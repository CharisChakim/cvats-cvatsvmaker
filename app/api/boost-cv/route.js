import { NextResponse } from 'next/server';
import { callAI } from '@/lib/callAI';
import { OPENROUTER_TEXT_MODELS, GROQ_TEXT_MODELS, GEMINI_MODELS } from '@/lib/aiModels';

const PROMPT_SAFE = `You are an ATS optimization assistant. Your only task is to return the COMPLETE resume text with targeted wording improvements — nothing more.

CRITICAL: Your output MUST include EVERY section of the original resume. Do NOT omit any section, job entry, project, or skill. Do NOT summarize or condense. The output must be roughly the same length as the input.

What to change (ONLY these):
- Rephrase bullet points in EXPERIENCE and PROJECTS to naturally use terminology from the job description
- Update the SUMMARY to highlight relevant keywords from the job posting
- Do NOT change job titles, company names, dates, institutions, or project names
- Do NOT add any new skills, certifications, roles, or metrics not already present
- Do NOT remove or merge bullet points

Format rules (REQUIRED):
- Section headings in ALL CAPS (e.g., EXPERIENCE, EDUCATION, SKILLS, PROJECTS)
- Bullet points must use • character
- Keep all line breaks and spacing from the original
- Return ONLY the complete resume text — no explanations, no "Here is...", no markdown`;

const PROMPT_GAP_ADVISOR = `You are an ATS optimization assistant. Return the COMPLETE resume text with two types of improvements applied together.

CRITICAL: Your output MUST include EVERY section of the original resume. Do NOT omit any section, job entry, project, or skill. The output must be roughly the same length as the input.

STEP 1 — Apply confirmed gap items (apply ALL of these exactly):
- Add the listed confirmed skills to the SKILLS section
- Showcase "underrepresented skills" more prominently in experience/project bullets where naturally relevant
- For metric updates: find the exact matching bullet and incorporate the provided value naturally

STEP 2 — Keyword optimization (apply to all remaining content):
- Rephrase bullet points in EXPERIENCE and PROJECTS to naturally incorporate terminology from the job description
- Update the SUMMARY to highlight relevant job keywords
- Do NOT add any facts, skills, tools, or roles beyond what is in STEP 1 or the original resume

Do NOT:
- Change job titles, company names, dates, institutions, or project names
- Remove or merge bullet points

Format rules (REQUIRED):
- Section headings in ALL CAPS
- Bullet points must use • character
- Return ONLY the complete resume text — no explanations, no markdown`;

function countSections(text) {
  return (text.match(/^[A-Z][A-Z\s]{2,}$/gm) || []).length;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const cvText = (body?.cvText || '').toString().trim();
    const jobText = (body?.jobText || '').toString().trim();
    const rawMode = body?.mode;
    const mode = rawMode === 'gap-advisor' ? 'gap-advisor' : 'safe';

    if (!cvText || cvText.length < 50) {
      return NextResponse.json({ error: 'CV text is too short.' }, { status: 400 });
    }
    if (!jobText || jobText.length < 30) {
      return NextResponse.json({ error: 'Job description is too short.' }, { status: 400 });
    }
    if (!process.env.OPENROUTER_API_KEY && !process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'No AI provider configured' }, { status: 500 });
    }

    const inputSections = countSections(cvText);
    const minLength = Math.floor(cvText.length * 0.55);

    // Validate that the model returned a complete document, not just a summary
    const validateFn = (text) => {
      const cleaned = text.replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/i, '').trim();
      if (cleaned.length < minLength) {
        return `Output too short (${cleaned.length} chars, expected ≥${minLength}). Model may have truncated the resume.`;
      }
      if (inputSections >= 2) {
        const outputSections = countSections(cleaned);
        if (outputSections < inputSections) {
          return `Missing sections: input has ${inputSections} ALL-CAPS headings, output has ${outputSections}. Sections were dropped.`;
        }
      }
      return null;
    };

    let userContent;
    if (mode === 'gap-advisor') {
      const confirmedSkills = Array.isArray(body?.confirmedSkills) ? body.confirmedSkills : [];
      const underrepresentedSkills = Array.isArray(body?.underrepresentedSkills) ? body.underrepresentedSkills : [];
      const confirmedMetrics = Array.isArray(body?.confirmedMetrics) ? body.confirmedMetrics : [];

      const parts = [`JOB DESCRIPTION:\n${jobText.slice(0, 3000)}\n\n---\n\nORIGINAL RESUME:\n${cvText.slice(0, 8000)}\n\n---\n\nCONFIRMED IMPROVEMENTS:`];
      if (confirmedSkills.length > 0) {
        parts.push(`\nSkills to add: ${confirmedSkills.join(', ')}`);
      }
      if (underrepresentedSkills.length > 0) {
        parts.push(`\nSkills to strengthen in experience/projects: ${underrepresentedSkills.join(', ')}`);
      }
      if (confirmedMetrics.length > 0) {
        parts.push('\nMetric updates:');
        for (const m of confirmedMetrics) {
          parts.push(`  - Bullet: "${m.bullet}" → add: "${m.value}"`);
        }
      }
      userContent = parts.join('\n');
    } else {
      userContent = `JOB DESCRIPTION:\n${jobText.slice(0, 3000)}\n\n---\n\nORIGINAL RESUME (return this COMPLETE, with only targeted wording changes):\n${cvText.slice(0, 8000)}`;
    }

    const systemPrompt = mode === 'gap-advisor' ? PROMPT_GAP_ADVISOR : PROMPT_SAFE;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ];

    let boosted;
    try {
      boosted = await callAI(messages, {
        openrouterModels: process.env.OPENROUTER_MODEL
          ? [process.env.OPENROUTER_MODEL, ...OPENROUTER_TEXT_MODELS]
          : OPENROUTER_TEXT_MODELS,
        groqModels: GROQ_TEXT_MODELS,
        geminiModels: GEMINI_MODELS,
        temperature: 0.3,
        max_tokens: 3500,
        validateFn,
        timeoutMs: 60000,
      });
    } catch (err) {
      console.error('[boost-cv] AI error:', err.message);
      if (err.code === 'QUOTA_EXHAUSTED') {
        return NextResponse.json(
          { error: 'AI quota exhausted. Please try again later.', code: 'QUOTA_EXHAUSTED' },
          { status: 429 },
        );
      }
      return NextResponse.json({ error: 'AI provider unavailable.' }, { status: 502 });
    }

    boosted = boosted.replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/i, '').trim();

    if (!boosted || boosted.length < 100) {
      return NextResponse.json({ error: 'Empty response from model.' }, { status: 502 });
    }

    return NextResponse.json({ boostedCvText: boosted });
  } catch (error) {
    console.error('Error boosting CV:', error);
    return NextResponse.json({ error: error.message || 'Failed to boost CV' }, { status: 500 });
  }
}
