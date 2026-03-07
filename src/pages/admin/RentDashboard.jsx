import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, CheckCircle, Clock, AlertTriangle, Plus } from 'lucide-react';
import { API_URL } from '../../apiConfig';
import { useAuth } from '../../context/AuthContext';

export default function RentDashboard() {
    const { user } = useAuth();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_URL}/api/products?isRent=true`)
            .then(res => res.ok ? res.json() : [])
            .then(data => {
                setProducts(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const total = products.length;
    const isAvailable = (p) => p.stockStatus === 'available' || p.stockStatus === 'in_stock';
    const available = products.filter(isAvailable).length;
    const availableLater = products.filter(p => p.stockStatus === 'available_later').length;
    const lowStock = products.filter(p => p.quantityAvailable != null && p.quantityAvailable <= 2 && isAvailable(p)).length;

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
    };

    const statusLabel = (p) => {
        if (p.stockStatus === 'available' || p.stockStatus === 'in_stock') return <span style={{ color: '#16a34a', fontWeight: 600 }}>Доступний</span>;
        if (p.stockStatus === 'available_later') return <span style={{ color: '#d97706', fontWeight: 600 }}>З {formatDate(p.availableFrom)}</span>;
        return <span style={{ color: '#dc2626', fontWeight: 600 }}>Недоступний</span>;
    };

    return (
        <div className="admin-dashboard">
            <div className="dashboard-header">
                <h1 className="admin-title">Оренда інструменту</h1>
                <p className="admin-subtitle">
                    Вітаємо{user ? `, ${user.name}${user.lastName ? ' ' + user.lastName : ''}` : ''}! Ось поточний стан вашого складу.
                </p>
            </div>

            {/* Stat Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon"><Wrench size={24} /></div>
                    <div className="stat-info">
                        <span className="stat-label">Всього інструментів</span>
                        <span className="stat-value">{total}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ color: '#16a34a' }}><CheckCircle size={24} /></div>
                    <div className="stat-info">
                        <span className="stat-label">Доступні зараз</span>
                        <span className="stat-value" style={{ color: '#16a34a' }}>{available}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ color: '#d97706' }}><Clock size={24} /></div>
                    <div className="stat-info">
                        <span className="stat-label">Буде доступно</span>
                        <span className="stat-value" style={{ color: '#d97706' }}>{availableLater}</span>
                    </div>
                </div>
                {lowStock > 0 && (
                    <div className="stat-card" style={{ borderLeft: '4px solid #dc2626' }}>
                        <div className="stat-icon" style={{ color: '#dc2626' }}><AlertTriangle size={24} /></div>
                        <div className="stat-info">
                            <span className="stat-label">Мало на складі (≤2 шт)</span>
                            <span className="stat-value" style={{ color: '#dc2626' }}>{lowStock}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Inventory table */}
            <div className="dashboard-sections">
                <div className="admin-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, textTransform: 'uppercase' }}>Склад інструментів</h2>
                        <Link to="/admin/rent/new" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--admin-accent)', color: '#fff', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, textDecoration: 'none', fontSize: '0.9rem' }}>
                            <Plus size={16} /> Додати інструмент
                        </Link>
                    </div>

                    {loading ? (
                        <p style={{ color: '#999', padding: '20px' }}>Завантаження...</p>
                    ) : (
                        <div className="admin-table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Назва</th>
                                        <th>Категорія</th>
                                        <th>Ціна / доба</th>
                                        <th style={{ textAlign: 'center' }}>На складі</th>
                                        <th>Статус</th>
                                        <th style={{ textAlign: 'right' }}>Дії</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map(p => (
                                                        <tr key={p.id} style={p.quantityAvailable != null && p.quantityAvailable <= 2 && isAvailable(p) ? { background: '#fff7ed' } : {}}>
                                            <td style={{ fontWeight: 600 }}>{p.name}</td>
                                            <td style={{ color: '#666' }}>{p.category || '—'}</td>
                                            <td>{p.price} ₴</td>
                                            <td style={{ textAlign: 'center' }}>
                                                {p.quantityAvailable != null ? (
                                                    <span style={{
                                                        fontWeight: 700,
                                                        color: p.quantityAvailable <= 2 ? '#dc2626' : '#16a34a'
                                                    }}>
                                                        {p.quantityAvailable} шт
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            <td>{statusLabel(p)}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <Link
                                                    to={`/admin/rent/${p.id}`}
                                                    style={{ color: 'var(--admin-accent)', fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem' }}
                                                >
                                                    Редагувати
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                    {products.length === 0 && (
                                        <tr>
                                            <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                                                Інструментів поки немає. <Link to="/admin/rent/new" style={{ color: 'var(--admin-accent)' }}>Додати перший</Link>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
