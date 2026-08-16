import { NextResponse } from 'next/server';
import { callAI, hasAiProvider } from '@/lib/callAI';
import { OPENROUTER_TEXT_MODELS, GROQ_TEXT_MODELS, GEMINI_MODELS } from '@/lib/aiModels';
import { checkRateLimit, clientIp, rateLimitedResponse } from '@/lib/rateLimit';

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
- CRITICAL: Do NOT rename any section heading. If the original says "SKILLS", keep it as "SKILLS" — not "Technical Skills", "Core Competencies", or any other variant. Preserve every heading exactly as written.
- SKILLS content: keep all skills as a comma-separated list on one line (e.g. "Python, SQL, Data Visualization, Power BI"). Do NOT convert to bullet points or space-separated.
- Bullet points must use • character (only in EXPERIENCE and PROJECTS)
- Keep all line breaks and spacing from the original
- Return ONLY the complete resume text — no explanations, no "Here is...", no markdown`;

const PROMPT_GAP_ADVISOR = `You are an ATS optimization assistant. Return the COMPLETE resume text with improvements applied.

CRITICAL: Your output MUST include EVERY section of the original resume. Do NOT omit any section, job entry, project, or skill. The output must be roughly the same length as the input (or slightly longer if new content is added).

STEP 1 — Apply confirmed gap items (apply ALL of these exactly):
- If confirmed skills are listed: add them to the SKILLS section, preserving all existing skills
- If hidden experience details are provided: for each area, find the most relevant job or project entry and add a new bullet point that incorporates the user's provided details naturally and truthfully
- If confirmed keywords are provided: for each keyword, naturally incorporate the user's description into the SUMMARY and/or the most relevant experience bullet points using the exact JD terminology
- If confirmed certifications are listed: add them to the EDUCATION section or create a CERTIFICATIONS section if none exists

STEP 2 — Keyword optimization (apply to all remaining content):
- Rephrase bullet points in EXPERIENCE and PROJECTS to naturally incorporate terminology from the job description
- Update the SUMMARY to highlight relevant job keywords
- Do NOT add any facts, skills, tools, or roles beyond what is in STEP 1 or the original resume

Do NOT:
- Change job titles, company names, dates, institutions, or project names
- Remove or merge bullet points

Format rules (REQUIRED):
- Section headings in ALL CAPS
- CRITICAL: Do NOT rename any section heading. If the original says "SKILLS", keep it as "SKILLS" — not "Technical Skills", "Core Competencies", or any other variant. Preserve every heading exactly as written.
- SKILLS content: keep all skills as a comma-separated list on one line (e.g. "Python, SQL, Data Visualization, Power BI"). Do NOT convert to bullet points or space-separated.
- Bullet points must use • character (only in EXPERIENCE and PROJECTS)
- Return ONLY the complete resume text — no explanations, no markdown`;

function countSections(text) {
  return (text.match(/^[A-Z][A-Z\s]{2,}$/gm) || []).length;
}

export async function POST(req) {
  try {
    const rl = checkRateLimit(`boost-cv:${clientIp(req)}`, { limit: 8, windowMs: 10 * 60 * 1000 });
    if (!rl.allowed) return rateLimitedResponse(rl.retryAfterSeconds);

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
    if (!hasAiProvider()) {
      return NextResponse.json({ error: 'No AI provider configured' }, { status: 500 });
    }

    const inputSections = countSections(cvText);
    const minLength = Math.floor(cvText.length * 0.70);
    const hasSkillsSection = /^SKILLS?\s*$/im.test(cvText);

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
      if (hasSkillsSection && !/^SKILLS?\s*$/im.test(cleaned)) {
        return 'SKILLS section heading was renamed or removed. Preserve all section headings exactly as in the original.';
      }
      return null;
    };

    let userContent;
    if (mode === 'gap-advisor') {
      const confirmedSkills = Array.isArray(body?.confirmedSkills) ? body.confirmedSkills : [];
      const hiddenExperiences = Array.isArray(body?.hiddenExperiences) ? body.hiddenExperiences : [];
      const confirmedKeywords = Array.isArray(body?.confirmedKeywords) ? body.confirmedKeywords : [];
      const confirmedCerts = Array.isArray(body?.confirmedCerts) ? body.confirmedCerts : [];

      const parts = [`JOB DESCRIPTION:\n${jobText.slice(0, 3000)}\n\n---\n\nORIGINAL RESUME:\n${cvText.slice(0, 8000)}\n\n---\n\nCONFIRMED IMPROVEMENTS:`];
      if (confirmedSkills.length > 0) {
        parts.push(`\nSkills to add to SKILLS section: ${confirmedSkills.join(', ')}`);
      }
      if (hiddenExperiences.length > 0) {
        parts.push('\nHidden experience to incorporate as new bullet points:');
        for (const exp of hiddenExperiences) {
          parts.push(`  - Area: "${exp.area}" — User says: "${exp.details}"`);
        }
      }
      if (confirmedKeywords.length > 0) {
        parts.push('\nKeyword context to weave into CV naturally:');
        for (const kw of confirmedKeywords) {
          parts.push(`  - Keyword: "${kw.keyword}" — User says: "${kw.details}"`);
        }
      }
      if (confirmedCerts.length > 0) {
        parts.push(`\nCertifications to add to EDUCATION or CERTIFICATIONS section: ${confirmedCerts.join(', ')}`);
      }
      const hasAnyConfirmed = confirmedSkills.length > 0 || hiddenExperiences.length > 0 || confirmedKeywords.length > 0 || confirmedCerts.length > 0;
      if (!hasAnyConfirmed) {
        parts.push('\n(No confirmed additions — apply keyword optimization only)');
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
