import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Hammer, Ruler, Truck, ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { addToCartWithToast } from '../utils/addToCartWithToast';
import { optimizeImageUrl } from '../utils/imageOptimize';
import { productsApi } from '../services/api';
import './RentSection.css';

/**
 * Домашня секція-тизер каталогу послуг — за структурою RentSection.jsx
 * (навмисно перевикористовує ті самі CSS-класи, суто презентаційні,
 * не rent-специфічні: `rent-info-grid`/`rent-highlights`/`product-grid`).
 */
export default function ServicesSection() {
    const [services, setServices] = useState([]);
    const { addToCart, cartItems } = useCart();
    const { showToast } = useToast();

    useEffect(() => {
        productsApi.list({ isService: true })
            .then((data) => setServices(Array.isArray(data) ? data : []))
            .catch(() => setServices([]));
    }, []);

    if (services.length === 0) return null;

    return (
        <section className="rent-section" id="services">
            <div className="container">
                <div className="rent-info-grid">
                    <div className="rent-content">
                        <h2 className="section-title-left">Послуги</h2>
                        <p className="rent-text">
                            Не лише продаж і оренда — допоможемо з виїздом на заміри, укладкою
                            підлогового покриття, доставкою та складанням кошторису.
                        </p>
                        <div className="rent-highlights">
                            <div className="rent-item">
                                <Ruler className="rent-icon" />
                                <div>
                                    <h3>Виїзд на заміри</h3>
                                    <p>Спеціаліст приїде, оцінить обсяг робіт і складе кошторис.</p>
                                </div>
                            </div>
                            <div className="rent-item">
                                <Hammer className="rent-icon" />
                                <div>
                                    <h3>Укладка покриття</h3>
                                    <p>Ламінат, паркетна дошка, вініл — професійний монтаж під ключ.</p>
                                </div>
                            </div>
                            <div className="rent-item">
                                <Truck className="rent-icon" />
                                <div>
                                    <h3>Доставка</h3>
                                    <p>Привеземо матеріали й інструмент на обʼєкт у зручний час.</p>
                                </div>
                            </div>
                        </div>
                        <div className="rent-actions">
                            <Link to="/poslugy" className="btn btn-primary">
                                Усі послуги
                            </Link>
                            <a href="tel:0670064044" className="btn">
                                Подзвонити менеджеру
                            </a>
                        </div>
                    </div>
                </div>

                <div className="rent-products-block">
                    <div className="product-grid">
                        {services.slice(0, 4).map((service) => (
                            <div key={service.id} className="product-card">
                                <div className="product-image-container">
                                    <Link to="/poslugy">
                                        <img src={optimizeImageUrl(service.image, { width: 300 })} alt={service.name} className="product-image" />
                                    </Link>
                                    <button
                                        className="add-to-cart-btn"
                                        onClick={() => addToCartWithToast(service, 1, cartItems, addToCart, showToast)}
                                        title="Додати в кошик"
                                    >
                                        <ShoppingCart size={20} />
                                    </button>
                                </div>
                                <div className="product-info">
                                    <Link to="/poslugy" style={{ textDecoration: 'none', color: 'inherit' }}>
                                        <h3 className="product-name">{service.name}</h3>
                                    </Link>
                                    <div className="price-block">
                                        <span className="product-price">{service.price} ₴ / {service.unit || 'послуга'}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ textAlign: 'center', marginTop: '40px' }}>
                        <Link to="/poslugy" className="btn btn-primary">
                            Усі послуги
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
