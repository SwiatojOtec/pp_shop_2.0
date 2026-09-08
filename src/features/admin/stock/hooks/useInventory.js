import { useCallback, useEffect, useRef, useState } from 'react';
import { inventoryApi } from '../../../../services/api';

/** Loads inventory rows (rent products only) for one warehouse. */
export function useInventory(warehouseId) {
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(false);
    // Guards against an older warehouse's response arriving after a newer one
    // (e.g. switching warehouses twice in quick succession).
    const requestIdRef = useRef(0);

    const fetchInventory = useCallback(async (id) => {
        const requestId = ++requestIdRef.current;
        if (!id) {
            setInventory([]);
            return;
        }
        setLoading(true);
        try {
            const data = await inventoryApi.list({ warehouseId: id });
            if (requestId !== requestIdRef.current) return;
            setInventory(Array.isArray(data) ? data.filter((i) => i?.Product?.isRent) : []);
        } catch {
            if (requestId !== requestIdRef.current) return;
            setInventory([]);
        } finally {
            if (requestId === requestIdRef.current) setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInventory(warehouseId);
    }, [warehouseId, fetchInventory]);

    const refetch = useCallback(() => fetchInventory(warehouseId), [fetchInventory, warehouseId]);

    return { inventory, setInventory, loading, refetch };
}
