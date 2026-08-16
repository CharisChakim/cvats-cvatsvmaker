/**
 * Shapes a user-made section can take.
 *
 * The field names deliberately match the built-in sections they mirror — `timeline`
 * uses Experience's names, `compact` uses Certificates' — so the PDF templates can
 * render a custom section through the renderer that already exists, with only the
 * heading swapped. No mapping layer, no new renderers.
 */
export const CUSTOM_SHAPES = {
    timeline: {
        multiple: true,
        fields: [
            { name: 'role', label: 'Title / Role', span: true, placeholder: 'Chairperson' },
            { name: 'company', label: 'Organization', placeholder: 'Organization name' },
            { name: 'location', label: 'Location', placeholder: 'City, Country' },
            { name: 'start', label: 'Start Date', type: 'month', placeholder: 'MM/YYYY' },
            { name: 'end', label: 'End Date', type: 'month', placeholder: 'MM/YYYY', presentable: true },
            {
                name: 'description',
                label: 'What you did',
                type: 'textarea',
                placeholder: 'Briefly describe what you did...',
                span: true,
                rows: 4,
                multipoints: true,
            },
        ],
    },
    compact: {
        multiple: true,
        fields: [
            { name: 'title', label: 'Title', placeholder: 'Award or publication name', span: true },
            { name: 'issuer', label: 'Issuer / Publisher', placeholder: 'Organization name' },
            { name: 'date', label: 'Date', type: 'month', placeholder: 'MM/YYYY' },
        ],
    },
};

const ResumeFields = {
    contact: {
        name: 'Contact',
        fields: [
            { name: 'name', label: 'Full Name', placeholder: 'John Doe', required: true },
            { name: 'title', label: 'Your Job Title', placeholder: 'Software Developer' },
            { name: 'email', label: 'Email', type: 'email', placeholder: 'john.doe@example.com' },
            { name: 'phone', label: 'Phone', type: 'tel', placeholder: '+1234567890' },
            { name: 'address', label: 'Address', placeholder: '123 Street, City, Country' },
            { name: 'linkedin', label: 'Linked', placeholder: 'linkedin.com/in/johndoe' },
            { name: 'github', label: 'Github', placeholder: 'github.com/johndoe' },
            { name: 'blogs', label: 'Blogs', placeholder: 'github.com/johndoe' },
            { name: 'twitter', label: 'Social Media', placeholder: 'x.com/username or instagram.com/username' },
            { name: 'portfolio', label: 'Portfolio', placeholder: 'johndoe.com' },
        ],
    },
    summary: {
        name: 'Summary',
        fields: [
            {
                name: 'summary',
                label: 'Summary',
                type: 'textarea',
                placeholder: 'Brief summary of your skills and experience...',
                span: true,
                rows: 5,
                aiRefine: 'summary',
            },
        ],
    },
    education: {
        name: 'Education',
        multiple: true,
        fields: [
            { name: 'degree', label: 'Study Program', placeholder: 'Bachelor of Computer Science' },
            { name: 'institution', label: 'Institution', placeholder: 'University Name' },
            { name: 'start', label: 'Start Date', type: 'month', placeholder: 'MM/YYYY' },
            { name: 'end', label: 'End Date', type: 'month', placeholder: 'MM/YYYY', presentable: true },
            { name: 'location', label: 'Location', placeholder: 'City, Country' },
            { name: 'gpa', label: 'GPA', placeholder: '3.8/4.0' },
        ],
    },

    experience: {
        name: 'Experience',
        multiple: true,
        fields: [
            { name: 'role', label: 'Title / Position', span: true, placeholder: 'Software Engineer' },
            { name: 'company', label: 'Workplace / Company', placeholder: 'Company Name' },
            { name: 'location', label: 'Location', placeholder: 'City, Country' },
            { name: 'start', label: 'Start Date', type: 'month', placeholder: 'MM/DD/YYYY' },
            { name: 'end', label: 'End Date', type: 'month', placeholder: 'MM/DD/YYYY', presentable: true },
            {
                name: 'description',
                label: 'Responsibility',
                type: 'textarea',
                placeholder: 'Brief description of your responsibilities...',
                span: true,
                rows: 4,
                multipoints: true,
                aiRefine: 'experience',
            },
        ],
    },

    projects: {
        name: 'Projects',
        multiple: true,
        fields: [
            { name: 'title', label: 'Project Title', placeholder: 'Project Name' },
            { name: 'url', label: 'Project Url', placeholder: 'https://example.com/project' },
            {
                name: 'description',
                label: 'Now Describe What you did',
                type: 'textarea',
                placeholder: 'Briefly describe your project...',
                span: true,
                multipoints: true,
                aiRefine: 'project',
            },
        ],
    },

    skills: {
        name: 'Skills',
        fields: [
            {
                name: 'items',
                label: 'Skills',
                type: 'tags',
                placeholder: 'Type a skill, then press Enter',
                span: true,
                max: 20,
            },
        ],
    },

    certificates: {
        name: 'Certificates',
        multiple: true,
        fields: [
            { name: 'title', label: 'Certificate Title', placeholder: 'Certificate Name', span: true },
            { name: 'issuer', label: 'Issuing Organization', placeholder: 'Organization Name' },
            { name: 'date', label: 'Issuance Date', type: 'month', placeholder: 'MM/DD/YYYY' },
        ],
    },

    languages: {
        name: 'Languages',
        multiple: true,
        fields: [
            { name: 'language', label: 'Language', placeholder: 'Language Name' },
            {
                name: 'proficiency',
                label: 'Proficiency',
                placeholder: 'e.g., Fluent, Intermediate, Beginner',
                type: 'select',
                options: [
                    {
                        
                        value: 'Elementary Proficiency',
                    },
                    {
                        
                        value: 'Limited Working Proficiency',
                    },
                    {
                        
                        value: 'Professional Working Proficiency',
                    },
                    {
                        
                        value: 'Full Professional Proficiency',
                    },
                    {
                        
                        value: 'Native or Bilingual Proficiency',
                    },
                ],
            },
        ],
    },
};

export default ResumeFields;

/**
 * A section's display name: whatever the user renamed it to, otherwise the
 * translated default. Lives here rather than in Tabs so the tab strip, the editor
 * header and the section manager can all share it without importing each other.
 */
export const sectionLabel = (section, t) =>
    section.title || (ResumeFields[section.id] ? t(`tabs.${section.id}`) : section.id);

/** Field config for a section entry, whether it is built-in or user-made. */
export const sectionFields = section => {
    if (!section) return null;
    if (String(section.id).startsWith('custom-')) {
        return CUSTOM_SHAPES[section.shape] || CUSTOM_SHAPES.timeline;
    }
    return ResumeFields[section.id] || null;
};
