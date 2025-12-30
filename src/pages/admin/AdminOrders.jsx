import { API_URL } from '../../apiConfig';
import React, { useState, useEffect } from 'react';
import { Trash2, CheckCircle, Clock, Truck, Search, Filter } from 'lucide-react';
import './Admin.css';

export default function AdminOrders() {
    const [orders, setOrders] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const res = await fetch(`${API_URL}/api/orders`);
            if (res.ok) {
                const data = await res.json();
                setOrders(Array.isArray(data) ? data : []);
            } else {
                console.error('Failed to fetch orders');
                setOrders([]);
            }
        } catch (err) {
            console.error('Error fetching orders:', err);
            setOrders([]);
        }
    };

    const updateStatus = async (id, status) => {
        await fetch(`${API_URL}/api/orders/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        fetchOrders();
    };

    const handleDelete = async (id) => {
        if (window.confirm('Видалити замовлення?')) {
            await fetch(`${API_URL}/api/orders/${id}`, { method: 'DELETE' });
            fetchOrders();
        }
    };

    const filteredOrders = orders.filter(o => {
        const matchesSearch =
            (o.customerName && o.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (o.customerPhone && o.customerPhone.includes(searchTerm)) ||
            (o.orderNumber && o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = filterStatus === 'All' || o.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const getStatusLabel = (status) => {
        const labels = {
            'pending': 'Новий',
            'invoice_sent': 'Рахунок виставлено',
            'paid': 'Оплачено',
            'processing': 'В роботі',
            'completed': 'Виконано',
            'cancelled': 'Скасовано'
        };
        return labels[status] || status;
    };

    return (
        <div className="admin-orders">
            <h1 className="admin-title" style={{ marginBottom: '30px' }}>Замовлення</h1>

            <div className="admin-filters" style={{ display: 'flex', gap: '20px', marginBottom: '20px', background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid var(--admin-border)' }}>
                <div className="search-box" style={{ flex: 1, position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                    <input
                        type="text"
                        placeholder="Пошук за ім'ям, телефоном або № замовлення..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none' }}
                    />
                </div>
                <div className="filter-box" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Filter size={18} style={{ color: '#999' }} />
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="admin-select-mini"
                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none', minWidth: '180px' }}
                    >
                        <option value="All">Всі статуси</option>
                        <option value="pending">Новий</option>
                        <option value="invoice_sent">Рахунок виставлено</option>
                        <option value="paid">Оплачено</option>
                        <option value="processing">В роботі</option>
                        <option value="completed">Виконано</option>
                        <option value="cancelled">Скасовано</option>
                    </select>
                </div>
            </div>

            <div className="admin-table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>№ Замовлення</th>
                            <th>Клієнт</th>
                            <th>Товари</th>
                            <th>Доставка</th>
                            <th>Сума</th>
                            <th>Статус</th>
                            <th>Дії</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.map(order => (
                            <tr key={order.id}>
                                <td style={{ fontWeight: 800, color: 'var(--admin-accent)' }}>
                                    {order.orderNumber || `#${order.id}`}
                                </td>
                                <td>
                                    <div className="client-info" style={{ display: 'flex', flexDirection: 'column' }}>
                                        <strong style={{ fontSize: '0.95rem' }}>{order.customerName}</strong>
                                        <span style={{ color: '#666', fontSize: '0.85rem' }}>{order.customerPhone}</span>
                                        {order.customerEmail && <span style={{ color: '#999', fontSize: '0.8rem' }}>{order.customerEmail}</span>}
                                    </div>
                                </td>
                                <td style={{ maxWidth: '250px' }}>
                                    <div className="order-items-summary" style={{ fontSize: '0.85rem' }}>
                                        {order.items && order.items.map((item, idx) => (
                                            <div key={idx} style={{ marginBottom: '2px' }}>
                                                • {item.name} x {item.quantity} {item.unit === 'м²' ? 'уп.' : 'шт.'}
                                            </div>
                                        ))}
                                    </div>
                                </td>
                                <td style={{ fontSize: '0.85rem', color: '#666' }}>
                                    <div style={{ fontWeight: 600, color: '#333' }}>
                                        {order.deliveryMethod === 'pickup' ? 'Самовивіз' : 'Доставка'}
                                    </div>
                                    <div style={{ fontSize: '0.75rem' }}>{order.address}</div>
                                </td>
                                <td style={{ fontWeight: 800 }}>{parseFloat(order.totalAmount).toLocaleString()} ₴</td>
                                <td>
                                    <div className="status-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        <span className={`status-badge ${order.status}`} style={{ textAlign: 'center' }}>
                                            {getStatusLabel(order.status)}
                                        </span>
                                        <select
                                            value={order.status}
                                            onChange={(e) => updateStatus(order.id, e.target.value)}
                                            style={{ padding: '4px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}
                                        >
                                            <option value="pending">Новий</option>
                                            <option value="invoice_sent">Рахунок виставлено</option>
                                            <option value="paid">Оплачено</option>
                                            <option value="processing">В роботі</option>
                                            <option value="completed">Виконано</option>
                                            <option value="cancelled">Скасовано</option>
                                        </select>
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button onClick={() => handleDelete(order.id)} className="action-btn delete" title="Видалити">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredOrders.length === 0 && (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>Замовлень не знайдено</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
