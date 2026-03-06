import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Clock, Phone, Plus } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { addToCartWithToast } from '../utils/addToCartWithToast';
import { getCategorySlug } from '../utils/categoryMapping';
import { API_URL } from '../apiConfig';
import './RentSection.css';

export default function RentSection() {
    const [rentProducts, setRentProducts] = useState([]);
    const { addToCart, cartItems } = useCart();
    const { showToast } = useToast();

    useEffect(() => {
        fetch(`${API_URL}/api/products?isRent=true`)
            .then(res => res.json())
            .then(data => setRentProducts(Array.isArray(data) ? data : []))
            .catch(err => console.error('Error fetching rent products:', err));
    }, []);

    return (
        <section className="rent-section" id="rent">
            <div className="container">

                {/* Info block */}
                <div className="rent-info-grid">
                    <div className="rent-content">
                        <h2 className="section-title-left">Оренда електроінструменту</h2>
                        <p className="rent-text">
                            Потрібен інструмент для ремонту, будівництва чи оздоблення — але купувати недоцільно?
                            Ми здаємо в оренду перевірений електроінструмент для будь-яких видів робіт.
                            Оренда від доби, з поверненням після використання.
                        </p>
                        <div className="rent-highlights">
                            <div className="rent-item">
                                <MapPin className="rent-icon" />
                                <div>
                                    <h3>Широкий асортимент</h3>
                                    <p>Перфоратори, болгарки, дрилі, лобзики та інший електроінструмент для будь-яких завдань.</p>
                                </div>
                            </div>
                            <div className="rent-item">
                                <Clock className="rent-icon" />
                                <div>
                                    <h3>Оренда від доби</h3>
                                    <p>Денна або тижнева оренда — платите лише за той час, що реально використовуєте.</p>
                                </div>
                            </div>
                            <div className="rent-item">
                                <Phone className="rent-icon" />
                                <div>
                                    <h3>Прозорі умови</h3>
                                    <p>Фіксована ціна за добу, повернення після роботи. Береться заставу на час оренди.</p>
                                </div>
                            </div>
                        </div>
                        <div className="rent-actions">
                            <a
                                href="https://t.me/+380670064044"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-primary"
                            >
                                Узгодити оренду в Telegram
                            </a>
                            <a href="tel:0670064044" className="btn">
                                Подзвонити менеджеру
                            </a>
                        </div>
                    </div>
                    <div className="rent-aside">
                        <div className="rent-card">
                            <h3>Для яких робіт</h3>
                            <ul>
                                <li>— Свердління та довбання стін</li>
                                <li>— Різання металу, плитки, дерева</li>
                                <li>— Шліфування та полірування</li>
                                <li>— Монтаж підлогових покриттів</li>
                                <li>— Оздоблювальні та ремонтні роботи</li>
                            </ul>
                            <p className="rent-card-note">
                                Каталог постійно поповнюється — уточнюйте наявність у менеджера.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Rent product cards */}
                {rentProducts.length > 0 && (
                    <div className="rent-products-block">
                        <div className="product-grid">
                            {rentProducts.slice(0, 8).map(product => (
                                <div key={product.id} className="product-card">
                                    <div className="product-image-container">
                                        <Link to={`/orenda/${product.slug}`}>
                                            <img src={product.image} alt={product.name} className="product-image" />
                                        </Link>
                                        <button
                                            className="add-to-cart-btn"
                                            onClick={() => addToCartWithToast(product, 1, cartItems, addToCart, showToast)}
                                        >
                                            <Plus size={24} />
                                        </button>
                                    </div>
                                    <div className="product-info">
                                        <Link to={`/orenda/${product.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                            <h3 className="product-name">{product.name}</h3>
                                        </Link>
                                        <div className="price-block">
                                            <span className="product-price">{product.price} ₴ / доба</span>
                                        </div>
                                        <div className="stock-status in-stock">
                                            {product.stockStatus === 'out_of_stock' ? 'Немає в наявності'
                                                : product.stockStatus === 'on_order' ? 'Під замовлення'
                                                : 'В наявності'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ textAlign: 'center', marginTop: '40px' }}>
                            <Link to="/orenda" className="btn btn-primary">
                                Всі інструменти для оренди
                            </Link>
                        </div>
                    </div>
                )}

            </div>
        </section>
    );
}
