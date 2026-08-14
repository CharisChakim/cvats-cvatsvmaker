/**
 * The hero's résumé sheet. Inline SVG rather than a raster mock so it stays
 * crisp at any size and so the "matched keyword" highlights can use the live
 * accent token — the sheet itself stays paper-white in both themes, because a
 * résumé is printed on paper regardless of what theme you read the app in.
 */
const line = (x, y, w, o = 0.16) => (
    <rect key={`${x}-${y}`} x={x} y={y} width={w} height="4.5" rx="2.25" fill="#1A1A18" opacity={o} />
);

const CvPreviewArt = ({ className = '' }) => (
    <svg viewBox="0 0 280 396" className={className} role="img" aria-label="Résumé preview with matched keywords highlighted">
        <rect width="280" height="396" rx="6" fill="#FFFFFF" />

        {/* Identity */}
        <text x="24" y="46" fill="#1A1A18" fontSize="17" fontWeight="600" letterSpacing="-0.4">
            Amelia Hartono
        </text>
        <text x="24" y="63" fill="rgb(var(--color-primary-400))" fontSize="9.5" fontWeight="600" letterSpacing="0.9">
            SENIOR BACKEND ENGINEER
        </text>
        {line(24, 74, 150, 0.12)}

        <rect x="24" y="88" width="232" height="1" fill="#1A1A18" opacity="0.12" />

        {/* Experience */}
        <text x="24" y="108" fill="#1A1A18" fontSize="8" fontWeight="700" letterSpacing="1.4">
            EXPERIENCE
        </text>
        <text x="24" y="128" fill="#1A1A18" fontSize="10" fontWeight="600">
            Payments Platform · Tokopedia
        </text>
        {line(24, 136, 78, 0.3)}
        {line(24, 150, 232)}
        {line(24, 161, 214)}

        {/* A matched keyword, called out the way the scorer sees it */}
        <rect x="22" y="170" width="74" height="15" rx="4" fill="rgb(var(--color-primary-400))" opacity="0.14" />
        <text x="28" y="181" fill="rgb(var(--color-primary-400))" fontSize="8.5" fontWeight="600">
            distributed systems
        </text>
        {line(100, 175, 156)}

        <text x="24" y="208" fill="#1A1A18" fontSize="10" fontWeight="600">
            Backend Engineer · Gojek
        </text>
        {line(24, 216, 70, 0.3)}
        {line(24, 230, 232)}
        {line(24, 241, 190)}

        <rect x="24" y="262" width="232" height="1" fill="#1A1A18" opacity="0.12" />

        {/* Skills */}
        <text x="24" y="282" fill="#1A1A18" fontSize="8" fontWeight="700" letterSpacing="1.4">
            SKILLS
        </text>
        {[
            { x: 24, w: 46, label: 'Go', matched: true },
            { x: 76, w: 62, label: 'PostgreSQL', matched: false },
            { x: 144, w: 54, label: 'Kafka', matched: true },
            { x: 204, w: 52, label: 'gRPC', matched: false },
        ].map(chip => (
            <g key={chip.label}>
                <rect
                    x={chip.x}
                    y="292"
                    width={chip.w}
                    height="17"
                    rx="8.5"
                    fill={chip.matched ? 'rgb(var(--color-primary-400))' : '#1A1A18'}
                    opacity={chip.matched ? 0.14 : 0.06}
                />
                <text
                    x={chip.x + chip.w / 2}
                    y="304"
                    textAnchor="middle"
                    fontSize="8.5"
                    fontWeight="600"
                    fill={chip.matched ? 'rgb(var(--color-primary-400))' : '#1A1A18'}
                    opacity={chip.matched ? 1 : 0.55}
                >
                    {chip.label}
                </text>
            </g>
        ))}

        {line(24, 328, 232, 0.1)}
        {line(24, 339, 170, 0.1)}
        {line(24, 350, 205, 0.1)}
    </svg>
);

export default CvPreviewArt;
