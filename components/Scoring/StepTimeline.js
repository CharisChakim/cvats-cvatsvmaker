'use client';

import { useEffect, useState } from 'react';
import { FaCircleCheck } from 'react-icons/fa6';

const StepTimeline = ({ steps, t, accentBg, accentRing, accentText }) => {
    const [activeStep, setActiveStep] = useState(0);

    useEffect(() => {
        let elapsed = 0;
        const timers = steps.slice(0, -1).map((s, i) => {
            elapsed += s.delay;
            return setTimeout(() => setActiveStep(i + 1), elapsed);
        });
        return () => timers.forEach(clearTimeout);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="flex flex-col gap-0 w-full max-w-xs">
            {steps.map(({ icon: Icon, key }, i) => {
                const done    = i < activeStep;
                const active  = i === activeStep;
                const pending = i > activeStep;
                const isLast  = i === steps.length - 1;
                return (
                    <div key={i} className="flex items-stretch gap-3">
                        <div className="flex flex-col items-center">
                            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-500 ${
                                done   ? 'bg-green-500 text-white' :
                                active ? `${accentBg} text-white ring-4 ${accentRing}` :
                                         'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                            }`}>
                                {done ? <FaCircleCheck className="text-sm" /> : <Icon className="text-xs" />}
                            </div>
                            {!isLast && (
                                <div className={`w-0.5 flex-1 my-1 rounded-full transition-all duration-700 ${done ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700'}`}
                                    style={{ minHeight: '1rem' }} />
                            )}
                        </div>
                        <div className={`flex items-center gap-2 ${isLast ? 'pb-0' : 'pb-4'} transition-all duration-500 ${pending ? 'opacity-35' : 'opacity-100'}`}>
                            <span className={`text-sm transition-all duration-500 ${
                                done   ? 'text-green-600 dark:text-green-400' :
                                active ? `font-semibold ${accentText}` :
                                         'text-gray-500 dark:text-gray-400'
                            }`}>
                                {t(key)}
                            </span>
                            {active && (
                                <span className="flex gap-0.5">
                                    <span className="h-1 w-1 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
                                    <span className="h-1 w-1 rounded-full bg-current animate-bounce [animation-delay:120ms]" />
                                    <span className="h-1 w-1 rounded-full bg-current animate-bounce [animation-delay:240ms]" />
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default StepTimeline;
