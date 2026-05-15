import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Edit2, ClipboardList, CheckCircle2, Trash2 } from 'lucide-react';
import { warehouseApi, inventoryApi } from '../../services/api';

const RETURN_TO = '/admin/warehouses/positions';
const rentEditUrl = (productId) =>
    `/admin/rent/${productId}?returnTo=${encodeURIComponent(RETURN_TO)}`;

const STATUS_LABEL = {
    active: 'Активна',
    booked: 'Заброньовано',
    overdue: 'Прострочено',
    returned: 'Повернено',
    draft: 'Чернетка',
};

export default function WarehouseProductWorkModal({
    open,
    onClose,
    inventoryRow,
    warehouses,
    selectedWarehouseId,
    onUpdated,
}) {
    const navigate = useNavigate();
    const [returnToId, setReturnToId] = useState('');
    const [returnBusy, setReturnBusy] = useState(false);
    const [rentals, setRentals] = useState([]);
    const [rentalsLoading, setRentalsLoading] = useState(false);

    const p = inventoryRow?.Product;
    const productId = p?.id;
    const maxMove = inventoryRow?.quantity ?? 0;

    const selectedWarehouse = useMemo(
        () => (warehouses || []).find((w) => w.id === selectedWarehouseId) || null,
        [warehouses, selectedWarehouseId]
    );
    const isRepairWarehouse = selectedWarehouse?.name === 'У ремонті';

    const targetWarehouses = useMemo(
        () => (warehouses || []).filter((w) => w.id !== selectedWarehouseId),
        [warehouses, selectedWarehouseId]
    );

    useEffect(() => {
        if (!open || !productId) return;
        setReturnToId(targetWarehouses[0]?.id ? String(targetWarehouses[0].id) : '');
    }, [open, productId, targetWarehouses]);

    useEffect(() => {
        if (!open || !productId) {
            setRentals([]);
            return;
        }
        let cancelled = false;
        (async () => {
            setRentalsLoading(true);
            try {
                const data = await warehouseApi.productRentals(productId);
                if (!cancelled) setRentals(Array.isArray(data) ? data : []);
            } catch {
                if (!cancelled) setRentals([]);
            } finally {
                if (!cancelled) setRentalsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [open, productId]);

    if (!open || !inventoryRow || !p) return null;

    const goEdit = () => {
        navigate(rentEditUrl(productId));
        onClose();
    };

    const doDeleteFromWarehouse = async () => {
        if (!inventoryRow?.id) return;
        if (!window.confirm(`Видалити позицію «${p.name}» з поточного складу?`)) return;
        try {
            await inventoryApi.deleteItem(inventoryRow.id);
            onUpdated?.();
            onClose();
        } catch (e) {
            alert(e.message || 'Помилка');
        }
    };

    const doReturnFromRepair = async () => {
        const toId = Number(returnToId);
        if (!toId) {
            alert('Оберіть склад для повернення.');
            return;
        }
        const qty = Math.floor(Number(maxMove));
        if (!Number.isFinite(qty) || qty <= 0) {
            alert('Немає кількості для переміщення.');
            return;
        }
        if (!window.confirm(`Повернути «${p.name}» з ремонту на склад призначення? (${qty} шт.)`)) return;
        setReturnBusy(true);
        try {
            await inventoryApi.move({
                productId,
                fromWarehouseId: selectedWarehouseId,
                toWarehouseId: toId,
                quantity: qty,
            });
            await inventoryApi.restoreInStock({ productId });
            onUpdated?.();
            onClose();
        } catch (e) {
            alert(e.message || 'Помилка');
        } finally {
            setReturnBusy(false);
        }
    };

    return (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
            <div className="admin-modal-card admin-modal-card--work-product" onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.15rem' }}>{p.name}</h2>
                        {p.sku && <code style={{ fontSize: '0.82rem', color: '#666' }}>{p.sku}</code>}
                    </div>
                    <button type="button" className="action-btn" onClick={onClose} aria-label="Закрити">
                        <X size={20} />
                    </button>
                </div>

                <div className="admin-work-product-actions">
                    <button type="button" className="btn btn-secondary admin-work-product-actions__row" onClick={goEdit}>
                        <Edit2 size={16} style={{ marginRight: '8px' }} /> Редагувати картку оренди
                    </button>

                    {isRepairWarehouse && (
                        <div className="admin-work-product-block">
                            <div style={{ fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <CheckCircle2 size={16} /> Повернути з ремонту
                            </div>
                            <div className="form-row" style={{ gridTemplateColumns: '1fr auto', alignItems: 'end' }}>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label>На склад</label>
                                    <select value={returnToId} onChange={(e) => setReturnToId(e.target.value)}>
                                        {targetWarehouses.map((w) => (
                                            <option key={w.id} value={w.id}>{w.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <button type="button" className="btn btn-primary" disabled={returnBusy} onClick={doReturnFromRepair}>
                                    {returnBusy ? '…' : 'Повернути'}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="admin-work-product-block">
                        <div style={{ fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ClipboardList size={16} /> Заявки оренди
                        </div>
                        {rentalsLoading ? (
                            <p style={{ color: '#888', fontSize: '0.9rem' }}>Завантаження…</p>
                        ) : rentals.length === 0 ? (
                            <p style={{ color: '#888', fontSize: '0.9rem' }}>Немає пов’язаних заявок.</p>
                        ) : (
                            <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: '0.9rem' }}>
                                {rentals.map((r) => (
                                    <li key={r.id} style={{ marginBottom: '8px' }}>
                                        <Link to={`/admin/rental-applications/${r.id}`} style={{ fontWeight: 700, color: 'var(--admin-accent)' }}>
                                            {r.applicationNumber}
                                        </Link>
                                        {' · '}
                                        {STATUS_LABEL[r.status] || r.status}
                                        {r.clientName && ` · ${r.clientName}`}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                        <button type="button" className="btn btn-danger" onClick={doDeleteFromWarehouse} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <Trash2 size={16} /> Видалити зі складу
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
