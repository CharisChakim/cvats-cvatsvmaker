'use client';

const MiniScoreCard = ({ label, results, highlight, delta, compact = false }) => {
    const score = results.overallScore;
    const r = compact ? 28 : 36;
    const circ = 2 * Math.PI * r;
    const dash = (circ * score) / 100;
    const size = compact ? 72 : 96;
    const strokeColor = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
    const textColor   = score >= 75 ? 'text-green-500' : score >= 50 ? 'text-amber-500' : 'text-red-500';
    const barColor    = highlight ? 'bg-violet-500' : 'bg-primary-400';

    const inner = (
        <>
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">{label}</p>

            <div className="relative">
                <svg width={size} height={size} className="-rotate-90" aria-hidden>
                    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-gray-200 dark:text-gray-700" />
                    <circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth="6" stroke={strokeColor}
                        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`font-black ${textColor} ${compact ? 'text-xl' : 'text-2xl'}`}>{score}</span>
                </div>
            </div>

            {delta !== undefined && (
                <div className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    delta > 0 ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                    : delta < 0 ? 'bg-red-500/10 text-red-500 dark:text-red-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                }`}>
                    {delta > 0 ? `+${delta} pts` : delta < 0 ? `${delta} pts` : 'No change'}
                </div>
            )}

            <div className="w-full space-y-2">
                {['skills', 'experience', 'education', 'keywords'].map(key => (
                    <div key={key}>
                        <div className="flex justify-between text-xs mb-0.5">
                            <span className="text-gray-500 dark:text-gray-400 capitalize">{key}</span>
                            <span className="font-medium tabular-nums">{results.breakdown[key].score}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700">
                            <div className={`h-1.5 rounded-full transition-all duration-700 ${barColor}`}
                                style={{ width: `${results.breakdown[key].score}%` }} />
                        </div>
                    </div>
                ))}
            </div>
        </>
    );

    if (compact) {
        return <div className="flex flex-col items-center gap-3 transition-all duration-300">{inner}</div>;
    }

    return (
        <div className={`card p-5 flex flex-col items-center gap-4 transition-all duration-300 ${highlight ? 'ring-2 ring-violet-400 shadow-lg shadow-violet-400/10' : ''}`}>
            {inner}
        </div>
    );
};

export default MiniScoreCard;
