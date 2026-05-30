'use client';

import ResumeFields from '@/config/ResumeFields';
import { FaSave } from 'react-icons/fa';
import {
    FaUser,
    FaFileLines,
    FaGraduationCap,
    FaBriefcase,
    FaFolderOpen,
    FaCode,
    FaCertificate,
    FaEarthAmericas,
} from 'react-icons/fa6';
import SingleEditor from './SingleEditor';
import MultiEditor from './MultiEditor';
import { useDispatch } from 'react-redux';
import { saveResume } from '@/store/slices/resumeSlice';
import { useEffect } from 'react';
import useTranslation from '@/hooks/useTranslation';

const TAB_META = {
    contact: { icon: FaUser, descKey: 'editor.desc.contact' },
    summary: { icon: FaFileLines, descKey: 'editor.desc.summary' },
    education: { icon: FaGraduationCap, descKey: 'editor.desc.education' },
    experience: { icon: FaBriefcase, descKey: 'editor.desc.experience' },
    projects: { icon: FaFolderOpen, descKey: 'editor.desc.projects' },
    skills: { icon: FaCode, descKey: 'editor.desc.skills' },
    certificates: { icon: FaCertificate, descKey: 'editor.desc.certificates' },
    languages: { icon: FaEarthAmericas, descKey: 'editor.desc.languages' },
};

const Editor = ({ tab }) => {
    const { multiple } = ResumeFields[tab];
    const dispatch = useDispatch();
    const t = useTranslation();
    const meta = TAB_META[tab];
    const Icon = meta?.icon;

    const save = e => {
        e?.preventDefault();
        dispatch(saveResume());
    };

    useEffect(() => {
        const interval = setInterval(save, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <>
            <form onSubmit={save} className="card my-8 animate-fade-in">
                <div className="mb-6 flex items-center gap-3 border-b border-gray-100 pb-5 dark:border-white/10">
                    {Icon && (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-400/20 text-primary-600 dark:bg-primary-400/10 dark:text-primary-300">
                            <Icon className="text-base" />
                        </div>
                    )}
                    <div>
                        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                            {t(`tabs.${tab}`)}
                        </h2>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                            {t(meta?.descKey)}
                        </p>
                    </div>
                </div>

                {multiple && <MultiEditor tab={tab} />}
                {!multiple && <SingleEditor tab={tab} />}

                <button type="submit" className="btn-filled ml-auto mt-6 w-full gap-2 px-6 text-center md:w-auto active:scale-95">
                    <span>{t('editor.save')}</span> <FaSave />
                </button>
            </form>
        </>
    );
};

export default Editor;
