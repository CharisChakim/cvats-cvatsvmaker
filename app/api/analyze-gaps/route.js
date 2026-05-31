import { NextResponse } from 'next/server';
import { callAI, extractJson } from '@/lib/callAI';
import { OPENROUTER_TEXT_MODELS, GROQ_TEXT_MODELS, GEMINI_MODELS } from '@/lib/aiModels';

const SYSTEM_PROMPT = `You are a resume gap analyst. Your job is to find gaps between what the job requires and what the candidate's CV shows.

Return a JSON object with this exact structure:
{
  "experienceQuestions": [
    {
      "id": "0",
      "area": "Supply Chain Management",
      "question": "The job involves supply chain processes. Have you worked in this area — even informally or as part of a broader role — in a way not currently shown in your CV?",
      "placeholder": "e.g. I coordinated with vendors and tracked inventory for a regional warehouse team..."
    }
  ],
  "confirmableSkills": [
    {
      "skill": "Docker",
      "reason": "Required in JD but not listed in your CV"
    }
  ]
}

Rules:
- experienceQuestions: Identify 2–4 experience AREAS the job explicitly or implicitly requires that are not demonstrated in the CV. Ask whether the candidate has relevant experience they haven't mentioned. Keep questions open and conversational — the candidate might have done this in a different context or role. Do NOT ask about specific tools or software (save those for confirmableSkills).
- confirmableSkills: List hard skills, tools, and technologies explicitly mentioned in the JD that do not appear anywhere in the CV. Maximum 6 items. Focus on actionable tools the candidate might have used but not listed (e.g. Docker, Tableau, Salesforce). Do NOT include soft skills.
- You MUST find gaps if the CV score is low. Be thorough — a candidate with a poor match needs actionable questions and skills to confirm.
- If a category truly has no items, return an empty array. But always try to find at least something for a CV that doesn't fully match the JD.
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
        temperature: 0.3,
        max_tokens: 1200,
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
      experienceQuestions: Array.isArray(result.experienceQuestions) ? result.experienceQuestions.slice(0, 4) : [],
      confirmableSkills: Array.isArray(result.confirmableSkills) ? result.confirmableSkills.slice(0, 6) : [],
    };

    return NextResponse.json(gaps);
  } catch (error) {
    console.error('Error analyzing gaps:', error);
    return NextResponse.json({ error: error.message || 'Failed to analyze gaps' }, { status: 500 });
  }
}
