import React, { useState, useEffect } from 'react';
import { API_URL } from '../../apiConfig';
import { Plus, Trash2, FolderTree, Award, Image as ImageIcon, ChevronDown } from 'lucide-react';
import './Admin.css';
import { useAuth } from '../../context/AuthContext';

export default function AdminSettings() {
    const [activeTab, setActiveTab] = useState('categories');
    const [categories, setCategories] = useState([]);
    const [rentCategories, setRentCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [newCategory, setNewCategory] = useState('');
    const [newRentCategory, setNewRentCategory] = useState('');
    const [newRentGroup, setNewRentGroup] = useState('');
    const [newBrand, setNewBrand] = useState({ name: '', logo: '' });
    const [loading, setLoading] = useState(true);
    const [openRentGroups, setOpenRentGroups] = useState({});
    const { token } = useAuth();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const headers = {};
            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }
            const [catRes, rentCatRes, brandRes] = await Promise.all([
                fetch(`${API_URL}/api/categories`, { headers }),
                fetch(`${API_URL}/api/rent-categories`, { headers }),
                fetch(`${API_URL}/api/brands`, { headers })
            ]);
            if (catRes.ok) setCategories(await catRes.json());
            if (rentCatRes.ok) setRentCategories(await rentCatRes.json());
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
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers.Authorization = `Bearer ${token}`;
            const res = await fetch(`${API_URL}/api/categories`, {
                method: 'POST',
                headers,
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
            const headers = {};
            if (token) headers.Authorization = `Bearer ${token}`;
            await fetch(`${API_URL}/api/categories/${id}`, { method: 'DELETE', headers });
            fetchData();
        } catch (err) {
            console.error('Error deleting category:', err);
        }
    };

    // Rent Category Handlers
    const handleAddRentCategory = async (e) => {
        e.preventDefault();
        if (!newRentCategory.trim()) return;
        try {
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers.Authorization = `Bearer ${token}`;
            const res = await fetch(`${API_URL}/api/rent-categories`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ name: newRentCategory.trim(), group: newRentGroup.trim() || null })
            });
            if (res.ok) {
                setNewRentCategory('');
                setNewRentGroup('');
                fetchData();
            }
        } catch (err) {
            console.error('Error adding rent category:', err);
        }
    };

    const handleDeleteRentCategory = async (id) => {
        if (!window.confirm('Ви впевнені?')) return;
        try {
            const headers = {};
            if (token) headers.Authorization = `Bearer ${token}`;
            await fetch(`${API_URL}/api/rent-categories/${id}`, { method: 'DELETE', headers });
            fetchData();
        } catch (err) {
            console.error('Error deleting rent category:', err);
        }
    };

    const handleUpdateRentCategoryGroup = async (id, group) => {
        try {
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers.Authorization = `Bearer ${token}`;
            await fetch(`${API_URL}/api/rent-categories/${id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ group })
            });
            fetchData();
        } catch (err) {
            console.error('Error updating rent category group:', err);
        }
    };

    // Brand Handlers
    const handleAddBrand = async (e) => {
        e.preventDefault();
        if (!newBrand.name.trim()) return;
        try {
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers.Authorization = `Bearer ${token}`;
            const res = await fetch(`${API_URL}/api/brands`, {
                method: 'POST',
                headers,
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
            const headers = {};
            if (token) headers.Authorization = `Bearer ${token}`;
            await fetch(`${API_URL}/api/brands/${id}`, { method: 'DELETE', headers });
            fetchData();
        } catch (err) {
            console.error('Error deleting brand:', err);
        }
    };

    const handleToggleBrand = async (id, field, value) => {
        try {
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers.Authorization = `Bearer ${token}`;
            const res = await fetch(`${API_URL}/api/brands/${id}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ [field]: value })
            });
            if (res.ok) {
                setBrands(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
            }
        } catch (err) {
            console.error('Error toggling brand:', err);
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
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
                                <FolderTree size={20} />
                                <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 800 }}>Категорії магазину</h2>
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

                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
                                <FolderTree size={20} />
                                <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 800 }}>Категорії оренди</h2>
                            </div>

                            <form onSubmit={handleAddRentCategory} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '10px', marginBottom: '30px' }}>
                                <input
                                    type="text"
                                    placeholder="Назва нової категорії оренди..."
                                    value={newRentCategory}
                                    onChange={(e) => setNewRentCategory(e.target.value)}
                                    style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
                                />
                                <input
                                    type="text"
                                    placeholder="Група (напр. Монтажне устаткування)"
                                    value={newRentGroup}
                                    onChange={(e) => setNewRentGroup(e.target.value)}
                                    style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
                                />
                                <button type="submit" className="btn btn-primary">
                                    <Plus size={20} /> Додати
                                </button>
                            </form>

                            {Object.entries(
                                rentCategories.reduce((acc, cat) => {
                                    const group = cat.group || 'Без групи';
                                    if (!acc[group]) acc[group] = [];
                                    acc[group].push(cat);
                                    return acc;
                                }, {})
                            ).map(([groupName, items]) => {
                                const isOpen = openRentGroups[groupName] ?? true;
                                return (
                                    <div key={groupName} style={{ marginBottom: '15px', border: '1px solid var(--admin-border)', borderRadius: '10px', overflow: 'hidden' }}>
                                        <button
                                            type="button"
                                            onClick={() => setOpenRentGroups(prev => ({ ...prev, [groupName]: !isOpen }))}
                                            style={{
                                                width: '100%',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '10px 16px',
                                                background: '#f8fafc',
                                                border: 'none',
                                                cursor: 'pointer',
                                                fontWeight: 700
                                            }}
                                        >
                                            <span>{groupName}</span>
                                            <ChevronDown
                                                size={16}
                                                style={{
                                                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                                    transition: 'transform 0.2s'
                                                }}
                                            />
                                        </button>
                                        {isOpen && (
                                            <table className="admin-table" style={{ borderTop: '1px solid var(--admin-border)' }}>
                                                <thead>
                                                    <tr>
                                                        <th>Назва</th>
                                                        <th>Slug</th>
                                                        <th>Група</th>
                                                        <th style={{ textAlign: 'right' }}>Дії</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {items.map(cat => (
                                                        <tr key={cat.id}>
                                                            <td style={{ fontWeight: 600 }}>{cat.name}</td>
                                                            <td>{cat.slug}</td>
                                                            <td>
                                                                <input
                                                                    type="text"
                                                                    defaultValue={cat.group || ''}
                                                                    onBlur={(e) => handleUpdateRentCategoryGroup(cat.id, e.target.value)}
                                                                    placeholder="Група..."
                                                                    style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #ddd', width: '100%' }}
                                                                />
                                                            </td>
                                                            <td style={{ textAlign: 'right' }}>
                                                                <button onClick={() => handleDeleteRentCategory(cat.id)} className="action-btn delete">
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
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
                                <th style={{ textAlign: 'center' }}>Магазин</th>
                                <th style={{ textAlign: 'center' }}>Оренда</th>
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
                                    <td style={{ textAlign: 'center' }}>
                                        <label className="brand-toggle">
                                            <input
                                                type="checkbox"
                                                checked={!!brand.isShop}
                                                onChange={e => handleToggleBrand(brand.id, 'isShop', e.target.checked)}
                                            />
                                            <span className="brand-toggle-slider" />
                                        </label>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <label className="brand-toggle">
                                            <input
                                                type="checkbox"
                                                checked={!!brand.isRent}
                                                onChange={e => handleToggleBrand(brand.id, 'isRent', e.target.checked)}
                                            />
                                            <span className="brand-toggle-slider" />
                                        </label>
                                    </td>
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
