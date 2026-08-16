import { NextResponse } from 'next/server';
import { callAI, extractJson, hasAiProvider } from '@/lib/callAI';
import { checkRateLimit, clientIp, rateLimitedResponse } from '@/lib/rateLimit';
import {
  OPENROUTER_TEXT_MODELS,
  OPENROUTER_VISION_MODELS,
  GROQ_TEXT_MODELS,
  GROQ_VISION_MODELS,
  GEMINI_MODELS,
} from '@/lib/aiModels';
import { computeOverallScore } from '@/utils/scoringLogic';

// Used for text jobs: AI scores all 4 dimensions; we compute overallScore ourselves.
// Keywords is AI too — code-based matching misses stemming, synonyms, and semantic equivalents
// (e.g. "React" vs "ReactJS", "managing" vs "management").
const TEXT_SCHEMA_FULL = `{
  "keywords":   { "score": <integer 0-100>, "matched": [top matched keywords], "missing": [top missing keywords — max 8] },
  "skills":     { "score": <integer 0-100>, "matched": [matched skills], "missing": [missing skills — max 8] },
  "experience": { "score": <integer 0-100>, "feedback": "<1-2 sentences>" },
  "education":  { "score": <integer 0-100>, "feedback": "<1 sentence>" },
  "recommendations": [3-5 actionable suggestions],
  "summary": "<2-3 sentence overall assessment>"
}`;

// Reduced schema when experience+education are already known (e.g. comparison after boost)
const TEXT_SCHEMA_KW_SKILLS = `{
  "keywords":   { "score": <integer 0-100>, "matched": [top matched keywords], "missing": [top missing keywords — max 8] },
  "skills":     { "score": <integer 0-100>, "matched": [matched skills], "missing": [missing skills — max 8] },
  "recommendations": [3-5 actionable suggestions],
  "summary": "<2-3 sentence overall assessment>"
}`;

// Used for image jobs: AI computes everything including overallScore
const IMAGE_SCHEMA = `{
  "overallScore": <integer 0-100>,
  "breakdown": {
    "keywords":   { "score": <integer 0-100>, "matched": [<strings>], "missing": [<strings>] },
    "skills":     { "score": <integer 0-100>, "matched": [<strings>], "missing": [<strings>] },
    "experience": { "score": <integer 0-100>, "feedback": "<1-2 sentences>" },
    "education":  { "score": <integer 0-100>, "feedback": "<1 sentence>" }
  },
  "recommendations": [<3-5 actionable suggestions>],
  "summary": "<2-3 sentence overall assessment>"
}`;

function clamp(n) {
  return Math.min(100, Math.max(0, Math.round(n)));
}

function normalizeRecommendations(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') return raw.split('\n').map(s => s.trim()).filter(Boolean);
  return [];
}

export async function POST(req) {
  try {
    // Also used by the Re-score button, which is a legitimate repeat call —
    // limit is looser than one-shot routes like boost-cv or analyze-gaps.
    const rl = checkRateLimit(`score:${clientIp(req)}`, { limit: 15, windowMs: 10 * 60 * 1000 });
    if (!rl.allowed) return rateLimitedResponse(rl.retryAfterSeconds);

    const body = await req.json();
    const { cvText, jobText, jobImageBase64 } = body;
    // Allow caller to pass temperature=0 for deterministic comparison rescoring
    const temperature = typeof body.temperature === 'number'
      ? Math.min(1, Math.max(0, body.temperature))
      : 0.2;
    // Allow caller to reuse specific dimension scores from a previous scoring call.
    // Used for comparison after boost: experience and education don't change, so we
    // pass them through to avoid AI variance between two scoring calls.
    const reuseScores = body.reuseScores || null;

    if (!cvText || cvText.trim().length < 50) {
      return NextResponse.json(
        { error: 'CV content is too short. Please add more details to your resume.' },
        { status: 400 },
      );
    }
    if (!hasAiProvider()) {
      return NextResponse.json({ error: 'No AI provider configured' }, { status: 500 });
    }

    // ── IMAGE JOB ─────────────────────────────────────────────────────────────
    if (jobImageBase64) {
      const messages = [
        {
          role: 'system',
          content: 'You are an expert ATS resume analyzer. Analyze the resume against the job posting image and return a structured JSON score report. Be honest and specific. Return ONLY a valid JSON object — no prose, no markdown, no code fences.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `The attached image is a job posting. Analyze this resume against it. Return ONLY a JSON matching this schema:\n${IMAGE_SCHEMA}\n\nRESUME:\n${cvText.slice(0, 3000)}`,
            },
            { type: 'image_url', image_url: { url: jobImageBase64 } },
          ],
        },
      ];

      let resultText;
      try {
        resultText = await callAI(messages, {
          openrouterModels: OPENROUTER_VISION_MODELS,
          groqModels: GROQ_VISION_MODELS,
          geminiModels: GEMINI_MODELS,
          temperature,
          max_tokens: 1500,
          response_format: { type: 'json_object' },
          validateFn: text => { try { extractJson(text); return null; } catch (e) { return e.message; } },
        });
      } catch (err) {
        return NextResponse.json(
          err.code === 'QUOTA_EXHAUSTED'
            ? { error: 'All free AI quota limits have been reached. Please try again later.', code: 'QUOTA_EXHAUSTED' }
            : { error: err.message || 'Failed to score resume' },
          { status: err.code === 'QUOTA_EXHAUSTED' ? 429 : 502 },
        );
      }

      const result = extractJson(resultText);
      if (typeof result.overallScore !== 'number') throw new Error('Invalid score format from AI');
      result.overallScore = clamp(result.overallScore);
      for (const key of ['skills', 'experience', 'education', 'keywords']) {
        if (result.breakdown?.[key]?.score != null)
          result.breakdown[key].score = clamp(result.breakdown[key].score);
      }
      result.recommendations = normalizeRecommendations(result.recommendations);
      return NextResponse.json(result);
    }

    // ── TEXT JOB ──────────────────────────────────────────────────────────────
    if (!jobText || jobText.trim().length < 50) {
      return NextResponse.json(
        { error: 'Job description is too short. Please provide more details.' },
        { status: 400 },
      );
    }

    const usingReuseScores = reuseScores?.experience && reuseScores?.education;
    const schema = usingReuseScores ? TEXT_SCHEMA_KW_SKILLS : TEXT_SCHEMA_FULL;
    const systemContent = usingReuseScores
      ? 'You are an expert ATS resume analyzer. Evaluate keyword coverage and skills match only. Return ONLY a valid JSON object — no prose, no markdown, no code fences.'
      : 'You are an expert ATS resume analyzer. Evaluate all dimensions: keyword coverage, skills match, experience relevance, and education fit. Return ONLY a valid JSON object — no prose, no markdown, no code fences.';

    const messages = [
      { role: 'system', content: systemContent },
      {
        role: 'user',
        content: `Evaluate this resume against the job description. Return ONLY a JSON matching this schema:\n${schema}\n\nRESUME:\n${cvText.slice(0, 3000)}\n\nJOB DESCRIPTION:\n${jobText.slice(0, 3000)}`,
      },
    ];

    let resultText;
    try {
      resultText = await callAI(messages, {
        openrouterModels: process.env.OPENROUTER_MODEL
          ? [process.env.OPENROUTER_MODEL, ...OPENROUTER_TEXT_MODELS]
          : [...OPENROUTER_TEXT_MODELS],
        groqModels: GROQ_TEXT_MODELS,
        geminiModels: GEMINI_MODELS,
        temperature,
        max_tokens: 1200,
        response_format: { type: 'json_object' },
        validateFn: text => { try { extractJson(text); return null; } catch (e) { return e.message; } },
      });
    } catch (err) {
      console.error('Score route: all providers failed:', err.message);
      return NextResponse.json(
        err.code === 'QUOTA_EXHAUSTED'
          ? { error: 'All free AI quota limits have been reached. Please try again later.', code: 'QUOTA_EXHAUSTED' }
          : { error: err.message || 'Failed to score resume' },
        { status: err.code === 'QUOTA_EXHAUSTED' ? 429 : 502 },
      );
    }

    const aiResult = extractJson(resultText);

    const kwScore    = clamp(aiResult.keywords?.score ?? 50);
    const skillScore = clamp(aiResult.skills?.score   ?? 50);
    // Use reused scores if provided; otherwise use AI scores
    const expScore   = usingReuseScores ? clamp(reuseScores.experience.score) : clamp(aiResult.experience?.score ?? 50);
    const eduScore   = usingReuseScores ? clamp(reuseScores.education.score)  : clamp(aiResult.education?.score  ?? 50);

    return NextResponse.json({
      overallScore: computeOverallScore(kwScore, skillScore, expScore, eduScore),
      breakdown: {
        keywords: {
          score:   kwScore,
          matched: Array.isArray(aiResult.keywords?.matched) ? aiResult.keywords.matched : [],
          missing: Array.isArray(aiResult.keywords?.missing) ? aiResult.keywords.missing : [],
        },
        skills: {
          score:   skillScore,
          matched: Array.isArray(aiResult.skills?.matched) ? aiResult.skills.matched : [],
          missing: Array.isArray(aiResult.skills?.missing) ? aiResult.skills.missing : [],
        },
        experience: usingReuseScores
          ? reuseScores.experience
          : { score: expScore, feedback: aiResult.experience?.feedback ?? '' },
        education: usingReuseScores
          ? reuseScores.education
          : { score: eduScore, feedback: aiResult.education?.feedback ?? '' },
      },
      recommendations: normalizeRecommendations(aiResult.recommendations),
      summary: aiResult.summary ?? '',
    });
  } catch (error) {
    console.error('Score route error:', error);
    return NextResponse.json({ error: error.message || 'Failed to score resume' }, { status: 500 });
  }
}
