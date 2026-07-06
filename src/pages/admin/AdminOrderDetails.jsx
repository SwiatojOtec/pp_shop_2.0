import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft, Save, Trash2, ClipboardList, Search, X,
    User, Truck, Package, UserCheck, UserPlus, Loader2, FileText, Files, Download, Undo2,
} from 'lucide-react';
import { ordersApi, productsApi, rentalApplicationsApi, clientsApi } from '../../services/api';
import { ConfirmDialog } from '../../components/admin';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { DEFAULT_SELLER_ID, SELLER_OPTIONS, resolveSellerId } from '../../constants/sellers';
import {
    ORDER_STATUS_VARIANT,
    DELIVERY_LABELS,
    PAYMENT_LABELS,
    getOrderStatusLabel,
    formatOrderNumberDisplay,
    formatOrderDate,
    orderHasRentItems,
} from '../../utils/orderHelpers';
import {
    calcOrderAmounts,
    calcLineDisplayAmounts,
    withOrderTotal,
} from '../../utils/orderAmounts';
import { generateRentalPdf } from '../../utils/generateRentalPdf';
import { buildRentalPdfPayload, blobToBase64 } from '../../utils/rentalPdfPayload';
import { isValidUaPhone, normalizeUaPhone } from '../../utils/phoneUtils';
import './Admin.css';
import './AdminOrderDetails.css';

export default function AdminOrderDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [order, setOrder] = useState(null);
    const [draft, setDraft] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [converting, setConverting] = useState(false);
    const [returnActLoading, setReturnActLoading] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [productSearch, setProductSearch] = useState('');
    const [linkedClient, setLinkedClient] = useState(null);
    const [phoneMatch, setPhoneMatch] = useState(null);
    const [clientLookupLoading, setClientLookupLoading] = useState(false);
    const [addingClient, setAddingClient] = useState(false);
    const [linkingClient, setLinkingClient] = useState(false);
    const [invoiceLoading, setInvoiceLoading] = useState(false);
    const [depositInvoiceLoading, setDepositInvoiceLoading] = useState(false);
    const [documents, setDocuments] = useState([]);
    const [deletingDocId, setDeletingDocId] = useState(null);
    const [linkedRentalApp, setLinkedRentalApp] = useState(null);

    const rentProductIds = useMemo(
        () => new Set(products.filter((p) => p.isRent).map((p) => p.id)),
        [products]
    );

    const billingOptions = useMemo(
        () => ({ rentProductIds, rentalApplication: linkedRentalApp }),
        [rentProductIds, linkedRentalApp]
    );

    const orderAmounts = useMemo(
        () => calcOrderAmounts(draft?.items, draft?.discount, draft?.sellerId, billingOptions),
        [draft?.items, draft?.discount, draft?.sellerId, billingOptions]
    );

    useEffect(() => {
        if (!id) return;
        (async () => {
            setLoading(true);
            try {
                const [orderData, productList, docsData] = await Promise.all([
                    ordersApi.get(id),
                    productsApi.list(),
                    ordersApi.listDocuments(id),
                ]);
                const productArr = Array.isArray(productList) ? productList : [];
                const rentIds = new Set(productArr.filter((p) => p.isRent).map((p) => p.id));

                let rentalApp = null;
                if (orderData?.rentalApplicationId) {
                    try {
                        rentalApp = await rentalApplicationsApi.get(orderData.rentalApplicationId);
                    } catch {
                        rentalApp = null;
                    }
                }

                setOrder(orderData);
                setLinkedRentalApp(rentalApp);
                setProducts(productArr);
                setDocuments(Array.isArray(docsData) ? docsData : []);
                setDraft(withOrderTotal({
                    ...orderData,
                    sellerId: resolveSellerId(orderData?.sellerId),
                    items: orderData?.items ? [...orderData.items.map((i) => ({ ...i }))] : [],
                }, { rentProductIds: rentIds, rentalApplication: rentalApp }));
            } catch {
                setOrder(null);
                setDraft(null);
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    useEffect(() => {
        const appId = order?.rentalApplicationId;
        if (!appId) {
            setLinkedRentalApp(null);
            return undefined;
        }

        let cancelled = false;
        rentalApplicationsApi.get(appId)
            .then((data) => {
                if (!cancelled) setLinkedRentalApp(data || null);
            })
            .catch(() => {
                if (!cancelled) setLinkedRentalApp(null);
            });

        return () => { cancelled = true; };
    }, [order?.rentalApplicationId]);

    useEffect(() => {
        if (!draft || !linkedRentalApp) return;
        setDraft((prev) => {
            if (!prev) return prev;
            const next = withOrderTotal(prev, billingOptions);
            return next.totalAmount === prev.totalAmount ? prev : next;
        });
    }, [billingOptions, linkedRentalApp]);

    useEffect(() => {
        if (!draft) return undefined;

        if (draft.clientId) {
            setPhoneMatch(null);
            setClientLookupLoading(true);
            clientsApi.get(draft.clientId)
                .then((c) => setLinkedClient(c))
                .catch(() => setLinkedClient(null))
                .finally(() => setClientLookupLoading(false));
            return undefined;
        }

        setLinkedClient(null);
        const phone = String(draft.customerPhone || '').trim();
        if (!isValidUaPhone(phone)) {
            setPhoneMatch(null);
            setClientLookupLoading(false);
            return undefined;
        }

        setClientLookupLoading(true);
        const timer = setTimeout(() => {
            clientsApi.lookupByPhone(phone)
                .then((res) => setPhoneMatch(res?.found ? res.client : null))
                .catch(() => setPhoneMatch(null))
                .finally(() => setClientLookupLoading(false));
        }, 400);

        return () => clearTimeout(timer);
    }, [draft?.clientId, draft?.customerPhone]);

    function setField(field, value) {
        setDraft((prev) => {
            if (!prev) return prev;
            const next = { ...prev, [field]: value };
            if (field === 'sellerId' || field === 'discount') {
                return withOrderTotal(next, billingOptions);
            }
            return next;
        });
    }

    function addItem(product) {
        setDraft((prev) => {
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
            return withOrderTotal({ ...prev, items }, billingOptions);
        });
        setProductSearch('');
    }

    function removeItem(idx) {
        setDraft((prev) => {
            if (!prev) return prev;
            const items = prev.items.filter((_, i) => i !== idx);
            return withOrderTotal({ ...prev, items }, billingOptions);
        });
    }

    function updateQty(idx, qty) {
        setDraft((prev) => {
            if (!prev) return prev;
            const items = prev.items.map((item, i) =>
                i === idx ? { ...item, quantity: parseFloat(qty) || 0 } : item
            );
            return withOrderTotal({ ...prev, items }, billingOptions);
        });
    }

    async function handleSave() {
        if (!draft) return;
        setSaving(true);
        try {
            const payload = withOrderTotal({
                ...draft,
                customerPhone: normalizeUaPhone(draft.customerPhone),
                sellerId: resolveSellerId(draft.sellerId),
            }, billingOptions);
            const updated = await ordersApi.update(draft.id, payload);
            setOrder(updated);
            setDraft({
                ...updated,
                items: updated.items ? [...updated.items.map((i) => ({ ...i }))] : [],
            });
        } catch (err) {
            alert(err.message || 'Помилка збереження');
        } finally {
            setSaving(false);
        }
    }

    async function linkClientToOrder(clientId) {
        if (!draft || !clientId) return;
        setLinkingClient(true);
        try {
            const updated = await ordersApi.update(draft.id, { ...draft, clientId });
            setOrder(updated);
            setDraft({
                ...updated,
                items: updated.items ? [...updated.items.map((i) => ({ ...i }))] : [],
            });
            const client = await clientsApi.get(clientId);
            setLinkedClient(client);
            setPhoneMatch(null);
        } catch (err) {
            alert(err.message || 'Не вдалося прив\'язати клієнта');
        } finally {
            setLinkingClient(false);
        }
    }

    async function addClientToDatabase() {
        if (!draft) return;
        if (!String(draft.customerName || '').trim() || !String(draft.customerPhone || '').trim()) {
            alert('Спочатку вкажіть ім\'я та телефон клієнта');
            return;
        }
        setAddingClient(true);
        try {
            const created = await clientsApi.create({
                fullName: String(draft.customerName).trim(),
                phone: normalizeUaPhone(draft.customerPhone),
                email: draft.customerEmail?.trim() || null,
                address: draft.address?.trim() || null,
                discountPercent: Number(draft.discount) || 0,
            });
            await linkClientToOrder(created.id);
        } catch (err) {
            alert(err.message || 'Не вдалося додати клієнта');
        } finally {
            setAddingClient(false);
        }
    }

    function renderClientDbStatus() {
        if (clientLookupLoading) {
            return (
                <div className="od-client-status od-client-status--checking">
                    <span className="od-client-status__text">
                        <Loader2 size={16} className="animate-spin" />
                        Перевіряємо базу клієнтів…
                    </span>
                </div>
            );
        }

        const knownClient = linkedClient || phoneMatch;
        if (knownClient) {
            const isLinked = !!draft.clientId;
            return (
                <div className="od-client-status od-client-status--linked">
                    <span className="od-client-status__text">
                        <UserCheck size={18} />
                        <span>
                            Цей клієнт вже є в базі
                            {knownClient.fullName ? ` — ${knownClient.fullName}` : ''}.
                            {' '}
                            <Link to={`/admin/clients/${knownClient.id}`} className="od-client-status__link">
                                Відкрити картку →
                            </Link>
                        </span>
                    </span>
                    {!isLinked && (
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => linkClientToOrder(knownClient.id)}
                            disabled={linkingClient}
                        >
                            {linkingClient ? 'Прив\'язуємо…' : 'Прив\'язати до замовлення'}
                        </Button>
                    )}
                </div>
            );
        }

        if (!isValidUaPhone(draft.customerPhone)) return null;

        return (
            <div className="od-client-status od-client-status--missing">
                <span className="od-client-status__text">
                    <UserPlus size={18} />
                    Цього клієнта немає в базі даних. Бажаєте додати?
                </span>
                <Button size="sm" onClick={addClientToDatabase} disabled={addingClient}>
                    {addingClient ? 'Додаємо…' : 'Додати'}
                </Button>
            </div>
        );
    }

    async function handleDownloadInvoice() {
        if (!order) return;
        setInvoiceLoading(true);
        try {
            const doc = await ordersApi.generateInvoiceDocument(order.id, {
                sellerId: resolveSellerId(draft?.sellerId),
            });
            setDocuments((prev) => [doc, ...prev.filter((d) => d.id !== doc.id)]);
            await ordersApi.downloadDocument(order.id, doc.id, doc.fileName);
        } catch (err) {
            alert(err.message || 'Не вдалося сформувати рахунок');
        } finally {
            setInvoiceLoading(false);
        }
    }

    async function handleDownloadDepositInvoice() {
        if (!order) return;
        setDepositInvoiceLoading(true);
        try {
            const { application, document } = await ordersApi.generateDepositInvoiceDocument(order.id, {
                sellerId: resolveSellerId(draft?.sellerId),
            });

            setOrder((prev) => (prev ? { ...prev, rentalApplicationId: application.id } : prev));
            setDraft((prev) => (prev ? { ...prev, rentalApplicationId: application.id } : prev));
            setLinkedRentalApp(application);
            setDocuments((prev) => [document, ...prev.filter((d) => d.id !== document.id)]);
            await ordersApi.downloadDocument(order.id, document.id, document.fileName);
        } catch (err) {
            alert(err.message || 'Не вдалося сформувати рахунок на заставу');
        } finally {
            setDepositInvoiceLoading(false);
        }
    }

    async function handleDownloadStoredDocument(doc) {
        if (!order || !doc?.id) return;
        try {
            await ordersApi.downloadDocument(order.id, doc.id, doc.fileName);
        } catch (err) {
            alert(err.message || 'Не вдалося завантажити файл');
        }
    }

    async function handleDeleteDocument(doc) {
        if (!order || !doc?.id) return;
        if (!window.confirm('Видалити цей файл?')) return;

        setDeletingDocId(doc.id);
        try {
            await ordersApi.removeDocument(order.id, doc.id);
            setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
        } catch (err) {
            alert(err.message || 'Не вдалося видалити файл');
        } finally {
            setDeletingDocId(null);
        }
    }

    function formatDocDateTime(value) {
        if (!value) return '';
        const dt = new Date(value);
        const date = formatOrderDate(value);
        const time = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
        return `${date} · ${time}`;
    }

    async function handleDelete() {
        if (!order) return;
        try {
            await ordersApi.remove(order.id);
            navigate('/admin/orders', { replace: true });
        } catch (err) {
            alert(err.message || 'Помилка видалення');
        } finally {
            setDeleteOpen(false);
        }
    }

    async function loadLinkedRentalApplication() {
        let applicationId = order.rentalApplicationId;
        if (!applicationId) {
            const { application: createdApp } = await ordersApi.createOrOpenRentalApplication(order.id);
            applicationId = createdApp.id;
        }

        const application = await rentalApplicationsApi.get(applicationId);

        setOrder((prev) => (prev ? { ...prev, rentalApplicationId: application.id } : prev));
        setDraft((prev) => (prev ? { ...prev, rentalApplicationId: application.id } : prev));
        setLinkedRentalApp(application);

        return application;
    }

    async function handleGenerateRentalDocument() {
        if (!order || converting || returnActLoading) return;
        setConverting(true);
        try {
            const application = await loadLinkedRentalApplication();
            const pdfPayload = buildRentalPdfPayload(application);
            const { blob, filename } = await generateRentalPdf(pdfPayload, {
                download: false,
                returnBlob: true,
            });

            const contentBase64 = await blobToBase64(blob);
            const { document } = await ordersApi.saveRentalApplicationDocument(order.id, {
                contentBase64,
                fileName: filename,
                title: `Заявка · ${application.applicationNumber || application.id}`,
            });

            setDocuments((prev) => [document, ...prev.filter((d) => d.id !== document.id)]);
            await ordersApi.downloadDocument(order.id, document.id, document.fileName);
        } catch (err) {
            alert(`Помилка: ${err.message}`);
        } finally {
            setConverting(false);
        }
    }

    async function handleGenerateReturnActDocument() {
        if (!order || converting || returnActLoading) return;
        setReturnActLoading(true);
        try {
            const application = await loadLinkedRentalApplication();
            const pdfPayload = buildRentalPdfPayload(application);
            const { blob, filename } = await generateRentalPdf(pdfPayload, {
                download: false,
                returnBlob: true,
                variant: 'return_inspection',
            });

            const contentBase64 = await blobToBase64(blob);
            const { document } = await ordersApi.saveRentalReturnActDocument(order.id, {
                contentBase64,
                fileName: filename,
                title: `Акт повернення · ${application.applicationNumber || application.id}`,
            });

            setDocuments((prev) => [document, ...prev.filter((d) => d.id !== document.id)]);
            await ordersApi.downloadDocument(order.id, document.id, document.fileName);
        } catch (err) {
            alert(`Помилка: ${err.message}`);
        } finally {
            setReturnActLoading(false);
        }
    }

    const suggestedProducts = productSearch.length > 1
        ? products.filter((p) =>
            p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
            (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase()))
        ).slice(0, 8)
        : [];

    if (loading) return <div className="od-loading">Завантаження...</div>;
    if (!order || !draft) return <div className="od-loading od-loading--err">Замовлення не знайдено</div>;

    const hasRent = orderHasRentItems(order, rentProductIds);

    return (
        <div className="od-page admin-form">
            <div className="od-header">
                <button type="button" className="od-back" onClick={() => navigate('/admin/orders')} title="До списку">
                    <ArrowLeft size={18} />
                </button>

                <div className="od-header-main">
                    <h1 className="od-title">{formatOrderNumberDisplay(order.orderNumber || `#${order.id}`)}</h1>
                    <div className="od-meta">
                        <Badge variant={ORDER_STATUS_VARIANT[order.status] || 'secondary'}>
                            {getOrderStatusLabel(order.status)}
                        </Badge>
                        <span>Створено {formatOrderDate(order.createdAt)}</span>
                        {linkedClient && (
                            <Link to={`/admin/clients/${linkedClient.id}`} className="text-[#e63946] font-semibold no-underline hover:underline">
                                Картка клієнта →
                            </Link>
                        )}
                    </div>
                </div>

                <div className="od-header-actions">
                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => setDeleteOpen(true)}>
                        <Trash2 size={14} /> Видалити
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                        <Save size={14} /> {saving ? 'Збереження...' : 'Зберегти'}
                    </Button>
                </div>
            </div>

            <div className="od-grid">
                <div className="od-grid-main">
                    <div className="od-grid-top">
                <div className="od-card od-card--client">
                    <h2 className="od-card__title">
                        <User size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                        Клієнт
                    </h2>
                    <div className="order-detail-grid2">
                        <div className="form-group">
                            <label>Ім&apos;я</label>
                            <input type="text" value={draft.customerName || ''} onChange={(e) => setField('customerName', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>Телефон</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                placeholder="380670064044"
                                value={draft.customerPhone || ''}
                                onChange={(e) => setField('customerPhone', e.target.value)}
                                onBlur={(e) => setField('customerPhone', normalizeUaPhone(e.target.value))}
                            />
                        </div>
                        <div className="form-group form-group--full">
                            <label>Email</label>
                            <input
                                type="email"
                                value={draft.customerEmail || ''}
                                onChange={(e) => setField('customerEmail', e.target.value)}
                                placeholder="email@example.com"
                            />
                        </div>
                        <div className="form-group form-group--full">
                            <label>Адреса доставки</label>
                            <input
                                type="text"
                                placeholder="Вкажіть адресу або «Самовивіз»"
                                value={draft.address || ''}
                                onChange={(e) => setField('address', e.target.value)}
                            />
                        </div>
                    </div>
                    {renderClientDbStatus()}
                </div>

                <div className="od-card od-card--delivery">
                    <h2 className="od-card__title">
                        <Truck size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                        Доставка та оплата
                    </h2>
                    <div className="od-readonly-row">
                        <span>Спосіб отримання</span>
                        <span>{DELIVERY_LABELS[draft.deliveryMethod] || draft.deliveryMethod || '—'}</span>
                    </div>
                    <div className="od-readonly-row">
                        <span>Оплата</span>
                        <span>{PAYMENT_LABELS[draft.paymentMethod] || draft.paymentMethod || '—'}</span>
                    </div>
                    <div className="form-group" style={{ marginTop: 16, marginBottom: 0 }}>
                        <label>Знижка, %</label>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={draft.discount ?? 0}
                            onChange={(e) => setField('discount', parseFloat(e.target.value) || 0)}
                        />
                    </div>
                    <div className="form-group" style={{ marginTop: 16, marginBottom: 0 }}>
                        <label>Орендодавець / Продавець</label>
                        <select
                            value={draft.sellerId || DEFAULT_SELLER_ID}
                            onChange={(e) => setField('sellerId', e.target.value)}
                        >
                            {SELLER_OPTIONS.map((seller) => (
                                <option key={seller.id} value={seller.id}>
                                    {seller.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    </div>
                </div>

                <div className="od-card od-card--products">
                    <h2 className="od-card__title">
                        <Package size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                        Товари
                    </h2>

                    <div className="order-item-list">
                        {draft.items.map((item, idx) => {
                            const line = calcLineDisplayAmounts(item, draft.sellerId, billingOptions);
                            return (
                            <div key={idx} className="order-item-row">
                                <span className="order-item-row__name">{item.name}</span>
                                <div className="order-item-row__qty">
                                    <input
                                        type="number"
                                        min="0"
                                        value={line.quantity ?? item.quantity}
                                        onChange={(e) => updateQty(idx, e.target.value)}
                                        readOnly={line.unit === 'доба'}
                                    />
                                    <span className="order-item-row__unit">{line.unit || (item.unit === 'м²' ? 'уп.' : 'шт.')}</span>
                                </div>
                                <span className="order-item-row__price">
                                    {line.lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₴
                                </span>
                                <button type="button" className="order-item-row__remove" onClick={() => removeItem(idx)} title="Прибрати">
                                    <X size={16} />
                                </button>
                            </div>
                            );
                        })}
                        {!draft.items.length && (
                            <p style={{ color: '#9ca3af', fontSize: '0.9rem', margin: '0 0 12px' }}>Позицій поки немає</p>
                        )}
                    </div>

                    <div className="order-product-search-wrap">
                        <Search size={15} className="order-product-search-icon" />
                        <input
                            type="text"
                            className="order-product-search-input"
                            placeholder="Додати товар: введіть назву або артикул..."
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                        />
                        {suggestedProducts.length > 0 && (
                            <div className="order-product-suggest">
                                {suggestedProducts.map((p) => (
                                    <div key={p.id} className="order-product-suggest__item" onClick={() => addItem(p)}>
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

                    <div className="od-footer-bar">
                        <div className="od-footer-bar__total">
                            <div>
                                Разом:{' '}
                                <strong>
                                    {orderAmounts.total.toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}{' '}
                                    ₴
                                </strong>
                                {orderAmounts.appliesVat && (
                                    <span className="od-footer-bar__vat">
                                        {' '}
                                        (в т.ч. ПДВ {orderAmounts.vatPercent}%:{' '}
                                        {orderAmounts.vatAmount.toLocaleString(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}{' '}
                                        ₴)
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="od-footer-bar__actions">
                            <Button variant="secondary" size="sm" onClick={() => navigate('/admin/orders')}>
                                До списку
                            </Button>
                            <Button size="sm" onClick={handleSave} disabled={saving}>
                                <Save size={14} /> {saving ? 'Збереження...' : 'Зберегти'}
                            </Button>
                        </div>
                    </div>
                </div>
                </div>

                <div className="od-card od-card--docs">
                    <h2 className="od-card__title">
                        <Files size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                        Документація
                    </h2>
                    <div className="od-docs-actions">
                        <Button
                            variant="secondary"
                            className="od-docs-actions__btn od-docs-actions__btn--invoice"
                            onClick={handleDownloadInvoice}
                            disabled={invoiceLoading || depositInvoiceLoading || !(draft.items || []).length}
                        >
                            <FileText size={16} />
                            {invoiceLoading ? 'Формуємо…' : 'Сформувати рахунок'}
                        </Button>
                        {hasRent && (
                            <Button
                                variant="secondary"
                                className="od-docs-actions__btn od-docs-actions__btn--deposit"
                                onClick={handleDownloadDepositInvoice}
                                disabled={invoiceLoading || depositInvoiceLoading || converting || returnActLoading}
                            >
                                <FileText size={16} />
                                {depositInvoiceLoading ? 'Формуємо…' : 'Рахунок на заставу'}
                            </Button>
                        )}
                        {hasRent && (
                            <>
                                <Button
                                    variant="secondary"
                                    className="od-docs-actions__btn od-docs-actions__btn--application"
                                    onClick={handleGenerateRentalDocument}
                                    disabled={converting || returnActLoading}
                                >
                                    <ClipboardList size={16} />
                                    {converting
                                        ? 'Формуємо…'
                                        : linkedRentalApp
                                            ? 'Сформувати заявку (PDF)'
                                            : 'Сформувати заявку'}
                                </Button>
                                <Button
                                    variant="secondary"
                                    className="od-docs-actions__btn od-docs-actions__btn--return"
                                    onClick={handleGenerateReturnActDocument}
                                    disabled={converting || returnActLoading}
                                >
                                    <Undo2 size={16} />
                                    {returnActLoading ? 'Формуємо…' : 'Акт повернення-огляду (PDF)'}
                                </Button>
                            </>
                        )}
                        {linkedRentalApp && (
                            <Link
                                to={`/admin/rental-applications/${linkedRentalApp.id}`}
                                className="od-docs-linked-app"
                            >
                                Заявка {linkedRentalApp.applicationNumber || `#${linkedRentalApp.id}`}
                            </Link>
                        )}
                        {!hasRent && (
                            <p className="od-docs-hint">
                                Заявка на оренду з&apos;явиться, якщо в замовленні є інструменти з каталогу оренди.
                            </p>
                        )}
                    </div>

                    <div className="od-docs-files">
                        <div className="od-docs-files__label">Збережені файли</div>
                        {documents.length === 0 ? (
                            <p className="od-docs-hint">Поки немає. Згенеровані документи з&apos;являться тут.</p>
                        ) : (
                            <ul className="od-docs-list">
                                {documents.map((doc) => (
                                    <li key={doc.id} className="od-docs-list__item">
                                        <button
                                            type="button"
                                            className="od-docs-list__link"
                                            onClick={() => handleDownloadStoredDocument(doc)}
                                            title="Завантажити"
                                        >
                                            <FileText size={16} />
                                            <span className="od-docs-list__meta">
                                                <span className="od-docs-list__title">{doc.title || doc.fileName}</span>
                                                <span className="od-docs-list__date">{formatDocDateTime(doc.createdAt)}</span>
                                            </span>
                                            <Download size={15} className="od-docs-list__icon" />
                                        </button>
                                        <button
                                            type="button"
                                            className="od-docs-list__remove"
                                            onClick={() => handleDeleteDocument(doc)}
                                            disabled={deletingDocId === doc.id}
                                            title="Видалити"
                                        >
                                            <X size={16} />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            <ConfirmDialog
                open={deleteOpen}
                title="Видалити замовлення?"
                message={`Видалити замовлення ${order.orderNumber || '#' + order.id}? Цю дію неможливо скасувати.`}
                confirmText="Видалити"
                onConfirm={handleDelete}
                onCancel={() => setDeleteOpen(false)}
            />
        </div>
    );
}
