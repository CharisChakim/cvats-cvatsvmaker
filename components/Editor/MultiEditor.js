'use client';

import { useDispatch, useSelector } from 'react-redux';
import Input from '../UI/Input';
import { addNewIndex, deleteIndex, moveIndex, updateResumeValue } from '@/store/slices/resumeSlice';
import ResumeFields from '@/config/ResumeFields';
import { LuPlus } from 'react-icons/lu';
import { useState } from 'react';
import { FaArrowUp, FaPencil, FaTrash } from 'react-icons/fa6';
import { FaArrowDown } from 'react-icons/fa';
import { TbArrowsMinimize } from 'react-icons/tb';
import useTranslation, { useLocalizeField } from '@/hooks/useTranslation';

const MultiEditor = ({ tab }) => {
    const { fields } = ResumeFields[tab];
    const [selectedCard, setSelectedCard] = useState(null);
    const dispatch = useDispatch();
    const resumeData = useSelector(state => state.resume[tab]);
    const t = useTranslation();
    const localizeField = useLocalizeField(tab);

    const handleChange = (e, i) => {
        const { name, value } = e.target;
        dispatch(updateResumeValue({ tab, name, value, index: i }));
    };

    const addNew = () => {
        dispatch(addNewIndex({ tab, name: 'degree', value: 'new' }));
        setSelectedCard(resumeData.length);
    };

    const deleteCard = index => {
        dispatch(deleteIndex({ tab, index }));
        setSelectedCard(null);
    };

    return (
        <div>
            <button
                type="button"
                className="btn mb-6 ml-auto bg-gray-200/75 text-sm 2xl:text-base dark:bg-gray-600/75 active:scale-95 transition-transform duration-100"
                onClick={addNew}
            >
                <LuPlus />
                <span>{t('editor.addNew')}</span>
            </button>

            {resumeData?.length === 0 && (
                <div className="my-16">
                    <p className="text-center text-gray-500">
                        {t('editor.pleaseAdd')} {t(`tabs.${tab}`).toLowerCase()}
                    </p>
                </div>
            )}

            <div className="space-y-5">
                {resumeData.map((e, i) => (
                    <div
                        key={i}
                        className="card h-full py-3 cursor-pointer transition-all duration-200"
                        onClick={() => setSelectedCard(i)}
                    >
                        <h3 className="flex items-center justify-between gap-5">
                            <span className="mr-auto text-sm md:text-base truncate">
                                {Object.values(e)[0] || t('editor.untitled')}
                            </span>

                            <button
                                disabled={i === 0}
                                className="hover:text-primary-400 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-100"
                                onClick={_ => {
                                    _.stopPropagation();
                                    dispatch(moveIndex({ tab, index: i, dir: 'up' }));
                                }}
                            >
                                <FaArrowUp />
                            </button>

                            <button
                                disabled={i === resumeData.length - 1}
                                className="hover:text-primary-400 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-100"
                                onClick={_ => {
                                    _.stopPropagation();
                                    dispatch(moveIndex({ tab, index: i }));
                                }}
                            >
                                <FaArrowDown />
                            </button>

                            {selectedCard === i ? (
                                <button
                                    type="button"
                                    onClick={_ => {
                                        _.stopPropagation();
                                        setSelectedCard(null);
                                    }}
                                >
                                    <TbArrowsMinimize />
                                </button>
                            ) : (
                                <button type="button" className="text-primary-400">
                                    <FaPencil />
                                </button>
                            )}

                            <button
                                type="button"
                                className="text-red-400 transition-colors duration-100"
                                onClick={_ => {
                                    _.stopPropagation();
                                    deleteCard(i);
                                }}
                            >
                                <FaTrash />
                            </button>
                        </h3>

                        {selectedCard === i && (
                            <div className="mt-6 grid gap-4 md:grid-cols-2 md:gap-6 animate-fade-in">
                                {fields.map(field => {
                                    const localized = localizeField(field);
                                    const isPresent = field.presentable && resumeData[i][field.name] === 'present';

                                    if (field.presentable) {
                                        return (
                                            <div key={field.name}>
                                                <Input
                                                    {...localized}
                                                    onChange={e => handleChange(e, i)}
                                                    value={isPresent ? '' : (resumeData[i][field.name] || '')}
                                                    disabled={isPresent}
                                                />
                                                <label className="mt-1.5 flex items-center gap-1.5 cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        checked={isPresent}
                                                        onChange={e =>
                                                            handleChange({ target: { name: field.name, value: e.target.checked ? 'present' : '' } }, i)
                                                        }
                                                        className="accent-primary-500"
                                                    />
                                                    <span className="text-xs text-gray-600 dark:text-gray-400">{t('editor.present')}</span>
                                                </label>
                                            </div>
                                        );
                                    }

                                    return (
                                        <Input
                                            key={field.name}
                                            {...localized}
                                            onChange={e => handleChange(e, i)}
                                            value={resumeData[i][field.name]}
                                            aiRefineLabel={localized.aiRefine ? t('editor.aiRefine') : undefined}
                                            refiningLabel={localized.aiRefine ? t('editor.refining') : undefined}
                                            writeFirstLabel={localized.aiRefine ? t('editor.writeFirst') : undefined}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MultiEditor;
