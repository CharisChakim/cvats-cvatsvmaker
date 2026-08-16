'use client';

import { useId } from 'react';

/**
 * C-VATS monogram, built the way the VOC mark was: two letters sharing one
 * composition rather than sitting side by side. The C and V interlock, and
 * conveniently spell the thing the product makes.
 *
 * Where the V crosses the C, the C is masked away rather than covered by a
 * knockout in the background colour — the header sits on a translucent
 * material, so any solid knockout would show as a mismatched sliver.
 */
const Logo = ({ size = 30, className = '' }) => {
    const maskId = useId();

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 64 64"
            fill="none"
            aria-hidden="true"
            className={className}
        >
            <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
                <rect width="64" height="64" fill="white" />
                {/* Fattened V carves the breathing room out of the C */}
                <path
                    d="M21 23 33.5 48 46 23"
                    stroke="black"
                    strokeWidth="13"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </mask>

            <path
                d="M45 16.5A21.5 21.5 0 1 0 45 47.5"
                stroke="currentColor"
                strokeWidth="7.5"
                strokeLinecap="round"
                mask={`url(#${maskId})`}
            />
            <path
                d="M21 23 33.5 48 46 23"
                className="stroke-primary-400"
                strokeWidth="7.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};

export default Logo;
