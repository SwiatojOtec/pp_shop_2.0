import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Eye, Trash2 } from 'lucide-react';
import { useFavorites } from '../context/FavoritesContext';
import { useCart } from '../context/CartContext';
import './Favorites.css';

export default function Favorites() {
    const { favorites, toggleFavorite } = useFavorites();
    const { addToCart } = useCart();

    const handleAddToCart = (product) => {
        addToCart(product);
    };

    const handleRemoveFromFavorites = (product) => {
        toggleFavorite(product);
    };

    const handleClearAll = () => {
        if (window.confirm('Ви впевнені, що хочете очистити всі обрані товари?')) {
            favorites.forEach(product => toggleFavorite(product));
        }
    };

    if (favorites.length === 0) {
        return (
            <div className="favorites-page">
                <div className="container">
                    <nav className="breadcrumbs">
                        <Link to="/">Головна</Link> / <span>Обране</span>
                    </nav>
                    <div className="empty-favorites">
                        <Heart size={120} className="empty-icon" />
                        <h2>Ваш список обраного порожній</h2>
                        <p>Додайте товари, які вам сподобалися, натиснувши на іконку серця</p>
                        <Link to="/shop" className="btn">Перейти до магазину</Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="favorites-page">
            <div className="container">
                <nav className="breadcrumbs">
                    <Link to="/">Головна</Link> / <span>Обране</span>
                </nav>

                <div className="favorites-header">
                    <h1 className="favorites-title">Обране ({favorites.length})</h1>
                    <button className="clear-favorites-btn" onClick={handleClearAll}>
                        <Trash2 size={16} style={{ marginRight: '8px', display: 'inline' }} />
                        Очистити все
                    </button>
                </div>

                <div className="favorites-grid">
                    {favorites.map(product => (
                        <div key={product._id || product.id} className="favorite-item">
                            <div className="favorite-image-container">
                                <Link to={`/shop/${product.slug}`}>
                                    <img
                                        src={product.image}
                                        alt={product.name}
                                        className="favorite-image"
                                    />
                                </Link>
                                <button
                                    className="remove-favorite-btn"
                                    onClick={() => handleRemoveFromFavorites(product)}
                                    title="Видалити з обраного"
                                >
                                    <Heart size={20} fill="currentColor" />
                                </button>
                            </div>
                            <div className="favorite-info">
                                <Link to={`/shop/${product.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                    <h3 className="favorite-name">{product.name}</h3>
                                </Link>
                                <div className="favorite-price">{product.price} ₴ / м²</div>
                                <div className="favorite-actions">
                                    <button
                                        className="add-to-cart-from-fav"
                                        onClick={() => handleAddToCart(product)}
                                    >
                                        <ShoppingCart size={18} />
                                        В кошик
                                    </button>
                                    <Link
                                        to={`/shop/${product.slug}`}
                                        className="view-product-btn"
                                        title="Переглянути товар"
                                    >
                                        <Eye size={18} />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
