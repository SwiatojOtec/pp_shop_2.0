import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, User, Heart, ShoppingCart, MapPin, Phone } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';
import './Header.css';

export default function Header({ onCartClick }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { cartCount } = useCart();
  const { favoritesCount } = useFavorites();
  const [searchQuery, setSearchQuery] = React.useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="header-wrapper">
      {/* Top Bar */}
      <div className="top-bar">
        <div className="container top-bar-content">
          <div className="top-bar-left">
            <span className="top-bar-item">
              <MapPin size={14} className="top-bar-icon" />
              Петропавлівська Борщагівка, вул. Жовтнева, 79
            </span>
            <span className="top-bar-item">
              <Phone size={14} className="top-bar-icon" />
              <a href="tel:0670064044" style={{ color: 'inherit', textDecoration: 'none' }}>067 006 40 44</a>
            </span>
          </div>
          <div className="top-bar-right">
            <Link to="#">Блог</Link>
            <Link to="#">Акції</Link>
            <Link to="/contacts">Контакти</Link>
            <span className="lang-switch">UA | EN</span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="header">
        <div className="container header-grid">
          <Link to="/" className="logo">
            PAN PARKET
          </Link>

          <form className="search-bar" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Пошук товарів..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit"><Search size={20} /></button>
          </form>

          <div className="actions">
            <button className="icon-btn"><User size={24} /></button>
            <div className="icon-btn-wrapper">
              <Link to="/favorites" className="icon-btn">
                <Heart size={24} />
              </Link>
              {favoritesCount > 0 && <span className="cart-count">{favoritesCount}</span>}
            </div>
            <button className="icon-btn cart-btn" onClick={onCartClick}>
              <ShoppingCart size={24} />
              <span className="cart-count">{cartCount}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Navigation */}
      <nav className="main-nav">
        <div className="container">
          <ul className="nav-list">
            <li><Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>Головна</Link></li>
            <li><Link to="/shop" className={`nav-item ${location.pathname === '/shop' ? 'active' : ''}`}>Магазин</Link></li>
            <li className="hide-mobile"><Link to="/shop/parketna_doshka" className="nav-item">Паркет</Link></li>
            <li className="hide-mobile"><Link to="/shop/laminat" className="nav-item">Ламінат</Link></li>
            <li className="hide-mobile"><Link to="/shop/vinilova_pidloha" className="nav-item">Вініл</Link></li>
            <li className="hide-mobile"><Link to="/shop/pidvikonnya" className="nav-item">Підвіконня</Link></li>
            <li className="hide-mobile"><Link to="/shop/stinovi_paneli" className="nav-item">Стінові панелі</Link></li>
            <li className="hide-mobile"><Link to="/shop/plintusa" className="nav-item">Плінтуса</Link></li>
            <li><Link to="/shop?badge=SALE" className="nav-item sale">Розпродаж %</Link></li>
          </ul>
        </div>
      </nav>
    </div>
  );
}
