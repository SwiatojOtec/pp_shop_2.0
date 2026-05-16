import { useState, useEffect, useMemo } from 'react';
import { ordersApi, productsApi, rentalApplicationsApi, clientsApi } from '../../services/api';
import {
    Trash2, Search, Filter, Save, ClipboardList,
    ChevronDown, ChevronUp, X, ShoppingCart,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AdminPageHeader, ConfirmDialog } from '../../components/admin';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { DEFAULT_RENTAL_DEPOSIT_PERCENT } from '../../constants/rentalDefaults';
import { normalizeTechnicalCondition } from '../../constants/technicalConditions';
import './Admin.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
    { value: 'pending',       label: 'Новий'             },
    { value: 'invoice_sent',  label: 'Рахунок виставлено' },
    { value: 'paid',          label: 'Оплачено'           },
    { value: 'processing',    label: 'В роботі'           },
    { value: 'completed',     label: 'Виконано'           },
    { value: 'cancelled',     label: 'Скасовано'          },
];

const STATUS_VARIANT = {
    pending:      'warning',
    invoice_sent: 'secondary',
    paid:         'success',
    processing:   'default',
    completed:    'success',
    cancelled:    'danger',
};

function getLabel(status) {
    return STATUS_OPTIONS.find((o) => o.value === status)?.label || status;
}

const EMPTY_SHOP_COMPOSER = {
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    address: '',
    deliveryMethod: 'pickup',
    paymentMethod: 'invoice',
    items: [],
    discount: 0,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminOrders() {
    const navigate  = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [orders,    setOrders]    = useState([]);
    const [products,  setProducts]  = useState([]);
    const [loading,   setLoading]   = useState(true);
    const [search,    setSearch]    = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [expanded,  setExpanded]  = useState(null);  // order id
    const [draft,     setDraft]     = useState(null);   // editable copy of expanded order
    const [productSearch, setProductSearch] = useState('');
    const [saving,    setSaving]    = useState(false);
    const [converting, setConverting] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const [composer, setComposer] = useState(null);
    const [composerProductSearch, setComposerProductSearch] = useState('');
    const [savingComposer, setSavingComposer] = useState(false);

    const shopProductsOnly = useMemo(
        () => products.filter((p) => !p.isRent),
        [products]
    );

    useEffect(() => {
        loadOrders();
        loadProducts();
    }, []);

    useEffect(() => {
        const raw = searchParams.get('newClientId');
        if (!raw) return;
        const cid = parseInt(raw, 10);
        const clearQuery = () => setSearchParams({}, { replace: true });

        if (Number.isNaN(cid) || cid <= 0) {
            clearQuery();
            return;
        }

        (async () => {
            try {
                const client = await clientsApi.get(cid);
                const phone =
                    String(client.phone || '')
                        .split(/[,;\s]+/)
                        .map((s) => s.trim())
                        .filter(Boolean)[0] || '';
                setExpanded(null);
                setDraft(null);
                setComposer({
                    customerName: client.fullName || '',
                    customerPhone: phone,
                    customerEmail: client.email || '',
                    address: [client.address, client.siteAddress].filter(Boolean).join(', ') || '',
                    deliveryMethod: 'pickup',
                    paymentMethod: 'invoice',
                    items: [],
                    discount: Number(client.discountPercent || 0) || 0,
                });
                setComposerProductSearch('');
            } catch (e) {
                alert(e.message || 'Не вдалося завантажити клієнта');
            } finally {
                clearQuery();
            }
        })();
    }, [searchParams, setSearchParams]);

    async function loadOrders() {
        setLoading(true);
        try {
            const data = await ordersApi.list();
            setOrders(Array.isArray(data) ? data : []);
        } catch {
            setOrders([]);
        } finally {
            setLoading(false);
        }
    }

    async function loadProducts() {
        try {
            const data = await productsApi.list();
            setProducts(Array.isArray(data) ? data : []);
        } catch {
            setProducts([]);
        }
    }

    function toggleExpand(order) {
        if (expanded === order.id) {
            setExpanded(null);
            setDraft(null);
        } else {
            setExpanded(order.id);
            setDraft({ ...order, items: order.items ? [...order.items.map((i) => ({ ...i }))] : [] });
            setProductSearch('');
        }
    }

    async function updateStatus(id, status) {
        try {
            await ordersApi.update(id, { status });
            setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status } : o));
        } catch (err) {
            alert(err.message || 'Помилка оновлення статусу');
        }
    }

    async function handleSave() {
        setSaving(true);
        try {
            const updated = await ordersApi.update(draft.id, draft);
            setOrders((prev) => prev.map((o) => o.id === updated.id ? updated : o));
            setExpanded(null);
            setDraft(null);
        } catch (err) {
            alert(err.message || 'Помилка збереження');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (!deleteTarget) return;
        try {
            await ordersApi.remove(deleteTarget.id);
            setOrders((prev) => prev.filter((o) => o.id !== deleteTarget.id));
            if (expanded === deleteTarget.id) { setExpanded(null); setDraft(null); }
        } catch (err) {
            alert(err.message || 'Помилка видалення');
        } finally {
            setDeleteTarget(null);
        }
    }

    const rentProductIds = new Set(products.filter((p) => p.isRent).map((p) => p.id));

    async function convertToRental(order) {
        setConverting(order.id);
        try {
            const rentItems = (order.items || [])
                .filter((i) => rentProductIds.has(i.id))
                .map((i) => {
                    const full = products.find((p) => p.id === i.id) || {};
                    return {
                        productId: i.id,
                        name: i.name,
                        serialNumber: full.serialNumber || '',
                        inventoryNumber: full.inventoryNumber || '',
                        technicalCondition: normalizeTechnicalCondition(full.technicalCondition),
                        unit: i.unit || 'шт',
                        quantity: i.quantity || 1,
                        weightTotal: full.weightTotal || '',
                        replacementCostPerUnit: parseFloat(full.replacementCost || 0),
                        replacementCostTotal: parseFloat(full.replacementCost || 0) * (i.quantity || 1),
                        depositPercent: DEFAULT_RENTAL_DEPOSIT_PERCENT,
                        depositAmount: (
                            parseFloat(full.replacementCost || 0) *
                            (i.quantity || 1) *
                            (DEFAULT_RENTAL_DEPOSIT_PERCENT / 100)
                        ).toFixed(2),
                        pricePerDay: parseFloat(i.price || 0),
                        rentFrom: '', rentTo: '', days: 0, totalRental: '',
                        kitItems: full.kitItems || [],
                    };
                });

            const totalDeposit = rentItems.reduce((s, i) => s + parseFloat(i.depositAmount || 0), 0);
            const payload = {
                clientName: order.customerName || '',
                clientPhone: order.customerPhone || '',
                clientEmail: order.customerEmail || '',
                clientAddress: order.address || '',
                status: 'draft',
                items: rentItems,
                totalAmount: 0,
                depositAmount: totalDeposit.toFixed(2),
            };

            const created = await rentalApplicationsApi.create(payload);
            navigate(`/admin/rental-applications/${created.id}`);
        } catch (err) {
            alert(`Помилка: ${err.message}`);
        } finally {
            setConverting(null);
        }
    }

    // Draft helpers
    function setDraftField(field, value) {
        setDraft((prev) => ({ ...prev, [field]: value }));
    }

    function addItem(product) {
        setDraft((prev) => {
            const items = [...prev.items, { id: product.id, name: product.name, price: product.price, quantity: 1, unit: product.unit, packSize: product.packSize || 1 }];
            return { ...prev, items, totalAmount: calcTotal(items) };
        });
        setProductSearch('');
    }

    function removeItem(idx) {
        setDraft((prev) => {
            const items = prev.items.filter((_, i) => i !== idx);
            return { ...prev, items, totalAmount: calcTotal(items) };
        });
    }

    function updateQty(idx, qty) {
        setDraft((prev) => {
            const items = prev.items.map((item, i) => i === idx ? { ...item, quantity: parseFloat(qty) || 0 } : item);
            return { ...prev, items, totalAmount: calcTotal(items) };
        });
    }

    function calcTotal(items) {
        return items.reduce((s, i) => s + (i.price * i.quantity * (i.packSize || 1)), 0);
    }

    function setComposerField(field, value) {
        setComposer((prev) => (prev ? { ...prev, [field]: value } : prev));
    }

    function addItemComposer(product) {
        setComposer((prev) => {
            if (!prev) return prev;
            const items = [
                ...prev.items,
                {
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    quantity: 1,
                    unit: product.unit,
                    packSize: product.packSize || 1,
                },
            ];
            return { ...prev, items };
        });
        setComposerProductSearch('');
    }

    function removeItemComposer(idx) {
        setComposer((prev) => {
            if (!prev) return prev;
            const items = prev.items.filter((_, i) => i !== idx);
            return { ...prev, items };
        });
    }

    function updateQtyComposer(idx, qty) {
        setComposer((prev) => {
            if (!prev) return prev;
            const items = prev.items.map((item, i) =>
                i === idx ? { ...item, quantity: parseFloat(qty) || 0 } : item
            );
            return { ...prev, items };
        });
    }

    async function submitComposer() {
        if (!composer) return;
        if (!String(composer.customerName || '').trim() || !String(composer.customerPhone || '').trim()) {
            alert('Вкажіть ім\'я та телефон клієнта');
            return;
        }
        setSavingComposer(true);
        try {
            const total = calcTotal(composer.items);
            const created = await ordersApi.createAdmin({
                customerName: composer.customerName.trim(),
                customerPhone: composer.customerPhone.trim(),
                customerEmail: composer.customerEmail?.trim() || '',
                address: composer.address || '',
                deliveryMethod: composer.deliveryMethod,
                paymentMethod: composer.paymentMethod,
                items: composer.items,
                totalAmount: total,
                discount: composer.discount ?? 0,
            });
            setOrders((prev) => [created, ...prev]);
            setComposer(null);
            setComposerProductSearch('');
            setExpanded(created.id);
            setDraft({
                ...created,
                items: created.items ? [...created.items.map((i) => ({ ...i }))] : [],
            });
        } catch (e) {
            alert(e.message || 'Помилка створення замовлення');
        } finally {
            setSavingComposer(false);
        }
    }

    function openComposerBlank() {
        setExpanded(null);
        setDraft(null);
        setComposer({ ...EMPTY_SHOP_COMPOSER, items: [] });
        setComposerProductSearch('');
    }

    const filteredOrders = orders.filter((o) => {
        const q = search.toLowerCase();
        const matchSearch = !q || (o.customerName || '').toLowerCase().includes(q) || (o.customerPhone || '').includes(q) || (o.orderNumber || '').toLowerCase().includes(q);
        const matchStatus = statusFilter === 'All' || o.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const suggestedProducts = productSearch.length > 1
        ? products.filter((p) =>
            p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
            (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase()))
        ).slice(0, 8)
        : [];

    const suggestedComposerProducts = composerProductSearch.length > 1
        ? shopProductsOnly.filter((p) =>
            p.name.toLowerCase().includes(composerProductSearch.toLowerCase()) ||
            (p.sku && p.sku.toLowerCase().includes(composerProductSearch.toLowerCase()))
        ).slice(0, 8)
        : [];

    return (
        <div>
            <AdminPageHeader
                title="Замовлення"
                subtitle={`${filteredOrders.length} з ${orders.length}`}
                actions={
                    <Button type="button" variant="secondary" onClick={openComposerBlank}>
                        <ShoppingCart size={16} /> Нове замовлення
                    </Button>
                }
            />

            {composer && (
                <div
                    className="order-composer-card"
                    style={{
                        marginBottom: '20px',
                        background: 'white',
                        border: '1px solid var(--admin-border)',
                        borderRadius: '12px',
                        padding: '18px 20px',
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '12px' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Нове замовлення (магазин)</h3>
                        <button
                            type="button"
                            className="action-btn"
                            onClick={() => { setComposer(null); setComposerProductSearch(''); }}
                            title="Закрити"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div className="order-detail-section">
                        <h4 className="order-detail-label">Клієнт</h4>
                        <div className="order-detail-grid2">
                            <div className="form-group">
                                <label>Ім&apos;я</label>
                                <input
                                    type="text"
                                    value={composer.customerName || ''}
                                    onChange={(e) => setComposerField('customerName', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label>Телефон</label>
                                <input
                                    type="text"
                                    value={composer.customerPhone || ''}
                                    onChange={(e) => setComposerField('customerPhone', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    value={composer.customerEmail || ''}
                                    onChange={(e) => setComposerField('customerEmail', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label>Знижка, %</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.5"
                                    value={composer.discount ?? 0}
                                    onChange={(e) => setComposerField('discount', parseFloat(e.target.value) || 0)}
                                />
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Адреса доставки / самовивіз</label>
                                <input
                                    type="text"
                                    value={composer.address || ''}
                                    onChange={(e) => setComposerField('address', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="order-detail-section" style={{ marginTop: '12px' }}>
                        <h4 className="order-detail-label">Товари (лише магазин, без оренди)</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                            {composer.items.map((item, idx) => (
                                <div
                                    key={`${item.id}-${idx}`}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 110px 100px 36px',
                                        gap: '10px',
                                        alignItems: 'center',
                                        padding: '8px 12px',
                                        background: '#f9fafb',
                                        borderRadius: '8px',
                                        border: '1px solid #e5e7eb',
                                    }}
                                >
                                    <span className="font-medium text-sm">{item.name}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <input
                                            type="number"
                                            min="0"
                                            value={item.quantity}
                                            onChange={(e) => updateQtyComposer(idx, e.target.value)}
                                            style={{ width: '60px', padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem' }}
                                        />
                                        <span className="text-xs text-gray-500">{item.unit === 'м²' ? 'уп.' : 'шт.'}</span>
                                    </div>
                                    <span className="text-right font-bold text-sm">
                                        {(item.price * item.quantity * (item.packSize || 1)).toLocaleString()} ₴
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => removeItemComposer(idx)}
                                        style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div style={{ position: 'relative', maxWidth: '420px' }}>
                            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
                            <input
                                type="text"
                                placeholder="Додати товар: назва або артикул..."
                                value={composerProductSearch}
                                onChange={(e) => setComposerProductSearch(e.target.value)}
                                style={{ width: '100%', padding: '8px 8px 8px 34px', border: '1px dashed #d1d5db', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
                            />
                            {suggestedComposerProducts.length > 0 && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        right: 0,
                                        background: 'white',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px',
                                        marginTop: '4px',
                                        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                                        zIndex: 20,
                                        maxHeight: '260px',
                                        overflowY: 'auto',
                                    }}
                                >
                                    {suggestedComposerProducts.map((p) => (
                                        <div
                                            key={p.id}
                                            onClick={() => addItemComposer(p)}
                                            style={{
                                                padding: '10px 14px',
                                                cursor: 'pointer',
                                                borderBottom: '1px solid #f3f4f6',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                            }}
                                            className="hover:bg-gray-50"
                                        >
                                            <div>
                                                <div className="font-semibold text-sm">{p.name}</div>
                                                {p.sku && <div className="text-xs text-gray-400">SKU: {p.sku}</div>}
                                            </div>
                                            <span className="font-bold text-[#e63946]">{p.price} ₴</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #e5e7eb', flexWrap: 'wrap', gap: '10px' }}>
                        <div className="text-sm">
                            Разом:{' '}
                            <strong style={{ fontSize: '1.1rem', color: 'var(--admin-accent)' }}>
                                {calcTotal(composer.items).toLocaleString()} ₴
                            </strong>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <Button variant="secondary" size="sm" onClick={() => { setComposer(null); setComposerProductSearch(''); }}>
                                Скасувати
                            </Button>
                            <Button size="sm" onClick={submitComposer} disabled={savingComposer}>
                                {savingComposer ? 'Створення...' : 'Створити замовлення'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', background: 'white', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--admin-border)' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input
                        type="text"
                        placeholder="Пошук за ім'ям, телефоном або № замовлення..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ width: '100%', padding: '9px 9px 9px 38px', borderRadius: '8px', border: '1px solid #e5e7eb', outline: 'none', fontSize: '0.9rem' }}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Filter size={16} style={{ color: '#9ca3af', flexShrink: 0 }} />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', outline: 'none', fontSize: '0.9rem', background: 'white' }}
                    >
                        <option value="All">Всі статуси</option>
                        {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="admin-table-container">
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Завантаження...</div>
                ) : filteredOrders.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Замовлень не знайдено</div>
                ) : (
                    filteredOrders.map((order) => (
                        <div key={order.id} className="order-row-wrap">
                            {/* ── Summary row ── */}
                            <div
                                className={`order-row-summary${expanded === order.id ? ' is-open' : ''}`}
                                onClick={() => toggleExpand(order)}
                            >
                                <div className="order-row-num">{order.orderNumber || `#${order.id}`}</div>

                                <div className="order-row-client">
                                    <span className="font-semibold">{order.customerName}</span>
                                    <span className="text-sm text-gray-500">{order.customerPhone}</span>
                                </div>

                                <div className="order-row-items text-sm text-gray-600">
                                    {(order.items || []).slice(0, 2).map((i, idx) => (
                                        <span key={idx}>{i.name} ×{i.quantity}{idx < Math.min(order.items.length, 2) - 1 ? ', ' : ''}</span>
                                    ))}
                                    {(order.items || []).length > 2 && <span className="text-gray-400"> +{order.items.length - 2}</span>}
                                </div>

                                <div className="order-row-amount font-bold">{parseFloat(order.totalAmount).toLocaleString()} ₴</div>

                                <div className="order-row-status" onClick={(e) => e.stopPropagation()}>
                                    <Badge variant={STATUS_VARIANT[order.status] || 'secondary'}>
                                        {getLabel(order.status)}
                                    </Badge>
                                    <select
                                        value={order.status}
                                        onChange={(e) => updateStatus(order.id, e.target.value)}
                                        className="order-status-select"
                                        title="Змінити статус"
                                    >
                                        {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>

                                <div className="order-row-chevron">
                                    {expanded === order.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                </div>
                            </div>

                            {/* ── Expanded detail panel ── */}
                            {expanded === order.id && draft && (
                                <div className="order-row-detail">
                                    {/* Client info */}
                                    <div className="order-detail-section">
                                        <h4 className="order-detail-label">Клієнт</h4>
                                        <div className="order-detail-grid2">
                                            <div className="form-group">
                                                <label>Ім'я</label>
                                                <input type="text" value={draft.customerName || ''} onChange={(e) => setDraftField('customerName', e.target.value)} />
                                            </div>
                                            <div className="form-group">
                                                <label>Телефон</label>
                                                <input type="text" value={draft.customerPhone || ''} onChange={(e) => setDraftField('customerPhone', e.target.value)} />
                                            </div>
                                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                                <label>Адреса доставки</label>
                                                <input type="text" value={draft.address || ''} onChange={(e) => setDraftField('address', e.target.value)} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Items */}
                                    <div className="order-detail-section">
                                        <h4 className="order-detail-label">Товари</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                                            {draft.items.map((item, idx) => (
                                                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 110px 100px 36px', gap: '10px', alignItems: 'center', padding: '8px 12px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                                    <span className="font-medium text-sm">{item.name}</span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={item.quantity}
                                                            onChange={(e) => updateQty(idx, e.target.value)}
                                                            style={{ width: '60px', padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem' }}
                                                        />
                                                        <span className="text-xs text-gray-500">{item.unit === 'м²' ? 'уп.' : 'шт.'}</span>
                                                    </div>
                                                    <span className="text-right font-bold text-sm">
                                                        {(item.price * item.quantity * (item.packSize || 1)).toLocaleString()} ₴
                                                    </span>
                                                    <button type="button" onClick={() => removeItem(idx)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Add product search */}
                                        <div style={{ position: 'relative', maxWidth: '420px' }}>
                                            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
                                            <input
                                                type="text"
                                                placeholder="Додати товар: введіть назву або артикул..."
                                                value={productSearch}
                                                onChange={(e) => setProductSearch(e.target.value)}
                                                style={{ width: '100%', padding: '8px 8px 8px 34px', border: '1px dashed #d1d5db', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
                                            />
                                            {suggestedProducts.length > 0 && (
                                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', marginTop: '4px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 20, maxHeight: '260px', overflowY: 'auto' }}>
                                                    {suggestedProducts.map((p) => (
                                                        <div
                                                            key={p.id}
                                                            onClick={() => addItem(p)}
                                                            style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between' }}
                                                            className="hover:bg-gray-50"
                                                        >
                                                            <div>
                                                                <div className="font-semibold text-sm">{p.name}</div>
                                                                {p.sku && <div className="text-xs text-gray-400">SKU: {p.sku}</div>}
                                                            </div>
                                                            <span className="font-bold text-[#e63946]">{p.price} ₴</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid #e5e7eb', marginTop: '8px', flexWrap: 'wrap', gap: '10px' }}>
                                        <div className="text-sm">
                                            Разом: <strong style={{ fontSize: '1.1rem', color: 'var(--admin-accent)' }}>{parseFloat(draft.totalAmount || 0).toLocaleString()} ₴</strong>
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                            {order.items && order.items.some((i) => rentProductIds.has(i.id)) && (
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => convertToRental(order)}
                                                    disabled={converting === order.id}
                                                    title="Перенести в заявку оренди"
                                                    style={{ color: '#7c3aed', borderColor: '#7c3aed' }}
                                                >
                                                    <ClipboardList size={14} /> До заявки оренди
                                                </Button>
                                            )}
                                            <Button variant="ghost" size="sm" className="text-red-500" onClick={() => { setExpanded(null); setDraft(null); setDeleteTarget(order); }}>
                                                <Trash2 size={14} /> Видалити
                                            </Button>
                                            <Button variant="secondary" size="sm" onClick={() => { setExpanded(null); setDraft(null); }}>
                                                Скасувати
                                            </Button>
                                            <Button size="sm" onClick={handleSave} disabled={saving}>
                                                <Save size={14} /> {saving ? 'Збереження...' : 'Зберегти'}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            <ConfirmDialog
                open={!!deleteTarget}
                title="Видалити замовлення?"
                message={deleteTarget ? `Видалити замовлення ${deleteTarget.orderNumber || '#' + deleteTarget.id}? Цю дію неможливо скасувати.` : ''}
                confirmText="Видалити"
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}
