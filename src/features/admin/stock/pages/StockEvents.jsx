import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { warehouseApi, warehousesApi, productsApi } from '../../../../services/api';
import { exportWarehouseEventsPdf } from '../model/exportWarehousePdf';
import PageHeader from '../../ui/PageHeader';
import EmptyState from '../../ui/EmptyState';
import '../stock.css';

const fmt = (d) => {
    if (!d) return '';
    const x = new Date(d);
    return `${String(x.getDate()).padStart(2, '0')}.${String(x.getMonth() + 1).padStart(2, '0')}.${x.getFullYear()} ${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`;
};

const ACTION_LABELS = {
    move_warehouse: 'Переміщення',
    bulk_move_warehouse: 'Групове переміщення',
    send_repair: 'В ремонт',
    send_repair_move: 'В ремонт',
    needs_repair: 'Потребує ремонту',
    restore_in_stock: 'З ремонту',
    update_inventory: 'Зміна залишку',
    delete_inventory_item: 'Списання',
    warehouse_delete_request: 'Запит на видалення складу',
    warehouse_delete_request_approved: 'Видалення складу підтверджено',
    warehouse_delete_request_rejected: 'Видалення складу відхилено',
    warehouse_delete_approved: 'Склад видалено',
    warehouse_delete_rejected: 'Запит відхилено',
    restore_all_inventory_one_each: 'Масове відновлення',
    set_status: 'Зміна статусу',
};

function actionLabel(action) {
    return ACTION_LABELS[action] || action || 'Подія';
}

/** Структурований рядок «Що сталось» з полів події, а не з готового message
 *  (docs/admin-redesign/03-screens.md, 1.3): <товар> · <кількість> · <звідки> → <куди>. */
function WhatHappened({ ev }) {
    const parts = [];
    if (ev.productId) {
        parts.push(
            <Link key="p" to={`/admin/catalog/tools/${ev.productId}`} className="stock-events-item-what">
                {ev.productName || `#${ev.productId}`}
            </Link>
        );
    } else if (ev.productName) {
        parts.push(ev.productName);
    }
    if (ev.quantity != null) parts.push(`${ev.quantity} шт.`);
    if (ev.fromWarehouseName || ev.toWarehouseName) {
        parts.push(`${ev.fromWarehouseName || '—'} → ${ev.toWarehouseName || '—'}`);
    }
    if (ev.rentalApplicationNumber) parts.push(`заявка ${ev.rentalApplicationNumber}`);

    if (!parts.length) return <span>{ev.message || '—'}</span>;
    return (
        <>
            {parts.map((part, i) => (
                <span key={i}>{i > 0 && ' · '}{part}</span>
            ))}
        </>
    );
}

const LIMIT = 50;

export default function StockEvents() {
    const [users, setUsers] = useState([]);
    const [userId, setUserId] = useState('');
    const [actions, setActions] = useState([]);
    const [action, setAction] = useState('');
    const [warehouses, setWarehouses] = useState([]);
    const [warehouseId, setWarehouseId] = useState('');
    const [productQuery, setProductQuery] = useState('');
    const [productResults, setProductResults] = useState([]);
    const [productId, setProductId] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');

    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [u, a] = await Promise.all([warehouseApi.eventUsers(), warehouseApi.eventActions()]);
                if (!cancelled) {
                    setUsers(Array.isArray(u) ? u : []);
                    setActions(Array.isArray(a) ? a : []);
                }
            } catch {
                if (!cancelled) { setUsers([]); setActions([]); }
            }
            try {
                const w = await warehousesApi.list();
                if (!cancelled) setWarehouses(Array.isArray(w) ? w : []);
            } catch {
                if (!cancelled) setWarehouses([]);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const buildParams = (nextOffset = 0) => {
        const params = { limit: LIMIT, offset: nextOffset };
        if (userId) params.userId = userId;
        if (productId) params.productId = productId;
        if (action) params.action = action;
        if (warehouseId) params.warehouseId = warehouseId;
        if (from) params.from = from;
        if (to) params.to = to;
        return params;
    };

    const load = async ({ reset = false } = {}) => {
        const nextOffset = reset ? 0 : offset;
        setLoading(true);
        setError(null);
        try {
            const json = await warehouseApi.events(buildParams(nextOffset));
            const rows = Array.isArray(json?.events) ? json.events : [];
            setEvents((prev) => (reset ? rows : [...prev, ...rows]));
            setOffset(nextOffset + rows.length);
            setHasMore(rows.length >= LIMIT);
        } catch (e) {
            setError(e.message || 'Помилка');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load({ reset: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, productId, action, warehouseId, from, to]);

    useEffect(() => {
        let cancelled = false;
        const q = productQuery.trim();
        if (!q || q.length < 2) {
            setProductResults([]);
            return undefined;
        }
        const t = setTimeout(async () => {
            try {
                const data = await productsApi.list({ search: q, isRent: true, includeHiddenRent: true, limit: 8 });
                if (!cancelled) setProductResults(Array.isArray(data) ? data : []);
            } catch {
                if (!cancelled) setProductResults([]);
            }
        }, 250);
        return () => { cancelled = true; clearTimeout(t); };
    }, [productQuery]);

    const resetFilters = () => {
        setUserId('');
        setAction('');
        setWarehouseId('');
        setProductId('');
        setProductQuery('');
        setProductResults([]);
        setFrom('');
        setTo('');
    };

    const hasActiveFilters = !!(userId || action || warehouseId || productId || from || to);

    return (
        <div className="stock-page">
            <PageHeader
                title="Журнал"
                subtitle="Всі зафіксовані зміни: переміщення, ремонт, правки кількості тощо."
                actions={(
                    <button
                        type="button"
                        className="ds-btn ds-btn--secondary"
                        disabled={!events.length}
                        onClick={() => exportWarehouseEventsPdf({ events })}
                    >
                        Експорт
                    </button>
                )}
            />

            <div className="stock-events-filters">
                <label className="stock-modal-field">
                    Тип дії
                    <select value={action} onChange={(e) => setAction(e.target.value)}>
                        <option value="">Всі</option>
                        {actions.map((a) => (
                            <option key={a} value={a}>{actionLabel(a)}</option>
                        ))}
                    </select>
                </label>
                <label className="stock-modal-field">
                    Склад
                    <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
                        <option value="">Всі</option>
                        {warehouses.map((w) => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                    </select>
                </label>
                <label className="stock-modal-field">
                    Користувач
                    <select value={userId} onChange={(e) => setUserId(e.target.value)}>
                        <option value="">Всі</option>
                        {users.map((u) => (
                            <option key={u.userId} value={u.userId}>{u.userDisplayName}</option>
                        ))}
                    </select>
                </label>
                <label className="stock-modal-field stock-events-product-field">
                    Товар
                    <input
                        type="text"
                        value={productQuery}
                        onChange={(e) => { setProductQuery(e.target.value); setProductId(''); }}
                        placeholder="Почніть вводити назву або SKU..."
                    />
                    {productResults.length > 0 && (
                        <div className="stock-events-product-results">
                            {productResults.map((p) => (
                                <button
                                    key={p.id}
                                    type="button"
                                    className="stock-events-product-result"
                                    onClick={() => {
                                        setProductId(String(p.id));
                                        setProductQuery(`${p.name}${p.sku ? ` (${p.sku})` : ''}`);
                                        setProductResults([]);
                                    }}
                                >
                                    <div className="stock-events-product-result-name">{p.name}</div>
                                    <div className="stock-events-product-result-sku">{p.sku || ''}</div>
                                </button>
                            ))}
                        </div>
                    )}
                </label>
                <label className="stock-modal-field">
                    Дата від
                    <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                </label>
                <label className="stock-modal-field">
                    Дата до
                    <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                </label>
                {hasActiveFilters && (
                    <button type="button" className="ds-btn ds-btn--secondary" onClick={resetFilters}>
                        Скинути фільтри
                    </button>
                )}
            </div>

            {error && <p className="stock-events-error">{error}</p>}

            <div className="stock-events-feed">
                {events.length === 0 && !loading ? (
                    <EmptyState title="Подій не знайдено" />
                ) : (
                    <ul className="stock-events-list">
                        {events.map((ev) => (
                            <li key={ev.id} className="stock-events-item">
                                <span className="stock-events-item-time">{fmt(ev.createdAt)}</span>
                                <span className="stock-events-item-chip">{actionLabel(ev.action)}</span>
                                <span className="stock-events-item-body">
                                    <span className="stock-events-item-text"><WhatHappened ev={ev} /></span>
                                    <span className="stock-events-item-who">{ev.userDisplayName || 'Система'}</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
                <div className="stock-events-more">
                    <button type="button" className="ds-btn ds-btn--secondary" disabled={loading || !hasMore} onClick={() => load({ reset: false })}>
                        {loading ? 'Завантаження…' : hasMore ? 'Показати ще' : 'Більше немає'}
                    </button>
                </div>
            </div>
        </div>
    );
}
