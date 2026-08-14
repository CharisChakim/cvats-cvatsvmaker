import { StyleSheet } from '@react-pdf/renderer';
import './fonts';
import { getFontSet } from './fonts';

const TEXT = '#000000';
const SECONDARY = '#333333';

const buildStyles = (sizeMode, fontId) => {
    const compact = sizeMode === 'compact' || sizeMode === 'onepage' || sizeMode === true;
    const onePage = sizeMode === 'onepage';
    const f = getFontSet(fontId);

    return StyleSheet.create({
        page: {
            backgroundColor: '#ffffff',
            color: TEXT,
            padding: onePage ? 14 : compact ? 20 : 30,
            fontFamily: f.regular,
        },

        header: {
            textAlign: 'center',
        },

        header__name: {
            color: TEXT,
            fontSize: compact ? 16 : 20,
            fontFamily: f.bold,
            fontWeight: 'bold',
            textAlign: 'center',
        },
        header__links: {
            color: SECONDARY,
            fontSize: compact ? 9.5 : 11,
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: compact ? 10 : 14,
            marginTop: compact ? 4 : 6,
            marginBottom: compact ? 2 : 4,
        },

        title_wrapper: {
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: compact ? 10.5 : 12,
        },

        subTitle_wrapper: {
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: compact ? 9.5 : 11,
        },

        title: {
            fontFamily: f.bold,
            fontWeight: 'bold',
            marginRight: 'auto',
            color: TEXT,
        },
        date: {
            fontFamily: f.italic,
            fontStyle: 'italic',
            fontSize: compact ? 8.5 : 10,
            color: SECONDARY,
        },

        line: {
            borderBottom: '1px solid #dddddd',
            margin: onePage ? '2px 0px' : compact ? '3px 0px' : '5px 0px',
        },
        lists: {
            fontSize: compact ? 8.8 : 10.2,
            marginTop: compact ? 1 : 2,
        },
        link: {
            color: TEXT,
        },
    });
};

export default buildStyles;
