import { API_URL } from '../../apiConfig';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, Save, ArrowLeft, Trash2, Image as ImageIcon, Plus, X } from 'lucide-react';
import './Admin.css';

export default function ProductEdit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = id === 'new';

    const [formData, setFormData] = useState({
        name: '',
        price: '',
        category: 'Паркетна дошка',
        image: '',
        images: [],
        desc: '',
        sku: '',
        slug: ''
    });
    const [loading, setLoading] = useState(!isNew);
    const [newImageUrl, setNewImageUrl] = useState('');

    useEffect(() => {
        if (!isNew) {
            fetchProduct();
        }
    }, [id]);

    const fetchProduct = async () => {
        try {
            const res = await fetch(`${API_URL}/api/products/by-id/${id}`);
            if (res.ok) {
                const data = await res.json();
                setFormData({
                    ...data,
                    images: data.images || []
                });
            }
        } catch (err) {
            console.error('Error fetching product:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.image) {
            alert('Будь ласка, додайте головне зображення (URL)');
            return;
        }

        const url = isNew
            ? `${API_URL}/api/products`
            : `${API_URL}/api/products/${id}`;
        const method = isNew ? 'POST' : 'PUT';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (res.ok) {
                navigate('/admin/products');
            } else {
                let errorMessage = data.message || 'Не вдалося зберегти товар';

                // If there are specific validation errors, list them
                if (data.errors && Array.isArray(data.errors)) {
                    const details = data.errors.map(e => e.message).join('\n');
                    errorMessage = `Помилка валідації:\n${details}`;
                } else if (data.message && data.message.includes('unique constraint')) {
                    if (data.message.includes('slug')) errorMessage = 'Товар з такою назвою вже існує (дублікат URL)';
                    if (data.message.includes('sku')) errorMessage = 'Такий артикул (SKU) вже існує';
                }

                alert(errorMessage);
            }
        } catch (err) {
            console.error('Error saving product:', err);
            alert("Сталася помилка при з'єднанні з сервером");
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
                                <label>Ціна (₴)</label>
                                <input
                                    type="number"
                                    value={formData.price}
                                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Категорія</label>
                                <select
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                >
                                    <option>Паркетна дошка</option>
                                    <option>Ламінат</option>
                                    <option>Вініл</option>
                                    <option>Двері</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="admin-section" style={{ background: 'white', padding: '25px', borderRadius: '12px', border: '1px solid var(--admin-border)' }}>
                        <h2 style={{ fontSize: '1rem', marginBottom: '20px', fontWeight: 800 }}>Ідентифікатори</h2>
                        <div className="admin-form">
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
                                    disabled
                                    placeholder="Генерується автоматично"
                                    style={{ background: '#f5f5f5', color: '#666' }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
