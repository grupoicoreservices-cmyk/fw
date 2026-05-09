import { useEffect, useRef, useState } from 'react';

export function usePolling(fn, deps = [], intervalMs = 3000) {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const mounted = useRef(true);
    const fnRef = useRef(fn);
    fnRef.current = fn;

    useEffect(() => {
        mounted.current = true;
        let timer = null;
        const tick = async () => {
            try {
                const res = await fnRef.current();
                if (mounted.current) {
                    setData(res);
                    setError(null);
                    setLoading(false);
                }
            } catch (e) {
                if (mounted.current) {
                    setError(e);
                    setLoading(false);
                }
            } finally {
                if (mounted.current) {
                    timer = setTimeout(tick, intervalMs);
                }
            }
        };
        tick();
        return () => {
            mounted.current = false;
            if (timer) clearTimeout(timer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...deps, intervalMs]);

    return { data, error, loading };
}
