import { NextResponse } from 'next/server';
import { callAI, extractJson } from '@/lib/callAI';

const OPENROUTER_TEXT_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemma-4-31b-it:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'deepseek/deepseek-v4-flash:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
  // gpt-oss models last — tend to ignore json_object format
  'openai/gpt-oss-120b:free',
  'openai/gpt-oss-20b:free',
];
const OPENROUTER_VISION_MODELS = [
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-nano-12b-v2-vl:free',
];
const GROQ_TEXT_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
const GROQ_VISION_MODELS = ['meta-llama/llama-4-scout-17b-16e-instruct'];
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];

const SYSTEM_PROMPT =
  'You are an expert ATS resume analyzer. Analyze the resume against the job description and return a structured JSON score report. Be honest and specific. Return ONLY a valid JSON object — no prose, no markdown, no code fences.';

const SCORE_SCHEMA = `{
  "overallScore": <integer 0-100>,
  "breakdown": {
    "skills": { "score": <integer 0-100>, "matched": [<matched skills>], "missing": [<missing skills>] },
    "experience": { "score": <integer 0-100>, "feedback": "<1-2 sentences>" },
    "education": { "score": <integer 0-100>, "feedback": "<1 sentence>" },
    "keywords": { "score": <integer 0-100>, "matched": [<matched keywords>], "missing": [<missing keywords>] }
  },
  "recommendations": [<3-5 actionable improvement suggestions>],
  "summary": "<2-3 sentence overall assessment>"
}`;

export async function POST(req) {
  try {
    const body = await req.json();
    const { cvText, jobText, jobImageBase64 } = body;

    if (!cvText || cvText.trim().length < 50) {
      return NextResponse.json(
        { error: 'CV content is too short. Please add more details to your resume.' },
        { status: 400 },
      );
    }
    if (!process.env.OPENROUTER_API_KEY && !process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'No AI provider configured' }, { status: 500 });
    }

    let messages;
    let openrouterModels;
    let groqModels;

    if (jobImageBase64) {
      messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `The attached image is a job posting. Analyze this resume against it. Return ONLY a JSON matching this schema:\n${SCORE_SCHEMA}\n\nRESUME:\n${cvText.slice(0, 3000)}`,
            },
            { type: 'image_url', image_url: { url: jobImageBase64 } },
          ],
        },
      ];
      openrouterModels = OPENROUTER_VISION_MODELS;
      groqModels = GROQ_VISION_MODELS;
    } else {
      if (!jobText || jobText.trim().length < 50) {
        return NextResponse.json(
          { error: 'Job description is too short. Please provide more details.' },
          { status: 400 },
        );
      }
      messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Analyze this resume against the job description. Return ONLY a JSON matching this schema:\n${SCORE_SCHEMA}\n\nRESUME:\n${cvText.slice(0, 3000)}\n\nJOB DESCRIPTION:\n${jobText.slice(0, 3000)}`,
        },
      ];
      openrouterModels = process.env.OPENROUTER_MODEL
        ? [process.env.OPENROUTER_MODEL, ...OPENROUTER_TEXT_MODELS]
        : OPENROUTER_TEXT_MODELS;
      groqModels = GROQ_TEXT_MODELS;
    }

    let resultText;
    try {
      resultText = await callAI(messages, {
        openrouterModels,
        groqModels,
        geminiModels: GEMINI_MODELS,
        temperature: 0.2,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
        validateFn: text => {
          try { extractJson(text); return null; } catch (e) { return e.message; }
        },
      });
    } catch (err) {
      console.error('Score route: all providers failed:', err.message);
      if (err.code === 'QUOTA_EXHAUSTED' || err.message?.startsWith('QUOTA_EXHAUSTED')) {
        return NextResponse.json(
          { error: 'All free AI quota limits have been reached. Please try again later.', code: 'QUOTA_EXHAUSTED' },
          { status: 429 },
        );
      }
      return NextResponse.json({ error: err.message || 'Failed to score resume' }, { status: 502 });
    }

    const result = extractJson(resultText);

    if (typeof result.overallScore !== 'number') throw new Error('Invalid score format from AI');

    result.overallScore = Math.min(100, Math.max(0, Math.round(result.overallScore)));
    for (const key of ['skills', 'experience', 'education', 'keywords']) {
      if (result.breakdown?.[key]?.score != null) {
        result.breakdown[key].score = Math.min(100, Math.max(0, Math.round(result.breakdown[key].score)));
      }
    }

    // Normalize recommendations to always be an array of strings
    if (!Array.isArray(result.recommendations)) {
      if (typeof result.recommendations === 'string') {
        result.recommendations = result.recommendations.split('\n').map(s => s.trim()).filter(Boolean);
      } else {
        result.recommendations = [];
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Score route error:', error);
    return NextResponse.json({ error: error.message || 'Failed to score resume' }, { status: 500 });
  }
}
