import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { ArrowLeft, Plus, Trash2, Save, Printer, Download, Search, X, Sparkles } from 'lucide-react';
import { generateRentalPdf } from '../../utils/generateRentalPdf';
import { buildRentalPdfPayload, RENTAL_LESSOR } from '../../utils/rentalPdfPayload';
import { buildRentalActContractRef } from '../../utils/rentalContractRef';
import { clientsApi, rentalApplicationsApi, productsApi } from '../../services/api';
import RentalApplicationPrint from './RentalApplicationPrint';
import { DEFAULT_RENTAL_DEPOSIT_PERCENT } from '../../constants/rentalDefaults';
import { normalizeUaPhone } from '../../utils/phoneUtils';
import {
    TECHNICAL_CONDITION_OPTIONS,
    normalizeTechnicalCondition,
    isCanonicalTechnicalCondition,
} from '../../constants/technicalConditions';
import './Admin.css';
import './RentalApplicationForm.css';
import { getRentPricePerDayFromTiers, coerceDbRentPriceTiers, formatRentCatalogPriceCaption } from '../../utils/rentPricing';

const LESSOR = RENTAL_LESSOR;

const emptyItem = () => ({
    _key: Date.now() + Math.random(),
    productId: null,
    name: '',
    serialNumber: '',
    inventoryNumber: '',
    technicalCondition: '',
    unit: 'шт',
    quantity: 1,
    weightPerUnit: '',
    weightTotal: '',
    replacementCostPerUnit: '',
    replacementCostTotal: '',
    depositPercent: DEFAULT_RENTAL_DEPOSIT_PERCENT,
    depositAmount: '',
    rentFrom: '',
    rentTo: '',
    days: 0,
    pricePerDay: '',
    totalRental: '',
    kitItems: [],
    catalogPrice: '',
    rentPriceTiers: null,
});

const calcDays = (from, to) => {
    if (!from || !to) return 0;
    const d = Math.ceil((new Date(to) - new Date(from)) / 86400000);
    return d > 0 ? d : 0;
};

function recalcLineTotals(item) {
    const qty = parseFloat(item.quantity || 1);
    const rawDays = calcDays(item.rentFrom, item.rentTo);
    const daysForTier = rawDays > 0 ? rawDays : 1;
    const catRaw =
        item.catalogPrice === '' || item.catalogPrice === null || item.catalogPrice === undefined
            ? NaN
            : parseFloat(item.catalogPrice);
    const fallback = Number.isFinite(catRaw) ? catRaw : (parseFloat(item.pricePerDay) || 0);
    const tiers = coerceDbRentPriceTiers(item.rentPriceTiers);
    const rate = getRentPricePerDayFromTiers(tiers, fallback, daysForTier);
    const totalRental =
        rawDays > 0 ? (rawDays * rate * qty).toFixed(2) : (0).toFixed(2);
    return {
        ...item,
        days: rawDays,
        pricePerDay: rate,
        totalRental,
    };
}

export default function AdminRentalApplicationForm() {
    const { id } = useParams();
    const isNew = !id || id === 'new';
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const printRef = useRef();

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState('parties'); // 'parties' | 'items' | 'document'
    const [applicationNumber, setApplicationNumber] = useState('');
    const [status, setStatus] = useState('draft');
    const [notes, setNotes] = useState('');
    const [discountType, setDiscountType] = useState('fixed');
    const [discountValue, setDiscountValue] = useState('');
    const [clients, setClients] = useState([]);
    const [selectedClientId, setSelectedClientId] = useState('');

    // Client
    const [client, setClient] = useState({ name: '', phone: '', email: '', passport: '', address: '', siteAddress: '' });

    // Responsible persons
    const [responsible, setResponsible] = useState([]);

    // Items
    const [items, setItems] = useState([emptyItem()]);

    // Product search
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const searchTimeout = useRef(null);

    // Upsell panel
    const [upsellItems, setUpsellItems] = useState([]);
    const [upsellVisible, setUpsellVisible] = useState(false);
    const [upsellProductName, setUpsellProductName] = useState('');

    const buildCurrentApplicationPayload = () => buildRentalPdfPayload({
        applicationNumber,
        clientName: client.name,
        clientPhone: client.phone,
        clientEmail: client.email,
        clientPassport: client.passport,
        clientAddress: client.address,
        clientSiteAddress: client.siteAddress,
        responsible,
        items,
        discountType,
        discountValue: parsedDiscount,
    });

    const currentContractRef = buildRentalActContractRef(null, {
        applicationNumber,
        rentFrom: items[0]?.rentFrom,
    });

    const handlePrint = useReactToPrint({ contentRef: printRef });

    useEffect(() => {
        clientsApi.list()
            .then(data => setClients(Array.isArray(data) ? data : []))
            .catch(() => setClients([]));
    }, []);

    useEffect(() => {
        if (!isNew || clients.length === 0) return;
        const queryClientId = searchParams.get('clientId');
        if (!queryClientId) return;
        const picked = clients.find(c => String(c.id) === String(queryClientId));
        if (!picked) return;
        setSelectedClientId(String(picked.id));
        setClient({
            name: picked.fullName || '',
            phone: picked.phone || '',
            email: picked.email || '',
            passport: picked.passport || '',
            address: picked.address || '',
            siteAddress: picked.siteAddress || ''
        });
        const discountPercent = Number(picked.discountPercent || 0);
        setDiscountType('percent');
        setDiscountValue(String(discountPercent));
    }, [isNew, clients, searchParams]);

    // Load existing application
    useEffect(() => {
        if (!isNew) {
            rentalApplicationsApi.get(id)
                .then(data => {
                    if (!data) return;
                    setApplicationNumber(data.applicationNumber || '');
                    setStatus(data.status || 'draft');
                    setNotes(data.notes || '');
                    setDiscountType(data.discountType === 'percent' ? 'percent' : 'fixed');
                    setDiscountValue(
                        data.discountValue !== null && data.discountValue !== undefined
                            ? String(data.discountValue)
                            : ''
                    );
                    setClient({
                        name: data.clientName || '',
                        phone: data.clientPhone || '',
                        email: data.clientEmail || '',
                        passport: data.clientPassport || '',
                        address: data.clientAddress || '',
                        siteAddress: data.clientSiteAddress || '',
                    });
                    setSelectedClientId(data.clientId ? String(data.clientId) : '');
                    if (data.responsible && Array.isArray(data.responsible)) {
                        setResponsible(data.responsible);
                    }
                    setItems(data.items && data.items.length > 0
                        ? data.items.map((i) => {
                            const row = { ...emptyItem(), ...i, _key: Date.now() + Math.random() };
                            row.technicalCondition = normalizeTechnicalCondition(i.technicalCondition);
                            if (row.catalogPrice === '' || row.catalogPrice === null || row.catalogPrice === undefined) {
                                const pd = parseFloat(i.pricePerDay);
                                row.catalogPrice = Number.isFinite(pd) ? pd : '';
                            }
                            return recalcLineTotals(row);
                        })
                        : [emptyItem()]
                    );
                })
                .catch(() => {})
                .finally(() => setLoading(false));
        }
    }, [id, isNew]);

    // Product search with debounce
    useEffect(() => {
        clearTimeout(searchTimeout.current);
        if (searchQuery.trim().length < 2) { setSearchResults([]); return; }
        searchTimeout.current = setTimeout(async () => {
            try {
                const data = await productsApi.list({
                    search: searchQuery.trim(),
                    isRent: true,
                    includeHiddenRent: true,
                });
                const rows = Array.isArray(data) ? data : [];
                setSearchResults(rows.slice(0, 8));
            } catch {
                setSearchResults([]);
            }
        }, 300);
    }, [searchQuery]);

    const buildItemFromProduct = (product) => {
        const replacementCostPerUnit = parseFloat(product.replacementCost || 0);
        const depositPercent = DEFAULT_RENTAL_DEPOSIT_PERCENT;
        const depositAmount = (replacementCostPerUnit * depositPercent / 100).toFixed(2);
        const catalogPrice = parseFloat(product.price || 0) || 0;
        const rentPriceTiers = coerceDbRentPriceTiers(product.rentPriceTiers);
        const pricePerDay = getRentPricePerDayFromTiers(rentPriceTiers, catalogPrice, 1);
        return {
            ...emptyItem(),
            _key: Date.now() + Math.random(),
            productId: product.id,
            name: product.name,
            serialNumber: product.serialNumber || '',
            inventoryNumber: product.inventoryNumber || '',
            technicalCondition: normalizeTechnicalCondition(product.technicalCondition),
            unit: product.unit || 'шт',
            quantity: 1,
            weightPerUnit: product.weightPerUnit || '',
            weightTotal: product.weightTotal || '',
            replacementCostPerUnit: replacementCostPerUnit || '',
            replacementCostTotal: replacementCostPerUnit || '',
            depositPercent,
            depositAmount,
            catalogPrice,
            rentPriceTiers,
            pricePerDay,
            kitItems: product.kitItems || [],
        };
    };

    const addProductFromSearch = async (product) => {
        setItems(prev => [...prev, buildItemFromProduct(product)]);
        setSearchQuery('');
        setSearchResults([]);

        // Load related products for upsell panel
        if (product.relatedProducts && product.relatedProducts.length > 0) {
            const related = await Promise.all(
                product.relatedProducts.map((pid) =>
                    productsApi.getById(pid).catch(() => null)
                )
            );
            const filtered = related.filter(Boolean);
            if (filtered.length > 0) {
                setUpsellItems(filtered);
                setUpsellProductName(product.name);
                setUpsellVisible(true);
            }
        }
    };

    const addUpsellProduct = (product) => {
        // Check if already in items
        const alreadyAdded = items.some(i => i.productId === product.id);
        if (alreadyAdded) return;
        setItems(prev => [...prev, buildItemFromProduct(product)]);
        setUpsellItems(prev => prev.filter(p => p.id !== product.id));
        if (upsellItems.length <= 1) setUpsellVisible(false);
    };

    const updateItem = (key, field, value) => {
        setItems(prev => prev.map(item => {
            if ((field === 'rentFrom' || field === 'rentTo') && item._key !== key) {
                const merged = { ...item, [field]: value };
                return recalcLineTotals(merged);
            }

            if (item._key !== key) return item;

            const updated = { ...item, [field]: value };

            if (field === 'rentFrom' || field === 'rentTo') {
                return recalcLineTotals(updated);
            }
            if (field === 'quantity') {
                updated.weightTotal = (parseFloat(updated.weightPerUnit || 0) * parseFloat(value || 1)).toFixed(2);
                updated.replacementCostTotal = (parseFloat(updated.replacementCostPerUnit || 0) * parseFloat(value || 1)).toFixed(2);
                updated.depositAmount = (parseFloat(updated.replacementCostTotal || 0) * parseFloat(updated.depositPercent || 0) / 100).toFixed(2);
                return recalcLineTotals(updated);
            }
            if (field === 'replacementCostPerUnit') {
                updated.replacementCostTotal = (parseFloat(value || 0) * parseFloat(updated.quantity || 1)).toFixed(2);
                updated.depositAmount = (parseFloat(updated.replacementCostTotal) * parseFloat(updated.depositPercent || 0) / 100).toFixed(2);
                return updated;
            }
            if (field === 'depositPercent') {
                updated.depositAmount = (parseFloat(updated.replacementCostTotal || 0) * parseFloat(value || 0) / 100).toFixed(2);
                return updated;
            }
            if (field === 'pricePerDay') {
                updated.totalRental = (updated.days * parseFloat(value || 0) * parseFloat(updated.quantity || 1)).toFixed(2);
                return updated;
            }
            return updated;
        }));
    };

    const removeItem = (key) => setItems(prev => prev.filter(i => i._key !== key));

    const totalRental = items.reduce((s, i) => s + parseFloat(i.totalRental || 0), 0);
    const totalDeposit = items.reduce((s, i) => s + parseFloat(i.depositAmount || 0), 0);
    const parsedDiscount = Math.max(0, parseFloat(discountValue || 0) || 0);
    const rawDiscountAmount =
        discountType === 'percent'
            ? (totalRental * Math.min(parsedDiscount, 100)) / 100
            : parsedDiscount;
    const discountAmount = Math.min(rawDiscountAmount, totalRental);
    const totalRentalAfterDiscount = Math.max(totalRental - discountAmount, 0);
    const grandTotal = totalRentalAfterDiscount + totalDeposit;

    const handleSave = async () => {
        setSaving(true);
        const payload = {
            status,
            notes,
            clientName: client.name,
            clientPhone: normalizeUaPhone(client.phone),
            clientEmail: client.email,
            clientPassport: client.passport,
            clientAddress: client.address,
            clientSiteAddress: client.siteAddress,
            clientId: selectedClientId ? Number(selectedClientId) : null,
            responsible: responsible.map((person) => ({
                ...person,
                phone: normalizeUaPhone(person.phone),
            })),
            rentFrom: items[0]?.rentFrom || null,
            rentTo: items[0]?.rentTo || null,
            items: items.map(({ _key, ...i }) => i),
            totalAmount: totalRentalAfterDiscount.toFixed(2),
            depositAmount: totalDeposit.toFixed(2),
            discountType,
            discountValue: parsedDiscount.toFixed(2),
            discountAmount: discountAmount.toFixed(2),
        };

        const doSave = async (attempt = 1) => {
            try {
                const saved = isNew
                    ? await rentalApplicationsApi.create(payload)
                    : await rentalApplicationsApi.update(id, payload);
                if (isNew) navigate(`/admin/rental-applications/${saved.id}`, { replace: true });
                return true;
            } catch (err) {
                if (attempt === 1 && (err.status === 503 || err.status === 401)) {
                    await new Promise(r => setTimeout(r, 600));
                    return doSave(2);
                }
                throw err;
            }
        };

        try {
            await doSave();
        } catch (err) {
            alert(`Помилка збереження: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{ padding: 40, color: '#999' }}>Завантаження...</div>;

    const today = new Date().toLocaleDateString('uk-UA');

    return (
        <div className="rental-form-page">
            {/* Header */}
            <div className="rental-form-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Link to="/admin/rental-applications" className="btn-back">
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <h1 className="admin-title" style={{ marginBottom: 2 }}>
                            {isNew ? 'Нова заявка' : `Заявка ${applicationNumber}`}
                        </h1>
                        <span style={{ fontSize: '0.85rem', color: '#888' }}>{today}</span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <select value={status} onChange={e => setStatus(e.target.value)} className="status-select">
                        <option value="draft">Чернетка</option>
                        <option value="active">Активна</option>
                        <option value="booked">Заброньовано</option>
                        <option value="overdue">Термін повернення прострочено</option>
                        <option value="returned">Повернуто</option>
                        <option value="cancelled">Скасована</option>
                    </select>
                    <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                        <Save size={16} /> {saving ? 'Збереження...' : 'Зберегти'}
                    </button>
                </div>
            </div>

            {/* Tab navigation */}
            <div className="rental-tabs-nav">
                {[
                    { key: 'parties',  label: 'Сторони' },
                    { key: 'items',    label: `Позиції (${items.length})` },
                    { key: 'document', label: 'Документ' },
                ].map(t => (
                    <button
                        key={t.key}
                        className={`rental-tab-btn${tab === t.key ? ' is-active' : ''}`}
                        onClick={() => setTab(t.key)}
                        type="button"
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="rental-form-body">
                    {/* ── TAB: Сторони ── */}
                    {tab === 'parties' && <div className="rental-parties-grid">
                    {/* Lessor (static) */}
                    <div className="rental-party-block">
                        <h3 className="party-title">Орендодавець</h3>
                        <div className="party-field"><span>П.І.Б.:</span><strong>{LESSOR.name}</strong></div>
                        <div className="party-field"><span>ІПН:</span>{LESSOR.ipn}</div>
                        <div className="party-field"><span>Адреса:</span>{LESSOR.address}</div>
                        <div className="party-field"><span>Телефон:</span>{LESSOR.phone}</div>
                        <div className="party-field"><span>E-mail:</span>{LESSOR.email}</div>
                        <div className="party-field"><span>Адреса складу:</span>{LESSOR.warehouseAddress}</div>
                    </div>

                    {/* Client (editable) */}
                    <div className="rental-party-block">
                        <h3 className="party-title">Орендар</h3>
                        <div style={{ marginBottom: '10px' }}>
                            <select
                                value={selectedClientId}
                                onChange={e => {
                                    const value = e.target.value;
                                    setSelectedClientId(value);
                                    if (!value) return;
                                    const picked = clients.find(c => String(c.id) === String(value));
                                    if (!picked) return;
                                    setClient({
                                        name: picked.fullName || '',
                                        phone: picked.phone || '',
                                        email: picked.email || '',
                                        passport: picked.passport || '',
                                        address: picked.address || '',
                                        siteAddress: picked.siteAddress || ''
                                    });
                                    const discountPercent = Number(picked.discountPercent || 0);
                                    setDiscountType('percent');
                                    setDiscountValue(String(discountPercent));
                                }}
                                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #ddd' }}
                            >
                                <option value="">Обрати клієнта з бази (опціонально)</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.fullName} · {c.phone}
                                        {Number(c.discountPercent || 0) > 0 ? ` · знижка ${Number(c.discountPercent).toFixed(0)}%` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {[
                            { label: 'П.І.Б.', field: 'name', placeholder: "Прізвище Ім'я По-батькові" },
                            { label: 'Телефон', field: 'phone', placeholder: '380670064044' },
                            { label: 'E-mail', field: 'email', placeholder: 'email@example.com' },
                            { label: 'Паспорт / ID', field: 'passport', placeholder: 'Серія, номер або ID-картка' },
                            { label: 'Адреса проживання', field: 'address', placeholder: 'вул. Прикладна, 1, м. Київ' },
                            { label: 'Адреса майданчика', field: 'siteAddress', placeholder: 'Адреса будівельного майданчика' },
                        ].map(({ label, field, placeholder }) => (
                            <div key={field} className="party-field editable">
                                <span>{label}:</span>
                                <input
                                    value={client[field]}
                                    onChange={e => setClient(prev => ({ ...prev, [field]: e.target.value }))}
                                    onBlur={field === 'phone'
                                        ? (e) => setClient(prev => ({ ...prev, phone: normalizeUaPhone(e.target.value) }))
                                        : undefined}
                                    placeholder={placeholder}
                                />
                            </div>
                        ))}

                        {/* Responsible persons */}
                        {responsible.length > 0 && (
                            <div style={{ marginTop: '10px', borderTop: '1px dashed #eee', paddingTop: '10px' }}>
                                <div className="party-title" style={{ marginBottom: '8px' }}>Відповідальні особи</div>
                                {responsible.map((r, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
                                        <input
                                            value={r.name}
                                            onChange={e => setResponsible(prev => prev.map((p, pi) => pi === i ? { ...p, name: e.target.value } : p))}
                                            placeholder="П.І.Б. відповідальної особи"
                                            style={{ flex: 2, border: 'none', borderBottom: '1px dashed #ddd', padding: '2px 4px', fontSize: '0.88rem', outline: 'none', background: 'transparent' }}
                                        />
                                        <input
                                            value={r.phone}
                                            onChange={e => setResponsible(prev => prev.map((p, pi) => pi === i ? { ...p, phone: e.target.value } : p))}
                                            onBlur={e => setResponsible(prev => prev.map((p, pi) => pi === i ? { ...p, phone: normalizeUaPhone(e.target.value) } : p))}
                                            placeholder="380670064044"
                                            style={{ flex: 1, border: 'none', borderBottom: '1px dashed #ddd', padding: '2px 4px', fontSize: '0.88rem', outline: 'none', background: 'transparent' }}
                                        />
                                        <button
                                            onClick={() => setResponsible(prev => prev.filter((_, pi) => pi !== i))}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e53e3e', padding: '2px', opacity: 0.6 }}
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={() => setResponsible(prev => [...prev, { name: '', phone: '' }])}
                            style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: '1px dashed #ddd', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontSize: '0.8rem', color: '#888', width: '100%', justifyContent: 'center' }}
                        >
                            <Plus size={13} /> Додати відповідальну особу
                        </button>
                    </div>
                    </div>}

                    {/* ── TAB: Позиції ── */}
                    {tab === 'items' && <>
                    {/* Product search */}
                    <div className="rental-section">
                    <div className="rental-section-header">
                        <h2>Інструменти у заявці</h2>
                        <div className="product-search-wrap" style={{ position: 'relative' }}>
                            <Search size={16} className="search-icon" />
                            <input
                                type="text"
                                placeholder="Додати інструмент (пошук за назвою)..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="product-search-input"
                            />
                            {searchResults.length > 0 && (
                                <div className="search-dropdown">
                                    {searchResults.map(p => (
                                        <div key={p.id} className="search-dropdown-item" onClick={() => addProductFromSearch(p)}>
                                            <img src={p.image} alt="" />
                                            <div>
                                                <div className="sdi-name">{p.name}</div>
                                                <div className="sdi-sub">{p.category} · {formatRentCatalogPriceCaption(p)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Items table */}
                    <div className="rental-items-wrap">
                        {items.map((item, idx) => (
                            <div key={item._key} className="rental-item-card">
                                <div className="item-card-header">
                                    <span className="item-num">{idx + 1}</span>
                                    <input
                                        className="item-name-input"
                                        value={item.name}
                                        onChange={e => updateItem(item._key, 'name', e.target.value)}
                                        placeholder="Назва інструменту"
                                    />
                                    <button onClick={() => removeItem(item._key)} className="remove-item-btn" title="Видалити">
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                <div className="item-fields-grid">
                                    <div className="item-field">
                                        <label>Серійний №</label>
                                        <input value={item.serialNumber} onChange={e => updateItem(item._key, 'serialNumber', e.target.value)} placeholder="б/н" />
                                    </div>
                                    <div className="item-field">
                                        <label>Інвентарний №</label>
                                        <input value={item.inventoryNumber} onChange={e => updateItem(item._key, 'inventoryNumber', e.target.value)} placeholder="INV-001" />
                                    </div>
                                    <div className="item-field">
                                        <label>Технічний стан</label>
                                        <select value={item.technicalCondition} onChange={e => updateItem(item._key, 'technicalCondition', e.target.value)}>
                                            <option value="">— оберіть —</option>
                                            {TECHNICAL_CONDITION_OPTIONS.map((o) => (
                                                <option key={o.value} value={o.value}>{o.label}</option>
                                            ))}
                                            {item.technicalCondition && !isCanonicalTechnicalCondition(item.technicalCondition) && (
                                                <option value={item.technicalCondition}>{item.technicalCondition} (нестандарт)</option>
                                            )}
                                        </select>
                                    </div>
                                    <div className="item-field">
                                        <label>Од. виміру</label>
                                        <input value={item.unit} onChange={e => updateItem(item._key, 'unit', e.target.value)} />
                                    </div>
                                    <div className="item-field">
                                        <label>Кількість</label>
                                        <input type="number" min="1" value={item.quantity} onChange={e => updateItem(item._key, 'quantity', e.target.value)} />
                                    </div>
                                    <div className="item-field">
                                        <label>Вага заг., кг</label>
                                        <input type="number" step="0.01" value={item.weightTotal} onChange={e => updateItem(item._key, 'weightTotal', e.target.value)} placeholder="0.00" />
                                    </div>
                                    <div className="item-field">
                                        <label>Відновл. вартість, ₴</label>
                                        <input type="number" step="0.01" value={item.replacementCostPerUnit} onChange={e => updateItem(item._key, 'replacementCostPerUnit', e.target.value)} placeholder="0.00" />
                                    </div>
                                    <div className="item-field">
                                        <label>Заст. платіж, %</label>
                                        <input type="number" min="0" max="100" value={item.depositPercent} onChange={e => updateItem(item._key, 'depositPercent', e.target.value)} />
                                    </div>
                                    <div className="item-field item-field--highlight">
                                        <label>Застава, ₴</label>
                                        <input value={item.depositAmount} readOnly className="readonly-field" />
                                    </div>
                                    <div className="item-field">
                                        <label>Оренда з</label>
                                        <input type="date" value={item.rentFrom} onChange={e => updateItem(item._key, 'rentFrom', e.target.value)} />
                                    </div>
                                    <div className="item-field">
                                        <label>Оренда по</label>
                                        <input type="date" value={item.rentTo} onChange={e => updateItem(item._key, 'rentTo', e.target.value)} />
                                    </div>
                                    <div className="item-field item-field--highlight">
                                        <label>Діб</label>
                                        <input value={item.days || 0} readOnly className="readonly-field" />
                                    </div>
                                    <div className="item-field">
                                        <label>Тариф, ₴/доба</label>
                                        <input type="number" step="0.01" value={item.pricePerDay} onChange={e => updateItem(item._key, 'pricePerDay', e.target.value)} placeholder="0.00" />
                                    </div>
                                    <div className="item-field item-field--total">
                                        <label>Сума оренди, ₴</label>
                                        <input value={item.totalRental || '0.00'} readOnly className="readonly-field total-field" />
                                    </div>
                                </div>

                                {/* Kit items */}
                                {Array.isArray(item.kitItems) && item.kitItems.length > 0 && (
                                    <div className="kit-items-section">
                                        <div className="kit-items-title">До комплекту входять:</div>
                                        {item.kitItems.map((kit, ki) => (
                                            <div key={ki} className="kit-item-row">
                                                <span className="kit-item-num">{idx + 1}.{ki + 1}</span>
                                                <span className="kit-item-name">{kit}</span>
                                                <span className="kit-item-state">справний</span>
                                                <button
                                                    type="button"
                                                    className="kit-item-remove-btn"
                                                    title="Прибрати з комплектації в цій заявці"
                                                    onClick={() => {
                                                        setItems(prev =>
                                                            prev.map(it => {
                                                                if (it._key !== item._key) return it;
                                                                const nextKitItems = Array.isArray(it.kitItems)
                                                                    ? it.kitItems.filter((_, index) => index !== ki)
                                                                    : [];
                                                                return { ...it, kitItems: nextKitItems };
                                                            })
                                                        );
                                                    }}
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}

                        <button
                            onClick={() => setItems(prev => [...prev, emptyItem()])}
                            className="add-item-btn"
                        >
                            <Plus size={16} /> Додати рядок вручну
                        </button>
                    </div>
                </div>
                <div className="rental-footer-grid">
                    <div className="rental-totals rental-totals--row">
                        <div className="total-row">
                            <span>Загальна сума оренди:</span>
                            <strong>{totalRental.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴</strong>
                        </div>
                        <div className="total-row" style={{ gap: '10px', flexWrap: 'wrap' }}>
                            <span>Знижка:</span>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <select
                                    value={discountType}
                                    onChange={e => setDiscountType(e.target.value)}
                                    style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #ddd' }}
                                >
                                    <option value="fixed">₴</option>
                                    <option value="percent">%</option>
                                </select>
                                <input
                                    type="number"
                                    min="0"
                                    max={discountType === 'percent' ? 100 : undefined}
                                    step="0.01"
                                    value={discountValue}
                                    onChange={e => setDiscountValue(e.target.value)}
                                    placeholder={discountType === 'percent' ? '0-100' : '0.00'}
                                    style={{ width: '100px', padding: '6px 8px', borderRadius: '8px', border: '1px solid #ddd' }}
                                />
                            </div>
                            <strong style={{ marginLeft: 'auto', color: '#b91c1c' }}>
                                -{discountAmount.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴
                            </strong>
                        </div>
                        <div className="total-row">
                            <span>Оренда зі знижкою:</span>
                            <strong>{totalRentalAfterDiscount.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴</strong>
                        </div>
                        <div className="total-row">
                            <span>Загальна застава:</span>
                            <strong>{totalDeposit.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴</strong>
                        </div>
                        <div className="total-row total-row--grand">
                            <span>До сплати (оренда зі знижкою + застава):</span>
                            <strong>{grandTotal.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴</strong>
                        </div>
                    </div>
                </div>
                    </>}

                    {/* ── TAB: Документ ── */}
                    {tab === 'document' && (
                        <div className="rental-section">
                            <h2>Документ</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '480px' }}>
                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                    <button
                                        onClick={() =>
                                            generateRentalPdf(buildCurrentApplicationPayload()).catch(console.error)
                                        }
                                        className="btn-secondary-icon"
                                        title="Скачати PDF"
                                        style={{ flex: 1, minWidth: '180px' }}
                                    >
                                        <Download size={18} /> Заявка (PDF)
                                    </button>
                                    <button
                                        onClick={() =>
                                            generateRentalPdf(buildCurrentApplicationPayload(), { variant: 'return_inspection' }).catch(console.error)
                                        }
                                        className="btn-secondary-icon"
                                        title="Акт повернення-огляду"
                                        style={{ flex: 1, minWidth: '180px' }}
                                    >
                                        <Download size={18} /> Акт повернення (PDF)
                                    </button>
                                    <button onClick={handlePrint} className="btn-secondary-icon" title="Друк" style={{ flex: 1, minWidth: '120px' }}>
                                        <Printer size={18} /> Друк
                                    </button>
                                </div>

                                <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '16px', border: '1px solid #e5e7eb' }}>
                                    <div className="party-field"><span>№ заявки:</span><strong>{applicationNumber || '(буде присвоєно після збереження)'}</strong></div>
                                    <div className="party-field"><span>Клієнт:</span><strong>{client.name || '—'}</strong></div>
                                    <div className="party-field"><span>Телефон:</span>{client.phone || '—'}</div>
                                    <div className="party-field"><span>Позицій:</span>{items.length} шт.</div>
                                    <div className="party-field"><span>Оренда:</span><strong>{totalRentalAfterDiscount.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴</strong></div>
                                    <div className="party-field"><span>Застава:</span><strong>{totalDeposit.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴</strong></div>
                                    <div className="party-field" style={{ borderTop: '1px solid #e5e7eb', marginTop: '8px', paddingTop: '8px' }}>
                                        <span>Всього:</span>
                                        <strong style={{ fontSize: '1.1rem', color: 'var(--admin-accent)' }}>{grandTotal.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴</strong>
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>Нотатки</label>
                                    <textarea
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        placeholder="Додаткові умови, примітки, особливості..."
                                        rows={4}
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ddd', resize: 'vertical', fontSize: '0.9rem' }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
            </div>

            {/* Upsell panel */}
            <div className={`upsell-panel ${upsellVisible ? 'upsell-panel--open' : ''}`}>
                <div className="upsell-panel-header">
                    <div className="upsell-panel-title">
                        <Sparkles size={16} style={{ color: '#f59e0b' }} />
                        <span>Не забудьте порадити замовнику:</span>
                    </div>
                    <button className="upsell-close" onClick={() => setUpsellVisible(false)}>
                        <X size={18} />
                    </button>
                </div>
                <p className="upsell-subtitle">
                    До «{upsellProductName}» часто беруть:
                </p>
                <div className="upsell-items">
                    {upsellItems.map(p => {
                        const alreadyAdded = items.some(i => i.productId === p.id);
                        return (
                            <div
                                key={p.id}
                                className={`upsell-item ${alreadyAdded ? 'upsell-item--added' : ''}`}
                                onClick={() => !alreadyAdded && addUpsellProduct(p)}
                            >
                                <img src={p.image} alt={p.name} className="upsell-item-img" />
                                <div className="upsell-item-info">
                                    <span className="upsell-item-name">{p.name}</span>
                                    <span className="upsell-item-price">{formatRentCatalogPriceCaption(p)}</span>
                                </div>
                                <button className={`upsell-add-btn ${alreadyAdded ? 'added' : ''}`}>
                                    {alreadyAdded ? '✓' : <Plus size={16} />}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Hidden print template */}
            <div style={{ display: 'none' }}>
                <RentalApplicationPrint
                    ref={printRef}
                    applicationNumber={applicationNumber}
                    lessor={LESSOR}
                    client={client}
                    responsible={responsible}
                    items={items}
                    totalRental={totalRental}
                    totalDeposit={totalDeposit}
                    discountType={discountType}
                    discountValue={parsedDiscount}
                    discountAmount={discountAmount}
                    totalRentalAfterDiscount={totalRentalAfterDiscount}
                    contractRef={currentContractRef}
                    status={status}
                    notes={notes}
                />
            </div>
        </div>
    );
}
