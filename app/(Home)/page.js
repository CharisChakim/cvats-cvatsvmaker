'use client';

import { IoIosRocket } from 'react-icons/io';
import { FaCloudUploadAlt } from 'react-icons/fa';
import { FaMagnifyingGlass, FaArrowRight } from 'react-icons/fa6';
import { useRef, useState, useTransition } from 'react';
import { useDispatch } from 'react-redux';
import { setFullResume, setParseMeta } from '@/store/slices/resumeSlice';
import { useRouter } from 'next/navigation';
import { CgSpinner } from 'react-icons/cg';
import UploadProgress from '@/components/UploadProgress';
import useTranslation from '@/hooks/useTranslation';
import { cleanPdfText } from '@/utils/cleanPdfText';
import { extractTextFromPDF } from '@/utils/extractTextFromPdf';
import { parseResumeLocal } from '@/utils/parseResumeLocal';
import Tilt3D from '@/components/UI/Tilt3D';
import CvPreviewArt from '@/components/CvPreviewArt';
import RouteOverlay from '@/components/RouteOverlay';

const HeroSheet = ({ t }) => (
    <div className="scene w-full max-w-[19rem] lg:max-w-[21rem] animate-rise [animation-delay:180ms]">
        <Tilt3D className="relative select-none" angle={7} scale={1.02}>
            {/* Score chip — the thing the product actually produces */}
            <div
                className="absolute -top-4 -right-3 z-10 flex items-center gap-2.5 rounded-2xl px-3 py-2 glass shadow-layered-lg"
                style={{ transform: 'translateZ(52px)' }}
            >
                <svg className="-rotate-90 shrink-0" width="32" height="32" aria-hidden="true">
                    <circle cx="16" cy="16" r="12" fill="none" strokeWidth="3.5" className="stroke-gray-200 dark:stroke-gray-700" />
                    <circle
                        cx="16" cy="16" r="12" fill="none" strokeWidth="3.5" strokeLinecap="round"
                        className="stroke-primary-400"
                        strokeDasharray="75.4" strokeDashoffset="9"
                    />
                </svg>
                <div className="leading-none">
                    <p className="text-[10px] font-semibold text-ink">{t('hero.chipScore')}</p>
                    <p className="mt-1 text-[10px] font-bold text-primary-400">88 / 100</p>
                </div>
            </div>

            <div
                className="overflow-hidden rounded-xl border shadow-layered-xl"
                style={{ borderColor: 'var(--material-border)', transform: 'translateZ(14px)' }}
            >
                <CvPreviewArt className="block w-full h-auto" />
            </div>

            {/* Gap chip — the other half of the story */}
            <div
                className="absolute -bottom-4 -left-3 z-10 flex items-center gap-2 rounded-2xl px-3 py-2 glass shadow-layered-lg"
                style={{ transform: 'translateZ(60px)' }}
            >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/15 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                    3
                </span>
                <p className="text-[10px] font-semibold leading-none text-ink">{t('hero.chipGaps')}</p>
            </div>
        </Tilt3D>
    </div>
);

const STEP_KEYS = ['stepScan', 'stepGaps', 'stepRewrite'];

const page = () => {
    const fileInputRef = useRef(null);
    const uploadAbortRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [stage, setStage] = useState('read');
    const [fileName, setFileName] = useState('');
    const [uploadError, setUploadError] = useState('');
    const dispatch = useDispatch();
    const router = useRouter();
    const t = useTranslation();

    // Route transitions are tracked so a click always produces feedback. Without
    // this the first click on a not-yet-loaded route did nothing visible, people
    // clicked elsewhere, and the original navigation landed later out of nowhere.
    const [isRouting, startRouting] = useTransition();
    const go = href => startRouting(() => router.push(href));

    const busy = loading || isRouting;

    const handleUpload = async e => {
        const file = e.target.files[0];
        if (!file) return;
        if (busy) return;

        const controller = new AbortController();
        uploadAbortRef.current = controller;

        setFileName(file.name);
        setStage('read');
        setUploadError('');
        setLoading(true);
        try {
            const rawText = await extractTextFromPDF(file, controller.signal);
            const text = cleanPdfText(rawText);

            if (!text || text.trim().length === 0) {
                throw new Error(t('hero.uploadNoText'));
            }

            // Conventionally formatted CVs can be read outright. Skipping the model
            // saves the wait, the cost, and a slot in the parse rate limit. The local
            // parser gets rawText, not the cleaned copy — cleanPdfText strips
            // non-ASCII, which takes the bullets and en-dashes it reads structure from.
            const local = parseResumeLocal(rawText);
            if (local.confident) {
                setStage('editor');
                dispatch(setFullResume(local.data));
                dispatch(setParseMeta({ parsedBy: 'local', sourceText: text }));
                router.push('/editor');
                return;
            }

            setStage('parse');
            const response = await fetch('/api/parse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
                signal: controller.signal,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to parse resume');
            }

            setStage('editor');
            dispatch(setFullResume(data));
            dispatch(setParseMeta({ parsedBy: 'ai', sourceText: text }));
            router.push('/editor');
        } catch (error) {
            if (error.name === 'AbortError') {
                setLoading(false);
                return;
            }
            console.error('Error uploading/parsing resume:', error);
            setUploadError(error.message);
            setLoading(false);
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
            uploadAbortRef.current = null;
        }
    };

    const cancelUpload = () => uploadAbortRef.current?.abort();

    return (
        <>
            {loading && <UploadProgress stage={stage} fileName={fileName} onCancel={cancelUpload} />}
            {isRouting && <RouteOverlay label={t('hero.opening')} />}

            <main aria-hidden={busy} className={busy ? 'pointer-events-none select-none' : ''}>
                {/* ── Hero ─────────────────────────────────────────────────── */}
                <section className="mx-auto max-w-screen-xl px-5 pb-16 pt-10 md:pt-16 2xl:max-w-screen-2xl">
                    <div className="flex flex-col-reverse items-center gap-12 lg:flex-row lg:items-center lg:justify-between lg:gap-16">
                        <div className="w-full lg:w-[54%]">
                            <p className="animate-rise text-xs font-semibold uppercase tracking-[0.16em] text-primary-400">
                                {t('hero.eyebrow')}
                            </p>

                            <h1 className="mt-5 animate-rise text-[2.1rem] font-semibold leading-[1.08] tracking-[-0.035em] text-ink [animation-delay:60ms] md:text-[3rem] 2xl:text-[3.4rem]">
                                {t('hero.title1')}
                                <br className="hidden sm:block" />{' '}
                                <span className="text-primary-400">{t('hero.title2')}</span>
                            </h1>

                            <p className="mt-6 max-w-xl animate-rise text-[0.98rem] leading-relaxed text-ink-soft [animation-delay:120ms] md:text-lg">
                                {t('hero.description')}
                            </p>

                            <div className="mt-9 flex animate-rise flex-col gap-3 [animation-delay:180ms] sm:flex-row sm:flex-wrap">
                                <button onClick={() => go('/editor')} disabled={busy} className="btn-filled sm:w-auto">
                                    <span>{t('hero.startBtn')}</span>
                                    {isRouting ? <CgSpinner className="animate-spin" /> : <IoIosRocket />}
                                </button>

                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={busy}
                                    className="btn sm:w-auto"
                                >
                                    <span>{t('hero.uploadBtn')}</span>
                                    <FaCloudUploadAlt />
                                </button>

                                <button onClick={() => go('/scoring')} disabled={busy} className="btn sm:w-auto">
                                    <FaMagnifyingGlass />
                                    <span>{t('hero.scoreMatchBtn')}</span>
                                </button>
                            </div>

                            {uploadError && (
                                <p className="mt-4 max-w-xl rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                                    {uploadError}
                                </p>
                            )}

                            <ul className="mt-7 flex animate-rise flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-soft [animation-delay:240ms]">
                                {[t('hero.fact1'), t('hero.fact2'), t('hero.fact3')].map(fact => (
                                    <li key={fact} className="flex items-center gap-1.5">
                                        <span className="h-1 w-1 rounded-full bg-primary-400" />
                                        {fact}
                                    </li>
                                ))}
                            </ul>

                            <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleUpload} />
                        </div>

                        <HeroSheet t={t} />
                    </div>
                </section>

                {/* ── How it works — genuinely ordered, so the numbers mean something ── */}
                <section className="border-y" style={{ borderColor: 'var(--hairline)' }}>
                    <div className="mx-auto max-w-screen-xl px-5 py-14 md:py-20 2xl:max-w-screen-2xl">
                        {/* Type runs on a 1.2 ratio: 12 label · 15 body · 18 title · 28 heading.
                            Title and body were previously 16/14, too close to read as two levels. */}
                        <h2 className="max-w-xl text-2xl font-semibold tracking-[-0.022em] text-ink md:text-[1.75rem] md:leading-[1.2]">
                            {t('hero.howTitle')}
                        </h2>

                        {/* Columns are separated by rules rather than padded cards, so the
                            step text shares its left edge with the heading above it. Card
                            padding pushed it 28px out of alignment. */}
                        <ol className="mt-10 grid gap-10 md:grid-cols-3 md:gap-0">
                            {STEP_KEYS.map((key, i) => (
                                <li
                                    key={key}
                                    className="md:border-l md:px-8 md:first:border-l-0 md:first:pl-0 md:last:pr-0"
                                    style={{ borderColor: 'var(--hairline)' }}
                                >
                                    {/* The numeral anchors each column, so it is sized as a marker
                                        rather than a caption — but stays under the 28px section
                                        heading, since a step label outranking it inverts the order. */}
                                    <span className="block font-mono text-2xl font-semibold leading-none tracking-[-0.04em] tabular-nums text-primary-400">
                                        {String(i + 1).padStart(2, '0')}
                                    </span>
                                    <h3 className="mt-4 text-lg font-semibold tracking-[-0.015em] text-ink">
                                        {t(`hero.${key}Title`)}
                                    </h3>
                                    <p className="mt-2.5 text-[0.9375rem] leading-[1.6] text-ink-soft">
                                        {t(`hero.${key}Body`)}
                                    </p>
                                </li>
                            ))}
                        </ol>
                    </div>
                </section>

                {/* ── Close ────────────────────────────────────────────────── */}
                <section className="mx-auto max-w-screen-xl px-5 py-16 text-center md:py-24 2xl:max-w-screen-2xl">
                    <h2 className="mx-auto max-w-xl text-2xl font-semibold tracking-[-0.025em] text-ink text-balance md:text-[2.125rem] md:leading-[1.15]">
                        {t('hero.closeTitle')}
                    </h2>
                    <p className="mx-auto mt-4 max-w-md text-[0.9375rem] leading-[1.6] text-ink-soft md:text-lg">
                        {t('hero.closeBody')}
                    </p>
                    <button onClick={() => go('/editor')} disabled={busy} className="btn-filled mx-auto mt-8">
                        <span>{t('hero.startBtn')}</span>
                        <FaArrowRight className="text-sm" />
                    </button>
                </section>
            </main>
        </>
    );
};

export default page;
