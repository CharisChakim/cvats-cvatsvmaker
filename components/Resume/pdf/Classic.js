'use client';

import { Page, Text, View, Document, Link } from '@react-pdf/renderer';
import Section from './Section';
import ListItem from './ListItem';
import buildStyles from '../Styles';
import formatDate from '@/utils/formatDate';
import { DEFAULT_SECTIONS, isCustomSection } from '@/store/slices/resumeSlice';

// Harvard writes the contact line as "Address • City, State Zip • email • phone",
// so the address is included here — the previous header dropped it entirely — and
// the items are joined with bullet separators rather than bare whitespace.
const Header = ({ data, styles, compact }) => {
    const contactItems = [
        { name: data['address'] },
        { name: data['phone'], value: data['phone'] },
        { name: data['email'], value: data['email'] && `mailto:${data['email']}` },
        { name: 'LinkedIn', value: data['linkedin'] },
        { name: 'Github', value: data['github'] },
        { name: 'Blogs', value: data['blogs'] },
        { name: 'Twitter', value: data['twitter'] },
        { name: 'Portfolio', value: data['portfolio'] },
    ].filter(item => item.name);

    return (
        <Section compact={compact}>
            <Text style={styles.header__name}>{data.name}</Text>
            <View style={styles.header__links}>
                {contactItems.flatMap(({ value, name }, i) => {
                    const node = value ? (
                        <Link key={name} src={value} style={styles.link}>
                            {name}
                        </Link>
                    ) : (
                        <Text key={name}>{name}</Text>
                    );
                    return i === 0 ? [node] : [<Text key={`sep-${name}`}>•</Text>, node];
                })}
            </View>
        </Section>
    );
};

// Harvard's entry shape, verified against the official template:
//   Institution (bold)              Location
//   Degree, GPA (italic)            Dates
// The previous layout led with the degree and pushed the institution below, which is
// the opposite emphasis.
const Education = ({ data, styles, compact, title = 'Education' }) => (
    <Section title={title} compact={compact}>
        {data.map(({ degree, institution, start, end, location, gpa }, i) => (
            <View key={i} style={styles?.wrappper}>
                <View style={styles.title_wrapper}>
                    <Text style={styles.title}>{institution}</Text>
                    <Text style={styles.date}>{location}</Text>
                </View>

                <View style={styles.subTitle_wrapper}>
                    <Text style={styles.subtitle}>
                        {degree}
                        {gpa ? `, GPA ${gpa}` : ''}
                    </Text>

                    <Text style={styles.date}>
                        {formatDate(start)} – {formatDate(end)}
                    </Text>
                </View>

                {i !== data.length - 1 && <View style={styles.line} />}
            </View>
        ))}
    </Section>
);

const Projects = ({ data, styles, compact, title = 'Projects' }) => (
    <Section title={title} compact={compact}>
        {data.map((project, i) => (
            <View key={i}>
                <View style={styles.title_wrapper}>
                    <Text style={styles.title}>{project.title}</Text>
                </View>

                <View style={styles.subTitle_wrapper}>
                    <Link
                        style={{
                            textDecoration: 'none',
                            color: '#333333',
                        }}
                        src={project.url}
                    >
                        {project.url}
                    </Link>
                </View>

                <View style={styles.lists}>
                    {project.description
                        ?.split('\n')
                        .filter(line => line)
                        .map((responsibility, i) => (
                            <ListItem key={i}>{responsibility}</ListItem>
                        ))}
                </View>

                {i !== data.length - 1 && <View style={styles.line} />}
            </View>
        ))}
    </Section>
);

const Experience = ({ data, styles, compact, title = 'Experience' }) => (
    <Section title={title} compact={compact}>
        {data.map(({ role, start, end, company, location, description }, i) => (
            <View key={i} style={styles?.wrappper}>
                <View style={styles.title_wrapper}>
                    <Text style={styles.title}>{company}</Text>
                    <Text style={styles.date}>{location}</Text>
                </View>

                <View style={styles.subTitle_wrapper}>
                    <Text style={styles.subtitle}>{role}</Text>
                    <Text style={styles.date}>
                        {formatDate(start)} – {formatDate(end)}
                    </Text>
                </View>

                <View style={styles.lists}>
                    {description?.split('\n').map((responsibility, i) => (
                        <ListItem key={i}>{responsibility}</ListItem>
                    ))}
                </View>
                {i !== data.length - 1 && <View style={styles.line} />}
            </View>
        ))}
    </Section>
);

// Plain comma-separated text rather than shaded chips. Harvard writes skills as a
// labelled text line, and ATS guidance is explicit that shaded boxes, tables and
// grids are the elements that break parsers.
const Skills = ({ data, compact, title = 'Skills' }) => (
    <Section title={title} compact={compact}>
        <Text style={{ fontSize: compact ? 8.5 : 10 }}>{data.join(', ')}</Text>
    </Section>
);

const Certificaes = ({ data, styles, compact, title = 'Certifications' }) => (
    <Section title={title} compact={compact}>
        {data.map(({ title, issuer, date }, i) => (
            <View key={i} style={styles?.wrappper}>
                <View style={styles.title_wrapper}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.date}>{formatDate(date)}</Text>
                </View>

                <View style={styles.subTitle_wrapper}>
                    <Text>{issuer}</Text>
                </View>

                {i !== data.length - 1 && <View style={styles.line} />}
            </View>
        ))}
    </Section>
);

// Flowing text instead of space-between columns, which stretched two entries to
// opposite edges of the page and left a gap in the middle.
const Languages = ({ data, compact, title = 'Languages' }) => (
    <Section title={title} compact={compact}>
        <Text style={{ fontSize: compact ? 8.5 : 10 }}>
            {data
                .map(({ language, proficiency }) => (proficiency ? `${language} (${proficiency})` : language))
                .join(', ')}
        </Text>
    </Section>
);

const Resume = ({ data }) => {
    const { contact, summary, skills } = data;
    const sizeMode = data.onePage;
    const compact = sizeMode === 'compact' || sizeMode === 'onepage' || sizeMode === true;
    const styles = buildStyles(sizeMode, data.font);
    const sections = data.sections?.length ? data.sections : DEFAULT_SECTIONS;

    // Order comes from the section manifest rather than being fixed here, because
    // Harvard's own guidance is to list headings in order of importance — which
    // differs per applicant and per job.
    const renderSection = section => {
        const key = section.id;
        const shared = { key, styles, compact, title: section.title };

        if (isCustomSection(key)) {
            const entries = data.custom?.[key] || [];
            if (!entries.length) return null;
            // Custom entries reuse the built-in field names, so the existing
            // renderers take them as-is.
            return section.shape === 'compact'
                ? <Certificaes {...shared} data={entries} />
                : <Experience {...shared} data={entries} />;
        }

        switch (key) {
            case 'summary':
                return summary?.summary ? (
                    <Section key={key} title={section.title || 'Summary'} compact={compact}>
                        <Text style={{ fontSize: compact ? 8.5 : 10 }}>{summary.summary}</Text>
                    </Section>
                ) : null;
            case 'education':
                return data.education?.length ? <Education {...shared} data={data.education} /> : null;
            case 'experience':
                return data.experience?.length ? <Experience {...shared} data={data.experience} /> : null;
            case 'projects':
                return data.projects?.length ? <Projects {...shared} data={data.projects} /> : null;
            case 'skills':
                return skills?.items?.length ? <Skills key={key} compact={compact} title={section.title} data={skills.items} /> : null;
            case 'certificates':
                return data.certificates?.length ? <Certificaes {...shared} data={data.certificates} /> : null;
            case 'languages':
                return data.languages?.length ? <Languages key={key} compact={compact} title={section.title} data={data.languages} /> : null;
            default:
                return null;
        }
    };

    return (
        <Document language="en">
            <Page size="A4" style={styles.page}>
                <Header data={contact} styles={styles} compact={compact} />
                {sections.filter(s => s.visible && s.id !== 'contact').map(renderSection)}
            </Page>
        </Document>
    );
};

export default Resume;
