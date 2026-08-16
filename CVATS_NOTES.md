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
| `POST /api/parse` | Terima teks CV mentah → parse ke struktur JSON via AI. **Fallback saja** — lihat "Parsing hybrid" di bawah |
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

  // Manifest urutan + visibilitas section. Data section bawaan TETAP di slot
  // top-level masing-masing di atas — ini hanya mengatur urutan & tampil/tidak.
  sections: [{ id, visible, title?, shape? }],
  custom: { 'custom-1': [ ...entries ] },   // data section buatan user

  template: 'classic' | 'modern',
  onePage: 'normal' | 'compact' | 'onepage',
  font: 'Carlito' | 'Helvetica' | 'Times',
  saved: false,     // PDF re-render dipicu saat true
  lang: 'en' | 'id',

  parsedBy: null | 'local' | 'ai',   // jalur parse terakhir (tidak dipersist)
  parseSourceText: '',               // teks sumber utk "baca ulang dengan AI" (tidak dipersist)
}
```

**Actions penting:**
- `updateResumeValue({ tab, name, value, index })` — update satu field
- `setFullResume(data)` — replace semua data resume (dipakai setelah parse/boost).
  Payload parse tidak pernah berisi `sections`/`custom`, jadi keduanya selamat.
- `saveResume()` — set `saved: true`, memicu PDF re-render
- `setTemplate(id)` / `setOnePage(mode)` / `setFont(id)` — knob layout, langsung re-render
- `setLang('en'|'id')` — ganti bahasa UI
- `hydrateResume(saved)` — dipakai sekali oleh `ReduxProvider` saat mount (lihat peringatan di bawah)
- `setParseMeta({ parsedBy, sourceText })` — catat jalur parse
- `addSection({ title, shape })` / `removeSection(id)` / `renameSection({ id, title })` /
  `toggleSectionVisible(id)` / `moveSection({ id, dir })` — kelola section

Helper yang diekspor: `DEFAULT_RESUME`, `DEFAULT_SECTIONS`, `isCustomSection(id)`.

---

## ⚠️ State DIPERSIST ke localStorage — dan dimuat SETELAH mount

`store/index.js` menyimpan seluruh state ke `localStorage['reduxState']` (debounce 2,5
detik). Yang perlu diperhatikan adalah cara **memuatnya kembali**.

State tersimpan **sengaja tidak dipasang lewat `preloadedState`**. Server tidak punya
localStorage, jadi kalau dipasang di situ: server merender default kosong sementara
client merender CV tersimpan → seluruh pohon gagal hydrate. Gejalanya beruntun dan
membingungkan ("Text content did not match", "Expected server HTML to contain
a matching `<a>`") dan React membuang hasil SSR lalu merender ulang semuanya di client.

Alurnya sekarang: `store/index.js` mengekspor `loadPersistedResume()`, dan
`ReduxProvider` memanggilnya di `useEffect` lalu men-dispatch `hydrateResume(saved)`.
Server dan render pertama client sama-sama mulai dari `DEFAULT_RESUME`, jadi cocok;
data asli masuk di render berikutnya.

**Kalau menambah key baru ke state resume:** tidak perlu tindakan tambahan — reducer
`hydrateResume` sudah men-merge di atas `DEFAULT_RESUME`. Tapi jangan pernah
memindahkan pemuatan itu kembali ke `preloadedState`.

**Konsekuensi umum:** komponen apa pun yang merender state persisted akan berbeda
antara server dan render pertama client. Kalau kelak ada state client-only lain
(mis. dari `localStorage` langsung), pakai mounted-guard seperti di
`components/Editor/ParseNotice.js`.

`parsedBy` dan `parseSourceText` sengaja dibuang saat menyimpan: yang satu bisa
beberapa KB teks CV duplikat, yang lain akan memunculkan notice usang berhari-hari
kemudian.

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

## Parsing hybrid — rule-based dulu, AI kalau perlu

`utils/parseResumeLocal.js` membaca CV berformat konvensional tanpa memanggil AI.
Dipanggil **client-side** sebelum `fetch`, jadi CV yang lolos tidak menyentuh jaringan
sama sekali dan tidak memakan rate limit.

Dua titik pemanggilan: `app/(Home)/page.js` (upload PDF) dan `app/scoring/page.js`
(`handleAcceptBoost`, re-parse setelah accept boost). Jalur boost hampir selalu lolos
karena teksnya output `serializeCv` yang ditulis ulang AI, dan `validateFn` di
`boost-cv` sudah memaksa heading ALL-CAPS tetap utuh.

`parseResumeLocal(text)` → `{ data, confident, reasons, coverage }`. `data` berbentuk
**persis** seperti `mapToAppSchema` di route parse, jadi pemanggil tidak perlu
bercabang. Fallback ke AI kecuali **semua** terpenuhi: ≥2 heading dikenali, ada
nama/email, ≥1 entry experience/education bertanggal, dan **≥60% karakter input
terserap** (pengaman utama melawan parse yang diam-diam membuang separuh CV).

**Penting — parser menerima teks MENTAH, bukan hasil `cleanPdfText`.** `cleanPdfText`
membuang non-ASCII, yang ikut menghapus `•` dan `–` — persis karakter yang dipakai
untuk mendeteksi bullet dan rentang tanggal. Jalur AI tetap pakai versi bersih.

Setelah parse lokal, `components/Editor/ParseNotice.js` menampilkan strip
"Dibaca instan, tanpa AI" + tombol baca-ulang-dengan-AI. Hasil rule-based yang salah
tapi senyap lebih buruk daripada parse AI yang lambat.

`utils/extractTextFromPdf.js` merekonstruksi baris dari koordinat text item
(`transform[5]` untuk baris, `transform[4]` untuk urutan kiri→kanan, gap vertikal
besar → baris kosong). Versi lama menggabungkan **semua** item dengan spasi sehingga
struktur baris hilang total; tanpa ini parsing rule-based mustahil.

---

## PDF Generation

- Template dirender dengan `@react-pdf/renderer`
- Dua template: **Classic** (`components/Resume/pdf/Classic.js`) dan **Modern** (`components/Resume/pdf/Modern.js`)
- `PreviewInner.js` di-load dengan `dynamic({ ssr: false })` karena `usePDF` hanya jalan di browser
- **Urutan section datang dari `state.sections`, bukan hardcode di template.** Kedua
  template mengiterasi manifest yang sama, jadi urutan & visibilitas konsisten lintas
  template. Section custom dirender lewat renderer bawaan yang sudah ada —
  `shape: 'timeline'` pakai renderer Experience, `shape: 'compact'` pakai Certificates.
- PDF di-render ulang saat `resumeData.saved === true`, atau saat template / onePage /
  font / **urutan-visibilitas section** berubah. Rename section sengaja TIDAK memicu
  re-render (itu teks, bukan layout — kalau tidak, tiap ketukan tombol me-rebuild PDF).

### Classic mengikuti struktur template Harvard College

Diverifikasi terhadap template resmi Harvard College (Bullet Points) dan panduan
resminya:

- Institusi/perusahaan **tebal di kiri** dengan **lokasi rata kanan**; degree/role
  **miring di kiri** dengan **tanggal rata kanan** (dulu terbalik)
- Skills sebagai teks dipisah koma — **bukan** pill berlatar abu-abu. Harvard menulis
  skills sebagai baris teks berlabel, dan panduan ATS eksplisit melarang kotak/tabel/grid
- Kontak di tengah dipisah `•`, termasuk alamat
- Heading Title Case (template Harvard menulis "Education", bukan "EDUCATION")
- Padding halaman normal 36pt = 0,5 inci, ambang aman ATS. `compact`/`onepage` sengaja
  lebih sempit — itu memang trade-off yang diminta user
- Summary tetap dirender kalau diisi, walau template Harvard tidak punya section itu —
  data user tidak boleh dibuang. Karena itu caption berbunyi "mengikuti struktur",
  bukan "identik"

Font yang ditawarkan (`components/Resume/fonts.js`) semuanya ada di daftar ATS-safe.
Courier pernah ada dan sudah dibuang (monospace, tidak lazim untuk CV); `getFontSet`
jatuh ke Carlito untuk id yang tidak dikenal.

---

## Section yang bisa diatur user

Panduan Harvard menyuruh "list headings **in order of importance**" — urutan hardcode
yang lama justru menghalanginya. Sekarang user bisa mengurutkan, menyembunyikan,
mengganti nama, dan menambah section sendiri lewat `components/Editor/SectionManager.js`
(tombol di ujung strip tab).

- **Default tidak berubah** dari versi lama: semua section bawaan tampil dalam urutan
  yang sama. Fleksibilitas bersifat opt-in
- `contact` terkunci di posisi 0 — itu header CV, bukan section
- Section custom punya `shape`: `timeline` (field sama dengan experience) atau
  `compact` (field sama dengan certificates). Nama fieldnya sengaja dibuat identik
  dengan section bawaan supaya renderer PDF & editor tidak perlu mapping apa pun
- Judul yang tidak dikenali ATS memunculkan peringatan halus, bukan larangan
  (`isRecognizedHeading` di `parseResumeLocal.js`). Preset judul yang aman ditawarkan
  lebih dulu
- Section bawaan juga bisa di-rename (mis. "Experience" → "Pengalaman Kerja")
- **`serializeCv` wajib ikut manifest** — kalau tidak, scoring & boost buta terhadap
  section custom dan tetap melihat section yang sudah disembunyikan

---

## Fitur i18n (EN/ID)

- Semua teks UI ada di `lib/translations.js` — satu objek besar `{ en: {...}, id: {...} }`
- Hook `useTranslation()` (`hooks/useTranslation.js`) — baca `lang` dari Redux, return fungsi `t('key.nested')`
- Ganti bahasa via `setLang` action; ikut tersimpan ke localStorage bersama state lain, jadi pilihan bahasa bertahan setelah refresh
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
| `utils/parseResumeLocal.js` | **Parser rule-based** — baca CV tanpa AI + skor keyakinan. Juga ekspor `isRecognizedHeading` untuk peringatan ATS di section manager |
| `utils/extractTextFromPdf.js` | Ekstrak teks PDF **dengan struktur baris** direkonstruksi dari koordinat |
| `utils/serializeCv.js` | Konversi Redux state → plain text untuk dikirim ke AI (scoring/boost). Mengikuti urutan `sections` + menyertakan section custom |
| `utils/cleanPdfText.js` | Bersihkan teks hasil ekstrak PDF (hapus noise). **Membuang non-ASCII** — jangan suapkan hasilnya ke `parseResumeLocal` |
| `utils/aiCache.js` | Cache localStorage 24h untuk hasil scoring |
| `utils/jobHistory.js` | Session history untuk input job (text/url/screenshot) |
| `utils/scoringLogic.js` | **Code-based scoring** — `scoreKeywords`, `scoreSkills`, `computeOverallScore` |
| `lib/callAI.js` | Multi-provider AI caller dengan fallback |
| `lib/aiModels.js` | Daftar model AI terpusat — semua route import dari sini |
| `lib/translations.js` | Semua string UI dalam EN dan ID |
| `config/ResumeFields.js` | Definisi fields per tab editor + `CUSTOM_SHAPES`, `sectionFields()`, `sectionLabel()` |

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

**Section custom** memakai `CUSTOM_SHAPES` di file yang sama. Nama fieldnya sengaja
sama dengan section bawaan yang ditirunya (`timeline` → nama field experience,
`compact` → nama field certificates), supaya renderer PDF dan editor bisa dipakai
ulang apa adanya tanpa lapisan mapping.

---

## Pola-pola yang Perlu Diperhatikan

1. **PDF re-render mahal** — jangan trigger `updateInstance` sembarangan; trigger hanya via `saved` atau knob layout (`template`, `onePage`, `font`, urutan/visibilitas `sections`). Jangan tambahkan sesuatu yang berubah tiap ketukan tombol.
2. **AI JSON parse rapuh** — selalu pakai `extractJson()` dari `callAI.js`, bukan `JSON.parse` langsung. AI kadang kembalikan JSON di dalam markdown fences.
3. **Model OpenRouter sering ignore `response_format: json_object`** — itulah kenapa `extractJson` perlu parsing manual dengan sanitasi.
4. **`skills.items` adalah array string**, berbeda dengan section lain yang array of objects.
5. **`description` di experience/projects** — disimpan sebagai satu string multiline (`\n`-separated), masing-masing baris jadi satu bullet di PDF.
6. **Quick preview** (sidebar) hanya tampilkan halaman 1 dan sengaja diam — tidak ada efek tilt, karena sheet itu di-hover terus saat mengedit. **Full Preview** (modal) tampilkan semua halaman, buka pada 1,35× lebar-fit, dengan kontrol −/+/Fit.

---

## Struktur Komponen Editor (`components/Editor/`)

| File | Isi |
|---|---|
| `index.js` | Shell kartu editor — resolve tab ke config lewat `sectionFields()`, pilih Single/MultiEditor |
| `SingleEditor.js` | Section field tunggal (contact, summary, skills) |
| `MultiEditor.js` | Section berisi banyak entry; membaca `state.resume.custom[tab]` untuk section custom |
| `SectionManager.js` | Modal kelola section — urut naik/turun, toggle tampil, rename, tambah/hapus, peringatan heading non-standar |
| `ParseNotice.js` | Strip "dibaca tanpa AI" + tombol baca ulang dengan AI. Pakai mounted-guard karena `parsedBy` hanya ada di client |

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
- Tidak ada authentication/database — state ada di Redux dan dipersist ke localStorage (lihat peringatan di bagian State Management)
- Google Analytics sudah terpasang (`G-WPXWXJ9MC2`)
