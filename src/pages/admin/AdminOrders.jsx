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
            const res = await fetch('http://localhost:5000/api/orders');
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
        await fetch(`http://localhost:5000/api/orders/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        fetchOrders();
    };

    const handleDelete = async (id) => {
        if (window.confirm('Видалити замовлення?')) {
            await fetch(`http://localhost:5000/api/orders/${id}`, { method: 'DELETE' });
            fetchOrders();
        }
    };

    const filteredOrders = orders.filter(o => {
        const matchesSearch = o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.customerPhone.includes(searchTerm) ||
            o.id.toString().includes(searchTerm);
        const matchesStatus = filterStatus === 'All' || o.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="admin-orders">
            <h1 className="admin-title" style={{ marginBottom: '30px' }}>Замовлення</h1>

            <div className="admin-filters" style={{ display: 'flex', gap: '20px', marginBottom: '20px', background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid var(--admin-border)' }}>
                <div className="search-box" style={{ flex: 1, position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                    <input
                        type="text"
                        placeholder="Пошук за ім'ям, телефоном або ID..."
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
                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none' }}
                    >
                        <option value="All">Всі статуси</option>
                        <option value="pending">Очікує</option>
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
                            <th>ID</th>
                            <th>Клієнт</th>
                            <th>Сума</th>
                            <th>Статус</th>
                            <th>Дата</th>
                            <th>Дії</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.map(order => (
                            <tr key={order.id}>
                                <td>#{order.id}</td>
                                <td>
                                    <div className="client-info">
                                        <strong>{order.customerName}</strong>
                                        <span>{order.customerPhone}</span>
                                    </div>
                                </td>
                                <td>{order.totalAmount} ₴</td>
                                <td>
                                    <div className="status-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span className={`status-badge ${order.status}`}>
                                            {order.status === 'pending' ? 'Очікує' :
                                                order.status === 'processing' ? 'В роботі' :
                                                    order.status === 'completed' ? 'Виконано' : 'Скасовано'}
                                        </span>
                                        <select
                                            value={order.status}
                                            onChange={(e) => updateStatus(order.id, e.target.value)}
                                            className="status-select-mini"
                                            style={{ padding: '4px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.8rem' }}
                                        >
                                            <option value="pending">Змінити на Очікує</option>
                                            <option value="processing">Змінити на В роботі</option>
                                            <option value="completed">Змінити на Виконано</option>
                                            <option value="cancelled">Змінити на Скасовано</option>
                                        </select>
                                    </div>
                                </td>
                                <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                                <td>
                                    <button onClick={() => handleDelete(order.id)} className="action-btn delete">
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredOrders.length === 0 && (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>Замовлень не знайдено</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
