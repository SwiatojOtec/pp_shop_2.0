import React, { useState, useEffect } from 'react';
import { API_URL } from '../../apiConfig';
import { Plus, Trash2, FolderTree } from 'lucide-react';
import './Admin.css';

export default function AdminCategories() {
    const [categories, setCategories] = useState([]);
    const [newCategory, setNewCategory] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const res = await fetch(`${API_URL}/api/categories`);
            if (res.ok) {
                const data = await res.json();
                setCategories(data);
            }
        } catch (err) {
            console.error('Error fetching categories:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e) => {
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
                fetchCategories();
            } else {
                const data = await res.json();
                alert(data.message || 'Помилка при додаванні');
            }
        } catch (err) {
            console.error('Error adding category:', err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Ви впевнені? Це може вплинути на відображення товарів.')) return;

        try {
            const res = await fetch(`${API_URL}/api/categories/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                fetchCategories();
            }
        } catch (err) {
            console.error('Error deleting category:', err);
        }
    };

    return (
        <div className="admin-settings-page">
            <h1 className="admin-title" style={{ marginBottom: '30px' }}>Налаштування</h1>

            <div className="settings-tabs" style={{ display: 'flex', gap: '20px', marginBottom: '30px', borderBottom: '1px solid #eee' }}>
                <button className="tab-link active" style={{ padding: '10px 20px', borderBottom: '2px solid var(--admin-accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Категорії</button>
                {/* Future tabs can go here */}
            </div>

            <div className="admin-section" style={{ background: 'white', padding: '30px', borderRadius: '12px', border: '1px solid var(--admin-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
                    <FolderTree size={20} />
                    <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 800 }}>Управління категоріями</h2>
                </div>

                <form onSubmit={handleAdd} style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
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

                <div className="categories-list">
                    {loading ? (
                        <p>Завантаження...</p>
                    ) : (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Назва</th>
                                    <th>Slug (URL)</th>
                                    <th style={{ textAlign: 'right' }}>Дії</th>
                                </tr>
                            </thead>
                            <tbody>
                                {categories.map(cat => (
                                    <tr key={cat.id}>
                                        <td style={{ fontWeight: 600 }}>{cat.name}</td>
                                        <td style={{ color: '#666', fontSize: '0.9rem' }}>{cat.slug}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button onClick={() => handleDelete(cat.id)} className="action-btn delete">
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {categories.length === 0 && (
                                    <tr>
                                        <td colSpan="3" style={{ textAlign: 'center', padding: '30px', color: '#999' }}>Категорій поки немає</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
