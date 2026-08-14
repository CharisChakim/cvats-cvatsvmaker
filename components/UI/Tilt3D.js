'use client';

import { useEffect, useState } from 'react';
import Tilt from 'react-parallax-tilt';

/**
 * Restrained 3D tilt for the app's few hero surfaces.
 * Angles stay small on purpose — enough to read as depth, not as a gimmick.
 */
const Tilt3D = ({ children, className = '', angle = 6, glare = true, scale = 1.015 }) => {
    const [enabled, setEnabled] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const fine = window.matchMedia('(pointer: fine)');
        const update = () => setEnabled(!mq.matches && fine.matches);
        update();
        mq.addEventListener('change', update);
        fine.addEventListener('change', update);
        return () => {
            mq.removeEventListener('change', update);
            fine.removeEventListener('change', update);
        };
    }, []);

    if (!enabled) return <div className={className}>{children}</div>;

    return (
        <Tilt
            className={`preserve-3d ${className}`}
            tiltMaxAngleX={angle}
            tiltMaxAngleY={angle}
            perspective={1400}
            scale={scale}
            transitionSpeed={600}
            tiltReverse
            glareEnable={glare}
            glareMaxOpacity={0.12}
            glarePosition="all"
            glareBorderRadius="16px"
        >
            {children}
        </Tilt>
    );
};

export default Tilt3D;
