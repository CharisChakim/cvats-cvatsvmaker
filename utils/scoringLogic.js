/**
 * Code-based CV scoring — keyword and skills matching.
 * These are deterministic and 100% consistent, replacing the AI for these two dimensions.
 * AI is still used for experience relevance, education fit, recommendations, and summary.
 */

const STOPWORDS = new Set([
  // articles / prepositions / conjunctions
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'into', 'through', 'during', 'about',
  // auxiliary verbs
  'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can',
  // pronouns
  'this', 'that', 'these', 'those', 'it', 'its', 'we', 'you', 'they',
  'their', 'our', 'your', 'his', 'her', 'who', 'what', 'which',
  // common adjectives / adverbs that add no signal
  'not', 'also', 'just', 'more', 'most', 'other', 'some', 'any',
  'each', 'every', 'all', 'few', 'much', 'many', 'well', 'high', 'new',
  // generic job-posting words that appear in almost every JD (no signal)
  'work', 'working', 'team', 'role', 'job', 'position', 'candidate',
  'experience', 'years', 'year', 'strong', 'excellent', 'ability',
  'knowledge', 'required', 'preferred', 'requirement', 'requirements',
  'including', 'related', 'relevant', 'able', 'help', 'support',
  'ensure', 'good', 'great', 'plus', 'etc', 'per', 'use', 'used',
  'using', 'like', 'looking', 'nice', 'have', 'familiarity',
  'proficiency', 'control', 'version', 'senior', 'junior', 'mid',
]);

/** Normalize to lowercase alphanumeric + tech chars (#, +, ., -) */
function normalize(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9#+.\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Strip leading/trailing punctuation from a single token (e.g. "jest." → "jest") */
function stripEdgePunct(token) {
  return token.replace(/^[.\-]+|[.\-]+$/g, '');
}

/** Split text into meaningful tokens, filtering stopwords and short words */
function tokenize(text) {
  return normalize(text)
    .split(' ')
    .map(stripEdgePunct)
    .filter(w => w.length >= 3 && !STOPWORDS.has(w));
}

/**
 * Extract the top-N most frequent keywords from a job description.
 * Returns an array of normalized keyword strings.
 */
function extractJobKeywords(jdText, limit = 40) {
  const tokens = tokenize(jdText);
  const freq = {};
  for (const t of tokens) freq[t] = (freq[t] || 0) + 1;
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([w]) => w);
}

/**
 * Extract skills from the SKILLS section of a serialized CV text.
 * Handles comma-separated, newline-separated, and space-separated (long-line) formats.
 */
function extractCvSkills(cvText) {
  // Match from "SKILLS" heading to the next ALL-CAPS section or end of string
  const match = cvText.match(/SKILLS?\s*\n([\s\S]*?)(?:\n[A-Z][A-Z ]{2,}\n|$)/i);
  if (!match) return [];

  const skills = [];
  for (const seg of match[1].split(/[,\n•·|·]+/).map(s => s.trim()).filter(Boolean)) {
    if (seg.length <= 60) {
      skills.push(seg);
    } else {
      // Long line: space-separated skills (e.g. "python sql n8n ETL data visualization")
      skills.push(...seg.split(/\s+/).filter(w => w.length >= 2));
    }
  }
  return skills.filter(s => s.length >= 2 && s.length <= 60);
}

/**
 * Score keyword coverage: what % of the JD's top keywords appear in the CV text.
 * @returns {{ score: number, matched: string[], missing: string[] }}
 */
export function scoreKeywords(cvText, jdText) {
  const keywords = extractJobKeywords(jdText);
  if (keywords.length === 0) return { score: 0, matched: [], missing: [] };

  const cvNorm = normalize(cvText);

  const matched = [];
  const missing = [];
  for (const kw of keywords) {
    (cvNorm.includes(kw) ? matched : missing).push(kw);
  }

  const score = Math.round((matched.length / keywords.length) * 100);
  return { score, matched, missing };
}

/**
 * Score skills match: what % of the CV's listed skills appear in the JD text.
 * @returns {{ score: number, matched: string[], missing: string[] }}
 */
export function scoreSkills(cvText, jdText) {
  const skills = extractCvSkills(cvText);
  if (skills.length === 0) return { score: 0, matched: [], missing: [] };

  const jdNorm = normalize(jdText);

  const matched = [];
  const missing = [];
  for (const sk of skills) {
    (jdNorm.includes(normalize(sk)) ? matched : missing).push(sk);
  }

  const score = Math.round((matched.length / skills.length) * 100);
  return { score, matched, missing };
}

/**
 * Compute the final overall score from the four dimension scores.
 * Weights: keywords 30%, experience 30%, skills 25%, education 15%.
 */
export function computeOverallScore(keywordsScore, skillsScore, experienceScore, educationScore) {
  return Math.min(
    100,
    Math.max(
      0,
      Math.round(
        keywordsScore  * 0.30 +
        experienceScore * 0.30 +
        skillsScore    * 0.25 +
        educationScore * 0.15,
      ),
    ),
  );
}
