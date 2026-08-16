/**
 * Rule-based resume parser.
 *
 * Most uploaded CVs are conventionally formatted — headings on their own line,
 * reverse-chronological entries, bulleted duties. Those need no AI, and sending
 * them to a model costs a request, ~30s of waiting, and a slot in the parse rate
 * limit. This reads them directly and reports how sure it is; anything short of
 * confident falls back to /api/parse.
 *
 * Output matches mapToAppSchema in app/api/parse/route.js exactly, so callers can
 * hand either result to setFullResume without branching.
 *
 * Feed this the RAW extracted text, not cleanPdfText output — that strips
 * non-ASCII, which removes the bullet characters and en-dashes this relies on.
 */

// Headings are matched exactly (after light punctuation stripping) rather than by
// prefix, because "Experience" as a heading and "Experience with React" as a skill
// line must not be confused. Also reused by the section manager to tell users when
// a custom heading is one an ATS will not recognise.
export const SECTION_KEYWORDS = {
    summary: [
        'summary', 'professional summary', 'profile', 'professional profile', 'about', 'about me',
        'objective', 'career objective', 'ringkasan', 'ringkasan profesional', 'profil', 'profil singkat',
        'tentang saya', 'deskripsi diri',
    ],
    education: [
        'education', 'academic background', 'educational background', 'academics',
        'pendidikan', 'riwayat pendidikan', 'latar belakang pendidikan',
    ],
    experience: [
        'experience', 'work experience', 'working experience', 'professional experience',
        'employment', 'employment history', 'work history', 'career history',
        'pengalaman', 'pengalaman kerja', 'riwayat pekerjaan', 'pengalaman profesional',
    ],
    projects: [
        'projects', 'project', 'personal projects', 'selected projects', 'portfolio',
        'proyek', 'portofolio',
    ],
    skills: [
        'skills', 'skill', 'technical skills', 'core skills', 'key skills', 'skills & interests',
        'skills and interests', 'competencies', 'keahlian', 'kemampuan', 'keterampilan', 'kompetensi',
    ],
    certificates: [
        'certifications', 'certification', 'certificates', 'certificate',
        'licenses & certifications', 'licenses and certifications', 'courses', 'training',
        'sertifikat', 'sertifikasi', 'pelatihan', 'kursus',
    ],
    languages: [
        'languages', 'language', 'language skills', 'bahasa', 'kemampuan bahasa', 'penguasaan bahasa',
    ],
};

const MONTHS = {
    jan: 1, january: 1, januari: 1,
    feb: 2, february: 2, februari: 2, pebruari: 2,
    mar: 3, march: 3, maret: 3,
    apr: 4, april: 4,
    may: 5, mei: 5,
    jun: 6, june: 6, juni: 6,
    jul: 7, july: 7, juli: 7,
    aug: 8, august: 8, agu: 8, agt: 8, agustus: 8,
    sep: 9, sept: 9, september: 9,
    oct: 10, october: 10, okt: 10, oktober: 10,
    nov: 11, november: 11, nopember: 11,
    dec: 12, december: 12, des: 12, desember: 12,
};

const MONTH_PATTERN = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join('|');
const PRESENT_PATTERN = 'present|now|to date|current|currently|ongoing|sekarang|saat ini|kini|hingga kini';
const RANGE_SEPARATOR = '(?:-|--|–|—|to|until|through|s\\.?d\\.?|sampai(?: dengan)?|hingga)';

// "Jan 2020", "January 2020", "01/2020", "2020-01", "2020". The YYYY-MM form comes
// from our own stored values via serializeCv, so it has to win over the bare year.
const DATE_TOKEN = `(?:(?:${MONTH_PATTERN})[a-z]*\\.?[\\s,]*\\d{4}|\\d{4}-\\d{2}|\\d{1,2}[/.-]\\d{4}|\\d{4})`;
const DATE_RANGE_RE = new RegExp(
    `(${DATE_TOKEN})\\s*${RANGE_SEPARATOR}\\s*(${DATE_TOKEN}|${PRESENT_PATTERN})`,
    'i',
);
const PRESENT_RE = new RegExp(`^(?:${PRESENT_PATTERN})$`, 'i');

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+\w/;
const LINKEDIN_RE = /(?:https?:\/\/)?(?:[\w-]+\.)?linkedin\.com\/[^\s|,)\]]+/i;
const GITHUB_RE = /(?:https?:\/\/)?(?:www\.)?github\.com\/[^\s|,)\]]+/i;
const URL_RE = /(?:https?:\/\/)[^\s|,)\]]+|(?:www\.)[^\s|,)\]]+/i;
const GPA_RE = /\b(?:GPA|IPK|CGPA)\b[:\s]*([0-4](?:[.,]\d{1,2})?)(?:\s*\/\s*[45](?:[.,]0)?)?/i;
const BULLET_RE = /^[\s]*[•·‣▪◦*•▪◦-]\s+/;

const normalizeHeading = line =>
    line
        .toLowerCase()
        .replace(/[^a-z&\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

function matchSection(line) {
    if (!line || line.length > 40 || /[.;]$/.test(line.trim())) return null;
    const normalized = normalizeHeading(line);
    if (!normalized) return null;
    for (const [section, keywords] of Object.entries(SECTION_KEYWORDS)) {
        if (keywords.includes(normalized)) return section;
    }
    return null;
}

// Conventional resume headings that this parser does not map to a built-in section
// but ATS parsers still recognise. Kept apart from SECTION_KEYWORDS on purpose:
// matching one there would make the parser swallow the section into whatever came
// before it, since there is no handler to put the content anywhere.
const EXTRA_KNOWN_HEADINGS = [
    'leadership', 'leadership & activities', 'leadership and activities', 'activities',
    'organizations', 'organizational experience', 'organisational experience',
    'volunteer', 'volunteer experience', 'volunteering', 'community service',
    'awards', 'honors', 'awards & honors', 'awards and honors', 'achievements',
    'publications', 'research', 'interests', 'references',
    'organisasi', 'pengalaman organisasi', 'kegiatan', 'kepanitiaan',
    'penghargaan', 'prestasi', 'publikasi', 'minat', 'referensi', 'relawan',
];

/** True when a heading is one ATS parsers are known to recognise. */
export function isRecognizedHeading(title) {
    const text = String(title || '');
    if (matchSection(text)) return true;
    return EXTRA_KNOWN_HEADINGS.includes(normalizeHeading(text));
}

// The editor stores months as YYYY-MM and treats the literal 'present' as ongoing,
// so dates are normalised to that rather than left as free text — the AI path
// returns whatever the model felt like, which often will not show in a month input.
function normalizeDate(raw) {
    if (!raw) return '';
    const value = raw.trim();
    if (PRESENT_RE.test(value)) return 'present';

    const iso = value.match(/^(\d{4})-(\d{2})$/);
    if (iso && Number(iso[2]) >= 1 && Number(iso[2]) <= 12) return value;

    const monthYear = value.match(new RegExp(`^(${MONTH_PATTERN})[a-z]*\\.?[\\s,]*(\\d{4})$`, 'i'));
    if (monthYear) {
        const month = MONTHS[monthYear[1].toLowerCase()];
        if (month) return `${monthYear[2]}-${String(month).padStart(2, '0')}`;
    }

    const numeric = value.match(/^(\d{1,2})[/.-](\d{4})$/);
    if (numeric) {
        const month = Number(numeric[1]);
        if (month >= 1 && month <= 12) return `${numeric[2]}-${String(month).padStart(2, '0')}`;
    }

    // A bare year cannot be expressed in a month input, and formatDate already
    // renders "2020" as January 2020, so anchoring it loses nothing and keeps the
    // value visible and editable instead of blanking the field.
    const year = value.match(/^(\d{4})$/);
    if (year) return `${year[1]}-01`;

    return '';
}

function findDateRange(text) {
    const match = text.match(DATE_RANGE_RE);
    if (!match) return null;
    return {
        start: normalizeDate(match[1]),
        end: normalizeDate(match[2]),
        matched: match[0],
    };
}

/** Split a section's lines into entries at blank lines, or where bullets give way to a new header. */
function splitEntries(lines) {
    const entries = [];
    let current = null;
    let sawBullet = false;

    for (const line of lines) {
        if (!line.trim()) {
            current = null;
            sawBullet = false;
            continue;
        }

        const isBullet = BULLET_RE.test(line);
        if (!current || (!isBullet && sawBullet)) {
            current = { headers: [], bullets: [] };
            entries.push(current);
            sawBullet = false;
        }

        if (isBullet) {
            current.bullets.push(line.replace(BULLET_RE, '').trim());
            sawBullet = true;
        } else {
            current.headers.push(line.trim());
        }
    }

    return entries.filter(e => e.headers.length || e.bullets.length);
}

// Commas are deliberately NOT separators: "San Francisco, CA" is one location, and
// splitting it there loses the field entirely. " at " is here because serializeCv
// joins role/company/location that way, which is what the boost path re-parses.
const SEPARATOR_RE = /\s*\|\s*|\s*[·•]\s*|\s*[—–]\s*|\s+-\s+|\s+at\s+/;

function splitHeaderParts(line) {
    return line.split(SEPARATOR_RE).map(p => p.trim()).filter(Boolean);
}

const ORG_HINT_RE = /\b(?:PT|CV|Tbk|Inc|LLC|Ltd|Corp|Corporation|Company|Co|GmbH|BV|Group|Foundation|Yayasan|University|Universitas|Institut|Institute|College|Politeknik|Sekolah|School|Academy|Akademi)\b\.?/i;

// Resumes disagree on whether the job title or the employer comes first — Harvard
// puts the organisation first, most others the role. Job titles have a far more
// predictable vocabulary than company names, so that is the side worth detecting.
const ROLE_HINT_RE = /\b(?:engineer|developer|analyst|manager|director|designer|intern|internship|consultant|specialist|officer|assistant|coordinator|supervisor|lead|head|architect|scientist|researcher|administrator|executive|founder|president|associate|technician|programmer|writer|editor|accountant|auditor|teacher|lecturer|magang|direktur|manajer|kepala|staf|asisten|koordinator|penulis|peneliti|guru|dosen)\b/i;

const LOCATION_RE = /^[A-Z][\w.'-]*(?:\s+[\w.'-]+)*,\s*[A-Z][\w.'-]*(?:\s+[\w.'-]+)*$/;

/**
 * Pull the date range, GPA and location out of an entry's header lines, leaving the
 * names behind. `singleDateAs` covers education and certificates, where a lone date
 * is the graduation or award date rather than half a missing range.
 */
function dissectHeaders(headers, { singleDateAs = null } = {}) {
    const joined = headers.join(' \n ');
    let range = findDateRange(joined);
    if (!range && singleDateAs) {
        const single = joined.match(new RegExp(DATE_TOKEN, 'i'));
        const normalized = single ? normalizeDate(single[0]) : '';
        if (normalized) {
            range = { start: '', end: '', matched: single[0] };
            range[singleDateAs] = normalized;
        }
    }
    const gpaMatch = joined.match(GPA_RE);

    const cleaned = headers
        .map(line => {
            let rest = line;
            if (range?.matched) rest = rest.replace(range.matched, ' ');
            rest = rest.replace(GPA_RE, ' ');
            // Dates are often parenthesised, so removing them leaves "Jakarta ( )" behind.
            rest = rest.replace(/\(\s*\)|\[\s*\]/g, ' ');
            return rest.replace(/\s{2,}/g, ' ').replace(/^[\s,;|·—–()-]+|[\s,;|·—–()-]+$/g, '').trim();
        })
        .filter(Boolean);

    const parts = [];
    for (const line of cleaned) {
        for (const part of splitHeaderParts(line)) parts.push(part);
    }

    let location = '';
    let locationIndex = parts.findIndex(p => LOCATION_RE.test(p) && p.length <= 40);
    // A single-word city ("Jakarta") has no comma to recognise it by, so fall back to
    // position: with three or more parts the trailing one is the location, as long as
    // it does not read as a job title or an employer.
    if (locationIndex === -1 && parts.length >= 3) {
        const last = parts[parts.length - 1];
        if (last.length <= 30 && !ROLE_HINT_RE.test(last) && !ORG_HINT_RE.test(last)) {
            locationIndex = parts.length - 1;
        }
    }
    if (locationIndex !== -1) location = parts.splice(locationIndex, 1)[0];

    return {
        start: range?.start || '',
        end: range?.end || '',
        gpa: gpaMatch ? gpaMatch[1].replace(',', '.') : '',
        location,
        parts,
        hasDate: !!range,
    };
}

/** Order header parts into [title, organisation] using role- and organisation-name hints. */
function orderNameParts(parts) {
    if (parts.length === 0) return ['', ''];
    if (parts.length === 1) return [parts[0], ''];

    const roleIndex = parts.findIndex(p => ROLE_HINT_RE.test(p));
    const orgIndex = parts.findIndex(p => ORG_HINT_RE.test(p));

    if (roleIndex !== -1 && roleIndex !== orgIndex) {
        const org = orgIndex !== -1 ? parts[orgIndex] : parts.find((_, i) => i !== roleIndex);
        return [parts[roleIndex], org || ''];
    }
    if (orgIndex > 0) return [parts.find((_, i) => i !== orgIndex), parts[orgIndex]];
    if (orgIndex === 0) return [parts[1], parts[0]];
    return [parts[0], parts[1]];
}

function parseExperience(lines) {
    return splitEntries(lines).map(entry => {
        const { start, end, location, parts } = dissectHeaders(entry.headers);
        const [role, company] = orderNameParts(parts);
        return {
            role: role || '',
            company: company || '',
            location,
            start,
            end,
            description: entry.bullets.join('\n'),
        };
    });
}

function parseEducation(lines) {
    return splitEntries(lines).map(entry => {
        const { start, end, gpa, location, parts } = dissectHeaders(entry.headers, { singleDateAs: 'end' });
        const [primary, secondary] = orderNameParts(parts);
        // Education names run the other way round from jobs: the institution is the
        // organisation and the degree is the title.
        const institutionIsFirst = ORG_HINT_RE.test(primary);
        return {
            degree: (institutionIsFirst ? secondary : primary) || '',
            institution: (institutionIsFirst ? primary : secondary) || '',
            start,
            end,
            location,
            gpa,
        };
    });
}

function parseProjects(lines) {
    return splitEntries(lines).map(entry => {
        const joined = entry.headers.join(' ');
        const url = (joined.match(URL_RE) || [''])[0];
        const { parts } = dissectHeaders(entry.headers.map(l => l.replace(URL_RE, ' ')));
        return {
            title: parts[0] || '',
            url,
            description: entry.bullets.join('\n'),
        };
    });
}

function parseCertificates(lines) {
    return splitEntries(lines).map(entry => {
        const joined = entry.headers.join(' ');
        const single = joined.match(new RegExp(DATE_TOKEN, 'i'));
        const range = findDateRange(joined);
        const dateRaw = range ? range.start : normalizeDate(single ? single[0] : '');
        const cleaned = joined
            .replace(range?.matched || (single ? single[0] : ''), ' ')
            .replace(/\s{2,}/g, ' ')
            .trim();
        const parts = splitHeaderParts(cleaned);
        return {
            title: parts[0] || '',
            issuer: parts[1] || '',
            date: dateRaw || '',
        };
    });
}

function parseLanguages(lines) {
    const out = [];
    for (const line of lines) {
        const text = line.replace(BULLET_RE, '').trim();
        if (!text) continue;
        // "English — Fluent", "English (Fluent)", "English: Fluent"
        const paren = text.match(/^(.+?)\s*\((.+?)\)$/);
        const delimited = text.match(/^(.+?)\s*(?:[:—–-]|\s{2,})\s*(.+)$/);
        if (paren) out.push({ language: paren[1].trim(), proficiency: paren[2].trim() });
        else if (delimited) out.push({ language: delimited[1].trim(), proficiency: delimited[2].trim() });
        else out.push({ language: text, proficiency: '' });
    }
    return out;
}

// Mirrors the skills handling in /api/parse: split on list punctuation but never on
// spaces, so "Data Visualization" survives as one item.
function parseSkills(lines) {
    const seen = new Set();
    const items = [];
    for (const raw of lines.join('\n').split(/[\n,;|·•]+/)) {
        // Drop "Technical:" style prefixes that Harvard-format CVs put on each line.
        const skill = raw.replace(BULLET_RE, '').replace(/^[A-Za-z ]{3,20}:\s*/, '').trim();
        if (!skill || skill.length > 40) continue;
        const key = skill.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        items.push(skill);
        if (items.length >= 20) break;
    }
    return items;
}

function parseContact(lines) {
    const joined = lines.join('\n');
    const email = (joined.match(EMAIL_RE) || [''])[0];
    const linkedin = (joined.match(LINKEDIN_RE) || [''])[0];
    const github = (joined.match(GITHUB_RE) || [''])[0];

    let phone = '';
    for (const candidate of joined.match(/\+?[\d][\d\s().-]{7,}\d/g) || []) {
        if ((candidate.match(/\d/g) || []).length >= 9) {
            phone = candidate.trim();
            break;
        }
    }

    const textLines = lines.map(l => l.trim()).filter(Boolean);
    let name = '';
    let nameIndex = -1;
    for (let i = 0; i < textLines.length; i++) {
        const line = textLines[i];
        if (line.includes('@') || /\d/.test(line) || URL_RE.test(line)) continue;
        const words = line.split(/\s+/);
        if (words.length > 5 || line.length > 60) continue;
        name = line.replace(/[|·,]+$/, '').trim();
        nameIndex = i;
        break;
    }

    // serializeCv writes the headline as "Name — Title", so the boost path re-parses
    // its own output and would otherwise store the whole thing as the name.
    let title = '';
    const headline = name.split(/\s+[—–]\s+/);
    if (headline.length === 2) {
        name = headline[0].trim();
        title = headline[1].trim();
    }

    const after = textLines[nameIndex + 1];
    if (!title && after && !after.includes('@') && !URL_RE.test(after) && after.length <= 60 && !/\d{4}/.test(after)) {
        title = after.replace(/[|·,]+$/, '').trim();
    }

    let address = '';
    for (const line of textLines) {
        if (line === name || line === title) continue;
        const stripped = line.replace(EMAIL_RE, '').replace(URL_RE, '').replace(/\+?[\d][\d\s().-]{7,}\d/g, '');
        const candidate = stripped.split(/[•|·]/).map(s => s.trim()).find(s => LOCATION_RE.test(s));
        if (candidate) {
            address = candidate;
            break;
        }
    }

    return {
        name,
        title,
        email,
        phone,
        address,
        linkedin,
        github,
        blogs: '',
        twitter: '',
        portfolio: '',
    };
}

function toAppSchema(sections, preamble) {
    const education = sections.education ? parseEducation(sections.education) : [];
    const experience = sections.experience ? parseExperience(sections.experience) : [];

    return {
        contact: parseContact(preamble),
        summary: { summary: (sections.summary || []).join(' ').trim() },
        education,
        experience,
        projects: sections.projects ? parseProjects(sections.projects) : [],
        skills: { items: sections.skills ? parseSkills(sections.skills) : [] },
        certificates: sections.certificates ? parseCertificates(sections.certificates) : [],
        languages: sections.languages ? parseLanguages(sections.languages) : [],
    };
}

const countChars = value => {
    if (!value) return 0;
    if (typeof value === 'string') return value.replace(/\s/g, '').length;
    if (Array.isArray(value)) return value.reduce((sum, v) => sum + countChars(v), 0);
    if (typeof value === 'object') return Object.values(value).reduce((sum, v) => sum + countChars(v), 0);
    return 0;
};

/**
 * @returns {{ data: object, confident: boolean, reasons: string[], coverage: number }}
 */
export function parseResumeLocal(text) {
    const rawLines = String(text || '').split('\n');

    const preamble = [];
    const sections = {};
    let currentSection = null;

    for (const line of rawLines) {
        const section = matchSection(line);
        if (section) {
            currentSection = section;
            if (!sections[section]) sections[section] = [];
            continue;
        }
        if (currentSection) sections[currentSection].push(line);
        else preamble.push(line);
    }

    const data = toAppSchema(sections, preamble);

    const headingCount = Object.keys(sections).length;
    const inputChars = String(text || '').replace(/\s/g, '').length;
    const coverage = inputChars ? countChars(data) / inputChars : 0;
    const datedEntries = [...data.experience, ...data.education].filter(e => e.start || e.end).length;

    const reasons = [];
    if (headingCount < 2) reasons.push(`only ${headingCount} recognised heading(s)`);
    if (!data.contact.email && !data.contact.name) reasons.push('no name or email found');
    if (!datedEntries) reasons.push('no dated experience or education entry');
    // The important guard: a parse that quietly dropped half the CV looks like a
    // success from every other angle.
    if (coverage < 0.6) reasons.push(`only ${Math.round(coverage * 100)}% of the text was captured`);

    return { data, confident: reasons.length === 0, reasons, coverage };
}
