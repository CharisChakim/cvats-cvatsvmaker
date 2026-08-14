'use client';

import { FaArrowLeft, FaWandMagicSparkles } from 'react-icons/fa6';
import { CgSpinner } from 'react-icons/cg';
import ErrorBox from './ErrorBox';
import MiniScoreCard from './MiniScoreCard';
import SideBySideDiff from './SideBySideDiff';
import Tilt3D from '@/components/UI/Tilt3D';

const ComparisonStep = ({
    t,
    results,
    boostedResults,
    boostMode,
    selectedOption,
    onSelectOption,
    error,
    showDiff,
    onToggleDiff,
    cvText,
    boostedCvText,
    applyingBoost,
    onApplyOriginal,
    onApplyBoosted,
}) => (
    <div className="animate-fade-in">
        <div className="mb-5">
            <h2 className="text-xl font-bold">{t('scoring.compareTitle')}</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('scoring.compareSubtitle')}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-violet-400/10 text-violet-600 dark:text-violet-400 font-medium border border-violet-400/20">
                <FaWandMagicSparkles className="text-[10px]" />
                {boostMode === 'gap-advisor' ? t('scoring.boostModeAggressive') : t('scoring.boostModeSafe')}
            </div>
        </div>

        {/* Info banner: no change from Gap Advisor */}
        {boostMode === 'gap-advisor' && boostedResults.overallScore === results.overallScore && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-300/50 bg-amber-50 dark:bg-amber-500/10 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-300">
                <span className="shrink-0 mt-0.5">ℹ</span>
                <span>{t('scoring.gapNoChange')}</span>
            </div>
        )}

        {/* Option A / Option B selector cards */}
        <div className="scene grid sm:grid-cols-2 gap-3">
            {/* Option A — Original */}
            <Tilt3D angle={5} glare={false}>
                <button
                    type="button"
                    onClick={() => onSelectOption('original')}
                    className={`w-full h-full text-left rounded-2xl border-2 p-4 transition-all duration-500 ease-spring active:scale-[0.98] ${
                        selectedOption === 'original'
                            ? 'border-primary-400 bg-primary-50 dark:bg-primary-400/5 shadow-layered-lg'
                            : 'border-transparent bg-white dark:bg-gray-800/50 shadow-layered hover:shadow-layered-lg'
                    }`}
                >
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                            {t('scoring.optionA')}
                        </span>
                        <span className={`h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                            selectedOption === 'original'
                                ? 'border-primary-400 bg-primary-400'
                                : 'border-gray-300 dark:border-gray-600'
                        }`}>
                            {selectedOption === 'original' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </span>
                    </div>
                    <MiniScoreCard label={t('scoring.originalCv')} results={results} compact />
                </button>
            </Tilt3D>

            {/* Option B — Boosted */}
            <Tilt3D angle={5} glare={false}>
                <button
                    type="button"
                    onClick={() => onSelectOption('boosted')}
                    className={`w-full h-full text-left rounded-2xl border-2 p-4 transition-all duration-500 ease-spring active:scale-[0.98] ${
                        selectedOption === 'boosted'
                            ? 'border-violet-400 bg-violet-50 dark:bg-violet-500/5 shadow-layered-lg'
                            : 'border-transparent bg-white dark:bg-gray-800/50 shadow-layered hover:shadow-layered-lg'
                    }`}
                >
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-violet-400 dark:text-violet-500">
                            {t('scoring.optionB')}
                        </span>
                        <span className={`h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                            selectedOption === 'boosted'
                                ? 'border-violet-400 bg-violet-400'
                                : 'border-gray-300 dark:border-gray-600'
                        }`}>
                            {selectedOption === 'boosted' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </span>
                    </div>
                    <MiniScoreCard
                        label={t('scoring.boostedCv')}
                        results={boostedResults}
                        highlight
                        delta={boostedResults.overallScore - results.overallScore}
                        compact
                    />
                </button>
            </Tilt3D>
        </div>

        {error && <div className="mt-4"><ErrorBox msg={error} /></div>}

        {/* Text diff section */}
        <div className="mt-4 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
                onClick={onToggleDiff}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
            >
                <span className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <FaWandMagicSparkles className="text-violet-500 dark:text-violet-400 text-xs" />
                    {t('scoring.viewChanges')}
                </span>
                <span className="text-xs text-gray-400">{showDiff ? '▲ Hide' : '▼ Show'}</span>
            </button>
            {showDiff && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <SideBySideDiff original={cvText} boosted={boostedCvText} />
                </div>
            )}
        </div>

        {/* Apply button */}
        <div className="mt-5">
            <button
                onClick={() => (selectedOption === 'original' ? onApplyOriginal() : onApplyBoosted())}
                disabled={applyingBoost}
                className={`w-full flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-500 ease-spring active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-layered hover:shadow-layered-lg ${
                    selectedOption === 'boosted'
                        ? 'text-white bg-violet-600 hover:bg-violet-700'
                        : 'text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
            >
                {applyingBoost
                    ? <><CgSpinner className="animate-spin" /> <span>{t('scoring.applyingBoost')}</span></>
                    : selectedOption === 'boosted'
                        ? <><FaWandMagicSparkles /> <span>{t('scoring.applyOptionB')}</span></>
                        : <><FaArrowLeft className="text-xs" /> <span>{t('scoring.applyOptionA')}</span></>
                }
            </button>
        </div>
    </div>
);

export default ComparisonStep;
