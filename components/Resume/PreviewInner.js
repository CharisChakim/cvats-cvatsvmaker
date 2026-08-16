'use client';

import { useEffect, useRef, useState } from 'react';
import Resume from './pdf';
import { useDispatch, useSelector } from 'react-redux';
import { setTemplate, setOnePage, setFont } from '@/store/slices/resumeSlice';
import { usePDF } from '@react-pdf/renderer';
import { Document, Page } from 'react-pdf';
import { FaDownload, FaEye, FaMagnifyingGlass, FaMinus, FaPlus } from 'react-icons/fa6';
import { IoClose } from 'react-icons/io5';
import Link from 'next/link';
import useTranslation from '@/hooks/useTranslation';
import { CV_FONTS } from './fonts';
import '@/utils/extractTextFromPdf';

const Loader = () => (
    <div className="flex min-h-96 w-full items-center justify-center">
        <div className="space-y-3 w-full px-4">
            <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-600" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-600" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-gray-600" />
            <div className="mt-4 h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-600" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-gray-200 dark:bg-gray-600" />
        </div>
    </div>
);

const TEMPLATES = [
    { id: 'classic', label: 'Classic' },
    { id: 'modern', label: 'Modern' },
];

// The modal is the "look closely" view, so it opens magnified rather than fitted —
// 1 is fit-to-width, and the default sits above it. Fit stays reachable, otherwise
// a narrow screen traps you in horizontal scrolling with no way back.
const ZOOM_FIT = 1;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;
const ZOOM_DEFAULT = 1.35;

const PreviewModal = ({ url, onClose, t }) => {
    const containerRef = useRef(null);
    const [numPages, setNumPages] = useState(0);
    const [width, setWidth] = useState(0);
    const [zoom, setZoom] = useState(ZOOM_DEFAULT);

    const nudgeZoom = delta =>
        setZoom(z => Math.min(ZOOM_MAX, Math.max(ZOOM_FIT, Math.round((z + delta) * 100) / 100)));

    useEffect(() => {
        const onKey = e => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const measure = () => {
            const w = containerRef.current?.clientWidth ?? 0;
            setWidth(Math.max(0, w - 32));
        };
        measure();
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
        if (ro && containerRef.current) ro.observe(containerRef.current);
        window.addEventListener('resize', measure);

        return () => {
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('resize', measure);
            ro?.disconnect();
            document.body.style.overflow = prev;
        };
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 md:p-6 backdrop-blur-md animate-fade-in"
            onClick={onClose}
        >
            <div
                className="relative flex h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-layered-xl dark:bg-gray-900 animate-scale-in"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-2 dark:border-white/10">
                    <span className="truncate text-sm text-gray-600 dark:text-gray-300">
                        {t('preview.resumePreview')}
                    </span>

                    <div className="ml-auto flex items-center gap-1">
                        <button
                            onClick={() => nudgeZoom(-ZOOM_STEP)}
                            disabled={zoom <= ZOOM_FIT}
                            aria-label={t('preview.zoomOut')}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition-colors duration-150 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-300 dark:hover:bg-white/10"
                        >
                            <FaMinus className="text-xs" />
                        </button>
                        <span className="w-11 text-center text-xs tabular-nums text-gray-500 dark:text-gray-400">
                            {Math.round(zoom * 100)}%
                        </span>
                        <button
                            onClick={() => nudgeZoom(ZOOM_STEP)}
                            disabled={zoom >= ZOOM_MAX}
                            aria-label={t('preview.zoomIn')}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition-colors duration-150 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-300 dark:hover:bg-white/10"
                        >
                            <FaPlus className="text-xs" />
                        </button>
                        <button
                            onClick={() => setZoom(ZOOM_FIT)}
                            disabled={zoom === ZOOM_FIT}
                            className="ml-1 rounded-full px-2.5 py-1 text-xs text-gray-600 transition-colors duration-150 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-300 dark:hover:bg-white/10"
                        >
                            {t('preview.fit')}
                        </button>
                    </div>

                    <button
                        onClick={onClose}
                        aria-label="Close preview"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10 transition-colors duration-150"
                    >
                        <IoClose className="text-xl" />
                    </button>
                </div>

                <div ref={containerRef} className="flex-1 overflow-auto bg-gray-100 px-4 py-4 dark:bg-gray-800">
                    {width > 0 && (
                        <Document
                            file={url}
                            loading={<Loader />}
                            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                            // w-max sizes the box to the zoomed page, and the auto margins
                            // centre it only while there is room to spare — they collapse to
                            // zero once zoomed past the container, so scrolling still reaches
                            // the left edge. Flex centring would clip it instead.
                            className="mx-auto flex w-max flex-col items-center gap-4"
                        >
                            {Array.from({ length: numPages }, (_, i) => (
                                <Page
                                    key={i}
                                    pageNumber={i + 1}
                                    width={Math.round(Math.min(width, 900) * zoom)}
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                    className="shadow-xl"
                                />
                            ))}
                        </Document>
                    )}
                </div>
            </div>
        </div>
    );
};

const Preview = () => {
    const parentRef = useRef(null);
    const dispatch = useDispatch();
    const resumeData = useSelector(state => state.resume);
    const template = resumeData.template || 'classic';
    const sizeMode = resumeData.onePage === 'compact' || resumeData.onePage === 'onepage' ? resumeData.onePage : 'normal';
    const font = resumeData.font || 'Carlito';
    const document = <Resume data={resumeData} />;
    const [instance, updateInstance] = usePDF({ document });
    const [modalOpen, setModalOpen] = useState(false);
    const [mainNumPages, setMainNumPages] = useState(0);
    const [containerWidth, setContainerWidth] = useState(0);
    const t = useTranslation();

    useEffect(() => {
        const el = parentRef.current;
        if (!el) return;
        setContainerWidth(el.clientWidth);
        const ro = new ResizeObserver(([entry]) => {
            setContainerWidth(entry.contentRect.width);
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Section order and visibility are layout, like the template and size knobs, so
    // they rebuild immediately. Renames are deliberately excluded: they are text, and
    // rebuilding the PDF on every keystroke of a heading is exactly the kind of
    // re-render this component is careful to avoid — they land on save with everything
    // else typed.
    const sectionLayout = (resumeData.sections || []).map(s => `${s.id}:${s.visible ? 1 : 0}`).join('|');

    // One effect for all the layout knobs instead of one each. The mount run is kept:
    // it is what produces the first PDF, and skipping it left the preview stuck on
    // "No PDF file specified".
    useEffect(() => {
        updateInstance(document);
    }, [template, sizeMode, font, sectionLayout]);

    // Only re-render once edits are committed — `saved` also flips to false on every
    // keystroke, which must not trigger a PDF rebuild.
    useEffect(() => {
        if (resumeData.saved) updateInstance(document);
    }, [resumeData.saved]);

    return (
        <>
            <div ref={parentRef} className="relative w-full md:w-[24rem] 2xl:w-[28rem]">
                <div className="mb-2.5 flex flex-wrap items-center gap-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{t('preview.template')}</span>
                    <div className="segmented">
                        {TEMPLATES.map(tmpl => (
                            <button
                                key={tmpl.id}
                                onClick={() => dispatch(setTemplate(tmpl.id))}
                                data-active={template === tmpl.id}
                                className="segmented-item"
                            >
                                {tmpl.label}
                            </button>
                        ))}
                    </div>
                </div>

                <p className="mb-3 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                    {t(`preview.templateNote.${template}`)}
                </p>

                <div className="mb-2.5 flex flex-wrap items-center gap-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{t('preview.size')}</span>
                    <div className="segmented">
                        {[
                            { id: 'normal', labelKey: 'preview.normal' },
                            { id: 'compact', labelKey: 'preview.compact' },
                            { id: 'onepage', labelKey: 'preview.onepage' },
                        ].map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => dispatch(setOnePage(opt.id))}
                                data-active={sizeMode === opt.id}
                                className="segmented-item"
                            >
                                {t(opt.labelKey)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{t('preview.font')}</span>
                    <div className="segmented">
                        {CV_FONTS.map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => dispatch(setFont(opt.id))}
                                data-active={font === opt.id}
                                className="segmented-item"
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                <span className="mb-1.5 block text-sm text-gray-500 dark:text-gray-400">
                    {t('preview.quickPreview')}
                </span>

                {/* Deliberately static. This sheet sits beside the form and is hovered
                    constantly while editing, so a tilt that tracks the cursor reads as
                    the page never settling. Full Preview is where you look closely. */}
                <div
                    className="overflow-hidden rounded-xl shadow-layered-lg"
                    style={{ aspectRatio: '210 / 297' }}
                >
                    {instance.loading || containerWidth === 0 ? (
                        <Loader />
                    ) : (
                        <Document
                            loading={<Loader />}
                            file={instance.url}
                            onLoadSuccess={({ numPages }) => setMainNumPages(numPages)}
                        >
                            <Page
                                pageNumber={1}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                                loading={<Loader />}
                                width={containerWidth}
                            />
                        </Document>
                    )}
                </div>

                {!instance.loading && sizeMode === 'onepage' && mainNumPages > 1 && (
                    <div className="mt-3 rounded-md border border-amber-400/60 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                        {typeof t('preview.pageWarning') === 'function'
                            ? t('preview.pageWarning')(mainNumPages)
                            : t('preview.pageWarning')}
                    </div>
                )}

                {!instance.loading && (
                    <div className="mt-4 flex flex-col gap-3">
                        <div className="flex gap-4">
                            <button
                                onClick={() => setModalOpen(true)}
                                className="btn flex-1 text-sm active:scale-95 transition-transform duration-100"
                            >
                                <span>{t('preview.fullPreview')}</span>
                                <FaEye />
                            </button>
                            <a
                                href={instance.url}
                                download={`${resumeData.contact?.name || 'resume'}.pdf`}
                                className="btn flex-1 text-sm active:scale-95 transition-transform duration-100"
                            >
                                <span>{t('preview.download')}</span>
                                <FaDownload />
                            </a>
                        </div>
                        {(() => {
                            const ready = !!(
                                resumeData.contact?.name &&
                                resumeData.education?.length > 0 &&
                                resumeData.experience?.length > 0 &&
                                resumeData.skills?.items?.length > 0
                            );
                            return ready ? (
                                <Link
                                    href="/scoring"
                                    className="btn w-full text-sm active:scale-95 transition-transform duration-100"
                                >
                                    <FaMagnifyingGlass />
                                    <span>{t('hero.scoreMatchBtn')}</span>
                                </Link>
                            ) : (
                                <button
                                    disabled
                                    title="Fill in Contact, Education, Experience and Skills first"
                                    className="btn w-full text-sm opacity-40 cursor-not-allowed"
                                >
                                    <FaMagnifyingGlass />
                                    <span>{t('hero.scoreMatchBtn')}</span>
                                </button>
                            );
                        })()}
                    </div>
                )}
            </div>

            {modalOpen && instance.url && (
                <PreviewModal url={instance.url} onClose={() => setModalOpen(false)} t={t} />
            )}
        </>
    );
};

export default Preview;
