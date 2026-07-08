import { useState, useEffect, useMemo } from 'react';
import { ordersApi, productsApi, clientsApi } from '../../services/api';
import { Search, Filter, ShoppingCart, ChevronRight } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AdminPageHeader } from '../../components/admin';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
    ORDER_STATUS_VARIANT,
    getOrderStatusLabel,
    formatOrderNumberDisplay,
    calcOrderTotal,
    orderHasShopItems,
    orderHasRentItems,
} from '../../utils/orderHelpers';
import { normalizeUaPhone, parsePhones, isValidUaPhone } from '../../utils/phoneUtils';
import './Admin.css';

const TYPE_FILTER_OPTIONS = [
    { value: 'all',  label: 'Всі замовлення' },
    { value: 'shop', label: 'Магазин' },
    { value: 'rent', label: 'Оренда' },
];

const EMPTY_ORDER_COMPOSER = {
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    address: '',
    deliveryMethod: 'pickup',
    paymentMethod: 'invoice',
    items: [],
    discount: 0,
};

function buildComposerFromClient(client) {
    const phone = parsePhones(client.phone)[0] || normalizeUaPhone(client.phone);
    return {
        customerName: client.fullName || '',
        customerPhone: phone,
        customerEmail: client.email || '',
        address: [client.address, client.siteAddress].filter(Boolean).join(', ') || '',
        discount: Number(client.discountPercent || 0) || 0,
    };
}

export default function AdminOrders() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [typeFilter, setTypeFilter] = useState('all');

    const [composer, setComposer] = useState(null);
    const [composerProductSearch, setComposerProductSearch] = useState('');
    const [savingComposer, setSavingComposer] = useState(false);
    const [composerClientId, setComposerClientId] = useState(null);
    const [composerClientSuggestions, setComposerClientSuggestions] = useState([]);
    const [composerClientSuggestLoading, setComposerClientSuggestLoading] = useState(false);

    const rentProductIds = useMemo(
        () => new Set(products.filter((p) => p.isRent).map((p) => p.id)),
        [products]
    );

    const suggestedComposerProducts = composerProductSearch.length > 1
        ? products.filter((p) => {
            const q = composerProductSearch.toLowerCase();
            return p.name.toLowerCase().includes(q)
                || (p.sku && p.sku.toLowerCase().includes(q))
                || (p.inventoryNumber && String(p.inventoryNumber).toLowerCase().includes(q));
        }).slice(0, 8)
        : [];

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
                setComposer({
                    ...EMPTY_ORDER_COMPOSER,
                    ...buildComposerFromClient(client),
                    items: [],
                });
                setComposerProductSearch('');
                setComposerClientId(cid);
            } catch (e) {
                alert(e.message || 'Не вдалося завантажити клієнта');
            } finally {
                clearQuery();
            }
        })();
    }, [searchParams, setSearchParams]);

    useEffect(() => {
        const raw = searchParams.get('openOrder');
        if (!raw) return;
        const oid = parseInt(raw, 10);
        setSearchParams((prev) => {
            const n = new URLSearchParams(prev);
            n.delete('openOrder');
            return n;
        }, { replace: true });
        if (!Number.isNaN(oid) && oid > 0) {
            navigate(`/admin/orders/${oid}`, { replace: true });
        }
    }, [searchParams, setSearchParams, navigate]);

    useEffect(() => {
        if (!composer || composerClientId) {
            setComposerClientSuggestions([]);
            return undefined;
        }

        const nameQ = String(composer.customerName || '').trim();
        const phoneQ = normalizeUaPhone(composer.customerPhone || '');

        if (nameQ.length < 2 && !isValidUaPhone(phoneQ)) {
            setComposerClientSuggestions([]);
            setComposerClientSuggestLoading(false);
            return undefined;
        }

        setComposerClientSuggestLoading(true);
        const timer = setTimeout(async () => {
            try {
                let results = [];
                if (nameQ.length >= 2) {
                    const data = await clientsApi.list({ q: nameQ });
                    results = Array.isArray(data) ? data : [];
                } else if (isValidUaPhone(phoneQ)) {
                    const res = await clientsApi.lookupByPhone(phoneQ);
                    if (res?.found && res.client) results = [res.client];
                }
                setComposerClientSuggestions(results.slice(0, 8));
            } catch {
                setComposerClientSuggestions([]);
            } finally {
                setComposerClientSuggestLoading(false);
            }
        }, 350);

        return () => clearTimeout(timer);
    }, [composer?.customerName, composer?.customerPhone, composer, composerClientId]);

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

    const filteredOrders = useMemo(() => orders.filter((o) => {
        const q = search.toLowerCase();
        const matchSearch = !q
            || (o.customerName || '').toLowerCase().includes(q)
            || (o.customerPhone || '').includes(q)
            || (o.orderNumber || '').toLowerCase().includes(q);
        const matchStatus = statusFilter === 'All' || o.status === statusFilter;
        const matchType =
            typeFilter === 'all'
            || (typeFilter === 'shop' && orderHasShopItems(o, rentProductIds))
            || (typeFilter === 'rent' && orderHasRentItems(o, rentProductIds));
        return matchSearch && matchStatus && matchType;
    }), [orders, search, statusFilter, typeFilter, rentProductIds]);

    function setComposerField(field, value) {
        if (field === 'customerName' || field === 'customerPhone') {
            setComposerClientId(null);
        }
        setComposer((prev) => (prev ? { ...prev, [field]: value } : prev));
    }

    function selectComposerClient(client) {
        const patch = buildComposerFromClient(client);
        setComposer((prev) => (prev ? { ...prev, ...patch } : prev));
        setComposerClientId(client.id);
        setComposerClientSuggestions([]);
    }

    function addItemComposer(product) {
        setComposer((prev) => {
            if (!prev) return prev;
            const items = [
                ...prev.items,
                {
                    id: product.id,
                    name: product.name,
                    sku: product.sku || '',
                    price: product.price,
                    quantity: 1,
                    unit: product.unit,
                    packSize: product.packSize || 1,
                    isRent: !!product.isRent,
                },
            ];
            return { ...prev, items };
        });
        setComposerProductSearch('');
    }

    function removeItemComposer(idx) {
        setComposer((prev) => {
            if (!prev) return prev;
            return { ...prev, items: prev.items.filter((_, i) => i !== idx) };
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
            const total = calcOrderTotal(composer.items);
            const created = await ordersApi.createAdmin({
                customerName: composer.customerName.trim(),
                customerPhone: normalizeUaPhone(composer.customerPhone),
                customerEmail: composer.customerEmail?.trim() || '',
                address: composer.address || '',
                deliveryMethod: composer.deliveryMethod,
                paymentMethod: composer.paymentMethod,
                items: composer.items,
                totalAmount: total,
                discount: composer.discount ?? 0,
                clientId: composerClientId || undefined,
            });
            setOrders((prev) => [created, ...prev]);
            setComposer(null);
            setComposerProductSearch('');
            setComposerClientId(null);
            navigate(`/admin/orders/${created.id}`);
        } catch (e) {
            alert(e.message || 'Помилка створення замовлення');
        } finally {
            setSavingComposer(false);
        }
    }

    function openComposerBlank() {
        setComposer({ ...EMPTY_ORDER_COMPOSER, items: [] });
        setComposerProductSearch('');
        setComposerClientId(null);
        setComposerClientSuggestions([]);
    }

    const showComposerClientSuggest = composer
        && !composerClientId
        && (composerClientSuggestLoading || composerClientSuggestions.length > 0);

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
                <div className="order-composer-card admin-form">
                    <div className="order-composer-card__head">
                        <h3 className="order-composer-card__title">Нове замовлення</h3>
                        <button
                            type="button"
                            className="action-btn"
                            onClick={() => { setComposer(null); setComposerProductSearch(''); setComposerClientId(null); }}
                            title="Закрити"
                        >
                            ×
                        </button>
                    </div>

                    <div className="order-detail-section">
                        <h4 className="order-detail-label">Клієнт</h4>
                        <div className="order-composer-grid">
                            <div className="form-group order-composer-client-search">
                                <label>Ім&apos;я</label>
                                <input
                                    type="text"
                                    value={composer.customerName || ''}
                                    onChange={(e) => setComposerField('customerName', e.target.value)}
                                    autoComplete="off"
                                />
                                {showComposerClientSuggest && (
                                    <div className="order-client-suggest">
                                        {composerClientSuggestLoading && (
                                            <div className="order-client-suggest__item order-client-suggest__item--muted">
                                                Шукаємо в базі клієнтів…
                                            </div>
                                        )}
                                        {!composerClientSuggestLoading && composerClientSuggestions.map((client) => (
                                            <button
                                                key={client.id}
                                                type="button"
                                                className="order-client-suggest__item"
                                                onClick={() => selectComposerClient(client)}
                                            >
                                                <div>
                                                    <div className="order-client-suggest__name">{client.fullName}</div>
                                                    <div className="order-client-suggest__meta">
                                                        {parsePhones(client.phone)[0] || client.phone}
                                                        {client.email ? ` · ${client.email}` : ''}
                                                    </div>
                                                </div>
                                                <span className="order-client-suggest__pick">Обрати</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="form-group">
                                <label>Телефон</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="380670064044"
                                    value={composer.customerPhone || ''}
                                    onChange={(e) => setComposerField('customerPhone', e.target.value)}
                                    onBlur={(e) => setComposerField('customerPhone', normalizeUaPhone(e.target.value))}
                                    autoComplete="off"
                                />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input type="email" value={composer.customerEmail || ''} onChange={(e) => setComposerField('customerEmail', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label>Знижка, %</label>
                                <input type="number" min="0" max="100" step="0.5" value={composer.discount ?? 0} onChange={(e) => setComposerField('discount', parseFloat(e.target.value) || 0)} />
                            </div>
                            <div className="form-group order-composer-span2">
                                <label>Адреса доставки / самовивіз</label>
                                <input type="text" placeholder="Вкажіть адресу або «Самовивіз»" value={composer.address || ''} onChange={(e) => setComposerField('address', e.target.value)} />
                            </div>
                        </div>
                        {composerClientId && (
                            <p className="order-composer-client-linked">
                                Клієнта обрано з бази — поля заповнено автоматично.
                            </p>
                        )}
                    </div>

                    <div className="order-detail-section" style={{ marginTop: '12px' }}>
                        <h4 className="order-detail-label">Товари та оренда</h4>
                        <div className="order-item-list">
                            {composer.items.map((item, idx) => (
                                <div key={`${item.id}-${idx}`} className="order-item-row">
                                    <span className="order-item-row__name">
                                        {item.name}
                                        {item.isRent && <span className="order-item-row__tag">оренда</span>}
                                    </span>
                                    <div className="order-item-row__qty">
                                        <input type="number" min="0" value={item.quantity} onChange={(e) => updateQtyComposer(idx, e.target.value)} />
                                        <span className="order-item-row__unit">{item.unit === 'м²' ? 'уп.' : 'шт.'}</span>
                                    </div>
                                    <span className="order-item-row__price">
                                        {(item.price * item.quantity * (item.packSize || 1)).toLocaleString()} ₴
                                    </span>
                                    <button type="button" className="order-item-row__remove" onClick={() => removeItemComposer(idx)} title="Прибрати">×</button>
                                </div>
                            ))}
                        </div>

                        <div className="order-product-search-wrap">
                            <Search size={15} className="order-product-search-icon" />
                            <input
                                type="text"
                                className="order-product-search-input"
                                placeholder="Додати товар або позицію оренди: назва, артикул, інв. №..."
                                value={composerProductSearch}
                                onChange={(e) => setComposerProductSearch(e.target.value)}
                            />
                            {suggestedComposerProducts.length > 0 && (
                                <div className="order-product-suggest">
                                    {suggestedComposerProducts.map((p) => (
                                        <div key={p.id} className="order-product-suggest__item" onClick={() => addItemComposer(p)}>
                                            <div>
                                                <div className="font-semibold text-sm">
                                                    {p.name}
                                                    {p.isRent && <span className="order-product-suggest__tag">оренда</span>}
                                                </div>
                                                {p.sku && <div className="text-xs text-gray-400">SKU: {p.sku}</div>}
                                                {p.isRent && p.inventoryNumber && (
                                                    <div className="text-xs text-gray-400">Інв. №: {p.inventoryNumber}</div>
                                                )}
                                            </div>
                                            <span className="font-bold text-[#e63946]">{p.price} ₴</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="order-composer-card__footer">
                        <div className="text-sm">
                            Разом:{' '}
                            <strong style={{ fontSize: '1.1rem', color: 'var(--admin-accent)' }}>
                                {calcOrderTotal(composer.items).toLocaleString()} ₴
                            </strong>
                        </div>
                        <div className="order-composer-card__actions">
                            <Button variant="secondary" size="sm" onClick={() => { setComposer(null); setComposerProductSearch(''); setComposerClientId(null); }}>
                                Скасувати
                            </Button>
                            <Button size="sm" onClick={submitComposer} disabled={savingComposer}>
                                {savingComposer ? 'Створення...' : 'Створити замовлення'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="order-filters-bar">
                <div className="order-filters-bar__search">
                    <Search size={16} className="order-filters-bar__search-icon" />
                    <input
                        type="text"
                        placeholder="Пошук за ім'ям, телефоном або № замовлення..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="order-filters-bar__selects">
                    <Filter size={16} style={{ color: '#9ca3af', flexShrink: 0 }} />
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                        {TYPE_FILTER_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="All">Всі статуси</option>
                        <option value="pending">Новий</option>
                        <option value="invoice_sent">Рахунок виставлено</option>
                        <option value="paid">Оплачено</option>
                        <option value="processing">В роботі</option>
                        <option value="completed">Виконано</option>
                        <option value="cancelled">Скасовано</option>
                    </select>
                </div>
            </div>

            <div className="admin-table-container">
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Завантаження...</div>
                ) : filteredOrders.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Замовлень не знайдено</div>
                ) : (
                    filteredOrders.map((order) => (
                        <div key={order.id} className="order-row-wrap">
                            <div className="order-row-summary order-row-summary--static">
                                <div className="order-row-num" title={order.orderNumber || ''}>
                                    {formatOrderNumberDisplay(order.orderNumber || `#${order.id}`)}
                                </div>

                                <div className="order-row-client">
                                    <span className="font-semibold">{order.customerName}</span>
                                    <span className="text-sm text-gray-500">{order.customerPhone}</span>
                                </div>

                                <div className="order-row-items text-sm text-gray-600">
                                    {(order.items || []).slice(0, 2).map((i, idx) => (
                                        <span key={idx}>
                                            {i.name} ×{i.quantity}
                                            {idx < Math.min(order.items.length, 2) - 1 ? ', ' : ''}
                                        </span>
                                    ))}
                                    {(order.items || []).length > 2 && (
                                        <span className="text-gray-400"> +{order.items.length - 2}</span>
                                    )}
                                </div>

                                <div className="order-row-amount font-bold">
                                    {parseFloat(order.totalAmount).toLocaleString()} ₴
                                </div>

                                <div className="order-row-status">
                                    <Badge variant={ORDER_STATUS_VARIANT[order.status] || 'secondary'}>
                                        {getOrderStatusLabel(order.status)}
                                    </Badge>
                                </div>

                                <div className="order-row-actions">
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => navigate(`/admin/orders/${order.id}`)}
                                    >
                                        Детальніше <ChevronRight size={14} />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
