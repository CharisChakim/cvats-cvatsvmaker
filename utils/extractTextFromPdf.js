import { pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

function throwIfAborted(signal) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
}

// Items sharing a visual line rarely share an exact baseline — superscripts and
// mixed font sizes shift it by a point or so.
const LINE_TOLERANCE = 2;

// A vertical step this much larger than the document's usual one reads as a
// paragraph or section break rather than the next line.
const PARAGRAPH_GAP_RATIO = 1.6;

const itemY = item => item.transform[5];
const itemX = item => item.transform[4];
const itemHeight = item => item.height || Math.abs(item.transform[3]) || 10;

// Bucket items onto shared baselines. Order within a page is not reliably
// left-to-right, so grouping by position beats trusting the emitted sequence.
function groupIntoLines(items) {
    const lines = [];

    for (const item of items) {
        if (!item.str || !item.str.trim()) continue;
        const y = itemY(item);
        let line = lines.find(l => Math.abs(l.y - y) <= LINE_TOLERANCE);
        if (!line) {
            line = { y, items: [] };
            lines.push(line);
        }
        line.items.push(item);
    }

    lines.sort((a, b) => b.y - a.y); // PDF y grows upward, so descending is top-down
    for (const line of lines) line.items.sort((a, b) => itemX(a) - itemX(b));
    return lines;
}

// Some PDFs emit one item per word, others one per glyph. Deciding on the
// horizontal gap handles both — joining everything with spaces would turn a
// glyph-per-item file into "S o f t w a r e".
function joinLine(items) {
    let text = '';
    let prevEnd = null;

    for (const item of items) {
        const start = itemX(item);
        if (prevEnd !== null) {
            const gap = start - prevEnd;
            const needsSpace = gap > itemHeight(item) * 0.25;
            if (needsSpace && !/\s$/.test(text) && !/^\s/.test(item.str)) text += ' ';
        }
        text += item.str;
        prevEnd = start + (item.width || 0);
    }

    return text.replace(/\s+/g, ' ').trim();
}

function median(values) {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
}

// Blank lines are the strongest hint of where one section ends and the next
// begins, so they are reconstructed rather than dropped.
function linesToText(lines) {
    if (!lines.length) return '';

    const steps = [];
    for (let i = 1; i < lines.length; i++) {
        const step = lines[i - 1].y - lines[i].y;
        if (step > 0) steps.push(step);
    }
    const typicalStep = median(steps);

    const out = [];
    lines.forEach((line, i) => {
        if (i > 0 && typicalStep > 0) {
            const step = lines[i - 1].y - line.y;
            if (step > typicalStep * PARAGRAPH_GAP_RATIO) out.push('');
        }
        out.push(joinLine(line.items));
    });

    return out.join('\n');
}

export async function extractTextFromPDF(file, signal) {
    throwIfAborted(signal);
    const arrayBuffer = await file.arrayBuffer();
    throwIfAborted(signal);
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const pages = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        throwIfAborted(signal);
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        pages.push(linesToText(groupIntoLines(textContent.items)));
    }

    return pages.join('\n\n');
}
