'use client';

import { useEffect, useState } from 'react';
import { FaCheckCircle, FaCircleNotch } from 'react-icons/fa';
import { FiFileText, FiCpu, FiEdit3 } from 'react-icons/fi';
import useTranslation from '@/hooks/useTranslation';

const STAGE_INDEX = { read: 0, parse: 1, editor: 2 };
const STAGE_TARGETS = [25, 90, 100];

const UploadProgress = ({ stage, fileName }) => {
    const t = useTranslation();
    const stageIdx = STAGE_INDEX[stage] ?? 0;
    const target = STAGE_TARGETS[stageIdx];
    const [progress, setProgress] = useState(0);

    const STEPS = [
        { id: 'read', label: t('upload.readingPdf'), Icon: FiFileText },
        { id: 'parse', label: t('upload.parsingAi'), Icon: FiCpu },
        { id: 'editor', label: t('upload.openingEditor'), Icon: FiEdit3 },
    ];

    useEffect(() => {
        let raf;
        const tick = () => {
            setProgress(prev => {
                if (prev >= target - 0.4) return prev;
                const delta = Math.max(0.15, (target - prev) * 0.035);
                return prev + delta;
            });
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [target]);

    const pct = Math.min(100, progress);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
            role="status"
            aria-live="polite"
        >
            <div className="relative w-[92%] max-w-md overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900/95 to-gray-800/95 p-7 shadow-2xl">
                <div className="pointer-events-none absolute -left-16 -top-16 h-44 w-44 rounded-full bg-primary-400/30 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-16 -right-16 h-44 w-44 rounded-full bg-blue-500/25 blur-3xl" />

                <div className="relative">
                    <div className="flex items-center gap-3">
                        <span className="relative flex h-3 w-3">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-75" />
                            <span className="relative inline-flex h-3 w-3 rounded-full bg-primary-400" />
                        </span>
                        <h3 className="text-lg font-semibold text-white">{t('upload.processing')}</h3>
                    </div>
                    {fileName && (
                        <p className="mt-1 truncate text-xs text-gray-400" title={fileName}>
                            {fileName}
                        </p>
                    )}

                    <div className="relative mt-5 h-2 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-primary-400 via-emerald-400 to-blue-400 shadow-[0_0_12px_rgba(74,222,128,0.6)] transition-[width] duration-200 ease-out"
                            style={{ width: `${pct}%` }}
                        />
                        <div
                            className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent"
                            aria-hidden
                        />
                    </div>
                    <p className="mt-2 text-right text-xs tabular-nums text-gray-300">{Math.floor(pct)}%</p>

                    <ul className="mt-5 space-y-2">
                        {STEPS.map((step, i) => {
                            const status = i < stageIdx ? 'done' : i === stageIdx ? 'active' : 'pending';
                            const { Icon } = step;
                            return (
                                <li
                                    key={step.id}
                                    className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors duration-300 ${
                                        status === 'active'
                                            ? 'bg-primary-400/10 text-white'
                                            : status === 'done'
                                            ? 'text-gray-400'
                                            : 'text-gray-500'
                                    }`}
                                >
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center">
                                        {status === 'done' ? (
                                            <FaCheckCircle className="text-emerald-400" />
                                        ) : status === 'active' ? (
                                            <FaCircleNotch className="animate-spin text-primary-400" />
                                        ) : (
                                            <Icon className="text-gray-500" />
                                        )}
                                    </span>
                                    <span className="flex-1">{step.label}</span>
                                    {status === 'active' && (
                                        <span className="flex gap-0.5">
                                            <span className="h-1 w-1 animate-pulse rounded-full bg-primary-400 [animation-delay:0ms]" />
                                            <span className="h-1 w-1 animate-pulse rounded-full bg-primary-400 [animation-delay:200ms]" />
                                            <span className="h-1 w-1 animate-pulse rounded-full bg-primary-400 [animation-delay:400ms]" />
                                        </span>
                                    )}
                                </li>
                            );
                        })}
                    </ul>

                    <p className="mt-5 text-center text-[11px] text-gray-500">{t('upload.dontClose')}</p>
                </div>
            </div>
        </div>
    );
};

export default UploadProgress;
