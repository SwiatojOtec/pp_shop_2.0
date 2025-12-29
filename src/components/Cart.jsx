import React from 'react';
import { X, ShoppingCart, Trash2, Plus, Minus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import './Cart.css';

export default function Cart({ isOpen, onClose }) {
    const { cartItems, removeFromCart, updateQuantity, cartTotal } = useCart();

    if (!isOpen) return null;

    return (
        <div className="cart-overlay" onClick={onClose}>
            <div className="cart-drawer" onClick={e => e.stopPropagation()}>
                <div className="cart-header">
                    <div className="cart-title">
                        <ShoppingCart size={24} />
                        <h2>Кошик</h2>
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="cart-content">
                    {cartItems.length === 0 ? (
                        <div className="empty-cart">
                            <p>Ваш кошик порожній</p>
                            <button className="btn btn-primary" onClick={onClose}>До магазину</button>
                        </div>
                    ) : (
                        <div className="cart-items">
                            {cartItems.map(item => (
                                <div key={item.id} className="cart-item">
                                    <div className="item-img">
                                        <img src={item.image} alt={item.name} />
                                    </div>
                                    <div className="item-info">
                                        <h3>{item.name}</h3>
                                        <div className="item-price">{item.price} ₴ / м²</div>
                                        <div className="item-controls">
                                            <div className="qty-btns">
                                                <button onClick={() => updateQuantity(item.id, item.quantity - 1)}><Minus size={14} /></button>
                                                <span>{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item.id, item.quantity + 1)}><Plus size={14} /></button>
                                            </div>
                                            <button className="remove-btn" onClick={() => removeFromCart(item.id)}>
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {cartItems.length > 0 && (
                    <div className="cart-footer">
                        <div className="total-row">
                            <span>Разом:</span>
                            <span className="total-price">{cartTotal} ₴</span>
                        </div>
                        <Link to="/checkout" onClick={onClose}>
                            <button className="btn btn-primary checkout-btn">Оформити замовлення</button>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
