'use client';

import { useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaFilePdf, FaEdit, FaArrowLeft, FaRedo } from 'react-icons/fa';
import { FaMagnifyingGlass, FaWandMagicSparkles } from 'react-icons/fa6';
import { CgSpinner } from 'react-icons/cg';
import useTranslation from '@/hooks/useTranslation';
import { serializeCv } from '@/utils/serializeCv';
import { cleanPdfText } from '@/utils/cleanPdfText';
import { extractTextFromPDF } from '@/utils/extractTextFromPdf';
import { cacheGet, cacheSet } from '@/utils/aiCache';
import { parseResumeLocal } from '@/utils/parseResumeLocal';
import { setFullResume, saveResume, setParseMeta } from '@/store/slices/resumeSlice';
import JobInput from '@/components/Scoring/JobInput';
import ScoreResults from '@/components/Scoring/ScoreResults';
import { ScoringLoader, BoostLoader, GapAdvisorLoader } from '@/components/Scoring/ScoringLoaders';
import GapAdvisorChecklist from '@/components/Scoring/GapAdvisorChecklist';
import ErrorBox from '@/components/Scoring/ErrorBox';
import ComparisonStep from '@/components/Scoring/ComparisonStep';
import BoostMenuPopup from '@/components/Scoring/BoostMenuPopup';

const ScoringPage = () => {
    const t = useTranslation();
    const resumeData = useSelector(state => state.resume);
    const dispatch = useDispatch();
    const router = useRouter();
    const fileRef = useRef(null);
    // Shared across the four AI-calling steps (score, boost, gap-analyze, apply-gap) —
    // only one is ever in flight at a time, so one ref is enough.
    const abortRef = useRef(null);
    const cancelCurrentOperation = () => abortRef.current?.abort();

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

    // force=true skips the cache — otherwise "Re-score" would replay the cached
    // result for the same CV + job and appear to do nothing.
    const handleScore = async ({ force = false } = {}) => {
        if (!jobData) { setError(t('scoring.emptyJobError')); return; }
        if (!cvText || cvText.trim().length < 50) { setError(t('scoring.emptyCvError')); return; }
        setError('');

        if (!force && jobData.type === 'text') {
            const cached = cacheGet(['score', cvText, jobData.value]);
            if (cached) { setResults(cached); setStep(4); return; }
        }

        const controller = new AbortController();
        abortRef.current = controller;

        setStep(3);
        try {
            const body = jobData.type === 'image'
                ? { cvText, jobImageBase64: jobData.value }
                : { cvText, jobText: jobData.value };
            const res = await fetch('/api/score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: controller.signal,
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
            if (err.name !== 'AbortError') setError(err.message || t('scoring.scoreError'));
            setStep(2);
        } finally {
            abortRef.current = null;
        }
    };

    const runBoostAndScore = async (mode, body, signal) => {
        const boostRes = await fetch('/api/boost-cv', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal,
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
            signal,
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

        const controller = new AbortController();
        abortRef.current = controller;

        if (mode === 'gap-advisor') {
            setGapAnalysis(null);
            setStep(7);
            try {
                const res = await fetch('/api/analyze-gaps', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cvText, jobText: jobData.value }),
                    signal: controller.signal,
                });
                const data = await res.json();
                if (!res.ok) {
                    if (data.code === 'QUOTA_EXHAUSTED') { setError(t('scoring.quotaError')); setStep(4); return; }
                    throw new Error(data.error || 'Gap analysis failed');
                }
                setGapAnalysis(data);
                setStep(8);
            } catch (err) {
                if (err.name !== 'AbortError') setError(err.message || 'Failed to analyze gaps');
                setStep(4);
            } finally {
                abortRef.current = null;
            }
            return;
        }

        setStep(5);
        try {
            await runBoostAndScore(mode, { cvText, jobText: jobData.value, mode }, controller.signal);
        } catch (err) {
            if (err.name !== 'AbortError') setError(err.message || 'Failed to optimize CV');
            setStep(4);
        } finally {
            abortRef.current = null;
        }
    };

    const handleApplyGap = async ({ confirmedSkills, hiddenExperiences, confirmedKeywords, confirmedCerts }) => {
        setError('');
        const controller = new AbortController();
        abortRef.current = controller;
        setStep(9);
        try {
            await runBoostAndScore('gap-advisor', {
                cvText,
                jobText: jobData.value,
                mode: 'gap-advisor',
                confirmedSkills,
                hiddenExperiences,
                confirmedKeywords,
                confirmedCerts,
            }, controller.signal);
        } catch (err) {
            if (err.name !== 'AbortError') setError(err.message || 'Failed to apply Gap Advisor');
            setStep(8);
        } finally {
            abortRef.current = null;
        }
    };

    const handleAcceptBoost = async () => {
        if (!boostedCvText) return;
        setApplyingBoost(true);
        setError('');
        try {
            // The boosted text is our own serialised CV rewritten by the model, and
            // boost-cv's validateFn already guarantees the ALL-CAPS headings survive —
            // so this almost always reads cleanly without a second AI round trip.
            const local = parseResumeLocal(boostedCvText);
            let data;
            let parsedBy = 'local';

            if (local.confident) {
                data = local.data;
            } else {
                parsedBy = 'ai';
                const res = await fetch('/api/parse', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: boostedCvText }),
                });
                data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to apply boost');
            }

            const hasMinimumContent =
                (data.experience?.length > 0) ||
                (data.skills?.items?.length > 0) ||
                (data.education?.length > 0);
            if (!hasMinimumContent) {
                throw new Error(t('scoring.boostParseIncomplete'));
            }
            dispatch(setFullResume(data));
            dispatch(setParseMeta({ parsedBy, sourceText: boostedCvText }));
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
                                    className="lift group flex flex-col items-center gap-4 rounded-2xl border border-transparent bg-white p-8 text-center shadow-layered hover:border-primary-400/40 dark:bg-gray-800/50">
                                    <FaEdit className="text-4xl text-primary-400 transition-transform duration-500 ease-spring group-hover:scale-110" />
                                    <div>
                                        <p className="font-semibold">{t('scoring.useCurrent')}</p>
                                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('scoring.useCurrentDesc')}</p>
                                    </div>
                                </button>
                                <button onClick={handleSelectUpload} disabled={extractingPdf}
                                    className="lift group flex flex-col items-center gap-4 rounded-2xl border border-transparent bg-white p-8 text-center shadow-layered hover:border-primary-400/40 dark:bg-gray-800/50 disabled:opacity-60 disabled:cursor-not-allowed">
                                    {extractingPdf
                                        ? <CgSpinner className="text-4xl text-primary-400 animate-spin" />
                                        : <FaFilePdf className="text-4xl text-primary-400 transition-transform duration-500 ease-spring group-hover:scale-110" />
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
                                <button onClick={() => { setError(''); setStep(1); }} className="ml-auto shrink-0 text-xs text-primary-500 hover:underline dark:text-primary-400">
                                    {t('scoring.back')}
                                </button>
                            </div>
                            <h2 className="mb-4 font-semibold text-lg">{t('scoring.step2Title')}</h2>
                            <JobInput t={t} onJobReady={data => setJobData(data)}
                                initialUrl={jobUrl} initialFetchedText={jobFetchedText}
                                onUrlFetched={(url, text) => { setJobUrl(url); setJobFetchedText(text); }} />
                            {error && <div className="mt-3"><ErrorBox msg={error} /></div>}
                            <div className="mt-6 flex justify-between">
                                <button onClick={() => { setError(''); setStep(1); }} className="btn text-sm gap-2">
                                    <FaArrowLeft className="text-xs" /> {t('scoring.back')}
                                </button>
                                <button onClick={() => handleScore()} disabled={!jobData}
                                    className="btn-filled text-sm gap-2 active:scale-95 transition-transform duration-100 disabled:opacity-60 disabled:cursor-not-allowed">
                                    {t('scoring.scoreBtn')} <FaMagnifyingGlass />
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && <ScoringLoader t={t} onCancel={cancelCurrentOperation} />}
                    {step === 5 && <BoostLoader t={t} mode={boostMode} onCancel={cancelCurrentOperation} />}
                    {step === 7 && <GapAdvisorLoader t={t} onCancel={cancelCurrentOperation} />}
                    {step === 9 && <BoostLoader t={t} mode="gap-advisor" onCancel={cancelCurrentOperation} />}
                </div>
            )}

            {/* Step 8: Gap Advisor checklist */}
            {step === 8 && gapAnalysis && (
                <div className="animate-fade-in">
                    <GapAdvisorChecklist
                        gaps={gapAnalysis}
                        t={t}
                        onApply={handleApplyGap}
                        onBack={() => { setError(''); setStep(4); }}
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
                            <button onClick={() => handleScore({ force: true })} className="btn text-sm gap-2">
                                <FaRedo className="text-xs" /> {t('scoring.rescore')}
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
                <ComparisonStep
                    t={t}
                    results={results}
                    boostedResults={boostedResults}
                    boostMode={boostMode}
                    selectedOption={selectedOption}
                    onSelectOption={setSelectedOption}
                    error={error}
                    showDiff={showDiff}
                    onToggleDiff={() => setShowDiff(v => !v)}
                    cvText={cvText}
                    boostedCvText={boostedCvText}
                    applyingBoost={applyingBoost}
                    onApplyOriginal={() => { setError(''); setBoostedCvText(''); setBoostedResults(null); setStep(4); }}
                    onApplyBoosted={handleAcceptBoost}
                />
            )}

            {/* Boost mode popup */}
            {showBoostMenu && (
                <BoostMenuPopup t={t} onClose={() => setShowBoostMenu(false)} onSelect={handleBoost} />
            )}
        </div>
    );
};

export default ScoringPage;
