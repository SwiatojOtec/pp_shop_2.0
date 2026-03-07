import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { ArrowLeft, Plus, Trash2, Save, Printer, Download, Search, X, Sparkles } from 'lucide-react';
import { generateRentalPdf } from '../../utils/generateRentalPdf';
import { API_URL } from '../../apiConfig';
import { useAuth } from '../../context/AuthContext';
import RentalApplicationPrint from './RentalApplicationPrint';
import './Admin.css';
import './RentalApplicationForm.css';

const LESSOR = {
    name: 'Панкрат єв Олександр Миколайович',
    ipn: '2490020092',
    address: '15300, м. Корюківка, вул. Садова, буд. 139',
    phone: '+38 098 188 00 44; +38 095 672 44 00',
    email: 'office@ppbud.info',
    warehouseAddress: 'м. Київ, вул. Холодноярська 2а',
};

const emptyItem = () => ({
    _key: Date.now() + Math.random(),
    productId: null,
    name: '',
    serialNumber: '',
    inventoryNumber: '',
    technicalCondition: 'справний',
    unit: 'шт',
    quantity: 1,
    weightPerUnit: '',
    weightTotal: '',
    replacementCostPerUnit: '',
    replacementCostTotal: '',
    depositPercent: 30,
    depositAmount: '',
    rentFrom: '',
    rentTo: '',
    days: 0,
    pricePerDay: '',
    totalRental: '',
    kitItems: [],
});

const calcDays = (from, to) => {
    if (!from || !to) return 0;
    const d = Math.ceil((new Date(to) - new Date(from)) / 86400000);
    return d > 0 ? d : 0;
};

export default function AdminRentalApplicationForm() {
    const { id } = useParams();
    const isNew = !id || id === 'new';
    const navigate = useNavigate();
    const { token } = useAuth();
    const printRef = useRef();

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [applicationNumber, setApplicationNumber] = useState('');
    const [status, setStatus] = useState('draft');
    const [notes, setNotes] = useState('');

    // Client
    const [client, setClient] = useState({ name: '', phone: '', email: '', passport: '', address: '' });

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

    const handlePrint = useReactToPrint({ contentRef: printRef });

    // Load existing application
    useEffect(() => {
        if (!isNew) {
            fetch(`${API_URL}/api/rental-applications/${id}`, { headers: { Authorization: `Bearer ${token}` } })
                .then(r => r.ok ? r.json() : null)
                .then(data => {
                    if (!data) return;
                    setApplicationNumber(data.applicationNumber || '');
                    setStatus(data.status || 'draft');
                    setNotes(data.notes || '');
                    setClient({
                        name: data.clientName || '',
                        phone: data.clientPhone || '',
                        email: data.clientEmail || '',
                        passport: data.clientPassport || '',
                        address: data.clientAddress || '',
                    });
                    setItems(data.items && data.items.length > 0
                        ? data.items.map(i => ({ ...emptyItem(), ...i, _key: Date.now() + Math.random() }))
                        : [emptyItem()]
                    );
                })
                .finally(() => setLoading(false));
        }
    }, [id]);

    // Product search with debounce
    useEffect(() => {
        clearTimeout(searchTimeout.current);
        if (searchQuery.trim().length < 2) { setSearchResults([]); return; }
        searchTimeout.current = setTimeout(async () => {
            const res = await fetch(`${API_URL}/api/products?search=${encodeURIComponent(searchQuery)}&isRent=true`);
            const data = res.ok ? await res.json() : [];
            setSearchResults(data.slice(0, 8));
        }, 300);
    }, [searchQuery]);

    const buildItemFromProduct = (product) => {
        const replacementCostPerUnit = parseFloat(product.replacementCost || 0);
        const depositPercent = 30;
        const depositAmount = (replacementCostPerUnit * depositPercent / 100).toFixed(2);
        return {
            ...emptyItem(),
            _key: Date.now() + Math.random(),
            productId: product.id,
            name: product.name,
            serialNumber: product.serialNumber || '',
            inventoryNumber: product.inventoryNumber || '',
            technicalCondition: product.technicalCondition || 'справний',
            unit: product.unit || 'шт',
            quantity: 1,
            weightPerUnit: product.weightPerUnit || '',
            weightTotal: product.weightTotal || '',
            replacementCostPerUnit: replacementCostPerUnit || '',
            replacementCostTotal: replacementCostPerUnit || '',
            depositPercent,
            depositAmount,
            pricePerDay: parseFloat(product.price || 0),
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
                product.relatedProducts.map(pid =>
                    fetch(`${API_URL}/api/products/by-id/${pid}`).then(r => r.ok ? r.json() : null)
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
            // If date field changed — propagate to all items
            if ((field === 'rentFrom' || field === 'rentTo') && item._key !== key) {
                const updated = { ...item, [field]: value };
                updated.days = calcDays(updated.rentFrom, updated.rentTo);
                updated.totalRental = (updated.days * parseFloat(updated.pricePerDay || 0) * parseFloat(updated.quantity || 1)).toFixed(2);
                return updated;
            }

            if (item._key !== key) return item;
            const updated = { ...item, [field]: value };

            // Recalculate on date or quantity change
            if (field === 'rentFrom' || field === 'rentTo') {
                updated.days = calcDays(updated.rentFrom, updated.rentTo);
                updated.totalRental = (updated.days * parseFloat(updated.pricePerDay || 0) * parseFloat(updated.quantity || 1)).toFixed(2);
            }
            if (field === 'quantity') {
                updated.weightTotal = (parseFloat(updated.weightPerUnit || 0) * parseFloat(value || 1)).toFixed(2);
                updated.replacementCostTotal = (parseFloat(updated.replacementCostPerUnit || 0) * parseFloat(value || 1)).toFixed(2);
                updated.depositAmount = (parseFloat(updated.replacementCostTotal || 0) * parseFloat(updated.depositPercent || 0) / 100).toFixed(2);
                updated.totalRental = (updated.days * parseFloat(updated.pricePerDay || 0) * parseFloat(value || 1)).toFixed(2);
            }
            if (field === 'replacementCostPerUnit') {
                updated.replacementCostTotal = (parseFloat(value || 0) * parseFloat(updated.quantity || 1)).toFixed(2);
                updated.depositAmount = (parseFloat(updated.replacementCostTotal) * parseFloat(updated.depositPercent || 0) / 100).toFixed(2);
            }
            if (field === 'depositPercent') {
                updated.depositAmount = (parseFloat(updated.replacementCostTotal || 0) * parseFloat(value || 0) / 100).toFixed(2);
            }
            if (field === 'pricePerDay') {
                updated.totalRental = (updated.days * parseFloat(value || 0) * parseFloat(updated.quantity || 1)).toFixed(2);
            }
            return updated;
        }));
    };

    const removeItem = (key) => setItems(prev => prev.filter(i => i._key !== key));

    const totalRental = items.reduce((s, i) => s + parseFloat(i.totalRental || 0), 0);
    const totalDeposit = items.reduce((s, i) => s + parseFloat(i.depositAmount || 0), 0);

    const handleSave = async () => {
        setSaving(true);
        const payload = {
            status,
            notes,
            clientName: client.name,
            clientPhone: client.phone,
            clientEmail: client.email,
            clientPassport: client.passport,
            clientAddress: client.address,
            rentFrom: items[0]?.rentFrom || null,
            rentTo: items[0]?.rentTo || null,
            items: items.map(({ _key, ...i }) => i),
            totalAmount: totalRental.toFixed(2),
            depositAmount: totalDeposit.toFixed(2),
        };
        try {
            const url = isNew
                ? `${API_URL}/api/rental-applications`
                : `${API_URL}/api/rental-applications/${id}`;
            const res = await fetch(url, {
                method: isNew ? 'POST' : 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                const saved = await res.json();
                if (isNew) navigate(`/admin/rental-applications/${saved.id}`, { replace: true });
            } else {
                alert('Помилка збереження');
            }
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
                        <option value="returned">Повернуто</option>
                        <option value="cancelled">Скасована</option>
                    </select>
                    <button
                        onClick={() => generateRentalPdf({ applicationNumber, lessor: LESSOR, client, items, totalRental, totalDeposit }).catch(console.error)}
                        className="btn-secondary-icon"
                        title="Скачати PDF"
                    >
                        <Download size={18} /> Скачати PDF
                    </button>
                    <button onClick={handlePrint} className="btn-secondary-icon" title="Друк">
                        <Printer size={18} /> Друк
                    </button>
                    <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                        <Save size={16} /> {saving ? 'Збереження...' : 'Зберегти'}
                    </button>
                </div>
            </div>

            <div className="rental-form-body">
                {/* Two-column: Lessor + Client */}
                <div className="rental-parties-grid">
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
                        {[
                            { label: 'П.І.Б.', field: 'name', placeholder: "Прізвище Ім'я По-батькові" },
                            { label: 'Телефон', field: 'phone', placeholder: '+38 0XX XXX XX XX' },
                            { label: 'E-mail', field: 'email', placeholder: 'email@example.com' },
                            { label: 'Паспорт / ID', field: 'passport', placeholder: 'Серія, номер або ID-картка' },
                            { label: 'Адреса / Майданчик', field: 'address', placeholder: 'Адреса проживання або будмайданчику' },
                        ].map(({ label, field, placeholder }) => (
                            <div key={field} className="party-field editable">
                                <span>{label}:</span>
                                <input
                                    value={client[field]}
                                    onChange={e => setClient(prev => ({ ...prev, [field]: e.target.value }))}
                                    placeholder={placeholder}
                                />
                            </div>
                        ))}
                    </div>
                </div>

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
                                                <div className="sdi-sub">{p.category} · {p.price} ₴/доба</div>
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
                                            <option value="новий">Новий</option>
                                            <option value="відмінний">Відмінний</option>
                                            <option value="справний">Справний</option>
                                            <option value="задовільний">Задовільний</option>
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

                {/* Totals + Notes */}
                <div className="rental-footer-grid">
                    <div className="rental-section">
                        <h2>Нотатки</h2>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Додаткові умови, примітки, особливості..."
                            rows={4}
                            style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ddd', resize: 'vertical', fontSize: '0.9rem' }}
                        />
                    </div>
                    <div className="rental-totals">
                        <div className="total-row">
                            <span>Загальна сума оренди:</span>
                            <strong>{totalRental.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴</strong>
                        </div>
                        <div className="total-row">
                            <span>Загальна застава:</span>
                            <strong>{totalDeposit.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴</strong>
                        </div>
                        <div className="total-row total-row--grand">
                            <span>До сплати (оренда + застава):</span>
                            <strong>{(totalRental + totalDeposit).toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴</strong>
                        </div>
                    </div>
                </div>
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
                                    <span className="upsell-item-price">{p.price} ₴ / доба</span>
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
                    items={items}
                    totalRental={totalRental}
                    totalDeposit={totalDeposit}
                    status={status}
                    notes={notes}
                />
            </div>
        </div>
    );
}
