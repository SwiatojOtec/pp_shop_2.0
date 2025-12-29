import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, Heart, ShoppingCart, ShieldCheck, Truck, RotateCcw, Plus, Minus } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';
import { API_URL } from '../apiConfig';
import './ProductDetail.css';

export default function ProductDetail() {
    const { slug } = useParams();
    const { addToCart } = useCart();
    const { toggleFavorite, isFavorite } = useFavorites();
    const [product, setProduct] = useState(null);
    const [variants, setVariants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeImg, setActiveImg] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState('desc');

    useEffect(() => {
        setLoading(true);
        fetch(`${API_URL}/api/products/${slug}`)
            .then(res => {
                if (!res.ok) throw new Error('Товар не знайдено');
                return res.json();
            })
            .then(data => {
                setProduct(data);
                setActiveImg(data.image);
                setLoading(false);

                // Fetch variants if groupId exists
                if (data.groupId) {
                    fetch(`${API_URL}/api/products?groupId=${data.groupId}`)
                        .then(res => res.json())
                        .then(allProducts => {
                            // Filter out current product
                            setVariants(allProducts.filter(p => p.id !== data.id));
                        })
                        .catch(err => console.error('Error fetching variants:', err));
                } else {
                    setVariants([]);
                }
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, [slug]);

    if (loading) return <div className="container" style={{ padding: '100px 0', textAlign: 'center' }}>Завантаження...</div>;
    if (error) return <div className="container" style={{ padding: '100px 0', textAlign: 'center', color: 'red' }}>{error}</div>;
    if (!product) return <div className="container" style={{ padding: '100px 0', textAlign: 'center' }}>Товар не знайдено</div>;

    return (
        <div className="product-page">
            <div className="container">
                <nav className="breadcrumbs">
                    <Link to="/">Головна</Link> / <Link to="/shop">Магазин</Link> / <span>{product.name}</span>
                </nav>

                <div className="product-main-grid">
                    <div className="product-gallery">
                        <div className="main-image-container">
                            <img src={activeImg} alt={product.name} className="main-image" />
                            <button
                                className={`wishlist-btn-large ${isFavorite(product._id || product.id) ? 'active' : ''}`}
                                onClick={() => toggleFavorite(product)}
                            >
                                <Heart size={24} fill={isFavorite(product._id || product.id) ? "currentColor" : "none"} />
                            </button>
                        </div>
                        {product.images && product.images.length > 0 && (
                            <div className="thumbnails-grid" style={{ display: 'flex', gap: '10px', marginTop: '15px', overflowX: 'auto', paddingBottom: '10px' }}>
                                <div
                                    className={`thumb-item ${activeImg === product.image ? 'active' : ''}`}
                                    onClick={() => setActiveImg(product.image)}
                                    style={{ width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', border: activeImg === product.image ? '2px solid var(--color-primary)' : '2px solid transparent', flexShrink: 0 }}
                                >
                                    <img src={product.image} alt="Thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                                {product.images.map((img, i) => (
                                    <div
                                        key={i}
                                        className={`thumb-item ${activeImg === img ? 'active' : ''}`}
                                        onClick={() => setActiveImg(img)}
                                        style={{ width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', border: activeImg === img ? '2px solid var(--color-primary)' : '2px solid transparent', flexShrink: 0 }}
                                    >
                                        <img src={img} alt={`Thumb ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="product-info-panel">
                        <div className="info-header">
                            <span className="product-sku">SKU: {product.sku}</span>
                            <div className="product-rating">
                                <Star size={16} fill="var(--color-primary)" color="var(--color-primary)" />
                                <span>{product.rating}.0 ({product.reviews} відгуків)</span>
                            </div>
                        </div>

                        <h1 className="product-title-large">{product.name}</h1>

                        <div className="price-section">
                            <div className="price-current">
                                {product.price} ₴ <span className="unit">/ м²</span>
                            </div>
                            {product.oldPrice && (
                                <div className="price-old">{product.oldPrice} ₴</div>
                            )}
                        </div>

                        <p className="short-desc">{product.desc}</p>

                        {variants.length > 0 && (
                            <div className="product-variants" style={{ marginBottom: '25px' }}>
                                <h4 style={{ fontSize: '0.9rem', marginBottom: '10px', color: '#666' }}>Інші кольори колекції:</h4>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    {/* Current product indicator */}
                                    <div style={{ width: '45px', height: '45px', borderRadius: '50%', border: '2px solid var(--color-primary)', padding: '2px', cursor: 'default' }}>
                                        <img src={product.image} alt="current" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} title="Поточний колір" />
                                    </div>
                                    {/* Other variants */}
                                    {variants.map(v => (
                                        <Link
                                            key={v.id}
                                            to={`/shop/${v.slug}`}
                                            style={{ width: '45px', height: '45px', borderRadius: '50%', border: '1px solid #ddd', padding: '2px', transition: 'all 0.2s' }}
                                            onMouseOver={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                                            onMouseOut={e => e.currentTarget.style.borderColor = '#ddd'}
                                        >
                                            <img src={v.image} alt={v.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} title={v.name} />
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="purchase-section">
                            <div className="quantity-control">
                                <button onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={18} /></button>
                                <input type="number" value={quantity} readOnly />
                                <button onClick={() => setQuantity(quantity + 1)}><Plus size={18} /></button>
                            </div>
                            <button className="btn btn-primary buy-btn" onClick={() => addToCart(product, quantity)}>
                                <ShoppingCart size={20} />
                                Додати в кошик
                            </button>
                        </div>

                        <div className="trust-badges">
                            <div className="badge-item">
                                <ShieldCheck size={20} />
                                <span>2 роки гарантії</span>
                            </div>
                            <div className="badge-item">
                                <Truck size={20} />
                                <span>Швидка доставка</span>
                            </div>
                            <div className="badge-item">
                                <RotateCcw size={20} />
                                <span>14 днів на повернення</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="product-tabs-section">
                    <div className="tabs-header">
                        <button className={`tab-link ${activeTab === 'desc' ? 'active' : ''}`} onClick={() => setActiveTab('desc')}>Опис</button>
                        <button className={`tab-link ${activeTab === 'specs' ? 'active' : ''}`} onClick={() => setActiveTab('specs')}>Характеристики</button>
                    </div>
                    <div className="tab-content">
                        {activeTab === 'desc' && <p>{product.desc}</p>}
                        {activeTab === 'specs' && (
                            <div className="specs-grid">
                                <div className="spec-item"><span className="spec-label">Категорія</span><span>{product.category}</span></div>
                                {product.specs && Object.entries(product.specs).map(([label, value], i) => (
                                    <div key={i} className="spec-item">
                                        <span className="spec-label">{label}</span>
                                        <span>{value}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
