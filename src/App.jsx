import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Shop from './pages/Shop';
import Favorites from './pages/Favorites';
import ProductDetail from './pages/ProductDetail';
import Checkout from './pages/Checkout';
import Contacts from './pages/Contacts';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import InfoPage from './pages/InfoPage';
import Rent from './pages/Rent';
import Services from './pages/Services';
import RentPlaceholderPage from './pages/RentPlaceholderPage';
import NotFound from './pages/NotFound';
import AdminRoutes from './features/admin/routes';
import { CartProvider } from './context/CartContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Cart from './components/Cart';

function AppContent() {
  const [isCartOpen, setIsCartOpen] = React.useState(false);
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <div className="app">
      {!isAdmin && <Header onCartClick={() => setIsCartOpen(true)} />}
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/magazyn" element={<Shop />} />
          <Route path="/magazyn/:categorySlug" element={<Shop />} />
          <Route path="/magazyn/:categorySlug/:slug" element={<ProductDetail />} />
          <Route path="/orenda" element={<Rent />} />
          <Route path="/orenda/lisa-ryshtuvalni" element={<RentPlaceholderPage pageKey="lisa-ryshtuvalni" />} />
          <Route path="/orenda/opalubka" element={<RentPlaceholderPage pageKey="opalubka" />} />
          <Route path="/orenda/:slug" element={<ProductDetail />} />
          <Route path="/poslugy" element={<Services />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/policy" element={<InfoPage type="policy" />} />
          <Route path="/contract" element={<InfoPage type="contract" />} />
          <Route path="/delivery" element={<InfoPage type="delivery" />} />

          {/* Admin — see src/features/admin/routes.jsx */}
          <Route path="/admin/*" element={<AdminRoutes />} />

          {/* 404 — must be last */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!isAdmin && <Footer />}
      {!isAdmin && <Cart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />}
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <CartProvider>
        <FavoritesProvider>
          <AuthProvider>
            <Router>
              <AppContent />
            </Router>
          </AuthProvider>
        </FavoritesProvider>
      </CartProvider>
    </ToastProvider>
  );
}

export default App;
