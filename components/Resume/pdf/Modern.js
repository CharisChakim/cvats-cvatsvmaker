'use client';

import { Page, Text, View, Document, Link, StyleSheet } from '@react-pdf/renderer';
import formatDate from '@/utils/formatDate';
import '../fonts';

const ACCENT = '#1f6feb';
const TEXT = '#1f2933';
const MUTED = '#5b6b7a';
const RULE = '#dde3ea';

const buildStyles = (sizeMode) => {
    const compact = sizeMode === 'compact' || sizeMode === 'onepage' || sizeMode === true;
    const onePage = sizeMode === 'onepage';
    return StyleSheet.create({
        page: {
            backgroundColor: '#ffffff',
            color: TEXT,
            padding: onePage ? 16 : compact ? 24 : 36,
            fontFamily: 'Carlito',
            fontSize: compact ? 9 : 10.5,
            lineHeight: compact ? 1.25 : 1.45,
        },
        headerName: {
            color: TEXT,
            fontSize: compact ? 18 : 24,
            fontFamily: 'Carlito',
            fontWeight: 'bold',
            letterSpacing: 0.5,
        },
        headerTitle: {
            color: ACCENT,
            fontSize: compact ? 10 : 12,
            fontFamily: 'Carlito',
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
            fontFamily: 'Carlito',
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
            fontFamily: 'Carlito',
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
            fontFamily: 'Carlito',
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

const Experience = ({ data, styles }) => (
    <Section title="Experience" styles={styles}>
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

const Projects = ({ data, styles }) => (
    <Section title="Projects" styles={styles}>
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

const Education = ({ data, styles }) => (
    <Section title="Education" styles={styles}>
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

const Skills = ({ data, styles }) => (
    <Section title="Skills" styles={styles}>
        <View style={styles.pillRow}>
            {data.map((s, i) => (
                <Text key={i} style={styles.pill}>
                    {s}
                </Text>
            ))}
        </View>
    </Section>
);

const Certificates = ({ data, styles }) => (
    <Section title="Certifications" styles={styles}>
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

const Languages = ({ data, styles }) => (
    <Section title="Languages" styles={styles}>
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
    const styles = buildStyles(data.onePage);

    return (
        <Document language="en">
            <Page size="A4" style={styles.page}>
                <Header data={contact} styles={styles} />

                {summary?.summary && (
                    <Section title="Summary" styles={styles}>
                        <Text style={styles.summaryText}>{summary.summary}</Text>
                    </Section>
                )}

                {experience.length > 0 && <Experience data={experience} styles={styles} />}
                {education.length > 0 && <Education data={education} styles={styles} />}
                {projects.length > 0 && <Projects data={projects} styles={styles} />}
                {skills?.items?.length > 0 && <Skills data={skills.items} styles={styles} />}
                {certificates.length > 0 && <Certificates data={certificates} styles={styles} />}
                {languages.length > 0 && <Languages data={languages} styles={styles} />}
            </Page>
        </Document>
    );
};

export default Resume;
