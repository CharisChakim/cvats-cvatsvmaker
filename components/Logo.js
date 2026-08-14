/**
 * C-VATS mark: a sheet of paper with a screener's approval cut into it.
 * Monoline and inlined rather than an <img>, so the sheet inherits the ink
 * colour of whatever theme is active while the check keeps its accent green.
 */
const Logo = ({ size = 34, className = '' }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
        className={className}
    >
        {/* Sheet with a folded top corner */}
        <path
            d="M8.5 6.2a2 2 0 0 1 2-2h9.9L27.5 11v8.3"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M8.5 6.2v27.6a2 2 0 0 0 2 2h6.6"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M20.4 4.2V11h7.1"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
        />

        {/* Rules — the résumé's content, de-emphasised */}
        <path
            d="M13.4 16.2h9M13.4 21.4h6.2"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            opacity="0.38"
        />

        {/* Approval mark, sitting proud of the sheet's corner */}
        <circle cx="27.6" cy="27.6" r="9.1" className="fill-paper" />
        <circle cx="27.6" cy="27.6" r="7.4" className="fill-primary-400" />
        <path
            d="m24.1 27.7 2.5 2.5 5-5.3"
            stroke="rgb(var(--paper-raised))"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

export default Logo;
