import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, CreditCard, Truck, ShieldCheck } from 'lucide-react';
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
        paymentMethod: 'card'
    });
    const [loading, setLoading] = useState(false);

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
            address: `${formData.city}, ${formData.address}`,
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
                clearCart();
                alert('Замовлення успішно оформлено!');
                navigate('/');
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
                            <div className="input-group">
                                <input
                                    type="text"
                                    placeholder="Місто"
                                    required
                                    value={formData.city}
                                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                                />
                                <input
                                    type="text"
                                    placeholder="Адреса (вулиця, будинок, кв)"
                                    required
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>
                        </section>

                        <section className="form-section">
                            <h3 className="section-title">3. Оплата</h3>
                            <div className="payment-options">
                                <label className={`payment-card ${formData.paymentMethod === 'card' ? 'active' : ''}`}>
                                    <input
                                        type="radio"
                                        name="payment"
                                        value="card"
                                        checked={formData.paymentMethod === 'card'}
                                        onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                                    />
                                    <CreditCard size={24} />
                                    <span>Картою на сайті</span>
                                </label>
                                <label className={`payment-card ${formData.paymentMethod === 'cash' ? 'active' : ''}`}>
                                    <input
                                        type="radio"
                                        name="payment"
                                        value="cash"
                                        checked={formData.paymentMethod === 'cash'}
                                        onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                                    />
                                    <Truck size={24} />
                                    <span>При отриманні</span>
                                </label>
                            </div>
                        </section>

                        <button type="submit" className="btn btn-primary submit-order" disabled={loading}>
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
