'use client';

import { useRef, useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import { pdfjs } from 'react-pdf';
import Link from 'next/link';
import { FaFilePdf, FaEdit, FaArrowLeft, FaRedo } from 'react-icons/fa';
import { FaMagnifyingGlass, FaFileLines, FaBriefcase, FaListCheck, FaChartSimple, FaWandMagicSparkles, FaCircleCheck } from 'react-icons/fa6';
import { CgSpinner } from 'react-icons/cg';
import useTranslation from '@/hooks/useTranslation';
import { serializeCv } from '@/utils/serializeCv';
import { cleanPdfText } from '@/utils/cleanPdfText';
import { cacheGet, cacheSet } from '@/utils/aiCache';
import { setFullResume, saveResume } from '@/store/slices/resumeSlice';
import JobInput from '@/components/Scoring/JobInput';
import ScoreResults from '@/components/Scoring/ScoreResults';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

const SCORE_STEPS = [
    { icon: FaFileLines,         key: 'scoring.loadStep1', delay: 1800 },
    { icon: FaBriefcase,         key: 'scoring.loadStep2', delay: 1800 },
    { icon: FaListCheck,         key: 'scoring.loadStep3', delay: 2600 },
    { icon: FaChartSimple,       key: 'scoring.loadStep4', delay: 2600 },
    { icon: FaWandMagicSparkles, key: 'scoring.loadStep5', delay: null  },
];

const BOOST_STEPS = [
    { icon: FaBriefcase,         key: 'scoring.boostStep1', delay: 2000 },
    { icon: FaListCheck,         key: 'scoring.boostStep2', delay: 2500 },
    { icon: FaFileLines,         key: 'scoring.boostStep3', delay: 5000 },
    { icon: FaChartSimple,       key: 'scoring.boostStep4', delay: 3000 },
    { icon: FaCircleCheck,       key: 'scoring.boostStep5', delay: null  },
];

const StepTimeline = ({ steps, t, accentBg, accentRing, accentText }) => {
    const [activeStep, setActiveStep] = useState(0);

    useEffect(() => {
        let elapsed = 0;
        const timers = steps.slice(0, -1).map((s, i) => {
            elapsed += s.delay;
            return setTimeout(() => setActiveStep(i + 1), elapsed);
        });
        return () => timers.forEach(clearTimeout);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="flex flex-col gap-0 w-full max-w-xs">
            {steps.map(({ icon: Icon, key }, i) => {
                const done    = i < activeStep;
                const active  = i === activeStep;
                const pending = i > activeStep;
                const isLast  = i === steps.length - 1;
                return (
                    <div key={i} className="flex items-stretch gap-3">
                        <div className="flex flex-col items-center">
                            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-500 ${
                                done   ? 'bg-green-500 text-white' :
                                active ? `${accentBg} text-white ring-4 ${accentRing}` :
                                         'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                            }`}>
                                {done ? <FaCircleCheck className="text-sm" /> : <Icon className="text-xs" />}
                            </div>
                            {!isLast && (
                                <div className={`w-0.5 flex-1 my-1 rounded-full transition-all duration-700 ${done ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700'}`}
                                    style={{ minHeight: '1rem' }} />
                            )}
                        </div>
                        <div className={`flex items-center gap-2 ${isLast ? 'pb-0' : 'pb-4'} transition-all duration-500 ${pending ? 'opacity-35' : 'opacity-100'}`}>
                            <span className={`text-sm transition-all duration-500 ${
                                done   ? 'text-green-600 dark:text-green-400' :
                                active ? `font-semibold ${accentText}` :
                                         'text-gray-500 dark:text-gray-400'
                            }`}>
                                {t(key)}
                            </span>
                            {active && (
                                <span className="flex gap-0.5">
                                    <span className="h-1 w-1 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
                                    <span className="h-1 w-1 rounded-full bg-current animate-bounce [animation-delay:120ms]" />
                                    <span className="h-1 w-1 rounded-full bg-current animate-bounce [animation-delay:240ms]" />
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const ScoringLoader = ({ t }) => (
    <div className="flex flex-col items-center justify-center py-14 gap-8 animate-fade-in">
        <div className="relative h-16 w-16 shrink-0">
            <div className="absolute inset-0 rounded-full border-4 border-primary-400/20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary-400 animate-spin" />
            <FaMagnifyingGlass className="absolute inset-0 m-auto text-2xl text-primary-400" />
        </div>
        <p className="text-base font-semibold tracking-wide">{t('scoring.scoring')}</p>
        <StepTimeline steps={SCORE_STEPS} t={t}
            accentBg="bg-primary-400" accentRing="ring-primary-400/20" accentText="text-primary-500 dark:text-primary-400" />
    </div>
);

const BoostLoader = ({ t, mode }) => (
    <div className="flex flex-col items-center justify-center py-14 gap-8 animate-fade-in">
        <div className="relative h-16 w-16 shrink-0">
            <div className="absolute inset-0 rounded-full border-4 border-violet-400/20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-violet-400 animate-spin" />
            <FaWandMagicSparkles className="absolute inset-0 m-auto text-2xl text-violet-400" />
        </div>
        <div className="text-center">
            <p className="text-base font-semibold tracking-wide">{t('scoring.boostingTitle')}</p>
            <span className="mt-1.5 inline-block text-xs px-2.5 py-0.5 rounded-full bg-violet-400/10 text-violet-600 dark:text-violet-400 font-medium border border-violet-400/20">
                {mode === 'aggressive' ? t('scoring.boostModeAggressive') : t('scoring.boostModeSafe')}
            </span>
        </div>
        <StepTimeline steps={BOOST_STEPS} t={t}
            accentBg="bg-violet-500" accentRing="ring-violet-400/20" accentText="text-violet-600 dark:text-violet-400" />
    </div>
);

const MiniScoreCard = ({ label, results, highlight, delta }) => {
    const score = results.overallScore;
    const r = 36;
    const circ = 2 * Math.PI * r;
    const dash = (circ * score) / 100;
    const strokeColor = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
    const textColor   = score >= 75 ? 'text-green-500' : score >= 50 ? 'text-amber-500' : 'text-red-500';
    const barColor    = highlight ? 'bg-violet-500' : 'bg-primary-400';

    return (
        <div className={`card p-5 flex flex-col items-center gap-4 transition-all duration-300 ${highlight ? 'ring-2 ring-violet-400 shadow-lg shadow-violet-400/10' : ''}`}>
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">{label}</p>

            <div className="relative">
                <svg width="96" height="96" className="-rotate-90" aria-hidden>
                    <circle cx="48" cy="48" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-gray-200 dark:text-gray-700" />
                    <circle cx="48" cy="48" r={r} fill="none" strokeWidth="6" stroke={strokeColor}
                        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-2xl font-black ${textColor}`}>{score}</span>
                </div>
            </div>

            {delta !== undefined && (
                <div className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    delta > 0 ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                    : delta < 0 ? 'bg-red-500/10 text-red-500 dark:text-red-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                }`}>
                    {delta > 0 ? `+${delta} pts` : delta < 0 ? `${delta} pts` : 'No change'}
                </div>
            )}

            <div className="w-full space-y-2.5">
                {['skills', 'experience', 'education', 'keywords'].map(key => (
                    <div key={key}>
                        <div className="flex justify-between text-xs mb-0.5">
                            <span className="text-gray-500 dark:text-gray-400 capitalize">{key}</span>
                            <span className="font-medium tabular-nums">{results.breakdown[key].score}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700">
                            <div className={`h-1.5 rounded-full transition-all duration-700 ${barColor}`}
                                style={{ width: `${results.breakdown[key].score}%` }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ScoringPage = () => {
    const t = useTranslation();
    const resumeData = useSelector(state => state.resume);
    const dispatch = useDispatch();
    const router = useRouter();
    const fileRef = useRef(null);

    // Steps: 1=select cv, 2=job input, 3=scoring loader, 4=results,
    //        5=boost loader, 6=comparison
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

    const handleBoost = async (mode = 'safe') => {
        if (!cvText || !jobData || jobData.type !== 'text') return;
        setShowBoostMenu(false);
        setBoostMode(mode);
        setError('');
        setBoostedCvText('');
        setBoostedResults(null);
        setStep(5);

        try {
            const boostRes = await fetch('/api/boost-cv', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cvText, jobText: jobData.value, mode }),
            });
            const boostData = await boostRes.json();
            if (!boostRes.ok) throw new Error(boostData.error || 'Boost failed');
            const boosted = boostData.boostedCvText;
            setBoostedCvText(boosted);

            const scoreRes = await fetch('/api/score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cvText: boosted, jobText: jobData.value }),
            });
            const scoreData = await scoreRes.json();
            if (!scoreRes.ok) throw new Error(scoreData.error || 'Scoring failed');
            cacheSet(['score', boosted, jobData.value], scoreData);
            setBoostedResults(scoreData);
            setStep(6);
        } catch (err) {
            setError(err.message || 'Failed to optimize CV');
            setStep(4);
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
            dispatch(setFullResume(data));
            dispatch(saveResume()); // triggers PDF re-render in editor
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

    const inCard = step === 1 || step === 2 || step === 3 || step === 5;
    const isBoostPhase = step === 5 || step === 6;

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
                            <button onClick={handleReset} className="btn text-sm gap-2 active:scale-95 transition-transform duration-100">
                                <FaRedo className="text-xs" /> {t('scoring.scoreAgain')}
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
                            {boostMode === 'aggressive' ? t('scoring.boostModeAggressive') : t('scoring.boostModeSafe')}
                        </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <MiniScoreCard label={t('scoring.originalCv')} results={results} />
                        <MiniScoreCard
                            label={t('scoring.boostedCv')}
                            results={boostedResults}
                            highlight
                            delta={boostedResults.overallScore - results.overallScore}
                        />
                    </div>

                    {error && <div className="mt-4"><ErrorBox msg={error} /></div>}

                    <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-between">
                        <button
                            onClick={() => { setBoostedCvText(''); setBoostedResults(null); setStep(4); }}
                            className="btn text-sm gap-2 justify-center active:scale-95 transition-transform duration-100"
                        >
                            <FaArrowLeft className="text-xs" /> {t('scoring.keepOriginal')}
                        </button>
                        <button
                            onClick={handleAcceptBoost}
                            disabled={applyingBoost}
                            className="flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 active:scale-95 transition-all duration-100 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                        >
                            {applyingBoost ? <CgSpinner className="animate-spin" /> : <FaWandMagicSparkles />}
                            <span>{applyingBoost ? t('scoring.applyingBoost') : t('scoring.useBoosted')}</span>
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
                        <button onClick={() => handleBoost('aggressive')}
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
