import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Filter, ChevronDown, Plus, X, Heart, Star } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';
import { getCategoryName, getCategorySlug } from '../utils/categoryMapping';
import { API_URL } from '../apiConfig';
import './Shop.css';

const FILTERS = [
    { title: 'Категорія', options: ['Паркетна дошка', 'Ламінат', 'Вініл', 'Двері'] },
    { title: 'Бренд', options: ['Tarkett', 'Barlinek', 'Quick-Step', 'Arteo'] },
];

export default function Shop() {
    const [searchParams, setSearchParams] = useSearchParams();
    const { addToCart } = useCart();
    const { toggleFavorite, isFavorite } = useFavorites();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [quickViewProduct, setQuickViewProduct] = useState(null);

    // Filter states from URL
    const categorySlug = searchParams.get('category') || '';
    const category = getCategoryName(categorySlug);
    const search = searchParams.get('search') || '';
    const sort = searchParams.get('sort') || 'popular';
    const minPrice = searchParams.get('minPrice') || '';
    const maxPrice = searchParams.get('maxPrice') || '';
    const badge = searchParams.get('badge') || '';

    useEffect(() => {
        setLoading(true);
        const query = new URLSearchParams({
            category,
            search,
            sort,
            minPrice,
            maxPrice,
            badge
        }).toString();

        fetch(`${API_URL}/api/products?${query}`)
            .then(res => {
                if (!res.ok) throw new Error('Помилка завантаження товарів');
                return res.json();
            })
            .then(data => {
                setProducts(data);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, [category, search, sort, minPrice, maxPrice]);

    const handleFilterChange = (key, value) => {
        const newParams = new URLSearchParams(searchParams);
        if (value) {
            // If it's category, use slug
            const finalValue = key === 'category' ? getCategorySlug(value) : value;
            newParams.set(key, finalValue);
        } else {
            newParams.delete(key);
        }
        setSearchParams(newParams);
    };



    if (loading) return <div className="container" style={{ padding: '100px 0', textAlign: 'center' }}>Завантаження товарів...</div>;
    if (error) return <div className="container" style={{ padding: '100px 0', textAlign: 'center', color: 'red' }}>{error}</div>;

    return (
        <div className="shop-page">
            <div className="container">
                <nav className="breadcrumbs">
                    <Link to="/">Головна</Link> / <span>Магазин</span>
                </nav>

                <div className="shop-header">
                    <h1 className="shop-title">Магазин</h1>
                    <div className="shop-controls">
                        <span className="product-count">Показано {products.length} товарів</span>
                        <div className="sort-dropdown">
                            Сортувати: <strong>За популярністю</strong> <ChevronDown size={16} />
                        </div>
                    </div>
                </div>

                {(categorySlug || search) && (
                    <div className="active-filters">
                        {categorySlug && (
                            <span className="filter-tag">
                                {category} <X size={14} onClick={() => handleFilterChange('category', '')} />
                            </span>
                        )}
                        {search && (
                            <span className="filter-tag">
                                Пошук: {search} <X size={14} onClick={() => handleFilterChange('search', '')} />
                            </span>
                        )}
                        {badge && (
                            <span className="filter-tag">
                                {badge === 'SALE' ? 'Розпродаж' : badge} <X size={14} onClick={() => handleFilterChange('badge', '')} />
                            </span>
                        )}
                        <button className="clear-all" onClick={() => setSearchParams({})}>Очистити все</button>
                    </div>
                )}

                <div className="shop-layout">
                    <aside className="shop-sidebar">
                        <div className="filter-header">
                            <Filter size={20} />
                            <span>Фільтри</span>
                        </div>

                        {FILTERS.map((filter, idx) => (
                            <div key={idx} className="filter-group">
                                <h4 className="filter-title">{filter.title}</h4>
                                <div className="filter-options">
                                    {filter.options.map((opt, oIdx) => (
                                        <label key={oIdx} className="filter-label">
                                            <input
                                                type="checkbox"
                                                checked={category === opt}
                                                onChange={() => handleFilterChange('category', category === opt ? '' : opt)}
                                            />
                                            <span>{opt}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}

                        <div className="filter-group">
                            <h4 className="filter-title">Спеціальні пропозиції</h4>
                            <div className="filter-options">
                                <label className="filter-label">
                                    <input
                                        type="checkbox"
                                        checked={badge === 'SALE'}
                                        onChange={() => handleFilterChange('badge', badge === 'SALE' ? '' : 'SALE')}
                                    />
                                    <span>Розпродаж %</span>
                                </label>
                            </div>
                        </div>

                        <div className="price-filter">
                            <h4 className="filter-title">Ціна, ₴</h4>
                            <div className="price-inputs">
                                <input
                                    type="number"
                                    placeholder="Від"
                                    value={minPrice}
                                    onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                                />
                                <input
                                    type="number"
                                    placeholder="До"
                                    value={maxPrice}
                                    onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                                />
                            </div>
                        </div>
                    </aside>

                    <main className="shop-main">
                        <div className="product-grid">
                            {products.map((product, index) => (
                                <React.Fragment key={product._id || product.id}>
                                    <div className="product-card">
                                        <div className="product-image-container">
                                            {product.badge && <span className={`badge badge-${product.badge.toLowerCase()}`}>{product.badge}</span>}
                                            <Link to={`/shop/${product.slug}`}>
                                                <img src={product.image} alt={product.name} className="product-image" />
                                            </Link>
                                            <button
                                                className={`wishlist-btn ${isFavorite(product._id || product.id) ? 'active' : ''}`}
                                                onClick={() => toggleFavorite(product)}
                                            >
                                                <Heart size={20} fill={isFavorite(product._id || product.id) ? "currentColor" : "none"} />
                                            </button>
                                            <button className="quick-view-btn" onClick={() => setQuickViewProduct(product)}>
                                                Швидкий перегляд
                                            </button>
                                            <button className="add-to-cart-btn" onClick={() => addToCart(product)}><Plus size={24} /></button>
                                        </div>
                                        <div className="product-info">
                                            <div className="product-meta">
                                                <div className="color-swatches">
                                                    {product.colors?.map((c, i) => (
                                                        <span key={i} className="swatch" style={{ backgroundColor: c }}></span>
                                                    ))}
                                                </div>
                                                <div className="product-rating">
                                                    <Star size={12} fill="var(--color-primary)" color="var(--color-primary)" />
                                                    <span>{product.rating}.0 ({product.reviews})</span>
                                                </div>
                                            </div>
                                            <Link to={`/shop/${product.slug}`}>
                                                <h3 className="product-name">{product.name}</h3>
                                            </Link>
                                            <div className="price-block">
                                                <span className="product-price">{product.price} ₴ / м²</span>
                                            </div>
                                        </div>
                                    </div>
                                </React.Fragment>
                            ))}
                        </div>
                    </main>
                </div>
            </div>

            {/* Quick View Modal */}
            {quickViewProduct && (
                <div className="modal-overlay" onClick={() => setQuickViewProduct(null)}>
                    <div className="quick-view-modal" onClick={e => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setQuickViewProduct(null)}>
                            <X size={24} />
                        </button>
                        <div className="modal-grid">
                            <div className="modal-image">
                                <img src={quickViewProduct.image} alt={quickViewProduct.name} />
                            </div>
                            <div className="modal-info">
                                <h2 className="modal-title">{quickViewProduct.name}</h2>
                                <div className="modal-price">{quickViewProduct.price} ₴ / м²</div>
                                <p className="modal-desc">{quickViewProduct.desc}</p>
                                <div className="modal-actions">
                                    <button className="btn btn-primary add-btn" onClick={() => addToCart(quickViewProduct)}>
                                        В кошик
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
