'use client';

import { FaLightbulb } from 'react-icons/fa';
import { MdCheckCircle } from 'react-icons/md';

const ScoreRing = ({ score }) => {
    const radius = 52;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    const color = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';

    return (
        <div className="relative flex h-36 w-36 shrink-0 items-center justify-center">
            <svg className="absolute -rotate-90" width="140" height="140">
                <circle cx="70" cy="70" r={radius} fill="none" stroke="currentColor" strokeWidth="10" className="text-gray-200 dark:text-gray-700" />
                <circle
                    cx="70" cy="70" r={radius} fill="none"
                    stroke={color} strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={circumference} strokeDashoffset={offset}
                    style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                />
            </svg>
            <div className="text-center">
                <span className="text-3xl font-black" style={{ color }}>{score}</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">/100</span>
            </div>
        </div>
    );
};

const scoreColors = score =>
    score >= 75
        ? { badge: 'text-green-700 bg-green-100 border-green-300 dark:text-green-300 dark:bg-green-500/10 dark:border-green-500/30', bar: '#22c55e' }
        : score >= 50
        ? { badge: 'text-amber-700 bg-amber-100 border-amber-300 dark:text-amber-300 dark:bg-amber-500/10 dark:border-amber-500/30', bar: '#f59e0b' }
        : { badge: 'text-red-700 bg-red-100 border-red-300 dark:text-red-300 dark:bg-red-500/10 dark:border-red-500/30', bar: '#ef4444' };

const BreakdownCard = ({ label, score, feedback, matched, missing, matchedLabel, missingLabel }) => {
    const { badge, bar } = scoreColors(score);

    return (
        <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-sm md:text-base">{label}</span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${badge}`}>{score}/100</span>
            </div>

            <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden mb-3">
                <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${score}%`, background: bar }}
                />
            </div>

            {feedback && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{feedback}</p>
            )}

            {matched?.length > 0 && (
                <div className="mb-2">
                    <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1.5">✓ {matchedLabel}</p>
                    <div className="flex flex-wrap gap-1">
                        {matched.map((item, i) => (
                            <span key={i} className="text-xs rounded-md bg-green-100 px-2 py-0.5 text-green-700 border border-green-200 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/20">
                                {item}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {missing?.length > 0 && (
                <div>
                    <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1.5">✗ {missingLabel}</p>
                    <div className="flex flex-wrap gap-1">
                        {missing.map((item, i) => (
                            <span key={i} className="text-xs rounded-md bg-red-50 px-2 py-0.5 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20">
                                {item}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const ScoreResults = ({ results, t }) => {
    const { overallScore, breakdown, recommendations, summary } = results;

    const scoreLabel =
        overallScore >= 80 ? '🎉 Excellent match!'
        : overallScore >= 60 ? '👍 Good match'
        : overallScore >= 40 ? '⚠️ Partial match'
        : '❌ Low match';

    return (
        <div className="space-y-5 animate-fade-in">
            {/* Overall Score */}
            <div className="card flex flex-col items-center gap-5 p-6 sm:flex-row sm:gap-8">
                <ScoreRing score={overallScore} />
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('scoring.overallScore')}</p>
                    <p className="text-2xl font-black mt-1">{scoreLabel}</p>
                    {summary && (
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-lg leading-relaxed">{summary}</p>
                    )}
                </div>
            </div>

            {/* Breakdown */}
            <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {t('scoring.breakdown')}
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                    {breakdown?.skills && (
                        <BreakdownCard label={t('scoring.skillsLabel')} score={breakdown.skills.score}
                            matched={breakdown.skills.matched} missing={breakdown.skills.missing}
                            matchedLabel={t('scoring.matched')} missingLabel={t('scoring.missing')} />
                    )}
                    {breakdown?.experience && (
                        <BreakdownCard label={t('scoring.experienceLabel')} score={breakdown.experience.score}
                            feedback={breakdown.experience.feedback}
                            matchedLabel={t('scoring.matched')} missingLabel={t('scoring.missing')} />
                    )}
                    {breakdown?.education && (
                        <BreakdownCard label={t('scoring.educationLabel')} score={breakdown.education.score}
                            feedback={breakdown.education.feedback}
                            matchedLabel={t('scoring.matched')} missingLabel={t('scoring.missing')} />
                    )}
                    {breakdown?.keywords && (
                        <BreakdownCard label={t('scoring.keywordsLabel')} score={breakdown.keywords.score}
                            matched={breakdown.keywords.matched} missing={breakdown.keywords.missing}
                            matchedLabel={t('scoring.matched')} missingLabel={t('scoring.missing')} />
                    )}
                </div>
            </div>

            {/* Recommendations */}
            {Array.isArray(recommendations) && recommendations.length > 0 && (
                <div className="card p-5">
                    <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
                        <FaLightbulb className="text-amber-500 dark:text-yellow-400" />
                        {t('scoring.recommendations')}
                    </h3>
                    <ul className="space-y-2.5">
                        {(Array.isArray(recommendations) ? recommendations : []).map((rec, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                                <MdCheckCircle className="mt-0.5 shrink-0 text-primary-500 dark:text-primary-400 text-base" />
                                <span>{rec}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default ScoreResults;
