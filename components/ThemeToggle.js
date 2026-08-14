'use client';

import { useEffect, useState } from 'react';
import { FaMoon, FaSun } from 'react-icons/fa';
import useTranslation from '@/hooks/useTranslation';

const ThemeToggle = () => {
    const [dark, setDark] = useState(true);
    const t = useTranslation();

    useEffect(() => {
        setDark(document.documentElement.classList.contains('dark'));
    }, []);

    const toggle = () => {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle('dark', next);
        localStorage.setItem('theme', next ? 'dark' : 'light');
    };

    return (
        <button
            onClick={toggle}
            role="switch"
            aria-checked={dark}
            aria-label={dark ? t('theme.switchToLight') : t('theme.switchToDark')}
            className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 rounded-full"
        >
            {/* Track — warm neutral, so it sits inside the paper-and-ink palette
                rather than the sky-blue/indigo pair left over from the old theme. */}
            <span
                className={`relative inline-flex h-7 w-14 shrink-0 rounded-full transition-colors duration-300 ${
                    dark ? 'bg-primary-800' : 'bg-gray-300'
                }`}
            >
                {/* Knob carries the icon: ☀️ left (light) → 🌙 right (dark) */}
                <span
                    className={`absolute top-1 flex h-5 w-5 items-center justify-center rounded-full shadow-md transition-transform duration-300 ease-spring ${
                        dark
                            ? 'translate-x-8 bg-primary-400'
                            : 'translate-x-1 bg-white'
                    }`}
                >
                    {dark
                        ? <FaMoon className="text-[11px] text-gray-900" />
                        : <FaSun className="text-[11px] text-amber-500" />
                    }
                </span>
            </span>

        </button>
    );
};

export default ThemeToggle;
