'use client';

import { useState } from 'react';

// ── Line-level LCS diff ────────────────────────────────────────────────────

function computeLineDiff(oldText, newText) {
    const a = oldText.split('\n');
    const b = newText.split('\n');
    const m = a.length, n = b.length;

    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++)
        for (let j = 1; j <= n; j++)
            dp[i][j] = a[i-1] === b[j-1]
                ? dp[i-1][j-1] + 1
                : Math.max(dp[i-1][j], dp[i][j-1]);

    const diff = [];
    let i = m, j = n;
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && a[i-1] === b[j-1]) {
            diff.unshift({ type: 'same', left: a[i-1], right: b[j-1] });
            i--; j--;
        } else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) {
            diff.unshift({ type: 'add', right: b[j-1] });
            j--;
        } else {
            diff.unshift({ type: 'remove', left: a[i-1] });
            i--;
        }
    }
    return diff;
}

// ── Block-aware side-by-side pairing ──────────────────────────────────────
// Groups consecutive removes and adds into blocks, then zips them so that
// "remove line A / add line X" end up on the same row even in multi-line blocks.

function buildRows(diff, ctx = 2) {
    const paired = [];
    let k = 0;
    while (k < diff.length) {
        if (diff[k].type === 'same') {
            paired.push({ type: 'same', left: diff[k].left, right: diff[k].right });
            k++;
        } else {
            // Collect a contiguous block of removes + adds (any order)
            const removes = [], adds = [];
            while (k < diff.length && diff[k].type !== 'same') {
                if (diff[k].type === 'remove') removes.push(diff[k].left);
                else adds.push(diff[k].right);
                k++;
            }
            // Zip: pair removed and added lines 1-to-1
            const maxLen = Math.max(removes.length, adds.length);
            for (let x = 0; x < maxLen; x++) {
                const left  = removes[x] ?? null;
                const right = adds[x]   ?? null;
                if (left !== null && right !== null)
                    paired.push({ type: 'change', left, right });
                else if (left !== null)
                    paired.push({ type: 'remove', left, right: null });
                else
                    paired.push({ type: 'add', left: null, right });
            }
        }
    }

    // Collapse long runs of unchanged lines
    const result = [];
    let p = 0;
    while (p < paired.length) {
        if (paired[p].type !== 'same') { result.push(paired[p++]); continue; }
        let end = p;
        while (end < paired.length && paired[end].type === 'same') end++;
        const runLen   = end - p;
        const prevChange = p > 0;
        const nextChange = end < paired.length;
        if (runLen <= ctx * 2) {
            for (let x = p; x < end; x++) result.push(paired[x]);
        } else {
            for (let x = p; x < p + (prevChange ? ctx : 0); x++) result.push(paired[x]);
            const collapseCount = runLen - (prevChange ? ctx : 0) - (nextChange ? ctx : 0);
            if (collapseCount > 0) result.push({ type: 'collapse', count: collapseCount });
            for (let x = end - (nextChange ? ctx : 0); x < end; x++) result.push(paired[x]);
        }
        p = end;
    }
    return result;
}

// ── Word-level diff for changed lines ─────────────────────────────────────

function wordDiff(aText, bText) {
    // Split into word + whitespace tokens to preserve spacing
    const tokenize = s => s.match(/\S+|\s+/g) || [];
    const a = tokenize(aText);
    const b = tokenize(bText);
    const m = a.length, n = b.length;

    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++)
        for (let j = 1; j <= n; j++)
            dp[i][j] = a[i-1] === b[j-1]
                ? dp[i-1][j-1] + 1
                : Math.max(dp[i-1][j], dp[i][j-1]);

    const left = [], right = [];
    let i = m, j = n;
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && a[i-1] === b[j-1]) {
            left.unshift({ text: a[i-1], changed: false });
            right.unshift({ text: b[j-1], changed: false });
            i--; j--;
        } else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) {
            right.unshift({ text: b[j-1], changed: true });
            j--;
        } else {
            left.unshift({ text: a[i-1], changed: true });
            i--;
        }
    }
    return { left, right };
}

function InlineTokens({ tokens, highlightClass }) {
    return (
        <>
            {tokens.map((tok, i) =>
                tok.changed
                    ? <mark key={i} className={highlightClass}>{tok.text}</mark>
                    : <span key={i}>{tok.text}</span>
            )}
        </>
    );
}

// ── Component ──────────────────────────────────────────────────────────────

const SideBySideDiff = ({ original, boosted }) => {
    const [expanded, setExpanded] = useState(new Set());

    const rawDiff = computeLineDiff(original, boosted);
    const additions = rawDiff.filter(d => d.type === 'add').length;
    const removals  = rawDiff.filter(d => d.type === 'remove').length;

    if (additions === 0 && removals === 0) {
        return (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No text changes detected.
            </p>
        );
    }

    const rows = buildRows(rawDiff, 2);

    return (
        <div className="space-y-2">
            <div className="flex gap-3 text-xs font-medium">
                <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-700 dark:text-green-400">+{additions} added</span>
                <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-700 dark:text-red-400">−{removals} removed</span>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-2 rounded-t-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/60">
                    Original
                </div>
                <div className="px-3 py-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400 bg-gray-50 dark:bg-gray-800/60 border-l border-gray-200 dark:border-gray-700">
                    Boosted
                </div>
            </div>

            {/* Diff rows */}
            <div className="rounded-b-lg border border-t-0 border-gray-200 dark:border-gray-700 overflow-hidden font-mono text-xs leading-relaxed max-h-[400px] overflow-y-auto">
                {rows.map((row, idx) => {
                    if (row.type === 'collapse') {
                        const key = `c-${idx}`;
                        if (expanded.has(key)) return null;
                        return (
                            <button key={key}
                                onClick={() => setExpanded(prev => new Set([...prev, key]))}
                                className="w-full text-left px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                ··· {row.count} unchanged line{row.count !== 1 ? 's' : ''} — click to expand
                            </button>
                        );
                    }

                    if (row.type === 'same') {
                        return (
                            <div key={idx} className="grid grid-cols-2 border-t border-gray-100 dark:border-gray-800 first:border-t-0">
                                <div className="px-3 py-0.5 whitespace-pre-wrap break-all min-h-[1.4rem] text-gray-400 dark:text-gray-500">{row.left}</div>
                                <div className="px-3 py-0.5 whitespace-pre-wrap break-all min-h-[1.4rem] border-l border-gray-100 dark:border-gray-800 text-gray-400 dark:text-gray-500">{row.right}</div>
                            </div>
                        );
                    }

                    if (row.type === 'change') {
                        const { left: lToks, right: rToks } = wordDiff(row.left ?? '', row.right ?? '');
                        return (
                            <div key={idx} className="grid grid-cols-2 border-t border-gray-100 dark:border-gray-800 first:border-t-0">
                                <div className="px-3 py-0.5 whitespace-pre-wrap break-all min-h-[1.4rem] bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-300">
                                    <InlineTokens tokens={lToks} highlightClass="bg-red-400/80 dark:bg-red-500/70 rounded-sm" />
                                </div>
                                <div className="px-3 py-0.5 whitespace-pre-wrap break-all min-h-[1.4rem] border-l border-gray-100 dark:border-gray-800 bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-300">
                                    <InlineTokens tokens={rToks} highlightClass="bg-green-400/80 dark:bg-green-500/70 rounded-sm" />
                                </div>
                            </div>
                        );
                    }

                    // pure remove or pure add
                    const isRemove = row.type === 'remove';
                    return (
                        <div key={idx} className="grid grid-cols-2 border-t border-gray-100 dark:border-gray-800 first:border-t-0">
                            <div className={`px-3 py-0.5 whitespace-pre-wrap break-all min-h-[1.4rem] ${isRemove ? 'bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-300' : 'text-gray-300 dark:text-gray-600'}`}>
                                {isRemove ? row.left : ''}
                            </div>
                            <div className={`px-3 py-0.5 whitespace-pre-wrap break-all min-h-[1.4rem] border-l border-gray-100 dark:border-gray-800 ${!isRemove ? 'bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-300' : 'text-gray-300 dark:text-gray-600'}`}>
                                {!isRemove ? row.right : ''}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SideBySideDiff;
