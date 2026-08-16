'use client';

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FaArrowUp, FaArrowDown, FaEye, FaEyeSlash, FaTrash, FaPlus, FaTriangleExclamation } from 'react-icons/fa6';
import { IoClose } from 'react-icons/io5';
import {
    addSection,
    removeSection,
    renameSection,
    toggleSectionVisible,
    moveSection,
    isCustomSection,
} from '@/store/slices/resumeSlice';
import { isRecognizedHeading } from '@/utils/parseResumeLocal';
import useTranslation from '@/hooks/useTranslation';
import { sectionLabel } from '@/config/ResumeFields';

// Titles an ATS is known to recognise, offered first so the easy path is also the
// safe one. Harvard's own template uses "Leadership & Activities"; the rest are
// conventional headings that parsers key on.
const PRESETS = [
    { title: 'Leadership & Activities', shape: 'timeline' },
    { title: 'Organizational Experience', shape: 'timeline' },
    { title: 'Volunteer Experience', shape: 'timeline' },
    { title: 'Awards & Honors', shape: 'compact' },
    { title: 'Publications', shape: 'compact' },
    { title: 'Courses & Training', shape: 'compact' },
];

const SectionManager = ({ onClose }) => {
    const sections = useSelector(state => state.resume.sections);
    const dispatch = useDispatch();
    const t = useTranslation();
    const [draftTitle, setDraftTitle] = useState('');
    const [draftShape, setDraftShape] = useState('timeline');

    useEffect(() => {
        const onKey = e => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [onClose]);

    const add = (title, shape) => {
        const name = (title || '').trim();
        if (!name) return;
        dispatch(addSection({ title: name, shape }));
        setDraftTitle('');
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-md md:p-6 animate-fade-in"
            onClick={onClose}
        >
            <div
                className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-layered-xl dark:bg-gray-900 animate-scale-in"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-white/10">
                    <h2 className="text-sm font-semibold text-ink">{t('sections.title')}</h2>
                    <button
                        onClick={onClose}
                        aria-label={t('sections.done')}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 transition-colors duration-150 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
                    >
                        <IoClose className="text-xl" />
                    </button>
                </div>

                <div className="flex-1 overflow-auto px-5 py-4">
                    <p className="mb-4 text-xs leading-relaxed text-ink-soft">{t('sections.intro')}</p>

                    <ul className="space-y-2">
                        {sections.map((section, i) => {
                            const locked = section.id === 'contact';
                            const custom = isCustomSection(section.id);
                            const label = sectionLabel(section, t);
                            const risky = !!section.title && !isRecognizedHeading(section.title);

                            return (
                                <li
                                    key={section.id}
                                    className={`rounded-xl border px-3 py-2 transition-opacity duration-150 ${
                                        section.visible
                                            ? 'border-gray-200 dark:border-white/10'
                                            : 'border-dashed border-gray-200 opacity-55 dark:border-white/10'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="flex flex-col">
                                            <button
                                                type="button"
                                                aria-label={t('sections.moveUp')}
                                                disabled={locked || i <= 1}
                                                onClick={() => dispatch(moveSection({ id: section.id, dir: 'up' }))}
                                                className="text-[10px] text-gray-400 transition-colors duration-100 hover:text-primary-400 disabled:cursor-not-allowed disabled:opacity-30"
                                            >
                                                <FaArrowUp />
                                            </button>
                                            <button
                                                type="button"
                                                aria-label={t('sections.moveDown')}
                                                disabled={locked || i === sections.length - 1}
                                                onClick={() => dispatch(moveSection({ id: section.id, dir: 'down' }))}
                                                className="text-[10px] text-gray-400 transition-colors duration-100 hover:text-primary-400 disabled:cursor-not-allowed disabled:opacity-30"
                                            >
                                                <FaArrowDown />
                                            </button>
                                        </div>

                                        <input
                                            value={label}
                                            onChange={e =>
                                                dispatch(renameSection({ id: section.id, title: e.target.value }))
                                            }
                                            disabled={locked}
                                            aria-label={t('sections.rename')}
                                            className="mr-auto min-w-0 flex-1 truncate rounded-lg bg-transparent px-1.5 py-1 text-sm text-ink outline-none transition-colors duration-150 hover:bg-black/[0.04] focus:bg-black/[0.05] disabled:cursor-not-allowed disabled:opacity-70 dark:hover:bg-white/[0.06] dark:focus:bg-white/[0.08]"
                                        />

                                        <button
                                            type="button"
                                            aria-label={section.visible ? t('sections.hide') : t('sections.show')}
                                            disabled={locked}
                                            onClick={() => dispatch(toggleSectionVisible(section.id))}
                                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors duration-150 hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-30 dark:text-gray-400 dark:hover:bg-white/10"
                                        >
                                            {section.visible ? <FaEye /> : <FaEyeSlash />}
                                        </button>

                                        {custom && (
                                            <button
                                                type="button"
                                                aria-label={t('sections.delete')}
                                                onClick={() => dispatch(removeSection(section.id))}
                                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-red-400 transition-colors duration-150 hover:bg-red-500/10"
                                            >
                                                <FaTrash className="text-xs" />
                                            </button>
                                        )}
                                    </div>

                                    {risky && (
                                        <p className="mt-1.5 flex items-start gap-1.5 pl-6 text-[11px] leading-snug text-amber-700 dark:text-amber-400">
                                            <FaTriangleExclamation className="mt-0.5 shrink-0" />
                                            {t('sections.atsWarning')}
                                        </p>
                                    )}
                                </li>
                            );
                        })}
                    </ul>

                    <div className="mt-6 border-t border-gray-100 pt-4 dark:border-white/10">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                            {t('sections.addTitle')}
                        </p>
                        <p className="mb-3 text-xs leading-relaxed text-ink-soft">{t('sections.addHint')}</p>

                        <div className="mb-3 flex flex-wrap gap-1.5">
                            {PRESETS.map(preset => (
                                <button
                                    key={preset.title}
                                    type="button"
                                    onClick={() => add(preset.title, preset.shape)}
                                    className="rounded-full border border-gray-200 px-2.5 py-1 text-xs text-ink-soft transition-colors duration-150 hover:border-primary-400 hover:text-primary-500 active:scale-95 dark:border-white/15"
                                >
                                    + {preset.title}
                                </button>
                            ))}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <input
                                value={draftTitle}
                                onChange={e => setDraftTitle(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && add(draftTitle, draftShape)}
                                placeholder={t('sections.customPlaceholder')}
                                className="min-w-[10rem] flex-1 rounded-lg border border-gray-200 bg-transparent px-3 py-1.5 text-sm text-ink outline-none focus:border-primary-400 dark:border-white/15"
                            />
                            <div className="segmented">
                                {['timeline', 'compact'].map(shape => (
                                    <button
                                        key={shape}
                                        type="button"
                                        onClick={() => setDraftShape(shape)}
                                        data-active={draftShape === shape}
                                        className="segmented-item"
                                        title={t(`sections.shape.${shape}Hint`)}
                                    >
                                        {t(`sections.shape.${shape}`)}
                                    </button>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={() => add(draftTitle, draftShape)}
                                disabled={!draftTitle.trim()}
                                className="btn py-1.5 text-xs disabled:opacity-40 active:scale-95 transition-transform duration-100"
                            >
                                <FaPlus className="text-[10px]" />
                                <span>{t('sections.add')}</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-200 px-5 py-3 dark:border-white/10">
                    <button onClick={onClose} className="btn-filled ml-auto py-1.5 text-sm active:scale-95">
                        {t('sections.done')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SectionManager;
