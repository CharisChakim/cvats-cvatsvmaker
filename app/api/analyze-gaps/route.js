import { NextResponse } from 'next/server';
import { callAI, extractJson, hasAiProvider } from '@/lib/callAI';
import { OPENROUTER_TEXT_MODELS, GROQ_TEXT_MODELS, GEMINI_MODELS } from '@/lib/aiModels';
import { checkRateLimit, clientIp, rateLimitedResponse } from '@/lib/rateLimit';

const SYSTEM_PROMPT = `You are a resume-to-job-description gap analyst. Your ONLY job is to identify what the job description requires that is COMPLETELY ABSENT from the candidate's CV.

CRITICAL RULE: All gaps must be derived from JOB DESCRIPTION requirements only. Do NOT flag anything that appears anywhere in the CV — even if a skill appears in experience bullets but not in the SKILLS section, that is an internal CV issue, not a gap. For every item ask yourself: "Does the JD require this AND is it completely absent from the entire CV text?" If not, exclude it.

Return a JSON object with this exact structure:
{
  "experienceQuestions": [
    {
      "id": "0",
      "area": "Supply Chain Management",
      "question": "The job requires supply chain experience. Have you worked in this area in a way not shown in your CV?",
      "placeholder": "e.g. I coordinated with vendors and tracked inventory for a regional warehouse team..."
    }
  ],
  "confirmableSkills": [
    {
      "skill": "Docker",
      "reason": "Required in JD but not found anywhere in your CV"
    }
  ],
  "keywordGaps": [
    {
      "keyword": "Agile methodology",
      "context": "Mentioned repeatedly in JD as the primary work framework",
      "question": "The JD emphasizes Agile methodology. Does this term or approach apply to your work experience?",
      "placeholder": "e.g. I work in 2-week sprints, run daily standups, and manage a Jira board..."
    }
  ],
  "certificationGaps": [
    {
      "cert": "AWS Certified Developer",
      "reason": "Required/preferred in JD but not listed in your CV"
    }
  ]
}

Rules per category (quality over quantity — strict limits):
- experienceQuestions (max 2): Experience AREAS the JD explicitly requires that are not demonstrated ANYWHERE in the CV. Ask conversationally. Do NOT ask about specific tools (those go to confirmableSkills).
- confirmableSkills (max 4): Hard skills, tools, or technologies explicitly named in the JD that do not appear ANYWHERE in the CV text. No soft skills.
- keywordGaps (max 3): Key terms or phrases the JD uses repeatedly that are completely absent from the CV. Focus on role-specific language that improves keyword match (e.g. methodology names, domain terms). Do NOT duplicate items from confirmableSkills.
- certificationGaps (max 2): Specific certifications, licenses, or degrees the JD explicitly requires or prefers that are not in the CV. Only include if directly stated in the JD.

IMPORTANT:
- If an item appears ANYWHERE in the CV — do NOT include it in any category
- Return empty array [] for any category with nothing clearly missing
- Only include items with clear JD evidence AND complete CV absence
- Return ONLY the JSON object, no explanation`;

export async function POST(req) {
  try {
    const rl = checkRateLimit(`analyze-gaps:${clientIp(req)}`, { limit: 8, windowMs: 10 * 60 * 1000 });
    if (!rl.allowed) return rateLimitedResponse(rl.retryAfterSeconds);

    const body = await req.json();
    const cvText = (body?.cvText || '').toString().trim();
    const jobText = (body?.jobText || '').toString().trim();

    if (!cvText || cvText.length < 50) {
      return NextResponse.json({ error: 'CV text is too short.' }, { status: 400 });
    }
    if (!jobText || jobText.length < 30) {
      return NextResponse.json({ error: 'Job description is too short.' }, { status: 400 });
    }
    if (!hasAiProvider()) {
      return NextResponse.json({ error: 'No AI provider configured' }, { status: 500 });
    }

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `JOB DESCRIPTION:\n${jobText.slice(0, 3000)}\n\n---\n\nRESUME:\n${cvText.slice(0, 5000)}`,
      },
    ];

    let raw;
    try {
      raw = await callAI(messages, {
        openrouterModels: process.env.OPENROUTER_MODEL
          ? [process.env.OPENROUTER_MODEL, ...OPENROUTER_TEXT_MODELS]
          : OPENROUTER_TEXT_MODELS,
        groqModels: GROQ_TEXT_MODELS,
        geminiModels: GEMINI_MODELS,
        temperature: 0.3,
        max_tokens: 1800,
        response_format: { type: 'json_object' },
        validateFn: text => { try { extractJson(text); return null; } catch (e) { return e.message; } },
        timeoutMs: 30000,
      });
    } catch (err) {
      console.error('[analyze-gaps] AI error:', err.message);
      if (err.code === 'QUOTA_EXHAUSTED') {
        return NextResponse.json(
          { error: 'All free AI quota limits have been reached. Please try again later.', code: 'QUOTA_EXHAUSTED' },
          { status: 429 },
        );
      }
      return NextResponse.json({ error: 'AI provider unavailable.' }, { status: 502 });
    }

    let result;
    try {
      result = extractJson(raw);
    } catch (err) {
      console.error('[analyze-gaps] JSON parse error:', err.message, '| raw:', raw?.slice(0, 200));
      return NextResponse.json({ error: 'Could not parse AI response.' }, { status: 502 });
    }

    const gaps = {
      experienceQuestions: Array.isArray(result.experienceQuestions) ? result.experienceQuestions.slice(0, 2) : [],
      confirmableSkills: Array.isArray(result.confirmableSkills) ? result.confirmableSkills.slice(0, 4) : [],
      keywordGaps: Array.isArray(result.keywordGaps) ? result.keywordGaps.slice(0, 3) : [],
      certificationGaps: Array.isArray(result.certificationGaps) ? result.certificationGaps.slice(0, 2) : [],
    };

    return NextResponse.json(gaps);
  } catch (error) {
    console.error('Error analyzing gaps:', error);
    return NextResponse.json({ error: error.message || 'Failed to analyze gaps' }, { status: 500 });
  }
}
