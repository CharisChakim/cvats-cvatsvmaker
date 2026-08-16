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
            // Points, so 72 is one inch. ATS guidance puts the safe floor at half an
            // inch, which normal now meets — it previously sat under it at 30. Compact
            // and one-page stay tighter on purpose: they exist to trade margin for
            // fitting the page, and that is the user asking for it.
            backgroundColor: '#ffffff',
            color: TEXT,
            padding: onePage ? 14 : compact ? 20 : 36,
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
            flexWrap: 'wrap',
            justifyContent: 'center',
            // Tighter than before because the items now carry "•" separators between
            // them, the way the Harvard template writes its contact line.
            gap: compact ? 4 : 6,
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
        // The Harvard row is organisation (bold) over degree/role (italic); this is the
        // second line, which used to be plain text.
        subtitle: {
            fontFamily: f.italic,
            fontStyle: 'italic',
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
