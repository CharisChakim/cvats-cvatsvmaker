'use client';

import { FaWandMagicSparkles } from 'react-icons/fa6';

const BoostMenuPopup = ({ t, onClose, onSelect }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md animate-fade-in"
        onClick={onClose}>
        <div className="w-72 overflow-hidden rounded-2xl glass shadow-layered-xl animate-scale-in"
            onClick={e => e.stopPropagation()}>
            <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                <FaWandMagicSparkles className="text-violet-500 text-sm" />
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    {t('scoring.boostMenuTitle')}
                </p>
            </div>
            <button onClick={() => onSelect('safe')}
                className="w-full px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <span className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    {t('scoring.boostSafeTitle')}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                    {t('scoring.boostSafeDesc')}
                </span>
            </button>
            <div className="h-px bg-gray-100 dark:bg-gray-700" />
            <button onClick={() => onSelect('gap-advisor')}
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
);

export default BoostMenuPopup;
