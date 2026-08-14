'use client';

import { useEffect, useRef, useState } from 'react';
import Resume from './pdf';
import { useDispatch, useSelector } from 'react-redux';
import { setTemplate, setOnePage, setFont } from '@/store/slices/resumeSlice';
import { usePDF } from '@react-pdf/renderer';
import { Document, Page } from 'react-pdf';
import { FaDownload, FaEye, FaMagnifyingGlass } from 'react-icons/fa6';
import { IoClose } from 'react-icons/io5';
import Link from 'next/link';
import useTranslation from '@/hooks/useTranslation';
import Tilt3D from '@/components/UI/Tilt3D';
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

const PreviewModal = ({ url, onClose, t }) => {
    const containerRef = useRef(null);
    const [numPages, setNumPages] = useState(0);
    const [width, setWidth] = useState(0);

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
                <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2 dark:border-white/10">
                    <span className="text-sm text-gray-600 dark:text-gray-300">{t('preview.resumePreview')}</span>
                    <button
                        onClick={onClose}
                        aria-label="Close preview"
                        className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10 transition-colors duration-150"
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
                            className="flex flex-col items-center gap-4"
                        >
                            {Array.from({ length: numPages }, (_, i) => (
                                <Page
                                    key={i}
                                    pageNumber={i + 1}
                                    width={Math.min(width, 900)}
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

    // One effect for all three layout knobs instead of three separate ones. The
    // mount run is kept: it is what produces the first PDF, and skipping it left
    // the preview stuck on "No PDF file specified".
    useEffect(() => {
        updateInstance(document);
    }, [template, sizeMode, font]);

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

                <div className="scene">
                    <Tilt3D className="rounded-xl" angle={5}>
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
                    </Tilt3D>
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
                                <span>{t('preview.preview')}</span>
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
