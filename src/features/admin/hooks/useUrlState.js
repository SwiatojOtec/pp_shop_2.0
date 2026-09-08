import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Keeps list state (search / filters / active tab) in the URL query string,
 * so navigating back to a list from a card does not reset it
 * (docs/admin-redesign/00-plan.md, rule 5).
 *
 * @param {Record<string, string>} defaults - key -> default value. A param
 *   is written to the URL only when it differs from its default, and is
 *   read back as the default when absent or empty.
 * @returns {[Record<string,string>, (patch: Record<string,string>) => void]}
 */
export function useUrlState(defaults) {
    const [searchParams, setSearchParams] = useSearchParams();
    const defaultsKey = JSON.stringify(defaults);

    const state = useMemo(() => {
        const parsedDefaults = JSON.parse(defaultsKey);
        const result = { ...parsedDefaults };
        for (const key of Object.keys(parsedDefaults)) {
            const value = searchParams.get(key);
            if (value != null && value !== '') result[key] = value;
        }
        return result;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, defaultsKey]);

    const setState = useCallback(
        (patch) => {
            const parsedDefaults = JSON.parse(defaultsKey);
            setSearchParams(
                (prev) => {
                    const next = new URLSearchParams(prev);
                    for (const [key, value] of Object.entries(patch)) {
                        const isDefaultValue = value == null || value === '' || value === parsedDefaults[key];
                        if (isDefaultValue) next.delete(key);
                        else next.set(key, value);
                    }
                    return next;
                },
                { replace: true }
            );
        },
        [setSearchParams, defaultsKey]
    );

    return [state, setState];
}
