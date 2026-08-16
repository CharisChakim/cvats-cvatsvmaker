'use client';

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FaWandMagicSparkles, FaBolt } from 'react-icons/fa6';
import { IoClose } from 'react-icons/io5';
import { CgSpinner } from 'react-icons/cg';
import { setFullResume, setParseMeta } from '@/store/slices/resumeSlice';
import useTranslation from '@/hooks/useTranslation';

/**
 * Shown after a CV was read by the rule-based parser instead of the model.
 *
 * The point is the escape hatch, not the bragging: a rule-based reading that is
 * quietly wrong is worse than a slow one, so the user is told which path ran and
 * given a one-click way to hand the same text to the AI.
 */
const ParseNotice = () => {
    const parsedBy = useSelector(state => state.resume.parsedBy);
    const sourceText = useSelector(state => state.resume.parseSourceText);
    const dispatch = useDispatch();
    const t = useTranslation();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    // How the CV was parsed lives only in the client store, so rendering it during
    // the server pass produces a hydration mismatch. Wait for mount instead.
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    if (!mounted || parsedBy !== 'local') return null;

    const dismiss = () => dispatch(setParseMeta({ parsedBy: null, sourceText: '' }));

    const reparse = async () => {
        if (!sourceText) return dismiss();
        setBusy(true);
        setError('');
        try {
            const res = await fetch('/api/parse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: sourceText }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || t('upload.reparseFailed'));
            dispatch(setFullResume(data));
            dispatch(setParseMeta({ parsedBy: null, sourceText: '' }));
        } catch (err) {
            setError(err.message || t('upload.reparseFailed'));
            setBusy(false);
        }
    };

    return (
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-primary-400/40 bg-primary-400/10 px-4 py-2.5 text-sm animate-fade-in">
            <FaBolt className="shrink-0 text-primary-500 dark:text-primary-300" />

            <div className="mr-auto min-w-0">
                <span className="font-medium text-ink">{t('upload.parsedLocally')}</span>{' '}
                <span className="text-ink-soft">{error || t('upload.parsedLocallyHint')}</span>
            </div>

            <button
                type="button"
                onClick={reparse}
                disabled={busy}
                className="btn shrink-0 bg-white/70 py-1.5 text-xs disabled:opacity-60 dark:bg-white/10 active:scale-95 transition-transform duration-100"
            >
                {busy ? <CgSpinner className="animate-spin" /> : <FaWandMagicSparkles />}
                <span>{busy ? t('upload.reparsing') : t('upload.reparseWithAi')}</span>
            </button>

            <button
                type="button"
                onClick={dismiss}
                aria-label={t('upload.dismiss')}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors duration-150 hover:bg-black/5 dark:hover:bg-white/10"
            >
                <IoClose />
            </button>
        </div>
    );
};

export default ParseNotice;
