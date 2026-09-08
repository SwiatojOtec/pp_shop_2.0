import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowRightLeft, Wrench, CheckCircle2, Hash, EyeOff, Eye, Trash2, ClipboardList,
} from 'lucide-react';
import { warehouseApi, inventoryApi, productsApi } from '../../../../services/api';
import { useToast } from '../../../../context/ToastContext';
import Drawer from '../../ui/Drawer';
import ConfirmDialog from '../../ui/ConfirmDialog';
import StatusBadge from '../../ui/StatusBadge';
import { getStockStatusBadgeProps } from '../model/stockStatus';
import '../stock.css';

const rentEditUrl = (productId) => `/admin/catalog/tools/${productId}`;

const formatDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}.${dt.getFullYear()}`;
};

const isOverdue = (rentTo, status) => {
    if (status === 'overdue') return true;
    if (!rentTo || status !== 'active') return false;
    return new Date(rentTo) < new Date(new Date().toDateString());
};

/**
 * Side panel with every action for one warehouse position
 * (docs/admin-redesign/03-screens.md, 1.2 — replaces the old inline-expandable
 * "Робота з товаром" layout). Repair now keys off Product.stockStatus, not the
 * warehouse's literal name — a warehouse rename used to silently break it.
 */
export default function ProductWorkDrawer({
    open,
    onClose,
    inventoryRow,
    warehouses,
    selectedWarehouseId,
    onUpdated,
}) {
    const { showToast } = useToast();
    const [moveOpen, setMoveOpen] = useState(false);
    const [moveToId, setMoveToId] = useState('');
    const [moveQty, setMoveQty] = useState(0);
    const [moveBusy, setMoveBusy] = useState(false);
    const [returnToId, setReturnToId] = useState('');
    const [qtyOpen, setQtyOpen] = useState(false);
    const [qtyDraft, setQtyDraft] = useState(0);
    const [minStockDraft, setMinStockDraft] = useState(0);
    const [pendingChange, setPendingChange] = useState(null); // { field, label, oldVal, newVal }
    const [confirmAction, setConfirmAction] = useState(null); // 'repair' | 'return' | 'delete'
    const [actionBusy, setActionBusy] = useState(false);
    const [rentals, setRentals] = useState([]);
    const [rentalsLoading, setRentalsLoading] = useState(false);
    const [recentEvents, setRecentEvents] = useState([]);
    const [catalogBusy, setCatalogBusy] = useState(false);
    const [catalogOverride, setCatalogOverride] = useState(null);
    const [qtyOverride, setQtyOverride] = useState(null);
    const [minStockOverride, setMinStockOverride] = useState(null);
    const [gallery, setGallery] = useState(null);

    const p = inventoryRow?.Product;
    const productId = p?.id;
    // onUpdated() refetches the list but this drawer keeps showing the row
    // snapshot it opened with, so anything editable here needs its own
    // optimistic override instead of relying on inventoryRow to refresh —
    // otherwise a second edit compares against the stale pre-save value and
    // silently no-ops when it happens to match the new one.
    const onHand = qtyOverride ?? inventoryRow?.quantity ?? 0;
    const minStock = minStockOverride ?? inventoryRow?.minStock ?? 0;
    const committed = inventoryRow?.committedQuantity ?? 0;
    const free = p?.quantityAvailable ?? 0;
    const physicalTotal = inventoryRow?.physicalTotal ?? onHand;
    const showInRentCatalog = catalogOverride ?? p?.showInRentCatalog;

    const selectedWarehouse = useMemo(
        () => (warehouses || []).find((w) => w.id === selectedWarehouseId) || null,
        [warehouses, selectedWarehouseId]
    );
    const isInRepair = p?.stockStatus === 'in_repair';

    const targetWarehouses = useMemo(
        () => (warehouses || []).filter((w) => w.id !== selectedWarehouseId),
        [warehouses, selectedWarehouseId]
    );

    useEffect(() => {
        if (!open) return;
        const freshQty = Math.max(0, Math.floor(Number(inventoryRow?.quantity) || 0));
        const freshMinStock = Math.max(0, Math.floor(Number(inventoryRow?.minStock) || 0));
        const firstTarget = targetWarehouses[0]?.id ? String(targetWarehouses[0].id) : '';
        setReturnToId(firstTarget);
        setMoveToId(firstTarget);
        setMoveQty(freshQty);
        setQtyDraft(freshQty);
        setMinStockDraft(freshMinStock);
        setMoveOpen(false);
        setQtyOpen(false);
        setCatalogOverride(null);
        setQtyOverride(null);
        setMinStockOverride(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, inventoryRow?.id]);

    useEffect(() => {
        if (!open || !productId) {
            setRentals([]);
            setRecentEvents([]);
            return undefined;
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
            try {
                const json = await warehouseApi.events({ productId, limit: 3 });
                if (!cancelled) setRecentEvents(Array.isArray(json?.events) ? json.events : []);
            } catch {
                if (!cancelled) setRecentEvents([]);
            }
        })();
        return () => { cancelled = true; };
    }, [open, productId]);

    if (!inventoryRow || !p) {
        return <Drawer open={open} onClose={onClose} title="Товар" />;
    }

    const currentRentals = rentals.filter((r) => ['active', 'booked', 'overdue'].includes(r.status));

    const runAction = async (fn, successMessage) => {
        setActionBusy(true);
        try {
            await fn();
            showToast(successMessage, 'success');
            onUpdated?.();
            onClose();
        } catch (e) {
            showToast(e.message || 'Помилка', 'warning');
        } finally {
            setActionBusy(false);
            setConfirmAction(null);
        }
    };

    const doMove = async () => {
        const toId = Number(moveToId);
        const qty = Math.floor(Number(moveQty));
        if (!toId || !Number.isFinite(qty) || qty <= 0 || qty > onHand) return;
        setMoveBusy(true);
        try {
            await inventoryApi.move({
                productId,
                fromWarehouseId: selectedWarehouseId,
                toWarehouseId: toId,
                quantity: qty,
            });
            showToast('Товар переміщено.', 'success');
            onUpdated?.();
            onClose();
        } catch (e) {
            showToast(e.message || 'Помилка переміщення', 'warning');
        } finally {
            setMoveBusy(false);
        }
    };

    const doSendToRepair = () => runAction(
        () => inventoryApi.moveToRepair({ productId, fromWarehouseId: selectedWarehouseId, quantity: onHand }),
        'Відправлено в ремонт.'
    );

    const doReturnFromRepair = () => {
        const toId = Number(returnToId);
        const qty = Math.floor(Number(onHand));
        if (!toId || !Number.isFinite(qty) || qty <= 0) return;
        return runAction(async () => {
            await inventoryApi.move({ productId, fromWarehouseId: selectedWarehouseId, toWarehouseId: toId, quantity: qty });
            await inventoryApi.restoreInStock({ productId });
        }, 'Повернуто з ремонту.');
    };

    const doDeleteFromWarehouse = () => runAction(
        () => inventoryApi.deleteItem(inventoryRow.id),
        'Списано зі складу.'
    );

    const toggleCatalog = async () => {
        const nextValue = showInRentCatalog === false;
        setCatalogBusy(true);
        try {
            await productsApi.update(productId, { showInRentCatalog: nextValue });
            setCatalogOverride(nextValue);
            showToast(nextValue ? 'Показано в каталозі оренди.' : 'Прибрано з каталогу оренди.', 'success');
            onUpdated?.();
        } catch (e) {
            showToast(e.message || 'Не вдалося змінити відображення в каталозі', 'warning');
        } finally {
            setCatalogBusy(false);
        }
    };

    // Кількість, резерв і мінімум зберігались по-різному — кількість просила
    // підтвердження, решта мовчки. Тепер обидва редаговані поля йдуть через
    // один ConfirmDialog (docs/admin-redesign/03-screens.md, 1.2).
    const askConfirmChange = (field, label, oldVal, newVal) => {
        if (newVal === oldVal) return;
        setPendingChange({ field, label, oldVal, newVal });
    };

    const applyPendingChange = async () => {
        if (!pendingChange) return;
        try {
            await inventoryApi.updateItem(inventoryRow.id, { [pendingChange.field]: pendingChange.newVal });
            if (pendingChange.field === 'quantity') setQtyOverride(pendingChange.newVal);
            if (pendingChange.field === 'minStock') setMinStockOverride(pendingChange.newVal);
            showToast('Збережено.', 'success');
            onUpdated?.();
            setQtyOpen(false);
            setPendingChange(null);
        } catch (e) {
            showToast(e.message || 'Помилка збереження', 'warning');
            setPendingChange(null);
        }
    };

    const statusBadge = getStockStatusBadgeProps(p, inventoryRow);

    return (
        <>
            <Drawer
                open={open}
                onClose={onClose}
                width="lg"
                title={(
                    <div className="stock-drawer-title">
                        <span>{p.name}</span>
                        {p.sku && <code className="stock-drawer-sku">{p.sku}</code>}
                    </div>
                )}
            >
                <div className="stock-drawer-status">
                    <StatusBadge tone={statusBadge.tone} label={statusBadge.label} />
                    <span className="stock-drawer-status-qty">{p.inventoryNumber || '—'} · {selectedWarehouse?.name || '—'}</span>
                </div>

                <div className="stock-qty-cluster stock-qty-cluster--lg">
                    <div className="stock-qty-num">
                        <span className="stock-qty-value">{onHand}</span>
                        <span className="stock-qty-label">на цьому складі</span>
                    </div>
                    <div className="stock-qty-num">
                        <span className="stock-qty-value">{committed}</span>
                        <span className="stock-qty-label">в оренді</span>
                    </div>
                    <div className={`stock-qty-num${free > 0 ? ' stock-qty-num--free' : ' stock-qty-num--zero'}`}>
                        <span className="stock-qty-value">{free}</span>
                        <span className="stock-qty-label">вільно</span>
                    </div>
                    <div className="stock-qty-num">
                        <span className="stock-qty-value">{physicalTotal}</span>
                        <span className="stock-qty-label">всього по складах</span>
                    </div>
                </div>

                <div className="stock-drawer-actions">
                    <button type="button" className="ds-btn ds-btn--secondary" onClick={() => setMoveOpen((v) => !v)}>
                        <ArrowRightLeft size={16} /> Перемістити
                    </button>

                    {isInRepair ? (
                        <button
                            type="button"
                            className="ds-btn ds-btn--secondary"
                            disabled={actionBusy}
                            onClick={() => setConfirmAction('return')}
                        >
                            <CheckCircle2 size={16} /> Повернути з ремонту
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="ds-btn ds-btn--secondary"
                            disabled={actionBusy}
                            onClick={() => setConfirmAction('repair')}
                        >
                            <Wrench size={16} /> Відправити в ремонт
                        </button>
                    )}

                    <button type="button" className="ds-btn ds-btn--secondary" onClick={() => setQtyOpen((v) => !v)}>
                        <Hash size={16} /> Змінити кількість
                    </button>

                    <Link to={rentEditUrl(productId)} className="ds-btn ds-btn--secondary" onClick={onClose}>
                        Картка в каталозі
                    </Link>

                    <button type="button" className="ds-btn ds-btn--secondary" disabled={catalogBusy} onClick={toggleCatalog}>
                        {showInRentCatalog !== false ? <EyeOff size={16} /> : <Eye size={16} />}
                        {showInRentCatalog !== false ? 'Прибрати з сайту' : 'Повернути в каталог'}
                    </button>

                    <button
                        type="button"
                        className="ds-btn ds-btn--danger"
                        disabled={actionBusy}
                        onClick={() => setConfirmAction('delete')}
                    >
                        <Trash2 size={16} /> Списати зі складу
                    </button>
                </div>

                {moveOpen && (
                    <div className="stock-drawer-inline-form">
                        <label>
                            Склад призначення
                            <select value={moveToId} onChange={(e) => setMoveToId(e.target.value)}>
                                {targetWarehouses.map((w) => (
                                    <option key={w.id} value={w.id}>{w.name}</option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Кількість
                            <input
                                type="number"
                                min={0}
                                max={onHand}
                                value={moveQty}
                                onChange={(e) => setMoveQty(e.target.value)}
                            />
                        </label>
                        <button type="button" className="ds-btn ds-btn--primary" disabled={moveBusy || !moveToId} onClick={doMove}>
                            {moveBusy ? 'Переміщення…' : 'Перемістити'}
                        </button>
                    </div>
                )}

                {isInRepair && (
                    <div className="stock-drawer-inline-select">
                        На склад
                        <select value={returnToId} onChange={(e) => setReturnToId(e.target.value)}>
                            {targetWarehouses.map((w) => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {qtyOpen && (
                    <div className="stock-drawer-inline-form">
                        <label>
                            Нова кількість на складі
                            <input
                                type="number"
                                min={0}
                                value={qtyDraft}
                                onChange={(e) => setQtyDraft(e.target.value)}
                            />
                        </label>
                        <button
                            type="button"
                            className="ds-btn ds-btn--primary"
                            onClick={() => askConfirmChange('quantity', p.name, onHand, Math.max(0, Math.floor(Number(qtyDraft) || 0)))}
                        >
                            Зберегти
                        </button>
                    </div>
                )}

                <div className="stock-drawer-section">
                    <div className="stock-drawer-section-title"><ClipboardList size={16} /> Зараз в оренді</div>
                    {rentalsLoading ? (
                        <p className="stock-drawer-muted">Завантаження…</p>
                    ) : currentRentals.length === 0 ? (
                        <p className="stock-drawer-muted">Немає активних заявок.</p>
                    ) : (
                        <ul className="stock-drawer-rentals">
                            {currentRentals.map((r) => {
                                const overdue = isOverdue(r.rentTo, r.status);
                                const dest = r.orderId ? `/admin/deals/${r.orderId}` : `/admin/rental-applications/${r.id}`;
                                return (
                                    <li key={r.id} className="stock-drawer-rental-row">
                                        <Link to={dest} className="stock-drawer-rental-link">
                                            Угода {r.applicationNumber} · {r.clientName}
                                        </Link>
                                        <StatusBadge
                                            tone={overdue ? 'danger' : 'neutral'}
                                            label={overdue ? 'прострочено' : formatDate(r.rentTo)}
                                        />
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                <div className="stock-drawer-section">
                    <div className="stock-drawer-section-title">Картка</div>
                    <dl className="stock-drawer-dl">
                        <dt>Серійний №</dt><dd>{p.serialNumber || '—'}</dd>
                        <dt>Технічний стан</dt><dd>{p.technicalCondition || '—'}</dd>
                        <dt>Комплект</dt><dd>{Array.isArray(p.kitItems) && p.kitItems.length ? p.kitItems.join(', ') : '—'}</dd>
                        <dt>Вартість заміни</dt><dd>{p.replacementCost != null ? `${Number(p.replacementCost).toLocaleString('uk-UA')} ₴` : '—'}</dd>
                        <dt>Застава</dt><dd>{p.securityDeposit != null ? `${Number(p.securityDeposit).toLocaleString('uk-UA')} ₴` : '—'}</dd>
                        <dt>Вага</dt><dd>{p.weightPerUnit != null ? `${p.weightPerUnit} кг` : '—'}</dd>
                        <dt>Мін. залишок</dt>
                        <dd className="stock-drawer-dl-edit">
                            <input
                                type="number"
                                min={0}
                                value={minStockDraft}
                                onChange={(e) => setMinStockDraft(e.target.value)}
                                onBlur={(e) => askConfirmChange(
                                    'minStock', `Мін. залишок «${p.name}»`,
                                    minStock,
                                    Math.max(0, Math.floor(Number(e.target.value) || 0))
                                )}
                            />
                        </dd>
                    </dl>
                </div>

                <div className="stock-drawer-section">
                    <div className="stock-drawer-section-title">Останні події</div>
                    {recentEvents.length === 0 ? (
                        <p className="stock-drawer-muted">Подій ще немає.</p>
                    ) : (
                        <ul className="stock-drawer-rentals">
                            {recentEvents.map((ev) => (
                                <li key={ev.id}>{ev.message || `${ev.userDisplayName || ''} · ${ev.action}`}</li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="stock-drawer-section">
                    <div className="stock-drawer-section-title">Опис</div>
                    <p className="stock-drawer-desc">{p.desc || '—'}</p>
                </div>

                <div className="stock-drawer-section stock-drawer-grid">
                    <div><strong>Доступно з:</strong> {p.availableFrom ? formatDate(p.availableFrom) : '—'}</div>
                    <div>
                        <strong>На сайті:</strong>{' '}
                        {p.slug ? (
                            <a href={`/orenda/${p.slug}`} target="_blank" rel="noopener noreferrer">/orenda/{p.slug}</a>
                        ) : '—'}
                    </div>
                </div>

                {p.specs && Object.keys(p.specs).length > 0 && (
                    <div className="stock-drawer-section">
                        <div className="stock-drawer-section-title">Характеристики</div>
                        {Object.entries(p.specs).map(([key, val]) => (
                            <div key={key} className="stock-drawer-spec-row"><strong>{key}:</strong> {String(val)}</div>
                        ))}
                    </div>
                )}

                {p.adminNotes && (
                    <div className="stock-drawer-section">
                        <div className="stock-drawer-section-title">Внутрішні нотатки</div>
                        <p className="stock-drawer-desc">{p.adminNotes}</p>
                    </div>
                )}

                {Array.isArray(p.competitorLinks) && p.competitorLinks.length > 0 && (
                    <div className="stock-drawer-section">
                        <div className="stock-drawer-section-title">Конкуренти</div>
                        <ul className="stock-drawer-list">
                            {p.competitorLinks.map((url, i) => (
                                <li key={i}><a href={url.startsWith('http') ? url : `https://${url}`} target="_blank" rel="noopener noreferrer">{url}</a></li>
                            ))}
                        </ul>
                    </div>
                )}

                {Array.isArray(p.adminImages) && p.adminImages.length > 0 && (
                    <div className="stock-drawer-section">
                        <div className="stock-drawer-section-title">Адмінські фото</div>
                        <div className="stock-drawer-photos">
                            {p.adminImages.map((url, i) => (
                                <button
                                    key={`${url}-${i}`}
                                    type="button"
                                    className="stock-drawer-photo-thumb"
                                    onClick={() => setGallery({ urls: p.adminImages, index: i })}
                                >
                                    <img src={url} alt="" loading="lazy" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </Drawer>

            <ConfirmDialog
                open={confirmAction === 'repair'}
                title="Відправити в ремонт?"
                message={`«${p.name}» (${onHand} шт.) буде переміщено на службовий склад ремонту.`}
                confirmText="Відправити"
                loading={actionBusy}
                onConfirm={doSendToRepair}
                onCancel={() => setConfirmAction(null)}
            />
            <ConfirmDialog
                open={confirmAction === 'return'}
                title="Повернути з ремонту?"
                message={`«${p.name}» (${onHand} шт.) буде переміщено на склад призначення і позначено як доступне.`}
                confirmText="Повернути"
                danger={false}
                loading={actionBusy}
                onConfirm={doReturnFromRepair}
                onCancel={() => setConfirmAction(null)}
            />
            <ConfirmDialog
                open={confirmAction === 'delete'}
                title="Списати зі складу?"
                message={`Позицію «${p.name}» буде видалено з поточного складу.`}
                confirmText="Списати"
                loading={actionBusy}
                onConfirm={doDeleteFromWarehouse}
                onCancel={() => setConfirmAction(null)}
            />
            <ConfirmDialog
                open={!!pendingChange}
                title={pendingChange?.field === 'quantity' ? 'Змінити кількість на складі?' : 'Змінити мінімальний залишок?'}
                message={pendingChange ? `«${pendingChange.label}»: ${pendingChange.oldVal} → ${pendingChange.newVal}. Підтвердіть зміну.` : ''}
                confirmText="Підтвердити"
                onConfirm={applyPendingChange}
                onCancel={() => {
                    if (pendingChange?.field === 'minStock') setMinStockDraft(minStock);
                    if (pendingChange?.field === 'quantity') setQtyDraft(onHand);
                    setPendingChange(null);
                }}
            />

            {gallery && gallery.urls[gallery.index] && (
                <div className="stock-gallery-overlay" role="dialog" aria-modal="true" aria-label="Адмінські фото" onMouseDown={() => setGallery(null)}>
                    <div className="stock-gallery-card" onMouseDown={(e) => e.stopPropagation()}>
                        <img src={gallery.urls[gallery.index]} alt="Адмінське фото" className="stock-gallery-image" />
                        {gallery.urls.length > 1 && (
                            <div className="stock-gallery-nav">
                                <button
                                    type="button"
                                    className="ds-btn ds-btn--secondary"
                                    onClick={() => setGallery((prev) => ({ ...prev, index: (prev.index - 1 + prev.urls.length) % prev.urls.length }))}
                                >
                                    Попереднє
                                </button>
                                <span>{gallery.index + 1} / {gallery.urls.length}</span>
                                <button
                                    type="button"
                                    className="ds-btn ds-btn--secondary"
                                    onClick={() => setGallery((prev) => ({ ...prev, index: (prev.index + 1) % prev.urls.length }))}
                                >
                                    Наступне
                                </button>
                            </div>
                        )}
                        <button type="button" className="ds-icon-btn stock-gallery-close" onClick={() => setGallery(null)} aria-label="Закрити">✕</button>
                    </div>
                </div>
            )}
        </>
    );
}
