import { NextResponse } from 'next/server';
import { callAI } from '@/lib/callAI';

const OPENROUTER_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemma-4-31b-it:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'deepseek/deepseek-v4-flash:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
  'openai/gpt-oss-120b:free',
  'openai/gpt-oss-20b:free',
];
const GROQ_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];

const PROMPT_SAFE = `You are a professional resume consultant specializing in ATS optimization.
Rewrite the resume to better match the job description WITHOUT fabricating any information.

Rules:
- Keep all facts, employers, job titles, dates, and education exactly as they appear
- Rephrase bullet points and descriptions to naturally incorporate keywords from the job description
- Highlight transferable skills already present but under-represented
- Use industry-standard terminology from the job posting where it accurately reflects the candidate's experience
- Do NOT add skills, tools, certifications, or roles not in the original
- Do NOT add quantitative metrics that don't appear in the original
- Preserve the exact plain-text structure: sections in ALL CAPS, bullets with •, line breaks between entries
- Return ONLY the improved resume text — no preamble, no commentary, no markdown`;

const PROMPT_AGGRESSIVE = `You are a professional resume consultant specializing in aggressive ATS optimization.
Rewrite the resume to significantly better match the job description. Follow these rules exactly.

WHAT YOU MAY ENHANCE:
1. SKILLS section — add plausible proficiency indicators or years of experience for existing skills (e.g. "Python" → "Python (3+ years)"). You may also add closely related skills that someone with this background would realistically have.
2. PROJECTS section — add plausible metrics and outcomes to project descriptions (e.g. "improved load time by ~35%", "served 2,000+ users"). Enhance technical detail with realistic context.
3. EXPERIENCE descriptions/bullets ONLY — you may add one plausible metric or achievement per bullet point ONLY if it is clearly logical and realistic for that specific job title and industry. Use approximate ranges ("~", "up to", "over") to sound authentic. If the role makes it unclear what would be realistic, leave that bullet as-is.

WHAT YOU MUST NOT CHANGE:
- Job titles, company names, or employment dates
- Project names and core technologies listed
- Educational institutions, degrees, or dates
- Certification names and issuers
- The overall structure or order of sections

Rules:
- Every fabricated detail must be plausible — no exaggerated or unrealistic claims
- For experience bullets: skip any bullet where a plausible metric is not obvious for that role
- Preserve the exact plain-text structure: sections in ALL CAPS, bullets with •, line breaks between entries
- Return ONLY the improved resume text — no preamble, no commentary, no markdown`;

export async function POST(req) {
  try {
    const body = await req.json();
    const cvText = (body?.cvText || '').toString().trim();
    const jobText = (body?.jobText || '').toString().trim();
    const mode = body?.mode === 'aggressive' ? 'aggressive' : 'safe';

    if (!cvText || cvText.length < 50) {
      return NextResponse.json({ error: 'CV text is too short.' }, { status: 400 });
    }
    if (!jobText || jobText.length < 30) {
      return NextResponse.json({ error: 'Job description is too short.' }, { status: 400 });
    }
    if (!process.env.OPENROUTER_API_KEY && !process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'No AI provider configured' }, { status: 500 });
    }

    const systemPrompt = mode === 'aggressive' ? PROMPT_AGGRESSIVE : PROMPT_SAFE;

    const messages = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `JOB DESCRIPTION:\n${jobText.slice(0, 3000)}\n\n---\n\nORIGINAL RESUME:\n${cvText.slice(0, 5000)}`,
      },
    ];

    let boosted;
    try {
      boosted = await callAI(messages, {
        openrouterModels: process.env.OPENROUTER_MODEL
          ? [process.env.OPENROUTER_MODEL, ...OPENROUTER_MODELS]
          : OPENROUTER_MODELS,
        groqModels: GROQ_MODELS,
        geminiModels: GEMINI_MODELS,
        temperature: mode === 'aggressive' ? 0.5 : 0.35,
        max_tokens: 2000,
      });
    } catch {
      return NextResponse.json({ error: 'AI provider unavailable.' }, { status: 502 });
    }

    boosted = boosted.replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/i, '').trim();

    if (!boosted || boosted.length < 50) {
      return NextResponse.json({ error: 'Empty response from model.' }, { status: 502 });
    }

    return NextResponse.json({ boostedCvText: boosted });
  } catch (error) {
    console.error('Error boosting CV:', error);
    return NextResponse.json({ error: error.message || 'Failed to boost CV' }, { status: 500 });
  }
}
