import { NextResponse } from 'next/server';
import { callAI, extractJson } from '@/lib/callAI';
import { OPENROUTER_TEXT_MODELS, GROQ_TEXT_MODELS, GEMINI_MODELS } from '@/lib/aiModels';

const SYSTEM_PROMPT = `You are a resume gap analyst. Compare the candidate's resume against the job description and identify specific, actionable gaps.

Return a JSON object with this exact structure:
{
  "missingSkills": [
    { "skill": "Docker", "reason": "Required in JD, not in CV" }
  ],
  "underrepresentedSkills": [
    { "skill": "Python", "reason": "Listed in skills but not demonstrated in experience" }
  ],
  "metricOpportunities": [
    {
      "id": "0",
      "bullet": "Built a responsive web application",
      "question": "How many users did this serve, or what improvement did it bring?",
      "placeholder": "e.g. served 500+ users, reduced load time by 40%"
    }
  ]
}

Rules:
- missingSkills: only skills/tools explicitly mentioned in the JD that are absent from the CV. Maximum 8 items. Focus on hard skills, tools, and technologies — not soft skills.
- underrepresentedSkills: skills listed in the CV's SKILLS section but not demonstrated in experience/projects. Maximum 5 items.
- metricOpportunities: experience or project bullet points that would be stronger with a metric. Pick only the 3-5 most impactful ones. The "bullet" field must contain the exact original text of the bullet point (shortened to ~80 chars if needed).
- If a category has no items, return an empty array for it.
- Return ONLY the JSON object, no explanation.`;

export async function POST(req) {
  try {
    const body = await req.json();
    const cvText = (body?.cvText || '').toString().trim();
    const jobText = (body?.jobText || '').toString().trim();

    if (!cvText || cvText.length < 50) {
      return NextResponse.json({ error: 'CV text is too short.' }, { status: 400 });
    }
    if (!jobText || jobText.length < 30) {
      return NextResponse.json({ error: 'Job description is too short.' }, { status: 400 });
    }
    if (!process.env.OPENROUTER_API_KEY && !process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY) {
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
        temperature: 0.2,
        max_tokens: 1000,
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
      missingSkills: Array.isArray(result.missingSkills) ? result.missingSkills.slice(0, 8) : [],
      underrepresentedSkills: Array.isArray(result.underrepresentedSkills) ? result.underrepresentedSkills.slice(0, 5) : [],
      metricOpportunities: Array.isArray(result.metricOpportunities) ? result.metricOpportunities.slice(0, 5) : [],
    };

    return NextResponse.json(gaps);
  } catch (error) {
    console.error('Error analyzing gaps:', error);
    return NextResponse.json({ error: error.message || 'Failed to analyze gaps' }, { status: 500 });
  }
}
