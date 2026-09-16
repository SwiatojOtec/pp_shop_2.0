import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { addToCartWithToast } from '../utils/addToCartWithToast';
import { productsApi } from '../services/api';
import { optimizeImageUrl } from '../utils/imageOptimize';
import './Shop.css';

function stripHtml(html) {
    return String(html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Публічна сторінка послуг — укладка, виїзд на заміри, доставка, кошторис
 * тощо. Свідомо без сайдбару фільтрів/сортування (Rent.jsx/Shop.jsx) —
 * каталог короткий, це зайве. Без окремого маршруту /poslugy/:slug —
 * деталі відкриваються в quick-view модалці (docs plan «Каталог «Послуги»»).
 */
export default function Services() {
    const { addToCart, cartItems } = useCart();
    const { showToast } = useToast();
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [quickView, setQuickView] = useState(null);

    useEffect(() => {
        productsApi.list({ isService: true })
            .then((data) => setServices(Array.isArray(data) ? data : []))
            .catch(() => setServices([]))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="container" style={{ padding: '100px 0', textAlign: 'center' }}>Завантаження послуг...</div>;

    const groups = new Map();
    services.forEach((s) => {
        const key = s.category?.trim() || 'Інші послуги';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(s);
    });

    return (
        <div className="shop-page">
            <div className="container">
                <nav className="breadcrumbs">
                    <Link to="/">Головна</Link> / <span>Послуги</span>
                </nav>

                <div className="shop-header">
                    <h1 className="shop-title">Послуги</h1>
                    <span className="product-count">Показано {services.length} послуг</span>
                </div>

                {services.length === 0 && (
                    <p style={{ padding: '40px 0' }}>Послуги скоро зʼявляться тут.</p>
                )}

                {[...groups.entries()].map(([groupName, items]) => (
                    <section key={groupName} style={{ marginBottom: '32px' }}>
                        {groups.size > 1 && <h2 className="shop-title" style={{ fontSize: '1.25rem', marginBottom: '16px' }}>{groupName}</h2>}
                        <div className="product-grid">
                            {items.map((service) => (
                                <div key={service.id} className="product-card">
                                    <div className="product-image-container">
                                        <button className="quick-view-btn" onClick={() => setQuickView(service)}>
                                            Детальніше
                                        </button>
                                        <img
                                            src={optimizeImageUrl(service.image, { width: 300 })}
                                            alt={service.name}
                                            className="product-image"
                                            onClick={() => setQuickView(service)}
                                            style={{ cursor: 'pointer' }}
                                        />
                                    </div>
                                    <div className="product-info">
                                        <h3 className="product-name" onClick={() => setQuickView(service)} style={{ cursor: 'pointer' }}>
                                            {service.name}
                                        </h3>
                                        <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '4px 0 8px' }}>
                                            {stripHtml(service.desc).slice(0, 90)}{stripHtml(service.desc).length > 90 ? '…' : ''}
                                        </p>
                                        <div className="price-block">
                                            <span className="product-price" style={{ fontWeight: 700 }}>
                                                {service.price} ₴ / {service.unit || 'послуга'}
                                            </span>
                                        </div>
                                        <button
                                            className="btn btn-primary"
                                            style={{ marginTop: '10px', width: '100%' }}
                                            onClick={() => addToCartWithToast(service, 1, cartItems, addToCart, showToast)}
                                        >
                                            Додати в кошик
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ))}
            </div>

            {quickView && (
                <div className="modal-overlay" onClick={() => setQuickView(null)}>
                    <div className="quick-view-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setQuickView(null)}>
                            <X size={24} />
                        </button>
                        <div className="modal-grid">
                            <div className="modal-image">
                                <img src={optimizeImageUrl(quickView.image, { width: 500 })} alt={quickView.name} />
                            </div>
                            <div className="modal-info">
                                <h2 className="modal-title">{quickView.name}</h2>
                                <div className="modal-price-block" style={{ marginBottom: '20px' }}>
                                    <span className="modal-price" style={{ fontSize: '1.8rem', fontWeight: 800 }}>
                                        {quickView.price} ₴ / {quickView.unit || 'послуга'}
                                    </span>
                                </div>
                                <div className="modal-desc" dangerouslySetInnerHTML={{ __html: quickView.desc }} />
                                <div className="modal-actions">
                                    <button
                                        className="btn btn-primary add-btn"
                                        onClick={() => addToCartWithToast(quickView, 1, cartItems, addToCart, showToast)}
                                    >
                                        В кошик
                                    </button>
                                    <a className="btn" href="tel:0670064044">Зателефонувати</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
