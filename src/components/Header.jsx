import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Heart, ShoppingCart, MapPin, Phone, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';
import { API_URL } from '../apiConfig';
import { getCategorySlug } from '../utils/categoryMapping';
import './Header.css';

export default function Header({ onCartClick }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { cartCount } = useCart();
  const { favoritesCount } = useFavorites();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close on route change
  useEffect(() => { setShowSuggestions(false); }, [location.pathname]);

  // Debounced live search
  const fetchSuggestions = useCallback((query) => {
    clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`${API_URL}/api/products?search=${encodeURIComponent(query)}&limit=7`);
        const data = res.ok ? await res.json() : [];
        const items = Array.isArray(data) ? data : (data.products || []);
        setSuggestions(items.slice(0, 7));
        setShowSuggestions(true);
      } catch { setSuggestions([]); }
      finally { setSearching(false); }
    }, 280);
  }, []);

  const handleQueryChange = (e) => {
    setSearchQuery(e.target.value);
    fetchSuggestions(e.target.value);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setShowSuggestions(false);
    if (searchQuery.trim()) {
      navigate(`/magazyn?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const getProductUrl = (p) => {
    if (p.isRent) return `/orenda/${p.slug}`;
    return `/magazyn/${getCategorySlug(p.category)}/${p.slug}`;
  };

  return (
    <div className="header-wrapper">
      {/* Top Bar */}
      <div className="top-bar">
        <div className="container top-bar-content">
          <div className="top-bar-left">
            <span className="top-bar-item">
              <MapPin size={14} className="top-bar-icon" />
              Петропавлівська Борщагівка, вул. Козацька, 79
            </span>
            <span className="top-bar-item">
              <Phone size={14} className="top-bar-icon" />
              <a href="tel:0670064044" style={{ color: 'inherit', textDecoration: 'none' }}>067 006 40 44</a>
            </span>
          </div>
          <div className="top-bar-right">
            <Link to="/blog">Блог</Link>
            <Link to="/magazyn?badge=SALE">Акції</Link>
            <Link to="/contacts">Контакти</Link>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="header">
        <div className="container header-grid">
          <Link to="/" className="logo">
            PAN PARKET
          </Link>

          <form className="search-bar" onSubmit={handleSearch} ref={searchRef}>
            <input
              type="text"
              placeholder="Пошук товарів..."
              value={searchQuery}
              onChange={handleQueryChange}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onKeyDown={(e) => e.key === 'Escape' && setShowSuggestions(false)}
              autoComplete="off"
            />
            {searchQuery && (
              <button type="button" className="search-clear" onClick={handleClear} aria-label="Очистити">
                <X size={16} />
              </button>
            )}
            <button type="submit"><Search size={20} /></button>

            {/* Live suggestions dropdown */}
            {showSuggestions && (
              <div className="search-dropdown">
                {searching && <div className="search-dropdown__loading">Шукаємо...</div>}
                {!searching && suggestions.length === 0 && (
                  <div className="search-dropdown__empty">Нічого не знайдено</div>
                )}
                {!searching && suggestions.map(p => (
                  <Link
                    key={p.id}
                    to={getProductUrl(p)}
                    className="search-dropdown__item"
                    onClick={() => { setShowSuggestions(false); setSearchQuery(''); }}
                  >
                    <div className="search-dropdown__img">
                      {p.image
                        ? <img src={p.image} alt={p.name} />
                        : <div className="search-dropdown__img-placeholder" />
                      }
                    </div>
                    <div className="search-dropdown__info">
                      <span className="search-dropdown__name">{p.name}</span>
                      <span className="search-dropdown__meta">
                        {p.isRent ? 'Оренда' : (p.category || '')}
                        {p.price && <> · <strong>{parseFloat(p.price).toLocaleString()} ₴{p.isRent ? '/доба' : ''}</strong></>}
                      </span>
                    </div>
                  </Link>
                ))}
                {!searching && suggestions.length > 0 && (
                  <button
                    type="submit"
                    className="search-dropdown__all"
                    onClick={() => { setShowSuggestions(false); navigate(`/magazyn?search=${encodeURIComponent(searchQuery)}`); }}
                  >
                    Всі результати для «{searchQuery}» →
                  </button>
                )}
              </div>
            )}
          </form>

          <div className="actions">
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
            <li>
              <Link
                to="/"
                className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}
              >
                Головна
              </Link>
            </li>
            <li>
              <Link
                to="/magazyn"
                className={`nav-item ${location.pathname.startsWith('/magazyn') ? 'active' : ''}`}
              >
                Магазин
              </Link>
            </li>
            <li>
              <Link
                to="/orenda"
                className={`nav-item ${location.pathname.startsWith('/orenda') ? 'active' : ''}`}
              >
                Оренда
              </Link>
            </li>
            <li className="hide-mobile"><Link to="/magazyn/parketna_doshka" className="nav-item">Паркет</Link></li>
            <li className="hide-mobile"><Link to="/magazyn/laminat" className="nav-item">Ламінат</Link></li>
            <li className="hide-mobile"><Link to="/magazyn/vinilova_pidloha" className="nav-item">Вініл</Link></li>
            <li className="hide-mobile"><Link to="/magazyn/pidvikonnya" className="nav-item">Підвіконня</Link></li>
            <li className="hide-mobile"><Link to="/magazyn/stinovi_paneli" className="nav-item">Стінові панелі</Link></li>
            <li className="hide-mobile"><Link to="/magazyn/plintusa" className="nav-item">Плінтуса</Link></li>
            <li><Link to="/magazyn?badge=SALE" className="nav-item sale">Розпродаж %</Link></li>
          </ul>
        </div>
      </nav>
    </div>
  );
}
