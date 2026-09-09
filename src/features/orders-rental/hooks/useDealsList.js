import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ordersApi } from '../../../services/api';

const PAGE_SIZE = 20;

/** Список «Угоди» — стан живе в URL (?type=&q=&status=&page=), дані — з сервера. */
export function useDealsList() {
    const [searchParams, setSearchParams] = useSearchParams();
    const type = searchParams.get('type') || 'all';
    const status = searchParams.get('status') || '';
    const q = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page'), 10) || 1;

    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [counts, setCounts] = useState({ all: 0, shop: 0, rent: 0 });
    const [loading, setLoading] = useState(true);

    function updateParams(patch) {
        const next = new URLSearchParams(searchParams);
        Object.entries(patch).forEach(([key, value]) => {
            if (!value) next.delete(key);
            else next.set(key, value);
        });
        if (!('page' in patch)) next.delete('page');
        setSearchParams(next, { replace: true });
    }

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        const timer = setTimeout(async () => {
            try {
                const data = await ordersApi.deals({ q, status, type, page, limit: PAGE_SIZE });
                if (cancelled) return;
                setRows(Array.isArray(data?.rows) ? data.rows : []);
                setTotal(data?.total || 0);
                setCounts(data?.counts || { all: 0, shop: 0, rent: 0 });
            } catch {
                if (!cancelled) {
                    setRows([]);
                    setTotal(0);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }, q ? 300 : 0);

        return () => { cancelled = true; clearTimeout(timer); };
    }, [q, status, type, page]);

    const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

    return {
        rows,
        total,
        totalPages,
        counts,
        loading,
        type,
        status,
        q,
        page,
        pageSize: PAGE_SIZE,
        setType: (value) => updateParams({ type: value === 'all' ? '' : value }),
        setStatus: (value) => updateParams({ status: value }),
        setQ: (value) => updateParams({ q: value }),
        setPage: (value) => updateParams({ page: value > 1 ? String(value) : '' }),
    };
}
