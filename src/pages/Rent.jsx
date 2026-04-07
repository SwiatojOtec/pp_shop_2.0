import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Filter, ChevronDown, Plus, X, Heart, Star } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { addToCartWithToast } from '../utils/addToCartWithToast';
import { useFavorites } from '../context/FavoritesContext';
import { API_URL } from '../apiConfig';
import './Shop.css';

const RENT_CATEGORY_NAME = 'Оренда інструменту';

const isRentUnavailableNow = (product) => {
    if (!product) return true;
    if (typeof product.quantityAvailable === 'number' && product.quantityAvailable <= 0) return true;
    return ['out_of_stock', 'available_later', 'needs_repair', 'in_repair', 'in_procurement'].includes(product.stockStatus);
};

const rentStatusLabel = (product) => {
    if (typeof product.quantityAvailable === 'number' && product.quantityAvailable <= 0) return 'Немає в наявності';
    if (product.stockStatus === 'available_later') return `В оренді до ${product.availableFrom || 'уточнення дати'}`;
    if (product.stockStatus === 'needs_repair') return 'Потребує ремонту';
    if (product.stockStatus === 'in_repair') return 'На ремонті';
    if (product.stockStatus === 'in_procurement') return 'У закупівлі';
    return 'Тимчасово недоступний';
};

export default function Rent() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { addToCart, cartItems } = useCart();
    const { toggleFavorite, isFavorite } = useFavorites();
    const { showToast } = useToast();
    const [products, setProducts] = useState([]);
    const [brands, setBrands] = useState([]);
    const [rentCategories, setRentCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [quickViewProduct, setQuickViewProduct] = useState(null);
    const [isSortOpen, setIsSortOpen] = useState(false);

    // Local state for price inputs to avoid immediate URL updates
    const [localMinPrice, setLocalMinPrice] = useState(searchParams.get('minPrice') || '');
    const [localMaxPrice, setLocalMaxPrice] = useState(searchParams.get('maxPrice') || '');

    useEffect(() => {
        // Fetch brands for sidebar filter (rent only)
        fetch(`${API_URL}/api/brands?context=rent`)
            .then(res => res.json())
            .then((brandData) => {
                setBrands(brandData);
            })
            .catch(err => console.error('Error fetching brands:', err));

        // Fetch rent categories for sidebar filter (only active ones)
        fetch(`${API_URL}/api/rent-categories`)
            .then(res => res.json())
            .then((catData) => {
                setRentCategories(catData.filter(c => c.isActive !== false));
            })
            .catch(err => console.error('Error fetching rent categories:', err));

        // Close dropdown when clicking outside
        const handleClickOutside = () => setIsSortOpen(false);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // Debounce price updates
    useEffect(() => {
        const timer = setTimeout(() => {
            const newParams = new URLSearchParams(searchParams);

            if (localMinPrice) newParams.set('minPrice', localMinPrice);
            else newParams.delete('minPrice');

            if (localMaxPrice) newParams.set('maxPrice', localMaxPrice);
            else newParams.delete('maxPrice');

            if (newParams.toString() !== searchParams.toString()) {
                setSearchParams(newParams);
            }
        }, 800);

        return () => clearTimeout(timer);
    }, [localMinPrice, localMaxPrice]);

    // Update local state if URL changes (e.g. on "Clear All")
    useEffect(() => {
        setLocalMinPrice(searchParams.get('minPrice') || '');
        setLocalMaxPrice(searchParams.get('maxPrice') || '');
    }, [searchParams]);

    // Filter states from URL
    const search = searchParams.get('search') || '';
    const sort = searchParams.get('sort') || 'popular';
    const minPrice = searchParams.get('minPrice') || '';
    const maxPrice = searchParams.get('maxPrice') || '';
    const badge = searchParams.get('badge') || '';
    const toolType = searchParams.get('category') || '';

    useEffect(() => {
        setLoading(true);
        const params = Object.fromEntries(searchParams.entries());

        // Вказуємо, що це сторінка оренди
        params.isRent = 'true';

        const query = new URLSearchParams(params).toString();

        fetch(`${API_URL}/api/products?${query}`)
            .then(res => {
                if (!res.ok) throw new Error('Помилка завантаження інструментів');
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
    }, [searchParams]);

    // Get unique values for specs to show in filters
    const getUniqueSpecValues = (specKey) => {
        const values = new Set();
        products.forEach(p => {
            if (p.specs && p.specs[specKey]) {
                values.add(p.specs[specKey]);
            }
        });
        return Array.from(values);
    };

    const handleFilterChange = (key, value) => {
        const newParams = new URLSearchParams(searchParams);
        if (value) {
            newParams.set(key, value);
        } else {
            newParams.delete(key);
        }
        setSearchParams(newParams);
        setIsSortOpen(false);
    };

    const sortOptions = [
        { value: 'popular', label: 'За популярністю' },
        { value: 'name_asc', label: 'По назві А-Я' },
        { value: 'name_desc', label: 'По назві Я-А' },
        { value: 'price_asc', label: 'Ціна: від дешевого' },
        { value: 'price_desc', label: 'Ціна: від найдорожчого' }
    ];

    const currentSortLabel = sortOptions.find(opt => opt.value === sort)?.label || 'За популярністю';

    const sortedProducts = [...products].sort((a, b) => {
        const unavailableA = isRentUnavailableNow(a) ? 1 : 0;
        const unavailableB = isRentUnavailableNow(b) ? 1 : 0;
        if (unavailableA !== unavailableB) return unavailableA - unavailableB;
        switch (sort) {
            case 'name_asc':
                return a.name.localeCompare(b.name);
            case 'name_desc':
                return b.name.localeCompare(a.name);
            case 'price_asc':
                return a.price - b.price;
            case 'price_desc':
                return b.price - a.price;
            case 'popular':
            default:
                return (b.rating || 0) - (a.rating || 0);
        }
    });

    if (loading) return <div className="container" style={{ padding: '100px 0', textAlign: 'center' }}>Завантаження інструментів...</div>;
    if (error) return <div className="container" style={{ padding: '100px 0', textAlign: 'center', color: 'red' }}>{error}</div>;

    return (
        <div className="shop-page">
            <div className="container">
                <nav className="breadcrumbs">
                    <Link to="/">Головна</Link> / <span>{RENT_CATEGORY_NAME}</span>
                </nav>

                <div className="shop-header">
                    <h1 className="shop-title">{RENT_CATEGORY_NAME}</h1>
                    <div className="shop-controls">
                        <span className="product-count">Показано {products.length} позицій в оренду</span>
                        <div className="custom-sort-container" onClick={(e) => e.stopPropagation()}>
                            <span className="sort-label">Сортувати:</span>
                            <div className={`custom-select ${isSortOpen ? 'open' : ''}`} onClick={() => setIsSortOpen(!isSortOpen)}>
                                <div className="selected-option">
                                    {currentSortLabel}
                                    <ChevronDown size={16} className={`arrow-icon ${isSortOpen ? 'rotated' : ''}`} />
                                </div>
                                {isSortOpen && (
                                    <div className="options-dropdown">
                                        {sortOptions.map(option => (
                                            <div
                                                key={option.value}
                                                className={`option-item ${sort === option.value ? 'active' : ''}`}
                                                onClick={() => handleFilterChange('sort', option.value)}
                                            >
                                                {option.label}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {(search || badge || toolType) && (
                    <div className="active-filters">
                        {search && (
                            <span className="filter-tag">
                                Пошук: {search} <X size={14} onClick={() => handleFilterChange('search', '')} />
                            </span>
                        )}
                        {toolType && (
                            <span className="filter-tag">
                                Тип: {toolType} <X size={14} onClick={() => handleFilterChange('category', '')} />
                            </span>
                        )}
                        {badge && (
                            <span className="filter-tag">
                                {badge === 'SALE' ? 'Розпродаж' : badge} <X size={14} onClick={() => handleFilterChange('badge', '')} />
                            </span>
                        )}
                        <button className="clear-all" onClick={() => navigate('/orenda')}>Очистити все</button>
                    </div>
                )}

                <div className="shop-layout">
                    <aside className="shop-sidebar">
                        <div className="filter-header">
                            <Filter size={20} />
                            <span>Фільтри</span>
                        </div>

                        <div className="filter-group">
                            <h4 className="filter-title">Тип інструменту</h4>
                            <div className="filter-options">
                                {rentCategories.map((cat) => (
                                    <label key={cat.id} className="filter-label">
                                        <input
                                            type="checkbox"
                                            checked={toolType === cat.name}
                                            onChange={() => handleFilterChange('category', toolType === cat.name ? '' : cat.name)}
                                        />
                                        <span>{cat.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="filter-group">
                            <h4 className="filter-title">Бренд</h4>
                            <div className="filter-options">
                                {brands.map((brand) => (
                                    <label key={brand.id} className="filter-label">
                                        <input
                                            type="checkbox"
                                            checked={searchParams.get('brand') === brand.name}
                                            onChange={() => handleFilterChange('brand', searchParams.get('brand') === brand.name ? '' : brand.name)}
                                        />
                                        <span>{brand.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

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
                            <h4 className="filter-title">Ціна оренди, ₴</h4>
                            <div className="price-inputs">
                                <input
                                    type="number"
                                    placeholder="Від"
                                    value={localMinPrice}
                                    onChange={(e) => setLocalMinPrice(e.target.value)}
                                />
                                <input
                                    type="number"
                                    placeholder="До"
                                    value={localMaxPrice}
                                    onChange={(e) => setLocalMaxPrice(e.target.value)}
                                />
                            </div>
                        </div>
                    </aside>

                    <main className="shop-main">
                        <div className="product-grid">
                            {sortedProducts.map((product) => {
                                const unavailableNow = isRentUnavailableNow(product);
                                return (
                                <div key={product._id || product.id} className={`product-card ${unavailableNow ? 'product-card--unavailable' : ''}`}>
                                    <div className="product-image-container">
                                        {product.badge && (
                                            <span className={`badge badge-${product.badge.toLowerCase()}`}>
                                                {product.badge === 'SALE' ? 'Розпродаж' :
                                                    product.badge === 'NEW' ? 'Новинка' :
                                                        product.badge === 'HOT' ? 'Хіт' :
                                                            product.badge === 'TOP' ? 'Топ' : product.badge}
                                            </span>
                                        )}
                                        <Link to={`/orenda/${product.slug}`}>
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
                                        <button
                                            className="add-to-cart-btn"
                                            onClick={() => addToCartWithToast(product, 1, cartItems, addToCart, showToast)}
                                            disabled={unavailableNow}
                                            title={unavailableNow ? 'Тимчасово недоступно для оренди' : 'Додати в кошик'}
                                        >
                                            <Plus size={24} />
                                        </button>
                                    </div>
                                    <div className="product-info">
                                        <div className="product-meta">
                                            <div className="product-rating">
                                                <Star size={12} fill="var(--color-primary)" color="var(--color-primary)" />
                                                <span>{product.rating}.0 ({product.reviews})</span>
                                            </div>
                                        </div>
                                        <Link to={`/orenda/${product.slug}`}>
                                            <h3 className="product-name">{product.name}</h3>
                                        </Link>
                                        <div className="price-block">
                                            {product.oldPrice && (
                                                <span className="old-price" style={{ marginRight: '10px', fontSize: '0.9rem' }}>
                                                    {product.oldPrice} ₴
                                                </span>
                                            )}
                                            <span className={`product-price ${product.oldPrice ? 'sale-price' : ''}`} style={{ fontWeight: 700 }}>
                                                {product.price} ₴ / доба
                                            </span>
                                            {typeof product.quantityAvailable === 'number' && (
                                                <div style={{ marginTop: '4px', fontSize: '0.8rem', color: '#4b5563' }}>
                                                    В наявності: <strong>{product.quantityAvailable}</strong> {product.unit || 'шт'}
                                                </div>
                                            )}
                                        </div>
                                        <div
                                            className="stock-status"
                                            style={{
                                                marginTop: '5px',
                                                fontSize: '0.8rem',
                                                color: unavailableNow ? '#9ca3af' : '#16a34a',
                                                fontWeight: 600
                                            }}
                                        >
                                            {unavailableNow ? rentStatusLabel(product) : 'Доступний зараз'}
                                        </div>
                                    </div>
                                </div>
                            )})}
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
                                <div className="modal-price-block" style={{ marginBottom: '20px' }}>
                                    {quickViewProduct.oldPrice && (
                                        <span className="old-price" style={{ marginRight: '15px', fontSize: '1.2rem' }}>
                                            {quickViewProduct.oldPrice} ₴
                                        </span>
                                    )}
                                    <span className={`modal-price ${quickViewProduct.oldPrice ? 'sale-price' : ''}`} style={{ fontSize: '1.8rem', fontWeight: 800 }}>
                                        {quickViewProduct.price} ₴ / доба
                                    </span>
                                </div>
                                {quickViewProduct.specs && Object.keys(quickViewProduct.specs).length > 0 ? (
                                    <div className="modal-specs">
                                        {Object.entries(quickViewProduct.specs).slice(0, 7).map(([label, value], i) => (
                                            <div key={i} className="modal-spec-row">
                                                <span className="modal-spec-label">{label}</span>
                                                <span className="modal-spec-value">{value}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="modal-desc">{quickViewProduct.desc}</p>
                                )}
                                <div className="modal-actions">
                                    <button className="btn btn-primary add-btn" onClick={() => addToCartWithToast(quickViewProduct, 1, cartItems, addToCart, showToast)}>
                                        В кошик
                                    </button>
                                    <Link to={`/orenda/${quickViewProduct.slug}`} className="btn" onClick={() => setQuickViewProduct(null)}>
                                        Детальніше
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

