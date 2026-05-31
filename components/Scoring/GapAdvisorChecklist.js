'use client';

import { useState } from 'react';
import { FaCircleCheck, FaArrowLeft, FaWandMagicSparkles, FaChevronDown } from 'react-icons/fa6';

const GapAdvisorChecklist = ({ gaps, t, onApply, onBack }) => {
    const [checkedSkills, setCheckedSkills] = useState({});
    const [expAnswers, setExpAnswers] = useState({}); // { [id]: { enabled: bool, details: string } }

    const toggleSkill = (skill) => {
        setCheckedSkills(prev => ({ ...prev, [skill]: !prev[skill] }));
    };

    const toggleExp = (id) => {
        setExpAnswers(prev => ({
            ...prev,
            [id]: { enabled: !prev[id]?.enabled, details: prev[id]?.details || '' },
        }));
    };

    const setExpDetail = (id, value) => {
        setExpAnswers(prev => ({
            ...prev,
            [id]: { ...prev[id], details: value },
        }));
    };

    const hasAnyItem =
        gaps.experienceQuestions.length > 0 ||
        gaps.confirmableSkills.length > 0;

    const handleApply = () => {
        const confirmedSkills = gaps.confirmableSkills
            .filter(item => checkedSkills[item.skill])
            .map(item => item.skill);

        const hiddenExperiences = gaps.experienceQuestions
            .filter(item => expAnswers[item.id]?.enabled && expAnswers[item.id]?.details?.trim())
            .map(item => ({ area: item.area, details: expAnswers[item.id].details.trim() }));

        onApply({ confirmedSkills, hiddenExperiences });
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
            </div>

            {/* Section 1: Hidden Experience Interview */}
            {gaps.experienceQuestions.length > 0 && (
                <section className="card p-5 space-y-4">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('scoring.gapHiddenExpTitle')}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('scoring.gapHiddenExpDesc')}</p>
                    </div>
                    <div className="space-y-4">
                        {gaps.experienceQuestions.map(item => {
                            const isOn = !!expAnswers[item.id]?.enabled;
                            return (
                                <div key={item.id} className={`rounded-lg border transition-colors ${isOn ? 'border-violet-400/40 bg-violet-50/50 dark:bg-violet-500/5' : 'border-gray-200 dark:border-gray-700'}`}>
                                    <button
                                        type="button"
                                        onClick={() => toggleExp(item.id)}
                                        className="w-full flex items-start justify-between gap-3 p-3 text-left"
                                    >
                                        <div className="flex-1">
                                            <span className="text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">{item.area}</span>
                                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">{item.question}</p>
                                        </div>
                                        <div className={`shrink-0 mt-0.5 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
                                            isOn
                                                ? 'bg-violet-500 text-white'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                        }`}>
                                            {isOn ? 'Yes' : 'No'}
                                            <FaChevronDown className={`text-[10px] transition-transform ${isOn ? 'rotate-180' : ''}`} />
                                        </div>
                                    </button>
                                    {isOn && (
                                        <div className="px-3 pb-3">
                                            <textarea
                                                rows={3}
                                                value={expAnswers[item.id]?.details || ''}
                                                onChange={e => setExpDetail(item.id, e.target.value)}
                                                placeholder={item.placeholder}
                                                className="block w-full rounded-md border border-gray-300 bg-white/75 p-2 text-sm text-gray-900 shadow-sm outline-none focus:border-2 focus:border-violet-500 focus:bg-white dark:border-gray-600 dark:bg-gray-700/75 dark:text-gray-100 dark:focus:bg-gray-700 resize-none"
                                            />
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Tell us briefly — AI will incorporate this into your CV naturally.</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Section 2: Confirmable Skills */}
            {gaps.confirmableSkills.length > 0 && (
                <section className="card p-5 space-y-3">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('scoring.gapConfirmSkillsTitle')}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('scoring.gapConfirmSkillsDesc')}</p>
                    </div>
                    <div className="space-y-2">
                        {gaps.confirmableSkills.map(item => (
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
