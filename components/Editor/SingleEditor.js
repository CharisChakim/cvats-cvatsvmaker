'use client';

import { useDispatch, useSelector } from 'react-redux';
import Input from '../UI/Input';
import { updateResumeValue } from '@/store/slices/resumeSlice';
import ResumeFields from '@/config/ResumeFields';
import useTranslation, { useLocalizeField } from '@/hooks/useTranslation';

const CONTACT_PERSONAL = ['name', 'title', 'email', 'phone', 'address'];
const CONTACT_SOCIAL = ['linkedin', 'github', 'blogs', 'twitter', 'portfolio'];

const SingleEditor = ({ tab }) => {
    const { fields } = ResumeFields[tab];
    const dispatch = useDispatch();
    const resumeData = useSelector(state => state.resume[tab]);
    const t = useTranslation();
    const localizeField = useLocalizeField(tab);

    const handleChange = e => {
        const { name, value } = e.target;
        dispatch(updateResumeValue({ tab, name, value }));
    };

    const renderField = field => {
        const localized = localizeField(field);
        return (
            <Input
                key={field.name}
                {...localized}
                onChange={handleChange}
                value={resumeData?.[field?.name]}
                aiRefineLabel={localized.aiRefine ? t('editor.aiRefine') : undefined}
                refiningLabel={localized.aiRefine ? t('editor.refining') : undefined}
                writeFirstLabel={localized.aiRefine ? t('editor.writeFirst') : undefined}
                hint={tab === 'summary' && field.name === 'summary' ? t('editor.summaryHint') : undefined}
            />
        );
    };

    if (tab === 'contact') {
        const personalFields = fields.filter(f => CONTACT_PERSONAL.includes(f.name));
        const socialFields = fields.filter(f => CONTACT_SOCIAL.includes(f.name));

        return (
            <div className="space-y-6">
                <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        {t('editor.groupPersonal')}
                    </p>
                    <div className="grid gap-5 md:grid-cols-2 md:gap-6">
                        {personalFields.map(renderField)}
                    </div>
                </div>
                <div className="border-t border-gray-100 pt-4 dark:border-white/10">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        {t('editor.groupSocial')}
                    </p>
                    <div className="grid gap-5 md:grid-cols-2 md:gap-6">
                        {socialFields.map(renderField)}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="grid gap-5 md:grid-cols-2 md:gap-6">
            {fields.map(renderField)}
        </div>
    );
};

export default SingleEditor;
