import { Font } from '@react-pdf/renderer';

Font.register({
    family: 'Carlito',
    fonts: [
        { src: '/fonts/Carlito-Regular.ttf' },
        { src: '/fonts/Carlito-Bold.ttf', fontWeight: 'bold' },
        { src: '/fonts/Carlito-Italic.ttf', fontStyle: 'italic' },
        { src: '/fonts/Carlito-BoldItalic.ttf', fontWeight: 'bold', fontStyle: 'italic' },
    ],
});

// Helvetica / Times / Courier are PDF standard-14 fonts: built into every reader,
// no files to ship. Their bold and italic cuts are separate PostScript names rather
// than weight variants of one family, so each cut is spelled out here.
const FONT_SETS = {
    Carlito: { regular: 'Carlito', bold: 'Carlito', italic: 'Carlito' },
    Helvetica: { regular: 'Helvetica', bold: 'Helvetica-Bold', italic: 'Helvetica-Oblique' },
    Times: { regular: 'Times-Roman', bold: 'Times-Bold', italic: 'Times-Italic' },
    Courier: { regular: 'Courier', bold: 'Courier-Bold', italic: 'Courier-Oblique' },
};

export const CV_FONTS = [
    { id: 'Carlito', label: 'Carlito' },
    { id: 'Helvetica', label: 'Helvetica' },
    { id: 'Times', label: 'Times' },
    { id: 'Courier', label: 'Courier' },
];

export const getFontSet = fontId => FONT_SETS[fontId] || FONT_SETS.Carlito;
