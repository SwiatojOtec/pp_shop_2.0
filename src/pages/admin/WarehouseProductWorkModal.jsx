import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Edit2, ArrowRightLeft, Wrench, ClipboardList } from 'lucide-react';
import { API_URL } from '../../apiConfig';

const RETURN_TO = '/admin/warehouses/positions';
const rentEditUrl = (productId) =>
    `/admin/rent/${productId}?returnTo=${encodeURIComponent(RETURN_TO)}`;

const STATUS_LABEL = {
    active: 'Активна',
    booked: 'Заброньовано',
    overdue: 'Прострочено',
    returned: 'Повернено',
    draft: 'Чернетка'
};

export default function WarehouseProductWorkModal({
    open,
    onClose,
    inventoryRow,
    warehouses,
    selectedWarehouseId,
    token,
    onUpdated
}) {
    const navigate = useNavigate();
    const [moveToId, setMoveToId] = useState('');
    const [moveQty, setMoveQty] = useState(1);
    const [moveBusy, setMoveBusy] = useState(false);
    const [repairBusy, setRepairBusy] = useState(false);
    const [rentals, setRentals] = useState([]);
    const [rentalsLoading, setRentalsLoading] = useState(false);

    const p = inventoryRow?.Product;
    const productId = p?.id;
    const maxMove = inventoryRow?.quantity ?? 0;

    const authHeaders = useMemo(() => ({
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    }), [token]);

    const targetWarehouses = useMemo(
        () => (warehouses || []).filter((w) => w.id !== selectedWarehouseId),
        [warehouses, selectedWarehouseId]
    );

    useEffect(() => {
        if (!open || !productId) return;
        setMoveToId(targetWarehouses[0]?.id ? String(targetWarehouses[0].id) : '');
        setMoveQty(Math.min(Math.max(1, maxMove || 1), maxMove || 1));
    }, [open, productId, maxMove, targetWarehouses]);

    useEffect(() => {
        if (!open || !productId) {
            setRentals([]);
            return;
        }
        let cancelled = false;
        (async () => {
            setRentalsLoading(true);
            try {
                const res = await fetch(`${API_URL}/api/warehouse/product-rentals/${productId}`, { headers: authHeaders });
                const data = res.ok ? await res.json() : [];
                if (!cancelled) setRentals(Array.isArray(data) ? data : []);
            } catch {
                if (!cancelled) setRentals([]);
            } finally {
                if (!cancelled) setRentalsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [open, productId, authHeaders]);

    if (!open || !inventoryRow || !p) return null;

    const goEdit = () => {
        navigate(rentEditUrl(productId));
        onClose();
    };

    const doMove = async () => {
        const toId = Number(moveToId);
        const qty = Math.floor(Number(moveQty));
        if (!toId || !selectedWarehouseId) return;
        if (qty < 1 || qty > maxMove) {
            alert('Некоректна кількість для переміщення.');
            return;
        }
        setMoveBusy(true);
        try {
            const res = await fetch(`${API_URL}/api/inventory/move`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({
                    productId,
                    fromWarehouseId: selectedWarehouseId,
                    toWarehouseId: toId,
                    quantity: qty
                })
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Не вдалося перемістити');
            }
            onUpdated?.();
            onClose();
        } catch (e) {
            alert(e.message || 'Помилка');
        } finally {
            setMoveBusy(false);
        }
    };

    const doRepair = async () => {
        if (!window.confirm(`Відправити «${p.name}» у ремонт? Статус товару буде змінено на «На ремонті».`)) return;
        setRepairBusy(true);
        try {
            const res = await fetch(`${API_URL}/api/inventory/send-repair`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ productId })
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Не вдалося оновити статус');
            }
            onUpdated?.();
            onClose();
        } catch (e) {
            alert(e.message || 'Помилка');
        } finally {
            setRepairBusy(false);
        }
    };

    return (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="work-product-title" onClick={onClose}>
            <div className="admin-modal-card admin-modal-card--work-product" onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                    <div>
                        <h2 id="work-product-title" style={{ margin: 0, fontSize: '1.15rem' }}>Робота з товаром</h2>
                        <p style={{ margin: '6px 0 0', fontWeight: 700 }}>{p.name}</p>
                        <code style={{ fontSize: '0.82rem', color: '#666' }}>{p.sku}</code>
                    </div>
                    <button type="button" className="action-btn" onClick={onClose} aria-label="Закрити">
                        <X size={20} />
                    </button>
                </div>

                <div className="admin-work-product-actions">
                    <button type="button" className="btn btn-primary admin-work-product-actions__row" onClick={goEdit}>
                        <Edit2 size={18} />
                        Редагувати картку
                    </button>

                    <div className="admin-work-product-block">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontWeight: 700 }}>
                            <ArrowRightLeft size={18} />
                            Переміщення на інший склад
                        </div>
                        {targetWarehouses.length === 0 ? (
                            <p style={{ fontSize: '0.88rem', color: '#888' }}>Немає іншого складу. Створіть склад у розділі «Залишки».</p>
                        ) : (
                            <>
                                <div className="form-group admin-form" style={{ marginBottom: '10px' }}>
                                    <label>Склад призначення</label>
                                    <select
                                        value={moveToId}
                                        onChange={(e) => setMoveToId(e.target.value)}
                                    >
                                        {targetWarehouses.map((w) => (
                                            <option key={w.id} value={w.id}>{w.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group admin-form" style={{ marginBottom: '10px' }}>
                                    <label>Кількість (макс. {maxMove} на поточному складі)</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={maxMove}
                                        value={moveQty}
                                        onChange={(e) => setMoveQty(e.target.value)}
                                    />
                                </div>
                                <button type="button" className="btn btn-secondary" disabled={moveBusy || maxMove < 1} onClick={doMove}>
                                    {moveBusy ? 'Переміщення…' : 'Перемістити'}
                                </button>
                            </>
                        )}
                    </div>

                    <div className="admin-work-product-block">
                        <button
                            type="button"
                            className="btn btn-secondary admin-work-product-actions__row"
                            disabled={repairBusy}
                            onClick={doRepair}
                        >
                            <Wrench size={18} />
                            {repairBusy ? 'Збереження…' : 'Відправити в ремонт'}
                        </button>
                        <p style={{ fontSize: '0.78rem', color: '#888', margin: '8px 0 0' }}>
                            Встановлює статус товару «На ремонті» для клієнтського каталогу.
                        </p>
                    </div>

                    <div className="admin-work-product-block">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontWeight: 700 }}>
                            <ClipboardList size={18} />
                            Знаходиться в оренді / заявках
                        </div>
                        {rentalsLoading ? (
                            <p style={{ fontSize: '0.88rem', color: '#888' }}>Завантаження…</p>
                        ) : rentals.length === 0 ? (
                            <p style={{ fontSize: '0.88rem', color: '#888' }}>Немає заявок з цим товаром (у вибраних статусах).</p>
                        ) : (
                            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.9rem' }}>
                                {rentals.map((r) => (
                                    <li key={r.id} style={{ marginBottom: '8px' }}>
                                        <Link to={`/admin/rental-applications/${r.id}`} style={{ fontWeight: 700, color: 'var(--admin-accent)' }}>
                                            {r.applicationNumber}
                                        </Link>
                                        {' · '}{STATUS_LABEL[r.status] || r.status}
                                        {r.clientName && ` · ${r.clientName}`}
                                        {(r.rentFrom || r.rentTo) && (
                                            <span style={{ color: '#666' }}> ({r.rentFrom || '—'} — {r.rentTo || '—'})</span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
