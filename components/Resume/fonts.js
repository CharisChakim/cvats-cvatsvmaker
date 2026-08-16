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

// Helvetica and Times are PDF standard-14 fonts: built into every reader, no files
// to ship. Their bold and italic cuts are separate PostScript names rather than
// weight variants of one family, so each cut is spelled out here. Carlito ships with
// the app and carries Calibri's metrics.
//
// Every option here appears on the standard ATS-safe font lists. Courier used to be
// offered and does not — it is a monospace face, unusual on a CV — so it was dropped;
// anyone who had it selected falls through to Carlito below.
const FONT_SETS = {
    Carlito: { regular: 'Carlito', bold: 'Carlito', italic: 'Carlito' },
    Helvetica: { regular: 'Helvetica', bold: 'Helvetica-Bold', italic: 'Helvetica-Oblique' },
    Times: { regular: 'Times-Roman', bold: 'Times-Bold', italic: 'Times-Italic' },
};

export const CV_FONTS = [
    { id: 'Carlito', label: 'Carlito' },
    { id: 'Helvetica', label: 'Helvetica' },
    { id: 'Times', label: 'Times' },
];

export const getFontSet = fontId => FONT_SETS[fontId] || FONT_SETS.Carlito;
