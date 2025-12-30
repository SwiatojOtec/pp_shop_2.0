import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, CreditCard, Truck, ShieldCheck, MapPin } from 'lucide-react';
import { API_URL } from '../apiConfig';
import './Checkout.css';

export default function Checkout() {
    const { cartItems, cartTotal, clearCart } = useCart();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        city: '',
        address: '',
        deliveryMethod: 'pickup', // pickup, delivery
        paymentMethod: 'invoice' // invoice
    });
    const [successOrder, setSuccessOrder] = useState(null);

    if (successOrder) {
        return (
            <div className="container" style={{ padding: '100px 0', textAlign: 'center', maxWidth: '600px' }}>
                <div style={{ background: '#f0fdf4', padding: '40px', borderRadius: '20px', border: '1px solid #bbf7d0' }}>
                    <ShieldCheck size={64} color="#22c55e" style={{ marginBottom: '20px' }} />
                    <h2 style={{ marginBottom: '15px', color: '#166534' }}>Дякуємо за замовлення!</h2>
                    <p style={{ fontSize: '1.2rem', marginBottom: '20px' }}>
                        Ваше замовлення <strong>№{successOrder.orderNumber}</strong> прийнято в роботу.
                    </p>
                    <p style={{ color: '#666', lineHeight: 1.6, marginBottom: '30px' }}>
                        Дякуємо за замовлення та бажаємо гарного дня! <br />
                        Невдовзі з вами зв'яжеться наш менеджер для уточнення деталей та виставлення рахунку.
                    </p>
                    <Link to="/" className="btn btn-primary" style={{ padding: '12px 30px' }}>На головну</Link>
                </div>
            </div>
        );
    }

    if (cartItems.length === 0) {
        return (
            <div className="container" style={{ padding: '100px 0', textAlign: 'center' }}>
                <h2>Ваш кошик порожній</h2>
                <Link to="/shop" className="btn btn-primary" style={{ marginTop: '20px' }}>До магазину</Link>
            </div>
        );
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const orderData = {
            customerName: formData.name,
            customerPhone: formData.phone,
            customerEmail: formData.email,
            deliveryMethod: formData.deliveryMethod,
            address: formData.deliveryMethod === 'delivery' ? `${formData.city}, ${formData.address}` : 'Самовивіз (вул. Жовтнева, 79)',
            paymentMethod: formData.paymentMethod,
            items: cartItems,
            totalAmount: cartTotal
        };

        try {
            const res = await fetch(`${API_URL}/api/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });

            if (res.ok) {
                const data = await res.json();
                clearCart();
                setSuccessOrder(data);
            } else {
                throw new Error('Помилка при оформленні замовлення');
            }
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="checkout-page">
            <div className="container">
                <Link to="/shop" className="back-link">
                    <ChevronLeft size={20} /> Повернутися до покупок
                </Link>

                <h1 className="page-title">Оформлення замовлення</h1>

                <div className="checkout-grid">
                    <form className="checkout-form" onSubmit={handleSubmit}>
                        <section className="form-section">
                            <h3 className="section-title">1. Контактні дані</h3>
                            <div className="input-group">
                                <input
                                    type="text"
                                    placeholder="ПІБ"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                                <input
                                    type="tel"
                                    placeholder="Телефон"
                                    required
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                                <input
                                    type="email"
                                    placeholder="Email (необов'язково)"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </section>

                        <section className="form-section">
                            <h3 className="section-title">2. Доставка</h3>
                            <div className="delivery-options" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                                <label className={`payment-card ${formData.deliveryMethod === 'pickup' ? 'active' : ''}`} style={{ cursor: 'pointer', padding: '15px', border: '1px solid #ddd', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                    <input
                                        type="radio"
                                        name="delivery"
                                        value="pickup"
                                        style={{ display: 'none' }}
                                        checked={formData.deliveryMethod === 'pickup'}
                                        onChange={e => setFormData({ ...formData, deliveryMethod: e.target.value })}
                                    />
                                    <MapPin size={24} />
                                    <span style={{ fontWeight: 700 }}>Самовивіз</span>
                                    <span style={{ fontSize: '0.75rem', color: '#666', textAlign: 'center' }}>вул. Жовтнева, 79</span>
                                </label>
                                <label className={`payment-card ${formData.deliveryMethod === 'delivery' ? 'active' : ''}`} style={{ cursor: 'pointer', padding: '15px', border: '1px solid #ddd', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                    <input
                                        type="radio"
                                        name="delivery"
                                        value="delivery"
                                        style={{ display: 'none' }}
                                        checked={formData.deliveryMethod === 'delivery'}
                                        onChange={e => setFormData({ ...formData, deliveryMethod: e.target.value })}
                                    />
                                    <Truck size={24} />
                                    <span style={{ fontWeight: 700 }}>Доставка</span>
                                    <span style={{ fontSize: '0.75rem', color: '#666', textAlign: 'center' }}>Адресна доставка</span>
                                </label>
                            </div>

                            {formData.deliveryMethod === 'delivery' && (
                                <div className="input-group" style={{ animation: 'fadeIn 0.3s ease' }}>
                                    <input
                                        type="text"
                                        placeholder="Місто"
                                        required={formData.deliveryMethod === 'delivery'}
                                        value={formData.city}
                                        onChange={e => setFormData({ ...formData, city: e.target.value })}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Адреса (вулиця, будинок, кв)"
                                        required={formData.deliveryMethod === 'delivery'}
                                        value={formData.address}
                                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    />
                                </div>
                            )}
                        </section>

                        <section className="form-section">
                            <h3 className="section-title">3. Оплата</h3>
                            <div className="payment-info-box" style={{ background: '#f9f9f9', padding: '20px', borderRadius: '12px', border: '1px solid #eee' }}>
                                <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                                    <CreditCard size={24} color="var(--color-primary)" />
                                    <div>
                                        <h4 style={{ margin: '0 0 5px 0', fontWeight: 700 }}>Оплата за рахунком</h4>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#666', lineHeight: 1.5 }}>
                                            Після оформлення замовлення наш менеджер зв'яжеться з вами для уточнення деталей, наявності та виставить рахунок для оплати.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <button type="submit" className="btn btn-primary submit-order" disabled={loading} style={{ width: '100%', padding: '15px', fontSize: '1.1rem' }}>
                            {loading ? 'Обробка...' : 'Підтвердити замовлення'}
                        </button>
                    </form>

                    <aside className="order-summary">
                        <h3 className="section-title">Ваше замовлення</h3>
                        <div className="summary-items">
                            {cartItems.map(item => (
                                <div key={item.id} className="summary-item">
                                    <span className="item-name">
                                        {item.name} x {item.quantity} {item.unit === 'м²' ? 'уп.' : 'шт.'}
                                    </span>
                                    <span className="item-price">
                                        {(item.price * item.quantity * (item.packSize || 1)).toLocaleString()} ₴
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="summary-total">
                            <span>Разом до оплати:</span>
                            <span className="total-value">{cartTotal.toLocaleString()} ₴</span>
                        </div>
                        <div className="trust-info">
                            <div className="trust-item">
                                <ShieldCheck size={18} />
                                <span>Безпечна оплата</span>
                            </div>
                            <div className="trust-item">
                                <Truck size={18} />
                                <span>Гарантована доставка</span>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}
