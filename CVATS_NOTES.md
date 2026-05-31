# CVATS — Catatan Internal untuk Claude

File ini dibuat khusus agar saya (Claude) bisa langsung memahami konteks proyek ini di sesi baru.

---

## Gambaran Besar

**CVATS** adalah aplikasi web pembuat CV berbasis AI, ATS-friendly, gratis, tanpa login, dan tidak menyimpan data di server. Dibangun dengan **Next.js 14 (App Router)**, dihosting di Vercel.

- **URL prod:** `cvats.vercel.app`
- **Nama package:** `cvats`
- **Stack:** Next.js 14, React 18, Redux Toolkit, @react-pdf/renderer, Tailwind CSS, SASS
- **Run dev:** `npm run dev`

---

## Struktur Halaman

| Route | File | Fungsi |
|---|---|---|
| `/` | `app/(Home)/page.js` | Landing page + upload PDF |
| `/editor?tab=contact` | `app/editor/page.js` | Editor CV dengan preview PDF live |
| `/scoring` | `app/scoring/page.js` | ATS Match Score + CV Boost |

---

## API Routes (`app/api/`)

| Route | Fungsi |
|---|---|
| `POST /api/parse` | Terima teks CV mentah → parse ke struktur JSON via AI |
| `POST /api/score` | Terima cvText + jobText/jobImageBase64 → kembalikan skor ATS JSON |
| `POST /api/boost-cv` | Terima cvText + jobText + mode → kembalikan teks CV yang dioptimasi. mode: `safe` \| `gap-advisor` |
| `POST /api/analyze-gaps` | Terima cvText + jobText → kembalikan `{ experienceQuestions, confirmableSkills, keywordGaps, certificationGaps }` |
| `GET /api/refine` | AI refine satu field (summary/experience/project) |
| `GET /api/fetch-job` | Fetch teks dari URL job posting |

---

## State Management — Redux

File: `store/slices/resumeSlice.js`

**Shape state resume:**
```js
{
  contact: { name, title, email, phone, address, linkedin, github, blogs, twitter, portfolio },
  summary: { summary },
  education: [{ degree, institution, start, end, location, gpa }],
  experience: [{ role, company, location, start, end, description }],
  projects: [{ title, url, description }],
  skills: { items: [] },   // array of skill strings, max 20
  certificates: [{ title, issuer, date }],
  languages: [{ language, proficiency }],

  template: 'classic' | 'modern',
  onePage: false,   // compact mode
  saved: false,     // PDF re-render dipicu saat true
  lang: 'en' | 'id',
}
```

**Actions penting:**
- `updateResumeValue({ tab, name, value, index })` — update satu field
- `setFullResume(data)` — replace semua data resume (dipakai setelah parse/boost)
- `saveResume()` — set `saved: true`, memicu PDF re-render
- `setTemplate(id)` — ganti template
- `setOnePage(bool)` — toggle compact mode
- `setLang('en'|'id')` — ganti bahasa UI

---

## AI Provider — `lib/callAI.js` + `lib/aiModels.js`

Fungsi `callAI(messages, options)` melakukan fallback otomatis dengan urutan:
1. **Gemini** — dicoba pertama: cepat, stabil, limit lebar
2. **Groq** — fallback kedua: cepat, jarang timeout
3. **OpenRouter** — last resort: model free tier, lambat dan sering queue

Setiap model call punya timeout via `AbortController` (default **30s**, boost **45s**) — model hang langsung di-skip ke model berikutnya.

Semua provider di-skip jika API key tidak ada di env. Jika semua gagal dengan 429 → throw error dengan `code: 'QUOTA_EXHAUSTED'`.

**Semua daftar model disentralisasi di `lib/aiModels.js`** — jangan hardcode model di route file. Export yang tersedia:
- `OPENROUTER_TEXT_MODELS` — untuk parse, score (text), boost, refine
- `OPENROUTER_VISION_MODELS` — untuk score dengan job screenshot
- `GROQ_TEXT_MODELS`, `GROQ_VISION_MODELS`, `GEMINI_MODELS`

**Model chain text (dari `lib/aiModels.js`):**
```
meta-llama/llama-3.3-70b-instruct:free
google/gemma-4-31b-it:free
qwen/qwen3-next-80b-a3b-instruct:free
nvidia/nemotron-3-super-120b-a12b:free
deepseek/deepseek-v4-flash:free
nousresearch/hermes-3-llama-3.1-405b:free
openai/gpt-oss-120b:free   (terakhir — sering abaikan json_object format)
openai/gpt-oss-20b:free
```

Bisa override model pertama via env `OPENROUTER_MODEL`.

**Environment variables yang dibutuhkan:**
```
OPENROUTER_API_KEY
GROQ_API_KEY
GEMINI_API_KEY
OPENROUTER_REFERER   (opsional, default: http://localhost:3000)
OPENROUTER_MODEL     (opsional, override model pertama)
```

---

## PDF Generation

- Template dirender dengan `@react-pdf/renderer`
- Dua template: **Classic** (`components/Resume/pdf/Classic.js`) dan **Modern** (`components/Resume/pdf/Modern.js`)
- `PreviewInner.js` di-load dengan `dynamic({ ssr: false })` karena `usePDF` hanya jalan di browser
- PDF di-render ulang hanya saat `resumeData.saved === true` atau saat template/onePage berubah

---

## Fitur i18n (EN/ID)

- Semua teks UI ada di `lib/translations.js` — satu objek besar `{ en: {...}, id: {...} }`
- Hook `useTranslation()` (`hooks/useTranslation.js`) — baca `lang` dari Redux, return fungsi `t('key.nested')`
- Ganti bahasa via `setLang` action, tersimpan di Redux state (in-memory, hilang saat refresh)
- Komponen `LangToggle.js` di header

---

## Fitur ATS Scoring (`/scoring`)

Flow 6 langkah dengan state `step`:
1. Pilih CV (dari editor saat ini atau upload PDF baru)
2. Input job description (paste teks / URL / screenshot gambar)
3. Loading scoring
4. Tampil hasil skor (`ScoreResults.js`)
5. Loading boost
6. Comparison (original vs boosted)

**Boost modes:**
- `safe` (UI: "ATS Optimizer") — rephrase saja, tidak menambah fakta baru
- `gap-advisor` (UI: "Gap Advisor") — interview user tentang pengalaman tersembunyi, lalu boost

**Gap Advisor flow (steps 7-8-9):**
1. step 7 — `GapAdvisorLoader`: call `/api/analyze-gaps` → `{ experienceQuestions, confirmableSkills, keywordGaps, certificationGaps }`
2. step 8 — `GapAdvisorChecklist`: empat section — (a) pengalaman tersembunyi (yes/no + textarea), (b) skill yang dimiliki tapi belum dicantumkan (checkbox), (c) istilah kunci dari JD yang absen di CV (yes/no + textarea), (d) sertifikasi yang diminta JD tapi belum ada di CV (checkbox)
3. step 9 — `BoostLoader`: call `/api/boost-cv` dengan `mode: 'gap-advisor'` + `hiddenExperiences` + `confirmedSkills` + `confirmedKeywords` + `confirmedCerts`
4. step 6 — comparison (sama untuk semua mode)

**Catatan Gap Advisor — prompt analyze-gaps:** Semua gap HARUS bersumber dari JD requirements saja. Jangan flag skill yang sudah ada di bagian mana pun di CV (bahkan jika ada di experience tapi tidak di SKILLS section). max_tokens=1800. Batas per kategori: experienceQuestions max 2, confirmableSkills max 4, keywordGaps max 3, certificationGaps max 2.

Setelah accept boost → `/api/parse` lagi dari teks yang sudah di-boost → validasi ada experience/skills/education → `setFullResume` → redirect ke `/editor`.

**Penting — boost gap-advisor:** jika skills score boosted < original, di-patch client-side ke original (AI artifact, skills hanya ditambah bukan dihapus). Formula patch: `keywords×0.30 + experience×0.30 + original_skills×0.25 + education×0.15`.

**Caching scoring:** `utils/aiCache.js` — pakai `localStorage` dengan TTL 24 jam, key = hash dari `[cvText, jobText]`.

**Job input history:** `utils/jobHistory.js` — pakai `sessionStorage`, tersimpan per session (tidak persisten).

---

## Utilitas Penting

| File | Fungsi |
|---|---|
| `utils/serializeCv.js` | Konversi Redux state → plain text untuk dikirim ke AI (scoring/boost) |
| `utils/cleanPdfText.js` | Bersihkan teks hasil ekstrak PDF (hapus noise) |
| `utils/aiCache.js` | Cache localStorage 24h untuk hasil scoring |
| `utils/jobHistory.js` | Session history untuk input job (text/url/screenshot) |
| `utils/scoringLogic.js` | **Code-based scoring** — `scoreKeywords`, `scoreSkills`, `computeOverallScore` |
| `lib/callAI.js` | Multi-provider AI caller dengan fallback |
| `lib/aiModels.js` | Daftar model AI terpusat — semua route import dari sini |
| `lib/translations.js` | Semua string UI dalam EN dan ID |
| `config/ResumeFields.js` | Definisi fields per tab editor (nama, type, label, validasi) |

---

## Field Types di Editor

Field di `config/ResumeFields.js` punya properti:
- `type: 'textarea'` — multiline, bisa punya `aiRefine: 'summary'|'experience'|'project'`
- `type: 'tags'` — tag input (untuk skills), punya `max: 20`
- `type: 'month'` — date picker bulan
- `type: 'select'` — dropdown dengan `options[]`
- `presentable: true` — field "End Date" bisa di-set ke "Present"
- `multipoints: true` — textarea untuk bullet points, tiap baris = satu bullet di PDF
- `span: true` — field full width di grid

---

## Pola-pola yang Perlu Diperhatikan

1. **PDF re-render mahal** — jangan trigger `updateInstance` sembarangan; trigger hanya via `saved`, `template`, atau `onePage`.
2. **AI JSON parse rapuh** — selalu pakai `extractJson()` dari `callAI.js`, bukan `JSON.parse` langsung. AI kadang kembalikan JSON di dalam markdown fences.
3. **Model OpenRouter sering ignore `response_format: json_object`** — itulah kenapa `extractJson` perlu parsing manual dengan sanitasi.
4. **`skills.items` adalah array string**, berbeda dengan section lain yang array of objects.
5. **`description` di experience/projects** — disimpan sebagai satu string multiline (`\n`-separated), masing-masing baris jadi satu bullet di PDF.
6. **Preview PDF** hanya tampilkan halaman 1; preview modal tampilkan semua halaman.

---

## Struktur Komponen Scoring (`components/Scoring/`)

Setelah refactor (Mei 2026), komponen scoring dipecah:

| File | Isi |
|---|---|
| `JobInput.js` | Form input job description (text/url/screenshot) |
| `ScoreResults.js` | Tampil hasil skor ATS lengkap |
| `StepTimeline.js` | Animasi step-by-step loading timeline |
| `ScoringLoaders.js` | `ScoringLoader` + `BoostLoader` + `GapAdvisorLoader` + konstanta `SCORE_STEPS`/`BOOST_STEPS`/`GAP_STEPS` |
| `MiniScoreCard.js` | Kartu skor lingkaran kecil untuk halaman comparison |
| `GapAdvisorChecklist.js` | Interview interaktif Gap Advisor — 4 section: (1) experienceQuestions (yes/no+textarea), (2) confirmableSkills (checkbox), (3) keywordGaps (yes/no+textarea), (4) certificationGaps (checkbox) |
| `SideBySideDiff.js` | Side-by-side diff: kolom kiri (original, merah) vs kanan (boosted, hijau). Block pairing otomatis, word-level highlight untuk baris yang berubah. Row bg: `bg-red/green-100`, inline mark: `bg-red/green-400/80`. |
| `CvDiff.js` | Single-column unified diff. Row bg: `bg-red/green-100`, removed text pakai `line-through` (tanpa opacity). |

`app/scoring/page.js` hanya berisi logic state + handlers — semua komponen visual sudah dipisah.

---

## Arsitektur Scoring (Full AI — Mei 2026)

`/api/score` menggunakan **full AI** untuk semua dimensi (text dan image jobs):

| Dimensi | Metode | Catatan |
|---|---|---|
| Keywords | AI | Code-based dihapus — tidak bisa detect stemming/sinonim ("ReactJS"≠"React") |
| Skills | AI | Code-based dihapus — tidak bisa detect skill relevan dari teks JD |
| Experience | AI | Semantic judgment |
| Education | AI | Semantic judgment |
| Recommendations | AI | Natural language |
| Summary | AI | Natural language |

**Formula overallScore (dihitung server, bukan AI):** `keywords×0.30 + experience×0.30 + skills×0.25 + education×0.15`

**Temperature override:** `/api/score` menerima opsional `body.temperature` (default 0.2). Setelah boost, rescore dipanggil dengan `temperature: 0` untuk hasil deterministik di comparison view.

**`utils/scoringLogic.js`** masih tersedia untuk digunakan di masa depan (exports `scoreKeywords`, `scoreSkills`, `computeOverallScore`) tapi tidak lagi dipakai oleh route scoring.

---

## Hal yang Perlu Diperhatikan Saat Development

- Scoring page: logic state & handlers di page, visual components di `components/Scoring/`
- Jika tambah model AI baru: edit **hanya** `lib/aiModels.js`, tidak perlu sentuh route files
- Jika ubah bobot skor: edit `computeOverallScore()` di `utils/scoringLogic.js`
- **boost-cv route** punya `validateFn` yang memvalidasi output AI: panjang ≥70% input, jumlah ALL-CAPS section heading sama, dan heading `SKILLS` tidak boleh berganti nama. Kalau gagal → otomatis retry ke model berikutnya.
- **boost-cv prompt** harus menyebut secara eksplisit: (1) jangan rename heading, (2) SKILLS tetap comma-separated, (3) bullet `•` hanya di EXPERIENCE dan PROJECTS. Tanpa ini AI sering reformatting.
- **parse route** input limit 12.000 char (bukan 6.000), max_tokens 8.000. Boosted CV bisa lebih panjang dari original, jadi limit lama menyebabkan section terpotong.
- **mapToAppSchema** selalu strip karakter bullet di awal tiap baris experience/project content (`cleanBulletLines`). Ini mencegah double-bullet "• •" di PDF jika AI menyertakan bullet meski sudah dilarang.
- **skills.items** diisi dari `skills.content` yang di-split oleh `/[\n,;|·•]+/` — **tidak** include spasi, karena multi-word skill ("Data Visualization") harus tetap satu item. AI diarahkan return comma-separated via prompt.
- Setelah accept boost → navigate ke `/editor` untuk lihat PDF preview
- Tidak ada authentication/database — semua state in-memory (Redux) + localStorage
- Google Analytics sudah terpasang (`G-WPXWXJ9MC2`)
