import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    Save, ArrowLeft, Plus, Trash2, Image as ImageIcon,
    X, ChevronRight, Settings
} from 'lucide-react';
import { API_URL } from '../../apiConfig';
import { transliterate } from '../../utils/transliterate';
import './Admin.css';

export default function ProductEdit() {
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
        badge: '',
        specs: {},
        priceMatrix: []
    });
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(!isNew);
    const [newImageUrl, setNewImageUrl] = useState('');
    const [newSpec, setNewSpec] = useState({ key: '', value: '' });

    useEffect(() => {
        fetchCategories();
        fetchBrands();
        if (!isNew) {
            fetchProduct();
        }
    }, [id]);

    const fetchCategories = async () => {
        try {
            const res = await fetch(`${API_URL}/api/categories`);
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
                setFormData({
                    ...data,
                    price: data.price || '',
                    oldPrice: data.oldPrice || '',
                    images: data.images || [],
                    images: data.images || [],
                    specs: data.specs || {},
                    priceMatrix: data.priceMatrix || []
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
                        specs: template.specs || {}
                    }));
                    console.log('Данные подтянуты из коллекции:', groupId);
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
                packSize: formData.packSize === '' ? 1.0 : Number(formData.packSize)
            };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSend)
            });

            if (res.ok) {
                navigate('/admin/products');
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

    if (loading) return <div className="admin-content">Завантаження...</div>;

    return (
        <div className="product-edit-page">
            <div className="admin-breadcrumbs" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', color: '#666', fontSize: '0.9rem' }}>
                <Link to="/admin/products" style={{ color: 'inherit', textDecoration: 'none' }}>Товари</Link>
                <ChevronRight size={14} />
                <span style={{ color: 'var(--admin-dark)', fontWeight: 700 }}>{isNew ? 'Новий товар' : formData.name}</span>
            </div>

            <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button onClick={() => navigate('/admin/products')} className="action-btn" style={{ width: '40px', height: '40px' }}><ArrowLeft size={20} /></button>
                    <h1 className="admin-title" style={{ margin: 0 }}>{isNew ? 'Додати новий товар' : 'Редагувати товар'}</h1>
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

                    {formData.category === 'Підвіконня' && (
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
                                <select
                                    value={formData.stockStatus}
                                    onChange={e => setFormData({ ...formData, stockStatus: e.target.value })}
                                >
                                    <option value="in_stock">В наявності</option>
                                    <option value="on_order">Під замовлення</option>
                                    <option value="out_of_stock">Немає в наявності</option>
                                </select>
                            </div>
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
                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label>Категорія</label>
                                <select
                                    value={formData.category}
                                    onChange={e => {
                                        const newCategory = e.target.value;
                                        setFormData(prev => ({
                                            ...prev,
                                            category: newCategory,
                                            unit: newCategory === 'Підвіконня' ? 'п.м.' : prev.unit
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
                                    disabled={formData.category === 'Підвіконня'}
                                    style={formData.category === 'Підвіконня' ? { background: '#f5f5f5', color: '#888' } : {}}
                                >
                                    <option value="м²">м² (Квадратний метр)</option>
                                    <option value="шт">шт (Штука)</option>
                                    <option value="п.м.">п.м. (Погонний метр)</option>
                                    <option value="уп">уп (Упаковка)</option>
                                </select>
                            </div>
                            {formData.category !== 'Підвіконня' && (
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
                </div>
            </div>
        </div>
    );
}
