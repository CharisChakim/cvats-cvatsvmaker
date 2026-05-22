'use client';

import { useState } from 'react';

function computeLineDiff(oldText, newText) {
    const a = oldText.split('\n');
    const b = newText.split('\n');
    const m = a.length, n = b.length;

    // LCS dp table
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i-1] === b[j-1]
                ? dp[i-1][j-1] + 1
                : Math.max(dp[i-1][j], dp[i][j-1]);
        }
    }

    // Backtrack
    const diff = [];
    let i = m, j = n;
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && a[i-1] === b[j-1]) {
            diff.unshift({ type: 'same', text: a[i-1] });
            i--; j--;
        } else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) {
            diff.unshift({ type: 'add', text: b[j-1] });
            j--;
        } else {
            diff.unshift({ type: 'remove', text: a[i-1] });
            i--;
        }
    }
    return diff;
}

// Collapse runs of unchanged lines that are more than `ctx` lines away from a change
function collapseSame(diff, ctx = 2) {
    const result = [];
    let i = 0;
    while (i < diff.length) {
        if (diff[i].type !== 'same') {
            result.push(diff[i++]);
            continue;
        }
        // Find the end of this 'same' run
        let end = i;
        while (end < diff.length && diff[end].type === 'same') end++;
        const runLen = end - i;
        const prevIsChange = i > 0;
        const nextIsChange = end < diff.length;

        if (runLen <= ctx * 2) {
            // Short run — show all
            for (let k = i; k < end; k++) result.push(diff[k]);
        } else {
            // Show ctx lines at start and end, collapse middle
            for (let k = i; k < i + (prevIsChange ? ctx : 0); k++) result.push(diff[k]);
            const collapseCount = runLen - (prevIsChange ? ctx : 0) - (nextIsChange ? ctx : 0);
            if (collapseCount > 0) result.push({ type: 'collapse', count: collapseCount });
            for (let k = end - (nextIsChange ? ctx : 0); k < end; k++) result.push(diff[k]);
        }
        i = end;
    }
    return result;
}

const CvDiff = ({ original, boosted }) => {
    const [expanded, setExpanded] = useState(new Set());

    const rawDiff = computeLineDiff(original, boosted);
    const diff = collapseSame(rawDiff, 2);

    const additions = rawDiff.filter(d => d.type === 'add').length;
    const removals  = rawDiff.filter(d => d.type === 'remove').length;

    if (additions === 0 && removals === 0) {
        return (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No text changes detected.
            </p>
        );
    }

    return (
        <div className="space-y-2">
            <div className="flex gap-3 text-xs font-medium">
                <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-700 dark:text-green-400">+{additions} added</span>
                <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-700 dark:text-red-400">−{removals} removed</span>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden font-mono text-xs leading-relaxed max-h-[420px] overflow-y-auto">
                {diff.map((entry, idx) => {
                    if (entry.type === 'collapse') {
                        const key = `collapse-${idx}`;
                        return expanded.has(key) ? null : (
                            <button key={key} onClick={() => setExpanded(prev => new Set([...prev, key]))}
                                className="w-full text-left px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                ··· {entry.count} unchanged line{entry.count !== 1 ? 's' : ''} — click to expand
                            </button>
                        );
                    }
                    const bg = entry.type === 'add'    ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                             : entry.type === 'remove' ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 line-through opacity-70'
                             : 'text-gray-500 dark:text-gray-500';
                    const prefix = entry.type === 'add' ? '+' : entry.type === 'remove' ? '−' : ' ';
                    return (
                        <div key={idx} className={`flex px-3 py-0.5 whitespace-pre-wrap break-all ${bg}`}>
                            <span className="select-none w-4 shrink-0 opacity-60">{prefix}</span>
                            <span>{entry.text || ' '}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CvDiff;
