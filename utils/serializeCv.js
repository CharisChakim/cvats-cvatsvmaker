export function serializeCv(resume) {
    const lines = [];
    const { contact, summary, experience, education, projects, skills, certificates, languages } = resume || {};

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

    if (summary?.summary) {
        lines.push('');
        lines.push('SUMMARY');
        lines.push(summary.summary);
    }

    if (experience?.length) {
        lines.push('');
        lines.push('EXPERIENCE');
        experience.forEach(exp => {
            const parts = [exp.role, exp.company, exp.location].filter(Boolean);
            const dates = [exp.start, exp.end === 'present' ? 'Present' : exp.end].filter(Boolean).join(' – ');
            lines.push(`${parts.join(' at ')}${dates ? ` (${dates})` : ''}`);
            if (exp.description) {
                exp.description
                    .split('\n')
                    .map(l => l.trim())
                    .filter(Boolean)
                    .forEach(l => lines.push(`• ${l}`));
            }
        });
    }

    if (education?.length) {
        lines.push('');
        lines.push('EDUCATION');
        education.forEach(edu => {
            const parts = [edu.degree, edu.institution, edu.location].filter(Boolean);
            const dates = [edu.start, edu.end === 'present' ? 'Present' : edu.end].filter(Boolean).join(' – ');
            const gpaStr = edu.gpa ? ` | GPA: ${edu.gpa}` : '';
            lines.push(`${parts.join(' — ')}${dates ? ` (${dates})` : ''}${gpaStr}`);
        });
    }

    if (projects?.length) {
        lines.push('');
        lines.push('PROJECTS');
        projects.forEach(proj => {
            lines.push(`${proj.title || 'Project'}${proj.url ? ` — ${proj.url}` : ''}`);
            if (proj.description) {
                proj.description
                    .split('\n')
                    .map(l => l.trim())
                    .filter(Boolean)
                    .forEach(l => lines.push(`• ${l}`));
            }
        });
    }

    if (skills?.items?.length) {
        lines.push('');
        lines.push('SKILLS');
        lines.push(skills.items.join(', '));
    }

    if (certificates?.length) {
        lines.push('');
        lines.push('CERTIFICATES');
        certificates.forEach(cert => {
            const parts = [cert.title, cert.issuer].filter(Boolean);
            lines.push(`${parts.join(' — ')}${cert.date ? ` (${cert.date})` : ''}`);
        });
    }

    if (languages?.length) {
        lines.push('');
        lines.push('LANGUAGES');
        languages.forEach(lang => {
            lines.push(`${lang.language}${lang.proficiency ? ` — ${lang.proficiency}` : ''}`);
        });
    }

    return lines.join('\n');
}
