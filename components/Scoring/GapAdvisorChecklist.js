'use client';

import { useState } from 'react';
import { FaCircleCheck, FaArrowLeft, FaWandMagicSparkles } from 'react-icons/fa6';

const GapAdvisorChecklist = ({ gaps, t, onApply, onBack }) => {
    const [checkedSkills, setCheckedSkills] = useState({});
    const [metricValues, setMetricValues] = useState({});

    const toggleSkill = (skill) => {
        setCheckedSkills(prev => ({ ...prev, [skill]: !prev[skill] }));
    };

    const setMetric = (id, value) => {
        setMetricValues(prev => ({ ...prev, [id]: value }));
    };

    const hasAnyItem =
        gaps.missingSkills.length > 0 ||
        gaps.underrepresentedSkills.length > 0 ||
        gaps.metricOpportunities.length > 0;

    const handleApply = () => {
        const confirmedSkills = gaps.missingSkills
            .filter(item => checkedSkills[item.skill])
            .map(item => item.skill);

        const confirmedMetrics = gaps.metricOpportunities
            .filter(item => metricValues[item.id]?.trim())
            .map(item => ({ bullet: item.bullet, value: metricValues[item.id].trim() }));

        onApply({
            confirmedSkills,
            underrepresentedSkills: gaps.underrepresentedSkills.map(i => i.skill),
            confirmedMetrics,
        });
    };

    if (!hasAnyItem) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-6 animate-fade-in">
                <FaCircleCheck className="text-5xl text-green-500" />
                <p className="text-base font-semibold text-center max-w-xs">{t('scoring.gapNothingFound')}</p>
                <button onClick={onBack} className="btn btn-secondary">
                    {t('scoring.gapBackBtn')}
                </button>
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-6 max-w-2xl mx-auto">
            <div>
                <h2 className="text-xl font-bold">{t('scoring.gapChecklistTitle')}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('scoring.gapChecklistSubtitle')}</p>
                <div className="mt-2 flex items-start gap-2 rounded-lg border border-violet-300/40 bg-violet-50 dark:bg-violet-500/5 px-3 py-2 text-xs text-violet-700 dark:text-violet-300">
                    <span className="shrink-0 mt-0.5">✦</span>
                    <span>Confirmed items will be added to your CV. Your existing content will also be rephrased to better match the job keywords — no new facts added.</span>
                </div>
            </div>

            {gaps.missingSkills.length > 0 && (
                <section className="card p-5 space-y-3">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('scoring.gapMissingSkillsTitle')}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('scoring.gapMissingSkillsDesc')}</p>
                    <div className="space-y-2">
                        {gaps.missingSkills.map(item => (
                            <label key={item.skill} className="flex items-start gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={!!checkedSkills[item.skill]}
                                    onChange={() => toggleSkill(item.skill)}
                                    className="mt-0.5 h-4 w-4 rounded accent-violet-500 cursor-pointer shrink-0"
                                />
                                <div>
                                    <span className={`text-sm font-medium transition-colors ${checkedSkills[item.skill] ? 'text-violet-600 dark:text-violet-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                        {item.skill}
                                    </span>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.reason}</p>
                                </div>
                            </label>
                        ))}
                    </div>
                </section>
            )}

            {gaps.underrepresentedSkills.length > 0 && (
                <section className="card p-5 space-y-2">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Skills to Strengthen</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">These will be showcased more prominently in your experience bullets.</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                        {gaps.underrepresentedSkills.map(item => (
                            <span key={item.skill} className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-400/20">
                                <FaCircleCheck className="text-violet-500" />
                                {item.skill}
                            </span>
                        ))}
                    </div>
                </section>
            )}

            {gaps.metricOpportunities.length > 0 && (
                <section className="card p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('scoring.gapMetricsTitle')}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('scoring.gapMetricsDesc')}</p>
                    <div className="space-y-4">
                        {gaps.metricOpportunities.map(item => (
                            <div key={item.id} className="space-y-1.5">
                                <p className="text-xs text-gray-500 dark:text-gray-400 italic truncate">"{item.bullet}"</p>
                                <p className="text-sm text-gray-700 dark:text-gray-300">{item.question}</p>
                                <input
                                    type="text"
                                    value={metricValues[item.id] || ''}
                                    onChange={e => setMetric(item.id, e.target.value)}
                                    placeholder={item.placeholder}
                                    className="block w-full rounded-md border border-gray-300 bg-white/75 p-2 text-sm text-gray-900 shadow-md outline-none focus:border-2 focus:border-violet-500 focus:bg-white dark:border-gray-600 dark:bg-gray-700/75 dark:text-gray-100 dark:focus:bg-gray-700"
                                />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <div className="flex gap-3 pb-4">
                <button onClick={onBack} className="btn btn-secondary flex items-center gap-2">
                    <FaArrowLeft className="text-xs" />
                    {t('scoring.gapBackBtn')}
                </button>
                <button onClick={handleApply} className="btn btn-primary flex items-center gap-2 flex-1 justify-center">
                    <FaWandMagicSparkles />
                    {t('scoring.gapApplyBtn')}
                </button>
            </div>
        </div>
    );
};

export default GapAdvisorChecklist;
