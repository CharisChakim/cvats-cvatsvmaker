/** @type {import('tailwindcss').Config} */

const colors = require('tailwindcss/colors');

module.exports = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: {
                    50:  'rgb(var(--color-primary-50)  / <alpha-value>)',
                    100: 'rgb(var(--color-primary-100) / <alpha-value>)',
                    200: 'rgb(var(--color-primary-200) / <alpha-value>)',
                    300: 'rgb(var(--color-primary-300) / <alpha-value>)',
                    400: 'rgb(var(--color-primary-400) / <alpha-value>)',
                    500: 'rgb(var(--color-primary-500) / <alpha-value>)',
                    600: 'rgb(var(--color-primary-600) / <alpha-value>)',
                    700: 'rgb(var(--color-primary-700) / <alpha-value>)',
                    800: 'rgb(var(--color-primary-800) / <alpha-value>)',
                    900: 'rgb(var(--color-primary-900) / <alpha-value>)',
                },
                /* Warm neutrals. Slate's blue cast is what made the light theme
                   feel cold and glary; stone sits on the paper side of neutral. */
                gray: { ...colors.stone },
                paper: 'rgb(var(--paper) / <alpha-value>)',
                'paper-raised': 'rgb(var(--paper-raised) / <alpha-value>)',
                ink: 'rgb(var(--ink) / <alpha-value>)',
                'ink-soft': 'rgb(var(--ink-soft) / <alpha-value>)',
            },
            transitionTimingFunction: {
                spring: 'cubic-bezier(0.32, 0.72, 0, 1)',
                soft: 'cubic-bezier(0.4, 0, 0.2, 1)',
                'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
            },
            keyframes: {
                shimmer: {
                    '0%': { transform: 'translateX(0)' },
                    '100%': { transform: 'translateX(400%)' },
                },
                fadeIn: {
                    '0%': { opacity: '0', transform: 'translateY(8px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(16px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                // Depth entrance: rises toward the viewer as it fades in
                rise: {
                    '0%': { opacity: '0', transform: 'translateY(14px) scale(0.97)' },
                    '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
                },
                scaleIn: {
                    '0%': { opacity: '0', transform: 'scale(0.94)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-6px)' },
                },
            },
            animation: {
                shimmer: 'shimmer 2s linear infinite',
                'fade-in': 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
                'slide-up': 'slideUp 0.38s cubic-bezier(0.32, 0.72, 0, 1) both',
                rise: 'rise 0.42s cubic-bezier(0.32, 0.72, 0, 1) both',
                'scale-in': 'scaleIn 0.26s cubic-bezier(0.32, 0.72, 0, 1) both',
                float: 'float 6s cubic-bezier(0.4, 0, 0.2, 1) infinite',
            },
        },
    },
};
