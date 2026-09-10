import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Drawer from '../../../admin/ui/Drawer';
import StatusBadge from '../../../admin/ui/StatusBadge';
import { getStockStatusBadgeProps } from '../../../admin/stock/model/stockStatus';
import { warehouseApi } from '../../../../services/api';
import '../../../admin/stock/stock.css';

const ACTIVE_RENTAL_STATUSES = ['active', 'booked', 'overdue'];

const fmtUa = (iso) => (iso ? iso.split('-').reverse().join('.') : '—');

/**
 * Read-only "is it free right now" look-up for a tool, opened from the
 * calendar's event drawer (клік по назві інструмента) — a lighter sibling of
 * ProductWorkDrawer (стенд «Склад»): no warehouse-management actions, just
 * the availability count and the list of everything currently booking it, so
 * a manager can tell at a glance whether a tool is free without leaving the
 * calendar.
 */
export default function CalendarProductDrawer({ open, onClose, product }) {
    const [rentals, setRentals] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open || !product?.id) {
            setRentals([]);
            return undefined;
        }
        let cancelled = false;
        setLoading(true);
        (async () => {
            try {
                const data = await warehouseApi.productRentals(product.id);
                if (!cancelled) setRentals(Array.isArray(data) ? data : []);
            } catch {
                if (!cancelled) setRentals([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [open, product?.id]);

    if (!product) {
        return <Drawer open={open} onClose={onClose} title="Інструмент" width="md" />;
    }

    const statusBadge = getStockStatusBadgeProps(product);
    const free = Number(product.quantityAvailable) || 0;
    const current = rentals.filter((r) => ACTIVE_RENTAL_STATUSES.includes(r.status));

    return (
        <Drawer
            open={open}
            onClose={onClose}
            width="md"
            title={(
                <div className="stock-drawer-title">
                    <span>{product.name}</span>
                    {product.sku && <code className="stock-drawer-sku">{product.sku}</code>}
                </div>
            )}
        >
            <div className="stock-drawer-status">
                <StatusBadge tone={statusBadge.tone} label={statusBadge.label} />
                <span className="stock-drawer-status-qty">
                    {product.inventoryNumber || '—'} · {product.category || '—'}
                </span>
            </div>

            <div className="stock-qty-cluster stock-qty-cluster--lg">
                <div className={`stock-qty-num${free > 0 ? ' stock-qty-num--free' : ' stock-qty-num--zero'}`}>
                    <span className="stock-qty-value">{free}</span>
                    <span className="stock-qty-label">вільно зараз</span>
                </div>
            </div>

            <div className="stock-drawer-section">
                <div className="stock-drawer-section-title">Зараз в оренді</div>
                {loading ? (
                    <p className="stock-drawer-muted">Завантаження…</p>
                ) : current.length === 0 ? (
                    <p className="stock-drawer-muted">Немає активних заявок.</p>
                ) : (
                    <ul className="stock-drawer-rentals">
                        {current.map((r) => {
                            const dest = r.orderId ? `/admin/deals/${r.orderId}` : `/admin/rental-applications/${r.id}`;
                            return (
                                <li key={r.id} className="stock-drawer-rental-row">
                                    <Link to={dest} className="stock-drawer-rental-link" onClick={onClose}>
                                        {r.applicationNumber || `#${r.id}`} · {r.clientName || 'без імені'}
                                    </Link>
                                    <StatusBadge tone="neutral" label={`${fmtUa(r.rentFrom)} — ${fmtUa(r.rentTo)}`} />
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            <div className="stock-drawer-section">
                <Link to={`/admin/catalog/tools/${product.id}`} className="ds-btn ds-btn--secondary" onClick={onClose}>
                    Картка в каталозі
                </Link>
            </div>
        </Drawer>
    );
}
