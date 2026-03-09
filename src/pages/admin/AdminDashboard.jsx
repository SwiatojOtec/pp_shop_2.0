import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, ShoppingBag, TrendingUp, Wrench, CheckCircle, Clock, AlertTriangle, Plus, ClipboardList } from 'lucide-react';
import { API_URL } from '../../apiConfig';
import { useAuth } from '../../context/AuthContext';
import RentDashboard from './RentDashboard';
import './Admin.css';

export default function AdminDashboard() {
    const { user, token } = useAuth();

    if (user?.role === 'rent') return <RentDashboard />;

    const [shopStats, setShopStats] = useState({ products: 0, orders: 0, revenue: 0 });
    const [recentOrders, setRecentOrders] = useState([]);
    const [rentProducts, setRentProducts] = useState([]);
    const [rentLoading, setRentLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [prodRes, orderRes, rentRes] = await Promise.all([
                    fetch(`${API_URL}/api/products`),
                    fetch(`${API_URL}/api/orders`, { headers: { Authorization: `Bearer ${token}` } }),
                    fetch(`${API_URL}/api/products?isRent=true`),
                ]);

                const products = prodRes.ok ? await prodRes.json() : [];
                const orders = orderRes.ok ? await orderRes.json() : [];
                const rent = rentRes.ok ? await rentRes.json() : [];

                const safeProducts = Array.isArray(products) ? products.filter(p => !p.isRent) : [];
                const safeOrders = Array.isArray(orders) ? orders : [];
                const safeRent = Array.isArray(rent) ? rent : [];

                const revenue = safeOrders.reduce((sum, o) => sum + parseFloat(o.totalAmount || 0), 0);

                setShopStats({ products: safeProducts.length, orders: safeOrders.length, revenue: revenue.toFixed(2) });
                setRecentOrders(safeOrders.slice(0, 5));
                setRentProducts(safeRent);
            } catch (err) {
                console.error('Dashboard fetch error:', err);
            } finally {
                setRentLoading(false);
            }
        };
        fetchAll();
    }, [token]);

    const isAvailable = (p) => p.stockStatus === 'available' || p.stockStatus === 'in_stock';
    const rentTotal = rentProducts.length;
    const rentAvailable = rentProducts.filter(isAvailable).length;
    const rentAvailableLater = rentProducts.filter(p => p.stockStatus === 'available_later').length;
    const rentLowStock = rentProducts.filter(p => p.quantityAvailable != null && p.quantityAvailable <= 2 && isAvailable(p)).length;

    const formatDate = (d) => {
        if (!d) return '';
        const dt = new Date(d);
        return `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}.${dt.getFullYear()}`;
    };

    const statusLabel = (p) => {
        if (isAvailable(p)) return <span style={{ color: '#16a34a', fontWeight: 600 }}>Доступний</span>;
        if (p.stockStatus === 'available_later') return <span style={{ color: '#d97706', fontWeight: 600 }}>З {formatDate(p.availableFrom)}</span>;
        return <span style={{ color: '#dc2626', fontWeight: 600 }}>Недоступний</span>;
    };

    return (
        <div className="admin-dashboard">
            <div className="dashboard-header">
                <h1 className="admin-title">Дашборд</h1>
                <p className="admin-subtitle">
                    Вітаємо{user ? `, ${user.name}${user.lastName ? ' ' + user.lastName : ''}` : ''}! Ось загальна картина.
                </p>
            </div>

            {/* ── МАГАЗИН ── */}
            <div style={{ marginBottom: '10px' }}>
                <h2 style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', marginBottom: '14px' }}>
                    Магазин
                </h2>
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon"><Package size={24} /></div>
                        <div className="stat-info">
                            <span className="stat-label">Товарів у магазині</span>
                            <span className="stat-value">{shopStats.products}</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon"><ShoppingBag size={24} /></div>
                        <div className="stat-info">
                            <span className="stat-label">Замовлень</span>
                            <span className="stat-value">{shopStats.orders}</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon"><TrendingUp size={24} /></div>
                        <div className="stat-info">
                            <span className="stat-label">Загальна виручка</span>
                            <span className="stat-value">{shopStats.revenue} ₴</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── ОРЕНДА ── */}
            <div style={{ marginTop: '32px', marginBottom: '10px' }}>
                <h2 style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', marginBottom: '14px' }}>
                    Оренда інструменту
                </h2>
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon"><Wrench size={24} /></div>
                        <div className="stat-info">
                            <span className="stat-label">Всього інструментів</span>
                            <span className="stat-value">{rentTotal}</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ color: '#16a34a' }}><CheckCircle size={24} /></div>
                        <div className="stat-info">
                            <span className="stat-label">Доступні зараз</span>
                            <span className="stat-value" style={{ color: '#16a34a' }}>{rentAvailable}</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ color: '#d97706' }}><Clock size={24} /></div>
                        <div className="stat-info">
                            <span className="stat-label">Буде доступно</span>
                            <span className="stat-value" style={{ color: '#d97706' }}>{rentAvailableLater}</span>
                        </div>
                    </div>
                    <Link to="/admin/rental-applications" className="stat-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div className="stat-icon"><ClipboardList size={24} /></div>
                        <div className="stat-info">
                            <span className="stat-label">Заявки оренди</span>
                            <span className="stat-value" style={{ fontSize: '0.85rem', color: 'var(--admin-accent)' }}>Переглянути →</span>
                        </div>
                    </Link>
                    {rentLowStock > 0 && (
                        <div className="stat-card" style={{ borderLeft: '4px solid #dc2626' }}>
                            <div className="stat-icon" style={{ color: '#dc2626' }}><AlertTriangle size={24} /></div>
                            <div className="stat-info">
                                <span className="stat-label">Мало на складі (≤2 шт)</span>
                                <span className="stat-value" style={{ color: '#dc2626' }}>{rentLowStock}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="dashboard-sections" style={{ marginTop: '32px' }}>
                {/* Останні замовлення */}
                <div className="admin-section" style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, textTransform: 'uppercase' }}>Останні замовлення</h2>
                        <Link to="/admin/orders" style={{ color: 'var(--admin-accent)', fontWeight: 700, textDecoration: 'none' }}>Всі замовлення →</Link>
                    </div>
                    <div className="admin-table-container">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Клієнт</th>
                                    <th>Сума</th>
                                    <th>Статус</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentOrders.map(order => (
                                    <tr key={order.id}>
                                        <td>#{order.id}</td>
                                        <td>{order.customerName}</td>
                                        <td>{order.totalAmount} ₴</td>
                                        <td>
                                            <span className={`status-badge ${order.status}`}>
                                                {order.status === 'pending' ? 'Очікує' :
                                                    order.status === 'processing' ? 'В роботі' :
                                                        order.status === 'completed' ? 'Виконано' : 'Скасовано'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {recentOrders.length === 0 && (
                                    <tr>
                                        <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>Замовлень поки немає</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Склад оренди */}
                <div className="admin-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, textTransform: 'uppercase' }}>Склад інструментів (оренда)</h2>
                        <Link to="/admin/rent/new" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--admin-accent)', color: '#fff', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, textDecoration: 'none', fontSize: '0.9rem' }}>
                            <Plus size={16} /> Додати інструмент
                        </Link>
                    </div>

                    {rentLoading ? (
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
                                    {rentProducts.map(p => (
                                        <tr key={p.id} style={p.quantityAvailable != null && p.quantityAvailable <= 2 && isAvailable(p) ? { background: '#fff7ed' } : {}}>
                                            <td style={{ fontWeight: 600 }}>{p.name}</td>
                                            <td style={{ color: '#666' }}>{p.category || '—'}</td>
                                            <td>{p.price} ₴</td>
                                            <td style={{ textAlign: 'center' }}>
                                                {p.quantityAvailable != null ? (
                                                    <span style={{ fontWeight: 700, color: p.quantityAvailable <= 2 ? '#dc2626' : '#16a34a' }}>
                                                        {p.quantityAvailable} шт
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            <td>{statusLabel(p)}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <Link to={`/admin/rent/${p.id}`} style={{ color: 'var(--admin-accent)', fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem' }}>
                                                    Редагувати
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                    {rentProducts.length === 0 && (
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
