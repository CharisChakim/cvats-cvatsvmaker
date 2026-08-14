import { StyleSheet, Text, View } from '@react-pdf/renderer';

const Section = ({ title, children, compact }) => {
    const styles = StyleSheet.create({
        section_title: {
            textTransform: 'uppercase',
            color: '#000000',
            fontSize: compact ? 11 : 13,
        },

        section_title_underline: {
            height: 1,
            margin: compact ? '1px 0px 2px 0px' : '2px 0px 4px 0px',
            backgroundColor: '#666666',
        },
        section_end: {
            height: compact ? 1 : 2,
            margin: compact ? '5px 0px' : '10px 0px',
            backgroundColor: '#eee',
        },
    });

    return (
        <View>
            {title && (
                <>
                    <Text style={styles.section_title}>{title}</Text>
                    <View style={styles.section_title_underline}></View>
                </>
            )}

            {children}

            <View style={styles.section_end}></View>
        </View>
    );
};

export default Section;
