'use client';

import { useEffect, useState } from 'react';
import { CgSpinner } from 'react-icons/cg';

/**
 * Shown while a route transition is in flight. It exists so a click never looks
 * ignored: the previous behaviour gave no feedback at all, so people clicked a
 * second destination and the first one landed later, seemingly at random.
 *
 * The overlay fades in after a short delay so genuinely fast navigations don't
 * flash a spinner on screen.
 */
const RouteOverlay = ({ label, delay = 180 }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), delay);
        return () => clearTimeout(timer);
    }, [delay]);

    if (!visible) return null;

    return (
        <div
            role="status"
            aria-live="polite"
            className="fixed inset-0 z-[60] flex items-center justify-center bg-paper/70 backdrop-blur-sm animate-fade-in"
        >
            <div className="flex items-center gap-3 rounded-2xl px-5 py-3.5 glass shadow-layered-lg">
                <CgSpinner className="animate-spin text-lg text-primary-400" />
                <span className="text-sm font-medium text-ink">{label}</span>
            </div>
        </div>
    );
};

export default RouteOverlay;
