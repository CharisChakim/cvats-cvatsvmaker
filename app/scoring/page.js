'use client';

import { useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import { pdfjs } from 'react-pdf';
import Link from 'next/link';
import { FaFilePdf, FaEdit, FaArrowLeft, FaRedo } from 'react-icons/fa';
import { FaMagnifyingGlass, FaWandMagicSparkles } from 'react-icons/fa6';
import { CgSpinner } from 'react-icons/cg';
import useTranslation from '@/hooks/useTranslation';
import { serializeCv } from '@/utils/serializeCv';
import { cleanPdfText } from '@/utils/cleanPdfText';
import { cacheGet, cacheSet } from '@/utils/aiCache';
import { setFullResume, saveResume } from '@/store/slices/resumeSlice';
import JobInput from '@/components/Scoring/JobInput';
import ScoreResults from '@/components/Scoring/ScoreResults';
import { ScoringLoader, BoostLoader, GapAdvisorLoader } from '@/components/Scoring/ScoringLoaders';
import MiniScoreCard from '@/components/Scoring/MiniScoreCard';
import GapAdvisorChecklist from '@/components/Scoring/GapAdvisorChecklist';
import SideBySideDiff from '@/components/Scoring/SideBySideDiff';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';


const ScoringPage = () => {
    const t = useTranslation();
    const resumeData = useSelector(state => state.resume);
    const dispatch = useDispatch();
    const router = useRouter();
    const fileRef = useRef(null);

    // Steps: 1=select cv, 2=job input, 3=scoring loader, 4=results,
    //        5=boost loader (safe), 6=comparison,
    //        7=gap analysis loader, 8=gap checklist, 9=gap apply loader
    const [step, setStep] = useState(1);
    const [cvSource, setCvSource] = useState(null);
    const [cvText, setCvText] = useState('');
    const [uploadedFileName, setUploadedFileName] = useState('');
    const [extractingPdf, setExtractingPdf] = useState(false);
    const [jobData, setJobData] = useState(null);
    const [jobUrl, setJobUrl] = useState('');
    const [jobFetchedText, setJobFetchedText] = useState('');
    const [results, setResults] = useState(null);
    const [error, setError] = useState('');
    const [emptyCvWarning, setEmptyCvWarning] = useState(false);
    const [showBoostMenu, setShowBoostMenu] = useState(false);
    const [boostMode, setBoostMode] = useState('safe');
    const [boostedCvText, setBoostedCvText] = useState('');
    const [boostedResults, setBoostedResults] = useState(null);
    const [applyingBoost, setApplyingBoost] = useState(false);
    const [gapAnalysis, setGapAnalysis] = useState(null);
    const [showDiff, setShowDiff] = useState(false);
    const [selectedOption, setSelectedOption] = useState('boosted'); // 'original' | 'boosted'

    const extractTextFromPDF = async file => {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            fullText += textContent.items.map(item => item.str).join(' ') + '\n';
        }
        return fullText;
    };

    const handleSelectCurrent = () => {
        const serialized = serializeCv(resumeData);
        if (!serialized || serialized.trim().length < 30) { setEmptyCvWarning(true); return; }
        const hasSubstance =
            (resumeData.experience?.length > 0) ||
            (resumeData.skills?.items?.length > 0) ||
            (resumeData.education?.length > 0);
        if (!hasSubstance) { setEmptyCvWarning(true); return; }
        setEmptyCvWarning(false);
        setCvText(serialized);
        setCvSource('current');
        setStep(2);
    };

    const handleSelectUpload = () => fileRef.current?.click();

    const handleFileChange = async e => {
        const file = e.target.files[0];
        if (!file) return;
        setExtractingPdf(true);
        setError('');
        try {
            const rawText = await extractTextFromPDF(file);
            const text = cleanPdfText(rawText, 6000);
            if (!text || text.trim().length < 50)
                throw new Error('Could not extract text from this PDF. Is it a scanned image?');
            setCvText(text);
            setCvSource('upload');
            setUploadedFileName(file.name);
            setStep(2);
        } catch (err) {
            setError(err.message);
        } finally {
            setExtractingPdf(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const handleScore = async () => {
        if (!jobData) { setError(t('scoring.emptyJobError')); return; }
        if (!cvText || cvText.trim().length < 50) { setError(t('scoring.emptyCvError')); return; }
        setError('');

        if (jobData.type === 'text') {
            const cached = cacheGet(['score', cvText, jobData.value]);
            if (cached) { setResults(cached); setStep(4); return; }
        }

        setStep(3);
        try {
            const body = jobData.type === 'image'
                ? { cvText, jobImageBase64: jobData.value }
                : { cvText, jobText: jobData.value };
            const res = await fetch('/api/score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) {
                if (data.code === 'QUOTA_EXHAUSTED') { setError(t('scoring.quotaError')); setStep(2); return; }
                throw new Error(data.error || 'Scoring failed');
            }
            if (jobData.type === 'text') cacheSet(['score', cvText, jobData.value], data);
            setResults(data);
            setStep(4);
        } catch (err) {
            setError(err.message || t('scoring.scoreError'));
            setStep(2);
        }
    };

    const runBoostAndScore = async (mode, body) => {
        const boostRes = await fetch('/api/boost-cv', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const boostData = await boostRes.json();
        if (!boostRes.ok) throw new Error(boostData.error || 'Boost failed');
        const boosted = boostData.boostedCvText;
        setBoostedCvText(boosted);
        setShowDiff(false);

        // Rescore boosted CV: temperature=0 for determinism, reuse experience+education
        // (those dimensions don't change during boost, reusing prevents AI variance)
        const scoreRes = await fetch('/api/score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cvText: boosted,
                jobText: jobData.value,
                temperature: 0,
                reuseScores: {
                    experience: results.breakdown.experience,
                    education: results.breakdown.education,
                },
            }),
        });
        let scoreData = await scoreRes.json();
        if (!scoreRes.ok) throw new Error(scoreData.error || 'Scoring failed');

        // In gap-advisor mode, skills score should never decrease — any drop is an AI
        // reformatting artifact (e.g. slightly changed skill names breaking substring match).
        // Patch: floor skills at original score, recalculate overall.
        if (mode === 'gap-advisor' && scoreData.breakdown?.skills?.score < results.breakdown.skills.score) {
            const k  = scoreData.breakdown.keywords.score;
            const e  = results.breakdown.experience.score;
            const s  = results.breakdown.skills.score;
            const ed = results.breakdown.education.score;
            scoreData = {
                ...scoreData,
                breakdown: { ...scoreData.breakdown, skills: results.breakdown.skills },
                overallScore: Math.min(100, Math.max(0, Math.round(k * 0.30 + e * 0.30 + s * 0.25 + ed * 0.15))),
            };
        }

        setBoostedResults(scoreData);
        setStep(6);
    };

    const handleBoost = async (mode = 'safe') => {
        if (!cvText || !jobData || jobData.type !== 'text') return;
        setShowBoostMenu(false);
        setBoostMode(mode);
        setError('');
        setBoostedCvText('');
        setBoostedResults(null);
        setSelectedOption('boosted');

        if (mode === 'gap-advisor') {
            setGapAnalysis(null);
            setStep(7);
            try {
                const res = await fetch('/api/analyze-gaps', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cvText, jobText: jobData.value }),
                });
                const data = await res.json();
                if (!res.ok) {
                    if (data.code === 'QUOTA_EXHAUSTED') { setError(t('scoring.quotaError')); setStep(4); return; }
                    throw new Error(data.error || 'Gap analysis failed');
                }
                setGapAnalysis(data);
                setStep(8);
            } catch (err) {
                setError(err.message || 'Failed to analyze gaps');
                setStep(4);
            }
            return;
        }

        setStep(5);
        try {
            await runBoostAndScore(mode, { cvText, jobText: jobData.value, mode });
        } catch (err) {
            setError(err.message || 'Failed to optimize CV');
            setStep(4);
        }
    };

    const handleApplyGap = async ({ confirmedSkills, hiddenExperiences }) => {
        setError('');
        setStep(9);
        try {
            await runBoostAndScore('gap-advisor', {
                cvText,
                jobText: jobData.value,
                mode: 'gap-advisor',
                confirmedSkills,
                hiddenExperiences,
            });
        } catch (err) {
            setError(err.message || 'Failed to apply Gap Advisor');
            setStep(8);
        }
    };

    const handleAcceptBoost = async () => {
        if (!boostedCvText) return;
        setApplyingBoost(true);
        setError('');
        try {
            const res = await fetch('/api/parse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: boostedCvText }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to apply boost');
            const hasMinimumContent =
                (data.experience?.length > 0) ||
                (data.skills?.items?.length > 0) ||
                (data.education?.length > 0);
            if (!hasMinimumContent) {
                throw new Error(t('scoring.boostParseIncomplete'));
            }
            dispatch(setFullResume(data));
            dispatch(saveResume());
            router.push('/editor');
        } catch (err) {
            setError(err.message || 'Failed to apply boosted CV to editor');
            setApplyingBoost(false);
        }
    };

    const handleReset = () => {
        setStep(1);
        setCvSource(null);
        setCvText('');
        setJobData(null);
        setResults(null);
        setError('');
        setUploadedFileName('');
        setEmptyCvWarning(false);
        setBoostedCvText('');
        setBoostedResults(null);
        setGapAnalysis(null);
        setShowDiff(false);
        // jobUrl and jobFetchedText kept so user doesn't re-fetch same URL
    };

    const ErrorBox = ({ msg }) =>
        msg ? (
            <p className="rounded-md border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                {msg}
            </p>
        ) : null;

    const StepDots = () => (
        <div className="mb-6 flex items-center justify-center gap-2">
            {[1, 2, 3].map(s => (
                <span key={s} className={`rounded-full transition-all duration-300 ${
                    s === step ? 'h-2.5 w-8 bg-primary-400'
                    : s < step  ? 'h-2 w-2 bg-primary-300 dark:bg-primary-600'
                                : 'h-2 w-2 bg-gray-300 dark:bg-gray-600'
                }`} />
            ))}
        </div>
    );

    const inCard = step === 1 || step === 2 || step === 3 || step === 5 || step === 7 || step === 9;
    const isBoostPhase = step === 5 || step === 6 || step === 7 || step === 8 || step === 9;

    return (
        <div className="mx-auto max-w-screen-md px-4 pb-16 pt-8 animate-fade-in">
            {/* Title */}
            <div className="mb-6 text-center">
                <div className="mb-3 flex justify-center">
                    <span className={`flex h-14 w-14 items-center justify-center rounded-2xl border transition-all duration-500 ${
                        isBoostPhase
                            ? 'bg-violet-400/10 border-violet-400/20'
                            : 'bg-primary-400/10 border-primary-400/20'
                    }`}>
                        {isBoostPhase
                            ? <FaWandMagicSparkles className="text-3xl text-violet-400" />
                            : <FaMagnifyingGlass className="text-3xl text-primary-400" />
                        }
                    </span>
                </div>
                <h1 className="text-2xl font-black md:text-3xl">{t('scoring.title')}</h1>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('scoring.subtitle')}</p>
            </div>

            {/* Steps 1, 2, 3, 5 — inside card */}
            {inCard && (
                <div className="card p-6 md:p-8">
                    {step < 3 && <StepDots />}

                    {step === 1 && (
                        <div className="animate-fade-in">
                            <h2 className="mb-5 font-semibold text-lg">{t('scoring.step1Title')}</h2>
                            <ErrorBox msg={error} />
                            <div className="mt-4 grid sm:grid-cols-2 gap-4">
                                <button onClick={handleSelectCurrent}
                                    className="flex flex-col items-center gap-4 rounded-xl border-2 border-gray-200 bg-gray-50 p-8 text-center transition-all duration-200 hover:border-primary-400 hover:bg-primary-50 active:scale-[0.98] group dark:border-gray-600 dark:bg-gray-800/50 dark:hover:border-primary-400 dark:hover:bg-primary-400/5">
                                    <FaEdit className="text-4xl text-primary-400 group-hover:scale-110 transition-transform duration-200" />
                                    <div>
                                        <p className="font-semibold">{t('scoring.useCurrent')}</p>
                                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('scoring.useCurrentDesc')}</p>
                                    </div>
                                </button>
                                <button onClick={handleSelectUpload} disabled={extractingPdf}
                                    className="flex flex-col items-center gap-4 rounded-xl border-2 border-gray-200 bg-gray-50 p-8 text-center transition-all duration-200 hover:border-primary-400 hover:bg-primary-50 active:scale-[0.98] group dark:border-gray-600 dark:bg-gray-800/50 dark:hover:border-primary-400 dark:hover:bg-primary-400/5 disabled:opacity-60 disabled:cursor-not-allowed">
                                    {extractingPdf
                                        ? <CgSpinner className="text-4xl text-primary-400 animate-spin" />
                                        : <FaFilePdf className="text-4xl text-primary-400 group-hover:scale-110 transition-transform duration-200" />
                                    }
                                    <div>
                                        <p className="font-semibold">{t('scoring.uploadNew')}</p>
                                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            {extractingPdf ? t('scoring.extractingPdf') : t('scoring.uploadNewDesc')}
                                        </p>
                                    </div>
                                </button>
                            </div>
                            {emptyCvWarning && (
                                <div className="mt-4 flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                                    <span className="flex-1">{t('scoring.emptyCvError')}</span>
                                    <Link href="/editor" className="shrink-0 font-semibold underline underline-offset-2 hover:opacity-80">
                                        {t('scoring.emptyCvRedirect')}
                                    </Link>
                                </div>
                            )}
                            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
                        </div>
                    )}

                    {step === 2 && (
                        <div className="animate-fade-in">
                            <div className="mb-5 flex items-center gap-2 rounded-lg border border-primary-400/30 bg-primary-50 px-4 py-2.5 text-sm dark:border-primary-400/20 dark:bg-primary-400/10">
                                {cvSource === 'current'
                                    ? <FaEdit className="text-primary-500 dark:text-primary-400 shrink-0" />
                                    : <FaFilePdf className="text-primary-500 dark:text-primary-400 shrink-0" />
                                }
                                <span className="text-primary-700 dark:text-primary-300 font-medium truncate">
                                    {cvSource === 'current' ? t('scoring.useCurrent') : uploadedFileName}
                                </span>
                                <button onClick={() => setStep(1)} className="ml-auto shrink-0 text-xs text-primary-500 hover:underline dark:text-primary-400">
                                    {t('scoring.back')}
                                </button>
                            </div>
                            <h2 className="mb-4 font-semibold text-lg">{t('scoring.step2Title')}</h2>
                            <JobInput t={t} onJobReady={data => setJobData(data)}
                                initialUrl={jobUrl} initialFetchedText={jobFetchedText}
                                onUrlFetched={(url, text) => { setJobUrl(url); setJobFetchedText(text); }} />
                            {error && <div className="mt-3"><ErrorBox msg={error} /></div>}
                            <div className="mt-6 flex justify-between">
                                <button onClick={() => setStep(1)} className="btn text-sm gap-2 active:scale-95 transition-transform duration-100">
                                    <FaArrowLeft className="text-xs" /> {t('scoring.back')}
                                </button>
                                <button onClick={handleScore} disabled={!jobData}
                                    className="btn-filled text-sm gap-2 active:scale-95 transition-transform duration-100 disabled:opacity-60 disabled:cursor-not-allowed">
                                    {t('scoring.scoreBtn')} <FaMagnifyingGlass />
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && <ScoringLoader t={t} />}
                    {step === 5 && <BoostLoader t={t} mode={boostMode} />}
                    {step === 7 && <GapAdvisorLoader t={t} />}
                    {step === 9 && <BoostLoader t={t} mode="gap-advisor" />}
                </div>
            )}

            {/* Step 8: Gap Advisor checklist */}
            {step === 8 && gapAnalysis && (
                <div className="animate-fade-in">
                    <GapAdvisorChecklist
                        gaps={gapAnalysis}
                        t={t}
                        onApply={handleApplyGap}
                        onBack={() => setStep(4)}
                    />
                    {error && <div className="mt-4"><ErrorBox msg={error} /></div>}
                </div>
            )}

            {/* Step 4: Score results */}
            {step === 4 && results && (
                <div className="animate-fade-in">
                    <ScoreResults results={results} t={t} />
                    {error && <div className="mt-4"><ErrorBox msg={error} /></div>}
                    <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-between">
                        <Link href="/editor" className="btn text-sm gap-2 justify-center active:scale-95 transition-transform duration-100">
                            <FaArrowLeft className="text-xs" /> {t('scoring.backToEditor')}
                        </Link>
                        <div className="flex items-center gap-2">
                            <button onClick={handleScore} className="btn text-sm gap-2 active:scale-95 transition-transform duration-100">
                                <FaRedo className="text-xs" /> Re-score
                            </button>
                            {jobData?.type === 'text' && (
                                <button onClick={() => setShowBoostMenu(true)}
                                    className="btn text-sm gap-2 active:scale-95 transition-transform duration-100">
                                    <FaWandMagicSparkles className="text-violet-500 dark:text-violet-400" />
                                    <span>{t('scoring.boostBtn')}</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Step 6: Comparison */}
            {step === 6 && results && boostedResults && (
                <div className="animate-fade-in">
                    <div className="mb-5">
                        <h2 className="text-xl font-bold">{t('scoring.compareTitle')}</h2>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('scoring.compareSubtitle')}</p>
                        <div className="mt-2 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-violet-400/10 text-violet-600 dark:text-violet-400 font-medium border border-violet-400/20">
                            <FaWandMagicSparkles className="text-[10px]" />
                            {boostMode === 'gap-advisor' ? t('scoring.boostModeAggressive') : t('scoring.boostModeSafe')}
                        </div>
                    </div>

                    {/* Info banner: no change from Gap Advisor */}
                    {boostMode === 'gap-advisor' && boostedResults.overallScore === results.overallScore && (
                        <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-amber-300/50 bg-amber-50 dark:bg-amber-500/10 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-300">
                            <span className="shrink-0 mt-0.5">ℹ</span>
                            <span>{t('scoring.gapNoChange')}</span>
                        </div>
                    )}

                    {/* Option A / Option B selector cards */}
                    <div className="grid sm:grid-cols-2 gap-3">
                        {/* Option A — Original */}
                        <button
                            type="button"
                            onClick={() => setSelectedOption('original')}
                            className={`text-left rounded-xl border-2 p-4 transition-all duration-150 active:scale-[0.98] ${
                                selectedOption === 'original'
                                    ? 'border-primary-400 bg-primary-50 dark:bg-primary-400/5'
                                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                    {t('scoring.optionA')}
                                </span>
                                <span className={`h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                                    selectedOption === 'original'
                                        ? 'border-primary-400 bg-primary-400'
                                        : 'border-gray-300 dark:border-gray-600'
                                }`}>
                                    {selectedOption === 'original' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                                </span>
                            </div>
                            <MiniScoreCard label={t('scoring.originalCv')} results={results} compact />
                        </button>

                        {/* Option B — Boosted */}
                        <button
                            type="button"
                            onClick={() => setSelectedOption('boosted')}
                            className={`text-left rounded-xl border-2 p-4 transition-all duration-150 active:scale-[0.98] ${
                                selectedOption === 'boosted'
                                    ? 'border-violet-400 bg-violet-50 dark:bg-violet-500/5'
                                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-bold uppercase tracking-wider text-violet-400 dark:text-violet-500">
                                    {t('scoring.optionB')}
                                </span>
                                <span className={`h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                                    selectedOption === 'boosted'
                                        ? 'border-violet-400 bg-violet-400'
                                        : 'border-gray-300 dark:border-gray-600'
                                }`}>
                                    {selectedOption === 'boosted' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                                </span>
                            </div>
                            <MiniScoreCard
                                label={t('scoring.boostedCv')}
                                results={boostedResults}
                                highlight
                                delta={boostedResults.overallScore - results.overallScore}
                                compact
                            />
                        </button>
                    </div>

                    {error && <div className="mt-4"><ErrorBox msg={error} /></div>}

                    {/* Text diff section */}
                    <div className="mt-4 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <button
                            onClick={() => setShowDiff(v => !v)}
                            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                        >
                            <span className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                <FaWandMagicSparkles className="text-violet-500 dark:text-violet-400 text-xs" />
                                {t('scoring.viewChanges')}
                            </span>
                            <span className="text-xs text-gray-400">{showDiff ? '▲ Hide' : '▼ Show'}</span>
                        </button>
                        {showDiff && (
                            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                                <SideBySideDiff original={cvText} boosted={boostedCvText} />
                            </div>
                        )}
                    </div>

                    {/* Apply button */}
                    <div className="mt-5">
                        <button
                            onClick={() => {
                                if (selectedOption === 'original') {
                                    setBoostedCvText(''); setBoostedResults(null); setStep(4);
                                } else {
                                    handleAcceptBoost();
                                }
                            }}
                            disabled={applyingBoost}
                            className={`w-full flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-150 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-sm ${
                                selectedOption === 'boosted'
                                    ? 'text-white bg-violet-600 hover:bg-violet-700'
                                    : 'text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                        >
                            {applyingBoost
                                ? <><CgSpinner className="animate-spin" /> <span>{t('scoring.applyingBoost')}</span></>
                                : selectedOption === 'boosted'
                                    ? <><FaWandMagicSparkles /> <span>{t('scoring.applyOptionB')}</span></>
                                    : <><FaArrowLeft className="text-xs" /> <span>{t('scoring.applyOptionA')}</span></>
                            }
                        </button>
                    </div>
                </div>
            )}

            {/* Boost mode popup */}
            {showBoostMenu && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
                    onClick={() => setShowBoostMenu(false)}>
                    <div className="w-72 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800"
                        onClick={e => e.stopPropagation()}>
                        <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                            <FaWandMagicSparkles className="text-violet-500 text-sm" />
                            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                {t('scoring.boostMenuTitle')}
                            </p>
                        </div>
                        <button onClick={() => handleBoost('safe')}
                            className="w-full px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <span className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                {t('scoring.boostSafeTitle')}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                                {t('scoring.boostSafeDesc')}
                            </span>
                        </button>
                        <div className="h-px bg-gray-100 dark:bg-gray-700" />
                        <button onClick={() => handleBoost('gap-advisor')}
                            className="w-full px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <span className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                {t('scoring.boostAggressiveTitle')}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                                {t('scoring.boostAggressiveDesc')}
                            </span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScoringPage;
