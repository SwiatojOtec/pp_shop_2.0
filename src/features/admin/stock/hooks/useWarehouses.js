import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { warehousesApi } from '../../../../services/api';

const SELECTED_WAREHOUSE_KEY = 'admin.selectedWarehouseId';

/** Loads warehouses and remembers/restores which one is selected (query param → last used → first). */
export function useWarehouses() {
    const [searchParams] = useSearchParams();
    const [warehouses, setWarehouses] = useState([]);
    const [manualSelection, setManualSelection] = useState(null);

    const fetchWarehouses = useCallback(async () => {
        try {
            const data = await warehousesApi.list();
            setWarehouses(Array.isArray(data) ? data : []);
        } catch {
            setWarehouses([]);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await warehousesApi.list();
                if (!cancelled) setWarehouses(Array.isArray(data) ? data : []);
            } catch {
                if (!cancelled) setWarehouses([]);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // Derived, not stored: avoids a setState-from-effect just to sync state that's
    // already fully computable from warehouses/searchParams/manualSelection.
    const selectedWarehouseId = useMemo(() => {
        if (manualSelection && warehouses.some((w) => w.id === manualSelection)) return manualSelection;
        if (!warehouses.length) return null;
        const fromQuery = Number(searchParams.get('warehouseId'));
        if (Number.isFinite(fromQuery) && warehouses.some((w) => w.id === fromQuery)) return fromQuery;
        const saved = Number(localStorage.getItem(SELECTED_WAREHOUSE_KEY));
        if (Number.isFinite(saved) && warehouses.some((w) => w.id === saved)) return saved;
        return warehouses[0].id;
    }, [warehouses, searchParams, manualSelection]);

    useEffect(() => {
        if (selectedWarehouseId) {
            localStorage.setItem(SELECTED_WAREHOUSE_KEY, String(selectedWarehouseId));
        }
    }, [selectedWarehouseId]);

    const createWarehouse = useCallback(async (data) => {
        const created = await warehousesApi.create(data);
        await fetchWarehouses();
        return created;
    }, [fetchWarehouses]);

    return {
        warehouses,
        selectedWarehouseId,
        setSelectedWarehouseId: setManualSelection,
        createWarehouse,
        refetch: fetchWarehouses,
    };
}
