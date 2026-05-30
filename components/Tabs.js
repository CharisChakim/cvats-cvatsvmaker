'use client';

import ResumeFields from '@/config/ResumeFields';
import Link from 'next/link';
import useTranslation from '@/hooks/useTranslation';
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
    const tabs = Object.keys(ResumeFields);
    const t = useTranslation();

    return (
        <div className="flex w-full gap-1.5 overflow-x-auto pb-2 md:gap-2">
            {tabs.map(tab => {
                const Icon = TAB_ICONS[tab];
                const isActive = activeTab === tab;
                return (
                    <Link
                        key={tab}
                        className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 md:px-4 md:py-2 2xl:text-base ${
                            isActive
                                ? 'bg-primary-400 text-black shadow-sm'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                        }`}
                        href={`/editor/?tab=${tab}`}
                    >
                        {Icon && <Icon className={`shrink-0 text-sm ${isActive ? 'opacity-90' : 'opacity-60'}`} />}
                        {t(`tabs.${tab}`)}
                    </Link>
                );
            })}
        </div>
    );
};

export default Tabs;
