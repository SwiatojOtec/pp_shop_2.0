import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    Save, ArrowLeft, Plus, Trash2, Image as ImageIcon,
    X, ChevronRight, Settings
} from 'lucide-react';
import { API_URL } from '../../apiConfig';
import { transliterate } from '../../utils/transliterate';
import { useAuth } from '../../context/AuthContext';
import './Admin.css';

export default function ProductEdit({ context = 'products' }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = id === 'new';

    const [formData, setFormData] = useState({
        name: '',
        price: '',
        oldPrice: '',
        category: '',
        image: '',
        images: [],
        desc: '',
        sku: '',
        slug: '',
        groupId: '', // For linking variants
        stockStatus: 'in_stock',
        brand: '',
        packSize: 1.0,
        unit: 'м²',
        badge: '',
        specs: {},
        priceMatrix: [],
        availableFrom: '',
        kitItems: [],
        quantityAvailable: '',
        relatedProducts: [],
        serialNumber: '',
        inventoryNumber: '',
        technicalCondition: '',
        weightPerUnit: '',
        weightTotal: '',
        replacementCost: '',
        securityDeposit: ''
    });
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(!isNew);
    const [newImageUrl, setNewImageUrl] = useState('');
    const [newSpec, setNewSpec] = useState({ key: '', value: '' });
    const [relatedSearch, setRelatedSearch] = useState('');
    const [relatedResults, setRelatedResults] = useState([]);
    const relatedSearchTimeout = useRef(null);
    const { token } = useAuth();

    const isRentContext = context === 'rent';

    useEffect(() => {
        // Для нових інструментів оренди за замовчуванням ставимо "шт"
        if (isRentContext && isNew) {
            setFormData(prev => ({ ...prev, unit: 'шт', packSize: 1 }));
        }

        fetchCategories();
        fetchBrands();
        if (!isNew) {
            fetchProduct();
        }
    }, [id]);

    const fetchCategories = async () => {
        try {
            const url = isRentContext ? `${API_URL}/api/rent-categories` : `${API_URL}/api/categories`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setCategories(data);
                // Set default category if it's a new product
                if (isNew && data.length > 0 && !formData.category) {
                    setFormData(prev => ({ ...prev, category: data[0].name }));
                }
            }
        } catch (err) {
            console.error('Error fetching categories:', err);
        }
    };

    const fetchBrands = async () => {
        try {
            const res = await fetch(`${API_URL}/api/brands`);
            if (res.ok) {
                const data = await res.json();
                setBrands(data);
            }
        } catch (err) {
            console.error('Error fetching brands:', err);
        }
    };

    // Auto-generate slug when name changes (only for new products)
    useEffect(() => {
        if (isNew && formData.name) {
            setFormData(prev => ({
                ...prev,
                slug: transliterate(formData.name)
            }));
        }
    }, [formData.name, isNew]);

    const fetchProduct = async () => {
        try {
            const res = await fetch(`${API_URL}/api/products/by-id/${id}`);
            if (res.ok) {
                const data = await res.json();
                // Load related products as full objects for display
                let relatedProductObjects = [];
                if (data.relatedProducts && data.relatedProducts.length > 0) {
                    const relRes = await Promise.all(
                        data.relatedProducts.map(pid => fetch(`${API_URL}/api/products/by-id/${pid}`).then(r => r.ok ? r.json() : null))
                    );
                    relatedProductObjects = relRes.filter(Boolean).map(p => ({ id: p.id, name: p.name, image: p.image, slug: p.slug }));
                }

                setFormData({
                    ...data,
                    price: data.price || '',
                    oldPrice: data.oldPrice || '',
                    images: data.images || [],
                    specs: data.specs || {},
                    priceMatrix: data.priceMatrix || [],
                    availableFrom: data.availableFrom || '',
                    kitItems: data.kitItems || [],
                    quantityAvailable: data.quantityAvailable ?? '',
                    relatedProducts: relatedProductObjects
                });
            }
        } catch (err) {
            console.error('Error fetching product:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchExistingGroupData = async (groupId) => {
        if (!isNew || !groupId) return;

        try {
            const res = await fetch(`${API_URL}/api/products?groupId=${groupId}`);
            if (res.ok) {
                const products = await res.json();
                if (products.length > 0) {
                    const template = products[0]; // Take data from the first found product in group
                    setFormData(prev => ({
                        ...prev,
                        price: template.price,
                        category: template.category,
                        desc: template.desc,
                        specs: template.specs || {},
                        priceMatrix: template.priceMatrix || []
                    }));
                }
            }
        } catch (err) {
            console.error('Error fetching group data:', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.image) {
            alert('Будь ласка, додайте головне зображення товару.');
            return;
        }

        try {
            const url = isNew ? `${API_URL}/api/products` : `${API_URL}/api/products/${id}`;
            const method = isNew ? 'POST' : 'PUT';

            // Clean up data before sending
            const dataToSend = {
                ...formData,
                price: formData.price === '' ? null : Number(formData.price),
                oldPrice: (formData.oldPrice === '' || formData.badge !== 'SALE') ? null : Number(formData.oldPrice),
                packSize: formData.packSize === '' ? 1.0 : Number(formData.packSize),
                availableFrom: formData.availableFrom || null,
                badge: isRentContext ? null : formData.badge,
                quantityAvailable: formData.quantityAvailable === '' ? null : Number(formData.quantityAvailable),
                // Store only IDs in DB, not full objects
                relatedProducts: Array.isArray(formData.relatedProducts)
                    ? formData.relatedProducts.map(r => (typeof r === 'object' ? r.id : r))
                    : []
            };

            const payload = {
                ...dataToSend,
                isRent: isRentContext
            };

            const headers = { 'Content-Type': 'application/json' };
            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }

            const res = await fetch(url, {
                method,
                headers,
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                navigate(isRentContext ? '/admin/rent' : '/admin/products');
            } else {
                const errorData = await res.json();
                alert(`Помилка: ${errorData.message || 'Не вдалося зберегти товар'}`);
            }
        } catch (err) {
            console.error('Error saving product:', err);
            alert('Сталася помилка при збереженні товару.');
        }
    };

    const addGalleryImage = () => {
        if (newImageUrl.trim()) {
            setFormData({
                ...formData,
                images: [...formData.images, newImageUrl.trim()]
            });
            setNewImageUrl('');
        }
    };

    const removeGalleryImage = (index) => {
        const newImages = [...formData.images];
        newImages.splice(index, 1);
        setFormData({
            ...formData,
            images: newImages
        });
    };

    const addSpec = () => {
        if (newSpec.key.trim() && newSpec.value.trim()) {
            setFormData({
                ...formData,
                specs: {
                    ...formData.specs,
                    [newSpec.key.trim()]: newSpec.value.trim()
                }
            });
            setNewSpec({ key: '', value: '' });
        }
    };

    const removeSpec = (key) => {
        const newSpecs = { ...formData.specs };
        delete newSpecs[key];
        setFormData({
            ...formData,
            specs: newSpecs
        });
    };

    // Price Matrix Helpers
    const addPriceRow = () => {
        setFormData(prev => ({
            ...prev,
            priceMatrix: [...prev.priceMatrix, { width: '', price: '' }]
        }));
    };

    const removePriceRow = (index) => {
        const newMatrix = [...formData.priceMatrix];
        newMatrix.splice(index, 1);
        setFormData(prev => ({ ...prev, priceMatrix: newMatrix }));
    };

    const updatePriceRow = (index, field, value) => {
        const newMatrix = [...formData.priceMatrix];
        newMatrix[index] = { ...newMatrix[index], [field]: Number(value) };
        setFormData(prev => ({ ...prev, priceMatrix: newMatrix }));
    };

    const generateStandardSizes = () => {
        const sizes = [];
        for (let w = 100; w <= 600; w += 50) {
            sizes.push({ width: w, price: 0 });
        }
        setFormData(prev => ({ ...prev, priceMatrix: sizes }));
    };

    const isSillCategory = formData.category === 'Підвіконня';

    if (loading) return <div className="admin-content">Завантаження...</div>;

    return (
        <div className="product-edit-page">
            <div className="admin-breadcrumbs" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', color: '#666', fontSize: '0.9rem' }}>
                <Link
                    to={isRentContext ? '/admin/rent' : '/admin/products'}
                    style={{ color: 'inherit', textDecoration: 'none' }}
                >
                    {isRentContext ? 'Оренда' : 'Товари'}
                </Link>
                <ChevronRight size={14} />
                <span style={{ color: 'var(--admin-dark)', fontWeight: 700 }}>
                    {isNew ? (isRentContext ? 'Новий інструмент' : 'Новий товар') : formData.name}
                </span>
            </div>

            <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button
                        onClick={() => navigate(isRentContext ? '/admin/rent' : '/admin/products')}
                        className="action-btn"
                        style={{ width: '40px', height: '40px' }}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="admin-title" style={{ margin: 0 }}>
                        {isNew
                            ? (isRentContext ? 'Додати новий інструмент' : 'Додати новий товар')
                            : (isRentContext ? 'Редагувати інструмент' : 'Редагувати товар')}
                    </h1>
                </div>
                <button onClick={handleSubmit} className="btn btn-primary">
                    <Save size={20} /> Зберегти зміни
                </button>
            </div>

            <div className="edit-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
                <div className="edit-main">
                    <div className="admin-section" style={{ background: 'white', padding: '30px', borderRadius: '12px', border: '1px solid var(--admin-border)', marginBottom: '30px' }}>
                        <h2 style={{ fontSize: '1.1rem', marginBottom: '20px', fontWeight: 800 }}>Основна інформація</h2>
                        <div className="admin-form">
                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label>Назва товару</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Наприклад: Chevron Oak Natural"
                                />
                            </div>
                            <div className="form-group">
                                <label>Опис товару</label>
                                <textarea
                                    value={formData.desc}
                                    onChange={e => setFormData({ ...formData, desc: e.target.value })}
                                    rows="10"
                                    style={{ resize: 'vertical' }}
                                ></textarea>
                            </div>
                        </div>
                    </div>

                    <div className="admin-section" style={{ background: 'white', padding: '30px', borderRadius: '12px', border: '1px solid var(--admin-border)', marginBottom: '30px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                            <Settings size={20} />
                            <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 800 }}>Характеристики</h2>
                        </div>

                        <div className="specs-list" style={{ marginBottom: '20px' }}>
                            {Object.entries(formData.specs).map(([key, value]) => (
                                <div key={key} className="spec-item" style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center', background: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>
                                    <div style={{ flex: 1 }}><strong>{key}:</strong> {value}</div>
                                    <button onClick={() => removeSpec(key)} className="remove-btn" style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="add-spec-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px' }}>
                            <input
                                type="text"
                                placeholder="Назва (напр. Товщина)"
                                value={newSpec.key}
                                onChange={e => setNewSpec({ ...newSpec, key: e.target.value })}
                                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                            />
                            <input
                                type="text"
                                placeholder="Значення (напр. 14 мм)"
                                value={newSpec.value}
                                onChange={e => setNewSpec({ ...newSpec, value: e.target.value })}
                                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                            />
                            <button type="button" onClick={addSpec} className="btn btn-primary" style={{ padding: '10px 20px' }}>
                                <Plus size={20} />
                            </button>
                        </div>
                    </div>

                    {isRentContext && (
                        <div className="admin-section" style={{ background: 'white', padding: '30px', borderRadius: '12px', border: '1px solid var(--admin-border)', marginBottom: '30px' }}>
                            <h2 style={{ fontSize: '1.1rem', marginBottom: '20px', fontWeight: 800 }}>Комплектація</h2>
                            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '10px' }}>
                                Список того, що входить до комплекту при оренді цього інструменту. Наприклад: &quot;Піка 400 мм&quot;, &quot;Кейс&quot;, &quot;Додаткова ручка&quot;.
                            </p>
                            <div className="specs-list" style={{ marginBottom: '15px' }}>
                                {Array.isArray(formData.kitItems) && formData.kitItems.length > 0 ? (
                                    formData.kitItems.map((item, index) => (
                                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', background: '#f9f9f9', padding: '8px 10px', borderRadius: '8px' }}>
                                            <span style={{ flex: 1 }}>{item}</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const next = [...formData.kitItems];
                                                    next.splice(index, 1);
                                                    setFormData(prev => ({ ...prev, kitItems: next }));
                                                }}
                                                className="remove-btn"
                                                style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ fontSize: '0.8rem', color: '#999' }}>Поки що немає елементів комплекту.</div>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input
                                    type="text"
                                    placeholder="Наприклад: Піка 400 мм"
                                    value={newSpec.value} // тимчасово використовуємо newSpec.value як буфер
                                    onChange={e => setNewSpec(prev => ({ ...prev, value: e.target.value }))}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const val = newSpec.value.trim();
                                            if (!val) return;
                                            const next = Array.isArray(formData.kitItems) ? [...formData.kitItems] : [];
                                            next.push(val);
                                            setFormData(prev => ({ ...prev, kitItems: next }));
                                            setNewSpec(prev => ({ ...prev, value: '' }));
                                        }
                                    }}
                                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                                />
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={() => {
                                        const val = newSpec.value.trim();
                                        if (!val) return;
                                        const next = Array.isArray(formData.kitItems) ? [...formData.kitItems] : [];
                                        next.push(val);
                                        setFormData(prev => ({ ...prev, kitItems: next }));
                                        setNewSpec(prev => ({ ...prev, value: '' }));
                                    }}
                                >
                                    <Plus size={18} /> Додати в комплект
                                </button>
                            </div>
                        </div>
                    )}

                    {isRentContext && (
                        <div className="admin-section" style={{ background: 'white', padding: '30px', borderRadius: '12px', border: '1px solid var(--admin-border)', marginBottom: '30px' }}>
                            <h2 style={{ fontSize: '1.1rem', marginBottom: '8px', fontWeight: 800 }}>З цим товаром також беруть</h2>
                            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '16px' }}>
                                Вкажіть товари, які клієнти часто орендують разом з цим інструментом.
                            </p>

                            {/* Selected related products */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                                {Array.isArray(formData.relatedProducts) && formData.relatedProducts.length > 0 ? (
                                    formData.relatedProducts.map(item => (
                                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 10px', fontSize: '0.85rem' }}>
                                            {item.image && <img src={item.image} alt="" style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '4px' }} />}
                                            <span style={{ fontWeight: 600 }}>{item.name}</span>
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, relatedProducts: prev.relatedProducts.filter(r => r.id !== item.id) }))}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e53e3e', padding: '0 2px', lineHeight: 1 }}
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <span style={{ fontSize: '0.8rem', color: '#999' }}>Товарів не вибрано</span>
                                )}
                            </div>

                            {/* Search input */}
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    placeholder="Пошук товару за назвою..."
                                    value={relatedSearch}
                                    onChange={e => {
                                        const val = e.target.value;
                                        setRelatedSearch(val);
                                        clearTimeout(relatedSearchTimeout.current);
                                        if (val.trim().length < 2) { setRelatedResults([]); return; }
                                        relatedSearchTimeout.current = setTimeout(async () => {
                                            const res = await fetch(`${API_URL}/api/products?search=${encodeURIComponent(val)}&isRent=true`);
                                            const data = res.ok ? await res.json() : [];
                                            const existing = (formData.relatedProducts || []).map(r => r.id);
                                            setRelatedResults(data.filter(p => p.id !== (id ? parseInt(id) : null) && !existing.includes(p.id)).slice(0, 6));
                                        }, 300);
                                    }}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.9rem' }}
                                />
                                {relatedResults.length > 0 && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 100, marginTop: '4px' }}>
                                        {relatedResults.map(p => (
                                            <div
                                                key={p.id}
                                                onClick={() => {
                                                    setFormData(prev => ({ ...prev, relatedProducts: [...(prev.relatedProducts || []), { id: p.id, name: p.name, image: p.image, slug: p.slug }] }));
                                                    setRelatedSearch('');
                                                    setRelatedResults([]);
                                                }}
                                                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                                            >
                                                <img src={p.image} alt="" style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#999' }}>{p.category} · {p.price} ₴/доба</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {isSillCategory && (
                        <div className="admin-section" style={{ background: 'white', padding: '30px', borderRadius: '12px', border: '1px solid var(--admin-border)', marginBottom: '30px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 800 }}>Матриця цін (Підвіконня)</h2>
                                <button type="button" onClick={generateStandardSizes} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '5px 10px' }}>
                                    Генерувати стандартні (100-600)
                                </button>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '15px' }}>
                                Додайте ширину (глибину) та ціну за погонний метр для цієї ширини.
                                Клієнт вводить свою ширину, а система округлює до найближчого більшого значення.
                            </p>

                            <div className="price-matrix-list">
                                {formData.priceMatrix.map((row, index) => (
                                    <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px', marginBottom: '10px' }}>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label style={{ fontSize: '0.7rem' }}>Ширина (мм)</label>
                                            <input
                                                type="number"
                                                value={row.width}
                                                onChange={e => updatePriceRow(index, 'width', e.target.value)}
                                                placeholder="150"
                                                style={{ border: '1px solid #ddd', padding: '8px', borderRadius: '6px', width: '100%', background: '#fff', color: '#333' }}
                                            />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label style={{ fontSize: '0.7rem' }}>Ціна (₴)</label>
                                            <input
                                                type="number"
                                                value={row.price}
                                                onChange={e => updatePriceRow(index, 'price', e.target.value)}
                                                placeholder="250"
                                                style={{ border: '1px solid #ddd', padding: '8px', borderRadius: '6px', width: '100%', background: '#fff', color: '#333' }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                            <button type="button" onClick={() => removePriceRow(index)} className="remove-btn" style={{ color: 'red', border: 'none', background: '#fee', padding: '10px', borderRadius: '8px', cursor: 'pointer' }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button type="button" onClick={addPriceRow} className="btn btn-secondary" style={{ width: '100%', marginTop: '10px', display: 'flex', justifyContent: 'center', gap: '5px' }}>
                                <Plus size={16} /> Додати розмір
                            </button>
                        </div>
                    )}

                    <div className="admin-section" style={{ background: 'white', padding: '30px', borderRadius: '12px', border: '1px solid var(--admin-border)' }}>
                        <h2 style={{ fontSize: '1.1rem', marginBottom: '20px', fontWeight: 800 }}>Галерея зображень</h2>

                        <div className="main-image-preview" style={{ marginBottom: '30px' }}>
                            <label style={{ display: 'block', marginBottom: '10px', fontSize: '0.9rem', color: '#666' }}>Головне зображення (Thumbnail)</label>
                            <div className="image-upload-area" style={{ border: '2px dashed #ddd', borderRadius: '12px', padding: '20px', textAlign: 'center', background: '#fcfcfc' }}>
                                {formData.image ? (
                                    <div style={{ position: 'relative', display: 'inline-block' }}>
                                        <img src={formData.image} alt="Preview" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px' }} />
                                        <button
                                            onClick={() => setFormData({ ...formData, image: '' })}
                                            className="remove-btn"
                                            style={{ position: 'absolute', top: '-10px', right: '-10px', background: 'var(--admin-accent)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ color: '#999' }}>
                                        <ImageIcon size={32} style={{ marginBottom: '10px', opacity: 0.3 }} />
                                        <p style={{ fontSize: '0.8rem' }}>Вставте посилання нижче</p>
                                    </div>
                                )}
                                <input
                                    type="text"
                                    value={formData.image}
                                    onChange={e => setFormData({ ...formData, image: e.target.value })}
                                    placeholder="URL головного зображення"
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', marginTop: '15px' }}
                                />
                            </div>
                        </div>

                        <div className="gallery-section">
                            <label style={{ display: 'block', marginBottom: '10px', fontSize: '0.9rem', color: '#666' }}>Додаткові зображення</label>
                            <div className="image-gallery-grid">
                                {formData.images.map((img, index) => (
                                    <div key={index} className="gallery-item">
                                        <img src={img} alt={`Gallery ${index}`} />
                                        <button className="remove-btn" onClick={() => removeGalleryImage(index)}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                                <div className="add-image-form" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <input
                                        type="text"
                                        placeholder="Вставте URL..."
                                        value={newImageUrl}
                                        onChange={(e) => setNewImageUrl(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addGalleryImage())}
                                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                                    />
                                    <button type="button" onClick={addGalleryImage} className="btn-primary" style={{ justifyContent: 'center', fontSize: '0.8rem', padding: '8px' }}>
                                        <Plus size={16} /> Додати в галерею
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="edit-sidebar">
                    <div className="admin-section" style={{ background: 'white', padding: '25px', borderRadius: '12px', border: '1px solid var(--admin-border)', marginBottom: '30px' }}>
                        <h2 style={{ fontSize: '1rem', marginBottom: '20px', fontWeight: 800 }}>Ціна та Категорія</h2>
                        <div className="admin-form">
                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label>{formData.badge === 'SALE' ? 'Акційна ціна (₴)' : 'Ціна (₴)'}</label>
                                <input
                                    type="number"
                                    value={formData.price}
                                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                                    placeholder="Поточна ціна"
                                />
                            </div>
                            {formData.badge === 'SALE' && (
                                <div className="form-group" style={{ marginBottom: '20px', animation: 'fadeIn 0.3s' }}>
                                    <label>Стара ціна (закреслена, ₴)</label>
                                    <input
                                        type="number"
                                        value={formData.oldPrice}
                                        onChange={e => setFormData({ ...formData, oldPrice: e.target.value })}
                                        placeholder="Ціна до знижки"
                                        style={{ border: '1px solid var(--admin-accent)' }}
                                    />
                                    <p style={{ fontSize: '0.7rem', color: 'var(--admin-accent)', marginTop: '5px' }}>
                                        Ця ціна буде відображатися закресленою на сайті.
                                    </p>
                                </div>
                            )}
                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label>Наявність</label>
                                {!isRentContext ? (
                                    <select
                                        value={formData.stockStatus}
                                        onChange={e => setFormData({ ...formData, stockStatus: e.target.value })}
                                    >
                                        <option value="in_stock">В наявності</option>
                                        <option value="on_order">Під замовлення</option>
                                        <option value="out_of_stock">Немає в наявності</option>
                                    </select>
                                ) : (
                                    <>
                                        <select
                                            value={formData.stockStatus}
                                            onChange={e => setFormData({ ...formData, stockStatus: e.target.value })}
                                        >
                                            <option value="in_stock">В наявності</option>
                                            <option value="out_of_stock">Немає в наявності</option>
                                            <option value="available_later">Буде доступно з дати</option>
                                        </select>
                                        {formData.stockStatus === 'available_later' && (
                                            <div style={{ marginTop: '10px' }}>
                                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: '#555' }}>
                                                    Доступно з
                                                </label>
                                                <input
                                                    type="date"
                                                    value={formData.availableFrom || ''}
                                                    onChange={e => setFormData({ ...formData, availableFrom: e.target.value })}
                                                />
                                            </div>
                                        )}
                                        <div style={{ marginTop: '12px' }}>
                                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: '#555' }}>
                                                Кількість доступних одиниць на складі
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={formData.quantityAvailable}
                                                onChange={e => setFormData({ ...formData, quantityAvailable: e.target.value })}
                                                placeholder="Наприклад: 5"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                            {!isRentContext && (
                                <div className="form-group" style={{ marginBottom: '20px' }}>
                                    <label>Мітка (Badge)</label>
                                    <select
                                        value={formData.badge || ''}
                                        onChange={e => setFormData({ ...formData, badge: e.target.value })}
                                    >
                                        <option value="">Без мітки</option>
                                        <option value="SALE">Розпродаж %</option>
                                        <option value="NEW">Новинка</option>
                                        <option value="HOT">Хіт продажу</option>
                                        <option value="TOP">Топ вибір</option>
                                    </select>
                                </div>
                            )}
                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label>Категорія</label>
                                <select
                                        value={formData.category}
                                        onChange={e => {
                                            const newCategory = e.target.value;
                                            setFormData(prev => ({
                                                ...prev,
                                                category: newCategory,
                                                unit:
                                                    newCategory === 'Підвіконня'
                                                        ? 'п.м.'
                                                        : isRentContext
                                                            ? prev.unit || 'шт'
                                                            : prev.unit
                                            }));
                                        }}
                                >
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                    ))}
                                    {categories.length === 0 && <option>Спочатку додайте категорії</option>}
                                </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label>Бренд</label>
                                <select
                                    value={formData.brand}
                                    onChange={e => setFormData({ ...formData, brand: e.target.value })}
                                >
                                    <option value="">Оберіть бренд</option>
                                    {brands.map(brand => (
                                        <option key={brand.id} value={brand.name}>{brand.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group" style={{ marginTop: '20px' }}>
                                <label>Одиниця виміру</label>
                                <select
                                    value={formData.unit}
                                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                    disabled={isSillCategory}
                                    style={isSillCategory ? { background: '#f5f5f5', color: '#888' } : {}}
                                >
                                    {isRentContext ? (
                                        <>
                                            <option value="шт">шт (Штука)</option>
                                            <option value="м²">м² (Квадратний метр, наприклад будівельні риштування)</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="м²">м² (Квадратний метр)</option>
                                            <option value="шт">шт (Штука)</option>
                                            <option value="п.м.">п.м. (Погонний метр)</option>
                                            <option value="уп">уп (Упаковка)</option>
                                        </>
                                    )}
                                </select>
                            </div>
                            {!isSillCategory && !isRentContext && (
                                <div className="form-group" style={{ marginTop: '20px' }}>
                                    <label>Площа в упаковці ({formData.unit})</label>
                                    <input
                                        type="number"
                                        step="0.001"
                                        value={formData.packSize}
                                        onChange={e => setFormData({ ...formData, packSize: e.target.value })}
                                        placeholder="Напр: 2.25"
                                    />
                                    <p style={{ fontSize: '0.7rem', color: '#999', marginTop: '5px' }}>Для розрахунку кратності пакунку.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {isRentContext && (
                        <div className="admin-section" style={{ background: 'white', padding: '25px', borderRadius: '12px', border: '1px solid var(--admin-border)' }}>
                            <h2 style={{ fontSize: '1rem', marginBottom: '20px', fontWeight: 800 }}>Додаткова інформація</h2>
                            <div className="admin-form">
                                <div className="form-group" style={{ marginBottom: '16px' }}>
                                    <label>Серійний номер</label>
                                    <input
                                        type="text"
                                        value={formData.serialNumber || ''}
                                        onChange={e => setFormData({ ...formData, serialNumber: e.target.value })}
                                        placeholder="Напр: SN-2024-001"
                                    />
                                </div>
                                <div className="form-group" style={{ marginBottom: '16px' }}>
                                    <label>Інвентарний номер</label>
                                    <input
                                        type="text"
                                        value={formData.inventoryNumber || ''}
                                        onChange={e => setFormData({ ...formData, inventoryNumber: e.target.value })}
                                        placeholder={formData.sku ? `Буде: ${formData.sku}` : 'Заповнюється автоматично зі SKU'}
                                    />
                                    {isNew && !formData.inventoryNumber && (
                                        <p style={{ fontSize: '0.7rem', color: '#999', marginTop: '4px' }}>Автоматично підставиться SKU після збереження</p>
                                    )}
                                </div>
                                <div className="form-group" style={{ marginBottom: '16px' }}>
                                    <label>Технічний стан</label>
                                    <select
                                        value={formData.technicalCondition || ''}
                                        onChange={e => setFormData({ ...formData, technicalCondition: e.target.value })}
                                    >
                                        <option value="">Оберіть стан</option>
                                        <option value="Новий">Новий</option>
                                        <option value="Відмінний">Відмінний</option>
                                        <option value="Добрий">Добрий</option>
                                        <option value="Задовільний">Задовільний</option>
                                        <option value="Потребує ремонту">Потребує ремонту</option>
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: '16px' }}>
                                    <label>Вага загальна, кг</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={formData.weightTotal || ''}
                                        onChange={e => setFormData({ ...formData, weightTotal: e.target.value })}
                                        placeholder="0.0"
                                    />
                                </div>
                                <div className="form-group" style={{ marginBottom: '16px' }}>
                                    <label>Відновлювальна вартість, ₴</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.replacementCost || ''}
                                        onChange={e => setFormData({ ...formData, replacementCost: e.target.value })}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Гарантійний платіж, ₴</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.securityDeposit || ''}
                                        onChange={e => setFormData({ ...formData, securityDeposit: e.target.value })}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {!isRentContext && (
                        <div className="admin-section" style={{ background: 'white', padding: '25px', borderRadius: '12px', border: '1px solid var(--admin-border)' }}>
                            <h2 style={{ fontSize: '1rem', marginBottom: '20px', fontWeight: 800 }}>Ідентифікатори</h2>
                            <div className="admin-form">
                                <div className="form-group" style={{ marginBottom: '20px' }}>
                                    <label>Group ID (Колекція)</label>
                                    <input
                                        type="text"
                                        value={formData.groupId || ''}
                                        onChange={e => setFormData({ ...formData, groupId: e.target.value })}
                                        onBlur={e => fetchExistingGroupData(e.target.value)}
                                        placeholder="Напр: chevron_oak_2024"
                                    />
                                    <p style={{ fontSize: '0.7rem', color: '#999', marginTop: '5px' }}>Однаковий ID об'єднує товари в одну колекцію.</p>
                                </div>
                                <div className="form-group" style={{ marginBottom: '20px' }}>
                                    <label>SKU</label>
                                    <input
                                        type="text"
                                        value={formData.sku}
                                        disabled
                                        placeholder="Генерується автоматично"
                                        style={{ background: '#f5f5f5', color: '#666' }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Slug (URL)</label>
                                    <input
                                        type="text"
                                        value={formData.slug}
                                        onChange={e => setFormData({ ...formData, slug: e.target.value })}
                                        placeholder="test_laminatu"
                                    />
                                    <p style={{ fontSize: '0.75rem', color: '#999', marginTop: '5px' }}>Генерується автоматично з назви, але можна змінити.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
