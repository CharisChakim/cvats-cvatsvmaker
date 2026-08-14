'use client';

import { useState } from 'react';
import { FaCircleCheck, FaArrowLeft, FaWandMagicSparkles, FaChevronDown } from 'react-icons/fa6';

const GapAdvisorChecklist = ({ gaps, t, onApply, onBack }) => {
    const [checkedSkills, setCheckedSkills] = useState({});
    const [expAnswers, setExpAnswers] = useState({}); // { [id]: { enabled: bool, details: string } }
    const [keywordAnswers, setKeywordAnswers] = useState({}); // { [keyword]: { enabled: bool, details: string } }
    const [checkedCerts, setCheckedCerts] = useState({});

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

    const toggleKeyword = (keyword) => {
        setKeywordAnswers(prev => ({
            ...prev,
            [keyword]: { enabled: !prev[keyword]?.enabled, details: prev[keyword]?.details || '' },
        }));
    };

    const setKeywordDetail = (keyword, value) => {
        setKeywordAnswers(prev => ({
            ...prev,
            [keyword]: { ...prev[keyword], details: value },
        }));
    };

    const toggleCert = (cert) => {
        setCheckedCerts(prev => ({ ...prev, [cert]: !prev[cert] }));
    };

    const keywordGaps = gaps.keywordGaps || [];
    const certificationGaps = gaps.certificationGaps || [];

    const hasAnyItem =
        gaps.experienceQuestions.length > 0 ||
        gaps.confirmableSkills.length > 0 ||
        keywordGaps.length > 0 ||
        certificationGaps.length > 0;

    const handleApply = () => {
        const confirmedSkills = gaps.confirmableSkills
            .filter(item => checkedSkills[item.skill])
            .map(item => item.skill);

        const hiddenExperiences = gaps.experienceQuestions
            .filter(item => expAnswers[item.id]?.enabled && expAnswers[item.id]?.details?.trim())
            .map(item => ({ area: item.area, details: expAnswers[item.id].details.trim() }));

        const confirmedKeywords = keywordGaps
            .filter(item => keywordAnswers[item.keyword]?.enabled && keywordAnswers[item.keyword]?.details?.trim())
            .map(item => ({ keyword: item.keyword, details: keywordAnswers[item.keyword].details.trim() }));

        const confirmedCerts = certificationGaps
            .filter(item => checkedCerts[item.cert])
            .map(item => item.cert);

        onApply({ confirmedSkills, hiddenExperiences, confirmedKeywords, confirmedCerts });
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
                                <div key={item.id} className={`rounded-xl border transition-colors ${isOn ? 'border-violet-400/40 bg-violet-50/50 dark:bg-violet-500/5' : 'border-gray-200 dark:border-gray-700'}`}>
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
                                                className="block w-full rounded-xl border border-black/10 bg-paper-raised p-2 text-sm text-gray-900 outline-none transition-all duration-300 ease-spring focus:border-violet-500 focus:ring-4 focus:ring-violet-400/25 dark:border-white/10 dark:bg-white/[0.06] dark:text-gray-100 resize-none"
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

            {/* Section 3: Keyword Gaps */}
            {keywordGaps.length > 0 && (
                <section className="card p-5 space-y-4">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('scoring.gapKeywordsTitle')}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('scoring.gapKeywordsDesc')}</p>
                    </div>
                    <div className="space-y-4">
                        {keywordGaps.map(item => {
                            const isOn = !!keywordAnswers[item.keyword]?.enabled;
                            return (
                                <div key={item.keyword} className={`rounded-xl border transition-colors ${isOn ? 'border-blue-400/40 bg-blue-50/50 dark:bg-blue-500/5' : 'border-gray-200 dark:border-gray-700'}`}>
                                    <button
                                        type="button"
                                        onClick={() => toggleKeyword(item.keyword)}
                                        className="w-full flex items-start justify-between gap-3 p-3 text-left"
                                    >
                                        <div className="flex-1">
                                            <span className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">{item.keyword}</span>
                                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">{item.question}</p>
                                        </div>
                                        <div className={`shrink-0 mt-0.5 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
                                            isOn
                                                ? 'bg-blue-500 text-white'
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
                                                value={keywordAnswers[item.keyword]?.details || ''}
                                                onChange={e => setKeywordDetail(item.keyword, e.target.value)}
                                                placeholder={item.placeholder}
                                                className="block w-full rounded-xl border border-black/10 bg-paper-raised p-2 text-sm text-gray-900 shadow-sm outline-none focus:border-2 focus:border-blue-500 focus:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:text-gray-100 resize-none"
                                            />
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Tell us briefly — AI will weave this terminology into your CV naturally.</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Section 4: Certification Gaps */}
            {certificationGaps.length > 0 && (
                <section className="card p-5 space-y-3">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('scoring.gapCertsTitle')}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('scoring.gapCertsDesc')}</p>
                    </div>
                    <div className="space-y-2">
                        {certificationGaps.map(item => (
                            <label key={item.cert} className="flex items-start gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={!!checkedCerts[item.cert]}
                                    onChange={() => toggleCert(item.cert)}
                                    className="mt-0.5 h-4 w-4 rounded accent-violet-500 cursor-pointer shrink-0"
                                />
                                <div>
                                    <span className={`text-sm font-medium transition-colors ${checkedCerts[item.cert] ? 'text-violet-600 dark:text-violet-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                        {item.cert}
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
