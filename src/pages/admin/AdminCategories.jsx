import React, { useState, useEffect } from 'react';
import { API_URL } from '../../apiConfig';
import { Plus, Trash2, FolderTree, Award, Image as ImageIcon } from 'lucide-react';
import './Admin.css';

export default function AdminSettings() {
    const [activeTab, setActiveTab] = useState('categories');
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [newCategory, setNewCategory] = useState('');
    const [newBrand, setNewBrand] = useState({ name: '', logo: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [catRes, brandRes] = await Promise.all([
                fetch(`${API_URL}/api/categories`),
                fetch(`${API_URL}/api/brands`)
            ]);
            if (catRes.ok) setCategories(await catRes.json());
            if (brandRes.ok) setBrands(await brandRes.json());
        } catch (err) {
            console.error('Error fetching settings data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Category Handlers
    const handleAddCategory = async (e) => {
        e.preventDefault();
        if (!newCategory.trim()) return;
        try {
            const res = await fetch(`${API_URL}/api/categories`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newCategory.trim() })
            });
            if (res.ok) {
                setNewCategory('');
                fetchData();
            }
        } catch (err) {
            console.error('Error adding category:', err);
        }
    };

    const handleDeleteCategory = async (id) => {
        if (!window.confirm('Ви впевнені?')) return;
        try {
            await fetch(`${API_URL}/api/categories/${id}`, { method: 'DELETE' });
            fetchData();
        } catch (err) {
            console.error('Error deleting category:', err);
        }
    };

    // Brand Handlers
    const handleAddBrand = async (e) => {
        e.preventDefault();
        if (!newBrand.name.trim()) return;
        try {
            const res = await fetch(`${API_URL}/api/brands`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newBrand)
            });
            if (res.ok) {
                setNewBrand({ name: '', logo: '' });
                fetchData();
            }
        } catch (err) {
            console.error('Error adding brand:', err);
        }
    };

    const handleDeleteBrand = async (id) => {
        if (!window.confirm('Ви впевнені?')) return;
        try {
            await fetch(`${API_URL}/api/brands/${id}`, { method: 'DELETE' });
            fetchData();
        } catch (err) {
            console.error('Error deleting brand:', err);
        }
    };

    return (
        <div className="admin-settings-page">
            <h1 className="admin-title" style={{ marginBottom: '30px' }}>Налаштування</h1>

            <div className="settings-tabs" style={{ display: 'flex', gap: '20px', marginBottom: '30px', borderBottom: '1px solid #eee' }}>
                <button
                    className={`tab-link ${activeTab === 'categories' ? 'active' : ''}`}
                    onClick={() => setActiveTab('categories')}
                    style={{ padding: '10px 20px', borderBottom: activeTab === 'categories' ? '2px solid var(--admin-accent)' : '2px solid transparent', background: 'none', border: 'none', cursor: 'pointer', fontWeight: activeTab === 'categories' ? 700 : 500 }}
                >
                    Категорії
                </button>
                <button
                    className={`tab-link ${activeTab === 'brands' ? 'active' : ''}`}
                    onClick={() => setActiveTab('brands')}
                    style={{ padding: '10px 20px', borderBottom: activeTab === 'brands' ? '2px solid var(--admin-accent)' : '2px solid transparent', background: 'none', border: 'none', cursor: 'pointer', fontWeight: activeTab === 'brands' ? 700 : 500 }}
                >
                    Бренди
                </button>
            </div>

            {activeTab === 'categories' && (
                <div className="admin-section" style={{ background: 'white', padding: '30px', borderRadius: '12px', border: '1px solid var(--admin-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
                        <FolderTree size={20} />
                        <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 800 }}>Управління категоріями</h2>
                    </div>

                    <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
                        <input
                            type="text"
                            placeholder="Назва нової категорії..."
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
                        />
                        <button type="submit" className="btn btn-primary">
                            <Plus size={20} /> Додати
                        </button>
                    </form>

                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Назва</th>
                                <th>Slug</th>
                                <th style={{ textAlign: 'right' }}>Дії</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.map(cat => (
                                <tr key={cat.id}>
                                    <td style={{ fontWeight: 600 }}>{cat.name}</td>
                                    <td>{cat.slug}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button onClick={() => handleDeleteCategory(cat.id)} className="action-btn delete">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'brands' && (
                <div className="admin-section" style={{ background: 'white', padding: '30px', borderRadius: '12px', border: '1px solid var(--admin-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
                        <Award size={20} />
                        <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 800 }}>Управління брендами</h2>
                    </div>

                    <form onSubmit={handleAddBrand} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px', marginBottom: '30px' }}>
                        <input
                            type="text"
                            placeholder="Назва бренду..."
                            value={newBrand.name}
                            onChange={(e) => setNewBrand({ ...newBrand, name: e.target.value })}
                            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
                        />
                        <input
                            type="text"
                            placeholder="URL логотипу..."
                            value={newBrand.logo}
                            onChange={(e) => setNewBrand({ ...newBrand, logo: e.target.value })}
                            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
                        />
                        <button type="submit" className="btn btn-primary">
                            <Plus size={20} /> Додати
                        </button>
                    </form>

                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Лого</th>
                                <th>Назва</th>
                                <th>Slug</th>
                                <th style={{ textAlign: 'right' }}>Дії</th>
                            </tr>
                        </thead>
                        <tbody>
                            {brands.map(brand => (
                                <tr key={brand.id}>
                                    <td>
                                        {brand.logo ? (
                                            <img src={brand.logo} alt={brand.name} style={{ height: '30px', maxWidth: '100px', objectFit: 'contain' }} />
                                        ) : (
                                            <ImageIcon size={20} color="#ccc" />
                                        )}
                                    </td>
                                    <td style={{ fontWeight: 600 }}>{brand.name}</td>
                                    <td>{brand.slug}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button onClick={() => handleDeleteBrand(brand.id)} className="action-btn delete">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
