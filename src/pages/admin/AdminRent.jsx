import { API_URL } from '../../apiConfig';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Search, Filter } from 'lucide-react';
import './Admin.css';
import { useAuth } from '../../context/AuthContext';

const RENT_CATEGORY_NAME = 'Оренда інструменту';

export default function AdminRent() {
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('All');
    const navigate = useNavigate();
    const { token } = useAuth();

    async function fetchProducts() {
        try {
            // У цьому розділі показуємо тільки те, що реально видно на клієнтській оренді
            const res = await fetch(`${API_URL}/api/products?isRent=true`);
            if (res.ok) {
                const data = await res.json();
                setProducts(Array.isArray(data) ? data : []);
            } else {
                console.error('Failed to fetch rent tools');
                setProducts([]);
            }
        } catch (err) {
            console.error('Error fetching rent tools:', err);
            setProducts([]);
        }
    }

    useEffect(() => {
        const t = setTimeout(() => {
            fetchProducts();
        }, 0);
        return () => clearTimeout(t);
    }, []);

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesType = filterType === 'All' || (p.category || '') === filterType;
        return matchesSearch && matchesType;
    });

    const handleDelete = async (id) => {
        if (!window.confirm('Ви впевнені, що хочете видалити цей інструмент з оренди?')) return;
        try {
            const headers = {};
            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }
            await fetch(`${API_URL}/api/products/${id}`, { method: 'DELETE', headers });
            fetchProducts();
        } catch (err) {
            console.error('Error deleting rent product:', err);
        }
    };

    const toolTypes = Array.from(
        new Set(
            products
                .map(p => p.category)
                .filter(Boolean)
        )
    );

    return (
        <div className="admin-products">
            <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1 className="admin-title" style={{ margin: 0 }}>Оренда інструменту</h1>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <Link className="btn btn-secondary" to="/admin/rental-applications">
                        Заявки (оренда)
                    </Link>
                    <Link className="btn btn-secondary" to="/admin/clients">
                        Клієнти
                    </Link>
                    <button className="btn btn-primary" onClick={() => navigate('/admin/warehouses/positions')}>
                        <Plus size={20} /> Додати інструмент зі складу
                    </button>
                </div>
            </div>

            <p style={{ marginBottom: '15px', color: '#555', fontSize: '0.9rem' }}>
                Тут відображаються тільки товари з категорією <strong>{RENT_CATEGORY_NAME}</strong>, які опубліковані у клієнтській оренді.
                Нові позиції додавайте/створюйте на складі, після чого керуйте показом через прапорець видимості в оренді.
            </p>

            <div className="admin-filters" style={{ display: 'flex', gap: '20px', marginBottom: '20px', background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid var(--admin-border)' }}>
                <div className="search-box" style={{ flex: 1, position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                    <input
                        type="text"
                        placeholder="Пошук за назвою або SKU..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none' }}
                    />
                </div>
                <div className="filter-box" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Filter size={18} style={{ color: '#999' }} />
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none' }}
                    >
                        <option value="All">Всі типи</option>
                        {toolTypes.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="admin-table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Зображення</th>
                            <th>SKU</th>
                            <th>Назва</th>
                            <th>Ціна оренди</th>
                            <th>К-сть в наявності</th>
                            <th>Тип інструменту</th>
                            <th>Бренд</th>
                            <th>Дії</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.map(product => (
                            <tr key={product.id}>
                                <td><img src={product.image} alt={product.name} className="admin-table-img" /></td>
                                <td><code style={{ background: '#eee', padding: '2px 6px', borderRadius: '4px' }}>{product.sku}</code></td>
                                <td>{product.name}</td>
                                <td>{product.price} ₴ / доба</td>
                                <td>{typeof product.quantityAvailable === 'number' ? product.quantityAvailable : '—'}</td>
                                <td>{product.category || '—'}</td>
                                <td>{product.brand || '—'}</td>
                                <td>
                                    <div className="table-actions">
                                        <button onClick={() => navigate(`/admin/rent/${product.id}`)} className="action-btn edit"><Edit2 size={18} /></button>
                                        <button onClick={() => handleDelete(product.id)} className="action-btn delete"><Trash2 size={18} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredProducts.length === 0 && (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>Інструментів в оренді поки немає</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

