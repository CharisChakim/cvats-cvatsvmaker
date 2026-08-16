'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import useTranslation from '@/hooks/useTranslation';
import { sectionLabel } from '@/config/ResumeFields';
import SectionManager from './Editor/SectionManager';
import {
    FaUser,
    FaFileLines,
    FaGraduationCap,
    FaBriefcase,
    FaFolderOpen,
    FaCode,
    FaCertificate,
    FaEarthAmericas,
    FaLayerGroup,
    FaSliders,
} from 'react-icons/fa6';

const TAB_ICONS = {
    contact: FaUser,
    summary: FaFileLines,
    education: FaGraduationCap,
    experience: FaBriefcase,
    projects: FaFolderOpen,
    skills: FaCode,
    certificates: FaCertificate,
    languages: FaEarthAmericas,
};

const Tabs = ({ activeTab }) => {
    const sections = useSelector(state => state.resume.sections);
    const t = useTranslation();
    const [managing, setManaging] = useState(false);

    return (
        <>
            <div className="flex w-full items-center gap-1.5 overflow-x-auto pb-2 md:gap-2">
                {sections
                    .filter(section => section.visible)
                    .map(section => {
                        const Icon = TAB_ICONS[section.id] || FaLayerGroup;
                        const isActive = activeTab === section.id;
                        return (
                            <Link
                                key={section.id}
                                className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-all duration-500 ease-spring active:scale-95 md:px-4 md:py-2 2xl:text-base ${
                                    isActive
                                        ? 'bg-primary-500 text-white shadow-layered dark:bg-primary-400 dark:text-gray-900'
                                        : 'bg-black/[0.04] text-gray-600 hover:bg-black/[0.07] dark:bg-white/[0.06] dark:text-gray-300 dark:hover:bg-white/[0.11]'
                                }`}
                                href={`/editor/?tab=${section.id}`}
                            >
                                <Icon className={`shrink-0 text-sm ${isActive ? 'opacity-90' : 'opacity-60'}`} />
                                {sectionLabel(section, t)}
                            </Link>
                        );
                    })}

                <button
                    type="button"
                    onClick={() => setManaging(true)}
                    className="ml-auto flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-500 transition-colors duration-150 hover:border-primary-400 hover:text-primary-500 active:scale-95 dark:border-white/15 dark:text-gray-400 dark:hover:border-primary-400 md:px-4"
                >
                    <FaSliders className="shrink-0 text-xs" />
                    {t('sections.manage')}
                </button>
            </div>

            {managing && <SectionManager onClose={() => setManaging(false)} />}
        </>
    );
};

export default Tabs;
