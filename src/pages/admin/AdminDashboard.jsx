import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, ShoppingBag, TrendingUp, Users } from 'lucide-react';
import './Admin.css';

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        products: 0,
        orders: 0,
        revenue: 0
    });
    const [recentOrders, setRecentOrders] = useState([]);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [prodRes, orderRes] = await Promise.all([
                    fetch('http://localhost:5000/api/products'),
                    fetch('http://localhost:5000/api/orders')
                ]);

                const products = prodRes.ok ? await prodRes.json() : [];
                const orders = orderRes.ok ? await orderRes.json() : [];

                const safeProducts = Array.isArray(products) ? products : [];
                const safeOrders = Array.isArray(orders) ? orders : [];

                const revenue = safeOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount || 0), 0);

                setStats({
                    products: safeProducts.length,
                    orders: safeOrders.length,
                    revenue: revenue.toFixed(2)
                });
                setRecentOrders(safeOrders.slice(0, 5));
            } catch (err) {
                console.error('Error fetching stats:', err);
            }
        };
        fetchStats();
    }, []);

    return (
        <div className="admin-dashboard">
            <div className="dashboard-header">
                <h1 className="admin-title">Огляд магазину</h1>
                <p className="admin-subtitle">Вітаємо, Микола! Ось що відбувається у вашому магазині сьогодні.</p>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon"><Package size={24} /></div>
                    <div className="stat-info">
                        <span className="stat-label">Всього товарів</span>
                        <span className="stat-value">{stats.products}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon"><ShoppingBag size={24} /></div>
                    <div className="stat-info">
                        <span className="stat-label">Замовлень</span>
                        <span className="stat-value">{stats.orders}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon"><TrendingUp size={24} /></div>
                    <div className="stat-info">
                        <span className="stat-label">Загальна виручка</span>
                        <span className="stat-value">{stats.revenue} ₴</span>
                    </div>
                </div>
            </div>

            <div className="dashboard-sections">
                <div className="admin-section">
                    <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, textTransform: 'uppercase' }}>Останні замовлення</h2>
                        <Link to="/admin/orders" className="view-all" style={{ color: 'var(--admin-accent)', fontWeight: 700, textDecoration: 'none' }}>Всі замовлення →</Link>
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
            </div>
        </div>
    );
}
