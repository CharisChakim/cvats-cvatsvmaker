import { StyleSheet } from '@react-pdf/renderer';
import './fonts';

const normalStyles = StyleSheet.create({
    page: {
        backgroundColor: '#ffffff',
        color: '#555',
        padding: 30,
        fontFamily: 'Carlito',
    },

    header: {
        textAlign: 'center',
    },

    header__name: {
        color: '#111',
        fontSize: 20,
        fontFamily: 'Carlito',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    header__links: {
        color: '#555',
        fontSize: 11,
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 14,
        marginTop: 6,
        marginBottom: 4,
    },

    title_wrapper: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: 12,
    },

    subTitle_wrapper: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: 11,
    },

    title: {
        fontFamily: 'Carlito',
        fontWeight: 'bold',
        marginRight: 'auto',
        color: '#555',
    },
    date: {
        fontFamily: 'Carlito',
        fontStyle: 'italic',
        fontSize: 10,
    },

    line: {
        borderBottom: '1px solid #eee',
        margin: '5px 0px',
    },
    lists: {
        fontSize: 10.2,
        marginTop: 2,
    },
    link: {
        color: '#666',
    },
});

const compactStyles = StyleSheet.create({
    page: {
        backgroundColor: '#ffffff',
        color: '#555',
        padding: 20,
        fontFamily: 'Carlito',
    },

    header: {
        textAlign: 'center',
    },

    header__name: {
        color: '#111',
        fontSize: 16,
        fontFamily: 'Carlito',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    header__links: {
        color: '#555',
        fontSize: 9.5,
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
        marginTop: 4,
        marginBottom: 2,
    },

    title_wrapper: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: 10.5,
    },

    subTitle_wrapper: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: 9.5,
    },

    title: {
        fontFamily: 'Carlito',
        fontWeight: 'bold',
        marginRight: 'auto',
        color: '#555',
    },
    date: {
        fontFamily: 'Carlito',
        fontStyle: 'italic',
        fontSize: 8.5,
    },

    line: {
        borderBottom: '1px solid #eee',
        margin: '3px 0px',
    },
    lists: {
        fontSize: 8.8,
        marginTop: 1,
    },
    link: {
        color: '#666',
    },
});

const onePageStyles = StyleSheet.create({
    page: {
        backgroundColor: '#ffffff',
        color: '#555',
        padding: 14,
        fontFamily: 'Carlito',
    },

    header: {
        textAlign: 'center',
    },

    header__name: {
        color: '#111',
        fontSize: 16,
        fontFamily: 'Carlito',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    header__links: {
        color: '#555',
        fontSize: 9.5,
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
        marginTop: 4,
        marginBottom: 2,
    },

    title_wrapper: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: 10.5,
    },

    subTitle_wrapper: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: 9.5,
    },

    title: {
        fontFamily: 'Carlito',
        fontWeight: 'bold',
        marginRight: 'auto',
        color: '#555',
    },
    date: {
        fontFamily: 'Carlito',
        fontStyle: 'italic',
        fontSize: 8.5,
    },

    line: {
        borderBottom: '1px solid #eee',
        margin: '2px 0px',
    },
    lists: {
        fontSize: 8.8,
        marginTop: 1,
    },
    link: {
        color: '#666',
    },
});

export { normalStyles, compactStyles, onePageStyles };
export default normalStyles;
