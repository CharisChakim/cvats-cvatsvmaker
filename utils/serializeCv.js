import { DEFAULT_SECTIONS, isCustomSection } from '@/store/slices/resumeSlice';

const dateRange = (start, end) =>
    [start, end === 'present' ? 'Present' : end].filter(Boolean).join(' – ');

const bulletLines = (lines, text) => {
    if (!text) return;
    text.split('\n')
        .map(l => l.trim())
        .filter(Boolean)
        .forEach(l => lines.push(`• ${l}`));
};

const heading = (lines, title) => {
    lines.push('');
    lines.push(title.toUpperCase());
};

export function serializeCv(resume) {
    const lines = [];
    const { contact, summary, experience, education, projects, skills, certificates, languages } = resume || {};
    const sections = resume?.sections?.length ? resume.sections : DEFAULT_SECTIONS;

    if (contact?.name) {
        const headline = [contact.name, contact.title].filter(Boolean).join(' — ');
        lines.push(headline);
    }

    const contactParts = [
        contact?.email,
        contact?.phone,
        contact?.address,
        contact?.linkedin,
        contact?.github,
        contact?.portfolio,
    ].filter(Boolean);
    if (contactParts.length) lines.push(contactParts.join(' | '));

    // Emitted in the user's chosen order, and including their own sections — scoring
    // and boosting read this text, so anything missing here is invisible to both.
    const writers = {
        summary: title => {
            if (!summary?.summary) return;
            heading(lines, title || 'Summary');
            lines.push(summary.summary);
        },
        experience: title => {
            if (!experience?.length) return;
            heading(lines, title || 'Experience');
            experience.forEach(exp => {
                const parts = [exp.role, exp.company, exp.location].filter(Boolean);
                const dates = dateRange(exp.start, exp.end);
                lines.push(`${parts.join(' at ')}${dates ? ` (${dates})` : ''}`);
                bulletLines(lines, exp.description);
            });
        },
        education: title => {
            if (!education?.length) return;
            heading(lines, title || 'Education');
            education.forEach(edu => {
                const parts = [edu.degree, edu.institution, edu.location].filter(Boolean);
                const dates = dateRange(edu.start, edu.end);
                const gpaStr = edu.gpa ? ` | GPA: ${edu.gpa}` : '';
                lines.push(`${parts.join(' — ')}${dates ? ` (${dates})` : ''}${gpaStr}`);
            });
        },
        projects: title => {
            if (!projects?.length) return;
            heading(lines, title || 'Projects');
            projects.forEach(proj => {
                lines.push(`${proj.title || 'Project'}${proj.url ? ` — ${proj.url}` : ''}`);
                bulletLines(lines, proj.description);
            });
        },
        skills: title => {
            if (!skills?.items?.length) return;
            heading(lines, title || 'Skills');
            lines.push(skills.items.join(', '));
        },
        certificates: title => {
            if (!certificates?.length) return;
            heading(lines, title || 'Certificates');
            certificates.forEach(cert => {
                const parts = [cert.title, cert.issuer].filter(Boolean);
                lines.push(`${parts.join(' — ')}${cert.date ? ` (${cert.date})` : ''}`);
            });
        },
        languages: title => {
            if (!languages?.length) return;
            heading(lines, title || 'Languages');
            languages.forEach(lang => {
                lines.push(`${lang.language}${lang.proficiency ? ` — ${lang.proficiency}` : ''}`);
            });
        },
    };

    const writeCustom = section => {
        const entries = resume?.custom?.[section.id] || [];
        if (!entries.length) return;
        heading(lines, section.title || 'Additional');

        entries.forEach(entry => {
            if (section.shape === 'compact') {
                const parts = [entry.title, entry.issuer].filter(Boolean);
                lines.push(`${parts.join(' — ')}${entry.date ? ` (${entry.date})` : ''}`);
                return;
            }
            const parts = [entry.role, entry.company, entry.location].filter(Boolean);
            const dates = dateRange(entry.start, entry.end);
            lines.push(`${parts.join(' at ')}${dates ? ` (${dates})` : ''}`);
            bulletLines(lines, entry.description);
        });
    };

    sections
        .filter(section => section.visible && section.id !== 'contact')
        .forEach(section => {
            if (isCustomSection(section.id)) return writeCustom(section);
            writers[section.id]?.(section.title);
        });

    return lines.join('\n');
}
