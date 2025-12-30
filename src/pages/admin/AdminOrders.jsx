import { API_URL } from '../../apiConfig';
import React, { useState, useEffect } from 'react';
import { Trash2, CheckCircle, Clock, Truck, Search, Filter, Edit2, Plus, X, Save } from 'lucide-react';
import './Admin.css';

export default function AdminOrders() {
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [editingOrder, setEditingOrder] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    useEffect(() => {
        fetchOrders();
        fetchProducts();
    }, []);

    const fetchOrders = async () => {
        try {
            const res = await fetch(`${API_URL}/api/orders`);
            if (res.ok) {
                const data = await res.json();
                setOrders(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error('Error fetching orders:', err);
        }
    };

    const fetchProducts = async () => {
        try {
            const res = await fetch(`${API_URL}/api/products`);
            if (res.ok) {
                const data = await res.json();
                setProducts(data.products || []);
            }
        } catch (err) {
            console.error('Error fetching products:', err);
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

    const handleSaveEdit = async () => {
        try {
            const res = await fetch(`${API_URL}/api/orders/${editingOrder.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingOrder)
            });
            if (res.ok) {
                setIsEditModalOpen(false);
                setEditingOrder(null);
                fetchOrders();
            }
        } catch (err) {
            alert('Помилка при збереженні');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Видалити замовлення?')) {
            await fetch(`${API_URL}/api/orders/${id}`, { method: 'DELETE' });
            fetchOrders();
        }
    };

    const addItemToOrder = (product) => {
        const newItem = {
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            unit: product.unit,
            packSize: product.packSize || 1
        };
        const updatedItems = [...editingOrder.items, newItem];
        const newTotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity * (item.packSize || 1)), 0);
        setEditingOrder({ ...editingOrder, items: updatedItems, totalAmount: newTotal });
    };

    const removeItemFromOrder = (index) => {
        const updatedItems = editingOrder.items.filter((_, i) => i !== index);
        const newTotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity * (item.packSize || 1)), 0);
        setEditingOrder({ ...editingOrder, items: updatedItems, totalAmount: newTotal });
    };

    const updateItemQuantity = (index, qty) => {
        const updatedItems = [...editingOrder.items];
        updatedItems[index].quantity = parseFloat(qty) || 0;
        const newTotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity * (item.packSize || 1)), 0);
        setEditingOrder({ ...editingOrder, items: updatedItems, totalAmount: newTotal });
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
                                        <button onClick={() => { setEditingOrder({ ...order }); setIsEditModalOpen(true); }} className="action-btn" title="Редагувати">
                                            <Edit2 size={18} />
                                        </button>
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

            {isEditModalOpen && editingOrder && (
                <div className="admin-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyCenter: 'center', zIndex: 1000, padding: '20px' }}>
                    <div className="admin-modal" style={{ background: 'white', padding: '30px', borderRadius: '15px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                            <h2 style={{ margin: 0 }}>Редагування замовлення {editingOrder.orderNumber}</h2>
                            <button onClick={() => setIsEditModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
                        </div>

                        <div className="admin-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                            <div className="form-group">
                                <label>Ім'я клієнта</label>
                                <input type="text" value={editingOrder.customerName} onChange={e => setEditingOrder({ ...editingOrder, customerName: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Телефон</label>
                                <input type="text" value={editingOrder.customerPhone} onChange={e => setEditingOrder({ ...editingOrder, customerPhone: e.target.value })} />
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Адреса / Спосіб доставки</label>
                                <input type="text" value={editingOrder.address} onChange={e => setEditingOrder({ ...editingOrder, address: e.target.value })} />
                            </div>
                        </div>

                        <h3 style={{ marginBottom: '15px' }}>Товари в замовленні</h3>
                        <div className="edit-order-items" style={{ marginBottom: '20px' }}>
                            {editingOrder.items.map((item, idx) => (
                                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 40px', gap: '15px', alignItems: 'center', marginBottom: '10px', padding: '10px', background: '#f9f9f9', borderRadius: '8px' }}>
                                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={e => updateItemQuantity(idx, e.target.value)}
                                            style={{ width: '70px', padding: '5px' }}
                                        />
                                        <span>{item.unit === 'м²' ? 'уп.' : 'шт.'}</span>
                                    </div>
                                    <div style={{ textAlign: 'right', fontWeight: 700 }}>
                                        {(item.price * item.quantity * (item.packSize || 1)).toLocaleString()} ₴
                                    </div>
                                    <button onClick={() => removeItemFromOrder(idx)} style={{ color: '#e63946', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={18} /></button>
                                </div>
                            ))}
                        </div>

                        <div className="add-item-section" style={{ marginBottom: '30px', padding: '15px', border: '1px dashed #ddd', borderRadius: '8px' }}>
                            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 700 }}>Додати товар</label>
                            <select
                                onChange={(e) => {
                                    const prod = products.find(p => p.id === parseInt(e.target.value));
                                    if (prod) addItemToOrder(prod);
                                    e.target.value = "";
                                }}
                                style={{ width: '100%' }}
                            >
                                <option value="">Оберіть товар для додавання...</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} ({p.price} ₴)</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid #eee', paddingTop: '20px' }}>
                            <div style={{ fontSize: '1.2rem' }}>
                                Разом: <strong style={{ fontSize: '1.5rem', color: 'var(--admin-accent)' }}>{editingOrder.totalAmount.toLocaleString()} ₴</strong>
                            </div>
                            <button onClick={handleSaveEdit} className="btn btn-primary" style={{ padding: '12px 30px' }}>
                                <Save size={20} /> Зберегти зміни
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
