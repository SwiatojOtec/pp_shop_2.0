import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../../services/api';

/** "Maybe you're looking for" suggestions from other warehouses when the current one has no matches. */
export function useInventorySuggestions({ search, warehouseId, hasLocalMatches }) {
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const qRaw = String(search || '').trim();
        if (!qRaw || qRaw.length < 2 || hasLocalMatches) {
            setSuggestions([]);
            return undefined;
        }
        const t = setTimeout(async () => {
            setLoading(true);
            try {
                const data = await inventoryApi.suggest({ q: qRaw, warehouseId: warehouseId || '' });
                if (!cancelled) setSuggestions(Array.isArray(data?.suggestions) ? data.suggestions : []);
            } catch {
                if (!cancelled) setSuggestions([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }, 260);
        return () => { cancelled = true; clearTimeout(t); };
    }, [search, warehouseId, hasLocalMatches]);

    return { suggestions, loading };
}
