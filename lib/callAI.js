const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

async function callEndpoint({ url, apiKey, model, messages, params, extraHeaders = {}, timeoutMs = 30000 }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`, ...extraHeaders },
      body: JSON.stringify({ model, messages, ...params }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw new Error(`(timeout) no response after ${timeoutMs / 1000}s`);
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`(${res.status}) ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  const msg = json?.choices?.[0]?.message ?? {};
  let text = msg.content ?? msg.reasoning ?? '';
  if (Array.isArray(text)) text = text.map(p => (typeof p === 'string' ? p : p?.text || '')).join('');
  return text.toString();
}

/**
 * Call AI with automatic multi-provider fallback.
 * Tries Gemini → Groq → OpenRouter in order, skips providers with no API key.
 * Gemini and Groq are tried first: faster, more stable, and less likely to timeout.
 * OpenRouter free models are the last resort.
 */
export async function callAI(messages, {
  openrouterModels = [],
  groqModels = [],
  geminiModels = [],
  temperature = 0.2,
  max_tokens,
  response_format,
  validateFn,
  timeoutMs = 30000,
} = {}) {
  const params = {
    temperature,
    ...(max_tokens && { max_tokens }),
    ...(response_format && { response_format }),
  };

  const errors = [];
  let allRateLimited = true;

  const recordError = (label, err) => {
    console.warn(`[${label}]:`, err.message);
    errors.push(`${label}: ${err.message}`);
    if (!err.message.startsWith('(429)') && !err.message.startsWith('(timeout)')) allRateLimited = false;
  };

  const tryCall = async (endpointArgs) => {
    const text = await callEndpoint({ ...endpointArgs, timeoutMs });
    if (validateFn) {
      const reason = validateFn(text);
      if (reason) throw new Error(`(invalid-response) ${reason}`);
    }
    return text;
  };

  if (process.env.GEMINI_API_KEY) {
    for (const model of geminiModels) {
      try {
        return await tryCall({
          url: GEMINI_URL, apiKey: process.env.GEMINI_API_KEY, model, messages, params,
        });
      } catch (err) {
        recordError(`Gemini/${model}`, err);
      }
    }
  }

  if (process.env.GROQ_API_KEY) {
    for (const model of groqModels) {
      try {
        return await tryCall({
          url: GROQ_URL, apiKey: process.env.GROQ_API_KEY, model, messages, params,
        });
      } catch (err) {
        recordError(`Groq/${model}`, err);
      }
    }
  }

  if (process.env.OPENROUTER_API_KEY) {
    for (const model of openrouterModels) {
      try {
        return await tryCall({
          url: OPENROUTER_URL,
          apiKey: process.env.OPENROUTER_API_KEY,
          model, messages, params,
          extraHeaders: {
            'HTTP-Referer': process.env.OPENROUTER_REFERER || 'http://localhost:3000',
            'X-Title': 'CVATS',
          },
        });
      } catch (err) {
        recordError(`OpenRouter/${model}`, err);
      }
    }
  }

  const summary = errors.slice(-3).join(' | ');
  const isQuota = errors.length > 0 && allRateLimited;
  const finalErr = new Error(isQuota ? `QUOTA_EXHAUSTED: ${summary}` : `All AI providers failed. ${summary}`);
  if (isQuota) finalErr.code = 'QUOTA_EXHAUSTED';
  throw finalErr;
}

export function extractJson(text) {
  text = text.replace(/```json/g, '').replace(/```/g, '').trim();
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first === -1 || last === -1) throw new Error('No JSON object found in AI response');

  let jsonStr = text.slice(first, last + 1);

  // Escape raw control characters inside JSON string values (e.g. bare \t or \n from AI)
  jsonStr = escapeControlCharsInStrings(jsonStr);

  // Remove consecutive commas (e.g. ,,  or ,\t, where AI emitted a tab as an array item)
  // and trailing commas before ] or }
  jsonStr = jsonStr.replace(/,(\s*,)+/g, ',').replace(/,\s*([}\]])/g, '$1');

  return JSON.parse(jsonStr);
}

function escapeControlCharsInStrings(str) {
  let result = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const code = str.charCodeAt(i);
    if (escaped) { result += ch; escaped = false; continue; }
    if (ch === '\\' && inString) { result += ch; escaped = true; continue; }
    if (ch === '"') { inString = !inString; result += ch; continue; }
    if (inString && code < 0x20) {
      if (code === 0x09) result += '\\t';
      else if (code === 0x0A) result += '\\n';
      else if (code === 0x0D) result += '\\r';
      // drop other non-printable control chars
      continue;
    }
    result += ch;
  }
  return result;
}
