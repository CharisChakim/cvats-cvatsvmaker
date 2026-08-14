'use client';

import { useDispatch } from 'react-redux';
import { setLang } from '@/store/slices/resumeSlice';
import { useLang } from '@/hooks/useTranslation';

const LangToggle = () => {
    const dispatch = useDispatch();
    const lang = useLang();

    const toggle = () => {
        const next = lang === 'en' ? 'id' : 'en';
        dispatch(setLang(next));
    };

    return (
        <button
            onClick={toggle}
            aria-label={`Switch to ${lang === 'en' ? 'Bahasa Indonesia' : 'English'}`}
            className="flex items-center gap-1 rounded-xl bg-gray-100 px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
        >
            <span className={lang === 'en' ? 'text-primary-400' : 'text-gray-600 dark:text-gray-300'}>EN</span>
            <span className="text-gray-400 dark:text-gray-500" aria-hidden="true">/</span>
            <span className={lang === 'id' ? 'text-primary-400' : 'text-gray-600 dark:text-gray-300'}>ID</span>
        </button>
    );
};

export default LangToggle;
