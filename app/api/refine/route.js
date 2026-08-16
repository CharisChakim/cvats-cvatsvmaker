import { NextResponse } from 'next/server';
import { callAI, hasAiProvider } from '@/lib/callAI';
import { OPENROUTER_TEXT_MODELS, GROQ_TEXT_MODELS, GEMINI_MODELS } from '@/lib/aiModels';
import { checkRateLimit, clientIp, rateLimitedResponse } from '@/lib/rateLimit';

const KIND_PROMPTS = {
  summary: `Rewrite this professional summary following this exact four-part structure:
① Role & specialization (what the person does and in what field) → ② Years of experience → ③ Core skills or key technologies → ④ A standout achievement or differentiator.

Rules:
- 2–4 sentences, ATS-friendly, confident, and specific
- Do NOT use "I", "my", or any first-person pronouns
- Do NOT start with "As a...", "Experienced...", or "Results-driven..."
- Start directly with the job title or professional identity (e.g., "Software engineer with 5 years...")
- Only use information already present in the input — do NOT invent skills, employers, years, or metrics`,

  experience: `Rewrite these job responsibilities as 3–6 concise bullet points.

Rules:
- One bullet per line, no leading dash or bullet symbol (the app inserts them automatically)
- Each bullet MUST begin with a strong past-tense action verb (e.g., Built, Led, Designed, Reduced, Improved, Automated, Delivered)
- Structure: action verb → what was done / context or scale → outcome or impact
- Quantify results only when the input already contains numbers — do NOT invent metrics
- Keep each bullet under 20 words
- Do NOT invent employers, tools, dates, or achievements not already in the input`,

  project: `Rewrite this project description as 2–4 concise bullet points.

Rules:
- One bullet per line, no leading dash or bullet symbol (the app inserts them automatically)
- Each bullet MUST begin with a strong action verb (e.g., Built, Developed, Designed, Integrated, Deployed, Implemented)
- First bullet: what was built and which core technologies were used
- Remaining bullets: key features, notable technical decisions, or measurable impact
- Keep each bullet under 20 words
- Do NOT invent technologies, metrics, or scope not already present in the input`,
};

export async function POST(req) {
  try {
    // Called per field during editing, so this needs real headroom —
    // someone refining every section a few times over shouldn't get blocked.
    const rl = checkRateLimit(`refine:${clientIp(req)}`, { limit: 30, windowMs: 10 * 60 * 1000 });
    if (!rl.allowed) return rateLimitedResponse(rl.retryAfterSeconds);

    const body = await req.json();
    const text = (body?.text || '').toString().trim();
    const kind = body?.kind;

    if (!text) return NextResponse.json({ error: 'Nothing to refine — write something first.' }, { status: 400 });
    if (text.length > 4000) return NextResponse.json({ error: 'Text too long to refine.' }, { status: 413 });
    if (!KIND_PROMPTS[kind]) return NextResponse.json({ error: 'Unknown refine kind.' }, { status: 400 });
    if (!hasAiProvider()) {
      return NextResponse.json({ error: 'No AI provider configured' }, { status: 500 });
    }

    const messages = [
      {
        role: 'system',
        content: 'You are a resume editor. Refine the user\'s text per the instructions. Return ONLY the refined text — no preamble, no markdown headers, no quotes, no commentary.',
      },
      { role: 'user', content: `${KIND_PROMPTS[kind]}\n\nInput:\n${text}` },
    ];

    let refined;
    try {
      refined = await callAI(messages, {
        openrouterModels: process.env.OPENROUTER_MODEL
          ? [process.env.OPENROUTER_MODEL, ...OPENROUTER_TEXT_MODELS]
          : OPENROUTER_TEXT_MODELS,
        groqModels: GROQ_TEXT_MODELS,
        geminiModels: GEMINI_MODELS,
        temperature: 0.4,
        max_tokens: 600,
      });
    } catch {
      return NextResponse.json({ error: 'Empty response from model.' }, { status: 502 });
    }

    refined = refined.replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/i, '');
    refined = refined.replace(/^["'`]+|["'`]+$/g, '').trim();
    refined = refined
      .split('\n')
      .map(line => line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trimEnd())
      .filter(line => line.length > 0)
      .join('\n');

    if (!refined) return NextResponse.json({ error: 'Empty response from model.' }, { status: 502 });

    return NextResponse.json({ refined });
  } catch (error) {
    console.error('Error refining text:', error);
    return NextResponse.json({ error: error.message || 'Failed to refine' }, { status: 500 });
  }
}
