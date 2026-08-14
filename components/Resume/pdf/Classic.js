'use client';

import { Page, Text, View, Document, Link } from '@react-pdf/renderer';
import Section from './Section';
import ListItem from './ListItem';
import buildStyles from '../Styles';
import formatDate from '@/utils/formatDate';

const Header = ({ data, styles, compact }) => {
    const contactLinks = [
        { name: data['phone'], value: data['phone'] },
        { name: data['email'], value: `mailto:${data['email']}` },
        { name: 'LinkedIn', value: data['linkedin'] },
        { name: 'Github', value: data['github'] },
        { name: 'Blogs', value: data['blogs'] },
        { name: 'Twitter', value: data['twitter'] },
        { name: 'Portfolio', value: data['portfolio'] },
    ];

    return (
        <Section compact={compact}>
            <Text style={styles.header__name}>{data.name}</Text>
            <View style={styles.header__links}>
                {contactLinks
                    .filter(obj => obj.value)
                    .map(({ value, name }) => (
                        <Link key={name} src={value} style={{ color: '#000000' }}>
                            {name}
                        </Link>
                    ))}
            </View>
        </Section>
    );
};

const Education = ({ data, styles, compact }) => (
    <Section title={'Education'} compact={compact}>
        {data.map(({ degree, institution, start, end, location, gpa }, i) => (
            <View key={i} style={styles?.wrappper}>
                <View style={styles.title_wrapper}>
                    <Text style={styles.title}>{degree}</Text>
                    <Text style={styles.date}>
                        {formatDate(start)}- {formatDate(end)}
                    </Text>
                </View>

                <View style={styles.subTitle_wrapper}>
                    <Text>
                        {institution}
                        {gpa && <Text> ({gpa})</Text>}
                    </Text>

                    <Text style={styles.date}>{location}</Text>
                </View>

                {i !== data.length - 1 && <View style={styles.line} />}
            </View>
        ))}
    </Section>
);

const Projects = ({ data, styles, compact }) => (
    <Section title={'Projects'} compact={compact}>
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

const Experience = ({ data, styles, compact }) => (
    <Section title={'Experience'} compact={compact}>
        {data.map(({ role, start, end, company, location, description }, i) => (
            <View key={i} style={styles?.wrappper}>
                <View style={styles.title_wrapper}>
                    <Text style={styles.title}>{role}</Text>
                    <Text style={styles.date}>
                        {formatDate(start)} - {formatDate(end)}
                    </Text>
                </View>

                <View style={styles.subTitle_wrapper}>
                    <Text>{company}</Text>
                    <Text>{location}</Text>
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

const Skills = ({ data, compact }) => (
    <Section title={'Skills'} compact={compact}>
        <View
            style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: compact ? 4 : 6,
            }}
        >
            {data.map((skill, i) => (
                <Text
                    key={i}
                    style={{
                        fontSize: compact ? 8.5 : 10,
                        paddingVertical: compact ? 1 : 2,
                        paddingHorizontal: compact ? 4 : 6,
                        backgroundColor: '#f1f1f1',
                        color: '#000000',
                        borderRadius: 3,
                        marginBottom: compact ? 2 : 4,
                        marginRight: compact ? 2 : 4,
                    }}
                >
                    {skill}
                </Text>
            ))}
        </View>
    </Section>
);

const Certificaes = ({ data, styles, compact }) => (
    <Section title={'Certifications'} compact={compact}>
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

const Languages = ({ data, compact }) => (
    <Section title={'Languages'} compact={compact}>
        <View
            style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
            }}
        >
            {data.map(({ language, proficiency }, i) => (
                <View key={i}>
                    <Text style={{ fontSize: compact ? 10 : 12 }}>{language}</Text>
                    <Text style={{ fontSize: compact ? 8.5 : 10, color: '#333333' }}>{proficiency}</Text>
                </View>
            ))}
        </View>
    </Section>
);

const Resume = ({ data }) => {
    const { contact, education, experience, projects, summary, skills, certificates, languages } = data;
    const sizeMode = data.onePage;
    const compact = sizeMode === 'compact' || sizeMode === 'onepage' || sizeMode === true;
    const styles = buildStyles(sizeMode, data.font);

    return (
        <Document language="en">
            <Page size="A4" style={styles.page}>
                <Header data={contact} styles={styles} compact={compact} />

                {summary?.summary && (
                    <Section title={'Summary'} compact={compact}>
                        <Text style={{ fontSize: compact ? 8.5 : 10 }}>{summary?.summary}</Text>
                    </Section>
                )}

                {education.length > 0 && <Education data={education} styles={styles} compact={compact} />}
                {experience.length > 0 && <Experience data={experience} styles={styles} compact={compact} />}
                {projects.length > 0 && <Projects data={projects} styles={styles} compact={compact} />}

                {skills?.items?.length > 0 && <Skills data={skills.items} compact={compact} />}
                {certificates?.length > 0 && <Certificaes data={certificates} styles={styles} compact={compact} />}
                {languages?.length > 0 && <Languages data={languages} compact={compact} />}
            </Page>
        </Document>
    );
};

export default Resume;
