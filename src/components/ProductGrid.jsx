import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Heart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';
import { API_URL } from '../apiConfig';
import './ProductGrid.css';

export default function ProductGrid() {
    const [activeTab, setActiveTab] = useState('all');
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const { addToCart } = useCart();
    const { toggleFavorite, isFavorite } = useFavorites();

    useEffect(() => {
        setLoading(true);
        fetch(`${API_URL}/api/products`)
            .then(res => res.json())
            .then(data => {
                setProducts(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching products:', err);
                setLoading(false);
            });
    }, []);

    const filteredProducts = activeTab === 'all'
        ? products
        : products.filter(p => {
            if (activeTab === 'new') return p.badge === 'NEW';
            if (activeTab === 'popular') return p.badge === 'HIT';
            if (activeTab === 'sale') return p.badge === 'SALE';
            return true;
        });

    if (loading) return <div className="container" style={{ padding: '50px 0', textAlign: 'center' }}>Завантаження товарів...</div>;

    return (
        <section className="product-section">
            <div className="container">
                <div className="section-header">
                    <h2 className="section-title-left">Товари</h2>
                    <div className="product-tabs">
                        <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>Всі</button>
                        <button className={`tab-btn ${activeTab === 'new' ? 'active' : ''}`} onClick={() => setActiveTab('new')}>Новинки</button>
                        <button className={`tab-btn ${activeTab === 'popular' ? 'active' : ''}`} onClick={() => setActiveTab('popular')}>Хіти</button>
                        <button className={`tab-btn ${activeTab === 'sale' ? 'active' : ''}`} onClick={() => setActiveTab('sale')}>Акції</button>
                    </div>
                </div>

                <div className="product-grid">
                    {filteredProducts.slice(0, 8).map(product => (
                        <div key={product._id || product.id} className="product-card">
                            <div className="product-image-container">
                                {product.badge && (
                                    <span className={`badge badge-${product.badge.toLowerCase()}`}>
                                        {product.badge === 'SALE' ? 'Розпродаж' :
                                            product.badge === 'NEW' ? 'Новинка' :
                                                product.badge === 'HOT' ? 'Хіт' :
                                                    product.badge === 'TOP' ? 'Топ' : product.badge}
                                    </span>
                                )}
                                <Link to={`/shop/${product.slug}`}>
                                    <img src={product.image} alt={product.name} className="product-image" />
                                </Link>
                                <button
                                    className={`wishlist-btn ${isFavorite(product._id || product.id) ? 'active' : ''}`}
                                    onClick={() => toggleFavorite(product)}
                                    style={{
                                        position: 'absolute',
                                        top: '10px',
                                        right: '10px',
                                        background: 'rgba(255,255,255,0.9)',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '36px',
                                        height: '36px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s',
                                        color: isFavorite(product._id || product.id) ? 'var(--color-primary)' : '#666'
                                    }}
                                >
                                    <Heart size={20} fill={isFavorite(product._id || product.id) ? "currentColor" : "none"} />
                                </button>
                                <button className="add-to-cart-btn" onClick={() => addToCart(product)}><Plus size={24} /></button>
                            </div>
                            <div className="product-info">
                                <Link to={`/shop/${product.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                    <h3 className="product-name">{product.name}</h3>
                                </Link>
                                <div className="price-block">
                                    {product.oldPrice && <span className="old-price">{product.oldPrice} ₴</span>}
                                    <span className={`product-price ${product.oldPrice ? 'sale-price' : ''}`}>{product.price} ₴ / {product.unit || 'м²'}</span>
                                </div>
                                <div className="stock-status in-stock">В наявності</div>
                            </div>
                        </div>
                    ))}
                </div>

                {products.length > 8 && (
                    <div style={{ textAlign: 'center', marginTop: '40px' }}>
                        <Link to="/shop" className="btn btn-primary">Дивитись всі товари</Link>
                    </div>
                )}
            </div>
        </section>
    );
}
