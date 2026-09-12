import { useEffect, useRef, useState } from 'react';

/** Плавно «доганяє» значення до нового числа замість миттєвого стрибка —
 *  дрібна, але помітна анімація на зміну періоду/товару в KPI-картках. */
export function useCountUp(target, duration = 500) {
    const [value, setValue] = useState(target);
    const frameRef = useRef(null);
    const fromRef = useRef(target);

    useEffect(() => {
        const from = fromRef.current;
        const to = Number(target) || 0;
        if (from === to) return undefined;
        const start = performance.now();

        function tick(now) {
            const progress = Math.min(1, (now - start) / duration);
            const eased = 1 - (1 - progress) ** 3; // ease-out cubic
            setValue(from + (to - from) * eased);
            if (progress < 1) {
                frameRef.current = requestAnimationFrame(tick);
            } else {
                fromRef.current = to;
            }
        }
        frameRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frameRef.current);
    }, [target, duration]);

    return value;
}
