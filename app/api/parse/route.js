import { NextResponse } from 'next/server';
import { callAI, extractJson } from '@/lib/callAI';
import { OPENROUTER_TEXT_MODELS, GROQ_TEXT_MODELS, GEMINI_MODELS } from '@/lib/aiModels';

export async function POST(req) {
  try {
    const { text } = await req.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }
    if (!process.env.OPENROUTER_API_KEY && !process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'No AI provider configured' }, { status: 500 });
    }

    const trimmedText = text.slice(0, 6000);

    const messages = [
      {
        role: 'system',
        content: 'You extract structured data from resumes. Return ONLY a valid JSON object — no prose, no markdown, no code fences.',
      },
      {
        role: 'user',
        content: `Extract this resume into exactly this JSON schema ("" for missing strings, [] for missing arrays). For experience/projects, "content" = newline-separated bullet points.\n\nSchema: {"contact":{"name":"","email":"","phone":"","location":"","designation":"","website":"","linkedin":""},"summary":{"content":""},"education":[{"institution":"","degree":"","startDate":"","endDate":"","location":""}],"experience":[{"company":"","role":"","startDate":"","endDate":"","location":"","content":""}],"projects":[{"name":"","role":"","startDate":"","endDate":"","link":"","content":""}],"skills":{"content":""},"certificates":[{"name":"","issuer":"","date":""}],"languages":[{"name":"","level":""}]}\n\nResume:\n${trimmedText}`,
      },
    ];

    let resultText;
    try {
      resultText = await callAI(messages, {
        openrouterModels: process.env.OPENROUTER_MODEL
          ? [process.env.OPENROUTER_MODEL, ...OPENROUTER_TEXT_MODELS]
          : OPENROUTER_TEXT_MODELS,
        groqModels: GROQ_TEXT_MODELS,
        geminiModels: GEMINI_MODELS,
        temperature: 0.1,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      });
    } catch {
      return NextResponse.json(
        { error: 'Could not parse the resume. Please try again or fill it in manually.' },
        { status: 502 },
      );
    }

    const parsed = extractJson(resultText);
    return NextResponse.json(mapToAppSchema(parsed));
  } catch (error) {
    console.error('Error parsing resume:', error);
    return NextResponse.json({ error: error.message || 'Failed to parse resume' }, { status: 500 });
  }
}

function mapToAppSchema(p) {
  const c = p.contact || {};
  const contact = {
    name: c.name || '',
    title: c.designation || '',
    email: c.email || '',
    phone: c.phone || '',
    address: c.location || '',
    linkedin: c.linkedin || '',
    github: '',
    blogs: '',
    twitter: '',
    portfolio: c.website || '',
  };

  const summary = { summary: p.summary?.content || '' };

  const education = (p.education || []).map(e => ({
    degree: e.degree || '',
    institution: e.institution || '',
    start: e.startDate || '',
    end: e.endDate || '',
    location: e.location || '',
    gpa: '',
  }));

  const experience = (p.experience || []).map(e => ({
    role: e.role || '',
    company: e.company || '',
    location: e.location || '',
    start: e.startDate || '',
    end: e.endDate || '',
    description: e.content || '',
  }));

  const projects = (p.projects || []).map(pr => ({
    title: pr.name || '',
    url: pr.link || '',
    description: pr.content || '',
  }));

  const skillItems = (p.skills?.content || '')
    .split(/[\n,;|·•]+/)
    .map(s => s.trim())
    .filter(Boolean);
  const seen = new Set();
  const dedup = [];
  for (const s of skillItems) {
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    dedup.push(s);
    if (dedup.length >= 20) break;
  }

  const certificates = (p.certificates || []).map(ct => ({
    title: ct.name || '',
    issuer: ct.issuer || '',
    date: ct.date || '',
  }));

  const languages = (p.languages || []).map(l => ({
    language: l.name || '',
    proficiency: l.level || '',
  }));

  return { contact, summary, education, experience, projects, skills: { items: dedup }, certificates, languages };
}
