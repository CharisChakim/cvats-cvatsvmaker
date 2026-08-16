'use client';

import { Page, Text, View, Document, Link, StyleSheet } from '@react-pdf/renderer';
import formatDate from '@/utils/formatDate';
import '../fonts';
import { getFontSet } from '../fonts';
import { DEFAULT_SECTIONS, isCustomSection } from '@/store/slices/resumeSlice';

const ACCENT = '#1f6feb';
const TEXT = '#000000';
const MUTED = '#333333';
const RULE = '#cccccc';

const buildStyles = (sizeMode, fontId) => {
    const compact = sizeMode === 'compact' || sizeMode === 'onepage' || sizeMode === true;
    const onePage = sizeMode === 'onepage';
    const f = getFontSet(fontId);
    return StyleSheet.create({
        page: {
            backgroundColor: '#ffffff',
            color: TEXT,
            padding: onePage ? 16 : compact ? 24 : 36,
            fontFamily: f.regular,
            fontSize: compact ? 9 : 10.5,
            lineHeight: compact ? 1.25 : 1.45,
        },
        headerName: {
            color: TEXT,
            fontSize: compact ? 18 : 24,
            fontFamily: f.bold,
            fontWeight: 'bold',
            letterSpacing: 0.5,
        },
        headerTitle: {
            color: ACCENT,
            fontSize: compact ? 10 : 12,
            fontFamily: f.bold,
            fontWeight: 'bold',
            marginTop: 2,
            textTransform: 'uppercase',
            letterSpacing: 1,
        },
        headerLinks: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: compact ? 7 : 10,
            marginTop: compact ? 5 : 8,
            fontSize: compact ? 8.5 : 9.5,
            color: MUTED,
        },
        headerDivider: {
            height: 2,
            backgroundColor: ACCENT,
            marginTop: compact ? 6 : 12,
            marginBottom: compact ? 8 : 14,
            width: 48,
        },
        sectionTitle: {
            fontFamily: f.bold,
            fontWeight: 'bold',
            color: ACCENT,
            fontSize: compact ? 9.5 : 11,
            textTransform: 'uppercase',
            letterSpacing: 1.2,
            marginBottom: compact ? 3 : 6,
        },
        sectionRule: {
            height: 0.6,
            backgroundColor: RULE,
            marginBottom: compact ? 4 : 8,
        },
        sectionEnd: {
            marginBottom: compact ? 6 : 12,
        },
        rowBetween: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
        },
        itemTitle: {
            fontFamily: f.bold,
            fontWeight: 'bold',
            fontSize: compact ? 9.5 : 11,
            color: TEXT,
        },
        itemSubtitle: {
            fontSize: compact ? 9 : 10.5,
            color: MUTED,
            marginTop: 1,
        },
        date: {
            fontSize: compact ? 8.5 : 9.5,
            color: MUTED,
            fontFamily: f.italic,
            fontStyle: 'italic',
        },
        bulletRow: {
            flexDirection: 'row',
            marginTop: compact ? 1 : 2,
        },
        bulletDot: {
            width: 10,
            color: ACCENT,
        },
        bulletText: {
            flex: 1,
            fontSize: compact ? 8.8 : 10,
            color: TEXT,
        },
        itemSpacer: {
            height: compact ? 4 : 8,
        },
        pillRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: compact ? 4 : 6,
        },
        pill: {
            backgroundColor: '#eef3fb',
            color: ACCENT,
            paddingVertical: compact ? 2 : 3,
            paddingHorizontal: compact ? 6 : 8,
            borderRadius: 3,
            fontSize: compact ? 8.5 : 9.5,
            marginBottom: compact ? 2 : 4,
            marginRight: compact ? 2 : 4,
        },
        summaryText: {
            fontSize: compact ? 9 : 10.5,
            color: TEXT,
        },
    });
};

const Section = ({ title, children, styles }) => (
    <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.sectionRule} />
        {children}
        <View style={styles.sectionEnd} />
    </View>
);

const Bullets = ({ text, styles }) => {
    if (!text) return null;
    return text
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean)
        .map((line, i) => (
            <View key={i} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>{'•'}</Text>
                <Text style={styles.bulletText}>{line}</Text>
            </View>
        ));
};

const Header = ({ data, styles }) => {
    const links = [
        { label: data.email, href: data.email ? `mailto:${data.email}` : null },
        { label: data.phone, href: data.phone ? `tel:${data.phone}` : null },
        { label: data.address, href: null },
        { label: 'LinkedIn', href: data.linkedin },
        { label: 'GitHub', href: data.github },
        { label: 'Portfolio', href: data.portfolio },
        { label: 'Twitter', href: data.twitter },
        { label: 'Blog', href: data.blogs },
    ].filter(l => l.label);

    return (
        <View>
            <Text style={styles.headerName}>{data.name}</Text>
            {data.title && <Text style={styles.headerTitle}>{data.title}</Text>}
            <View style={styles.headerLinks}>
                {links.map((l, i) =>
                    l.href ? (
                        <Link key={i} src={l.href} style={{ color: MUTED, textDecoration: 'none' }}>
                            {l.label}
                        </Link>
                    ) : (
                        <Text key={i}>{l.label}</Text>
                    ),
                )}
            </View>
            <View style={styles.headerDivider} />
        </View>
    );
};

const Experience = ({ data, styles, title = 'Experience' }) => (
    <Section title={title} styles={styles}>
        {data.map((e, i) => (
            <View key={i}>
                <View style={styles.rowBetween}>
                    <Text style={styles.itemTitle}>{e.role}</Text>
                    <Text style={styles.date}>
                        {formatDate(e.start)} — {formatDate(e.end)}
                    </Text>
                </View>
                <View style={styles.rowBetween}>
                    <Text style={styles.itemSubtitle}>
                        {e.company}
                        {e.location ? ` · ${e.location}` : ''}
                    </Text>
                </View>
                <Bullets text={e.description} styles={styles} />
                {i !== data.length - 1 && <View style={styles.itemSpacer} />}
            </View>
        ))}
    </Section>
);

const Projects = ({ data, styles, title = 'Projects' }) => (
    <Section title={title} styles={styles}>
        {data.map((p, i) => (
            <View key={i}>
                <View style={styles.rowBetween}>
                    <Text style={styles.itemTitle}>{p.title}</Text>
                    {p.url && (
                        <Link src={p.url} style={{ ...styles.date, color: ACCENT, textDecoration: 'none' }}>
                            {p.url}
                        </Link>
                    )}
                </View>
                <Bullets text={p.description} styles={styles} />
                {i !== data.length - 1 && <View style={styles.itemSpacer} />}
            </View>
        ))}
    </Section>
);

const Education = ({ data, styles, title = 'Education' }) => (
    <Section title={title} styles={styles}>
        {data.map((ed, i) => (
            <View key={i}>
                <View style={styles.rowBetween}>
                    <Text style={styles.itemTitle}>{ed.degree}</Text>
                    <Text style={styles.date}>
                        {formatDate(ed.start)} — {formatDate(ed.end)}
                    </Text>
                </View>
                <View style={styles.rowBetween}>
                    <Text style={styles.itemSubtitle}>
                        {ed.institution}
                        {ed.gpa ? ` · GPA ${ed.gpa}` : ''}
                    </Text>
                    {ed.location && <Text style={styles.date}>{ed.location}</Text>}
                </View>
                {i !== data.length - 1 && <View style={styles.itemSpacer} />}
            </View>
        ))}
    </Section>
);

const Skills = ({ data, styles, title = 'Skills' }) => (
    <Section title={title} styles={styles}>
        <View style={styles.pillRow}>
            {data.map((s, i) => (
                <Text key={i} style={styles.pill}>
                    {s}
                </Text>
            ))}
        </View>
    </Section>
);

const Certificates = ({ data, styles, title = 'Certifications' }) => (
    <Section title={title} styles={styles}>
        {data.map((c, i) => (
            <View key={i}>
                <View style={styles.rowBetween}>
                    <Text style={styles.itemTitle}>{c.title}</Text>
                    <Text style={styles.date}>{formatDate(c.date)}</Text>
                </View>
                <Text style={styles.itemSubtitle}>{c.issuer}</Text>
                {i !== data.length - 1 && <View style={styles.itemSpacer} />}
            </View>
        ))}
    </Section>
);

const Languages = ({ data, styles, title = 'Languages' }) => (
    <Section title={title} styles={styles}>
        <View style={styles.pillRow}>
            {data.map((l, i) => (
                <Text key={i} style={styles.pill}>
                    {l.language}
                    {l.proficiency ? ` — ${l.proficiency}` : ''}
                </Text>
            ))}
        </View>
    </Section>
);

const Resume = ({ data }) => {
    const { contact = {}, summary, education = [], experience = [], projects = [], skills, certificates = [], languages = [] } = data;
    const styles = buildStyles(data.onePage, data.font);
    const sections = data.sections?.length ? data.sections : DEFAULT_SECTIONS;

    // Same manifest as Classic, so section order and visibility carry across templates
    // instead of each template imposing its own.
    const renderSection = section => {
        const key = section.id;
        const shared = { key, styles, title: section.title };

        if (isCustomSection(key)) {
            const entries = data.custom?.[key] || [];
            if (!entries.length) return null;
            return section.shape === 'compact'
                ? <Certificates {...shared} data={entries} />
                : <Experience {...shared} data={entries} />;
        }

        switch (key) {
            case 'summary':
                return summary?.summary ? (
                    <Section key={key} title={section.title || 'Summary'} styles={styles}>
                        <Text style={styles.summaryText}>{summary.summary}</Text>
                    </Section>
                ) : null;
            case 'experience':
                return experience.length ? <Experience {...shared} data={experience} /> : null;
            case 'education':
                return education.length ? <Education {...shared} data={education} /> : null;
            case 'projects':
                return projects.length ? <Projects {...shared} data={projects} /> : null;
            case 'skills':
                return skills?.items?.length ? <Skills {...shared} data={skills.items} /> : null;
            case 'certificates':
                return certificates.length ? <Certificates {...shared} data={certificates} /> : null;
            case 'languages':
                return languages.length ? <Languages {...shared} data={languages} /> : null;
            default:
                return null;
        }
    };

    return (
        <Document language="en">
            <Page size="A4" style={styles.page}>
                <Header data={contact} styles={styles} />
                {sections.filter(s => s.visible && s.id !== 'contact').map(renderSection)}
            </Page>
        </Document>
    );
};

export default Resume;
