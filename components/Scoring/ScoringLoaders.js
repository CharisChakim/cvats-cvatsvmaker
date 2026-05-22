'use client';

import { FaMagnifyingGlass, FaWandMagicSparkles, FaFileLines, FaBriefcase, FaListCheck, FaChartSimple, FaCircleCheck, FaLightbulb } from 'react-icons/fa6';
import StepTimeline from './StepTimeline';

export const SCORE_STEPS = [
    { icon: FaFileLines,         key: 'scoring.loadStep1', delay: 1800 },
    { icon: FaBriefcase,         key: 'scoring.loadStep2', delay: 1800 },
    { icon: FaListCheck,         key: 'scoring.loadStep3', delay: 2600 },
    { icon: FaChartSimple,       key: 'scoring.loadStep4', delay: 2600 },
    { icon: FaWandMagicSparkles, key: 'scoring.loadStep5', delay: null  },
];

export const BOOST_STEPS = [
    { icon: FaBriefcase,         key: 'scoring.boostStep1', delay: 2000 },
    { icon: FaListCheck,         key: 'scoring.boostStep2', delay: 2500 },
    { icon: FaFileLines,         key: 'scoring.boostStep3', delay: 5000 },
    { icon: FaChartSimple,       key: 'scoring.boostStep4', delay: 3000 },
    { icon: FaCircleCheck,       key: 'scoring.boostStep5', delay: null  },
];

export const GAP_STEPS = [
    { icon: FaBriefcase,   key: 'scoring.gapStep1', delay: 1500 },
    { icon: FaListCheck,   key: 'scoring.gapStep2', delay: 2000 },
    { icon: FaFileLines,   key: 'scoring.gapStep3', delay: 2000 },
    { icon: FaChartSimple, key: 'scoring.gapStep4', delay: 2500 },
    { icon: FaLightbulb,   key: 'scoring.gapStep5', delay: null  },
];

export const GapAdvisorLoader = ({ t }) => (
    <div className="flex flex-col items-center justify-center py-14 gap-8 animate-fade-in">
        <div className="relative h-16 w-16 shrink-0">
            <div className="absolute inset-0 rounded-full border-4 border-amber-400/20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-amber-400 animate-spin" />
            <FaLightbulb className="absolute inset-0 m-auto text-2xl text-amber-400" />
        </div>
        <p className="text-base font-semibold tracking-wide">{t('scoring.gapAnalyzingTitle')}</p>
        <StepTimeline steps={GAP_STEPS} t={t}
            accentBg="bg-amber-400" accentRing="ring-amber-400/20" accentText="text-amber-600 dark:text-amber-400" />
    </div>
);

export const ScoringLoader = ({ t }) => (
    <div className="flex flex-col items-center justify-center py-14 gap-8 animate-fade-in">
        <div className="relative h-16 w-16 shrink-0">
            <div className="absolute inset-0 rounded-full border-4 border-primary-400/20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary-400 animate-spin" />
            <FaMagnifyingGlass className="absolute inset-0 m-auto text-2xl text-primary-400" />
        </div>
        <p className="text-base font-semibold tracking-wide">{t('scoring.scoring')}</p>
        <StepTimeline steps={SCORE_STEPS} t={t}
            accentBg="bg-primary-400" accentRing="ring-primary-400/20" accentText="text-primary-500 dark:text-primary-400" />
    </div>
);

export const BoostLoader = ({ t, mode }) => (
    <div className="flex flex-col items-center justify-center py-14 gap-8 animate-fade-in">
        <div className="relative h-16 w-16 shrink-0">
            <div className="absolute inset-0 rounded-full border-4 border-violet-400/20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-violet-400 animate-spin" />
            <FaWandMagicSparkles className="absolute inset-0 m-auto text-2xl text-violet-400" />
        </div>
        <div className="text-center">
            <p className="text-base font-semibold tracking-wide">{t('scoring.boostingTitle')}</p>
            <span className="mt-1.5 inline-block text-xs px-2.5 py-0.5 rounded-full bg-violet-400/10 text-violet-600 dark:text-violet-400 font-medium border border-violet-400/20">
                {mode === 'gap-advisor' ? t('scoring.boostModeAggressive') : t('scoring.boostModeSafe')}
            </span>
        </div>
        <StepTimeline steps={BOOST_STEPS} t={t}
            accentBg="bg-violet-500" accentRing="ring-violet-400/20" accentText="text-violet-600 dark:text-violet-400" />
    </div>
);
