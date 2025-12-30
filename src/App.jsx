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
import InfoPage from './pages/InfoPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProducts from './pages/admin/AdminProducts';
import ProductEdit from './pages/admin/ProductEdit';
import AdminOrders from './pages/admin/AdminOrders';
import AdminCategories from './pages/admin/AdminCategories';
import AdminLayout from './pages/admin/AdminLayout';
import { CartProvider } from './context/CartContext';
import { FavoritesProvider } from './context/FavoritesContext';
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
          <Route path="/shop" element={<Shop />} />
          <Route path="/shop/:categorySlug" element={<Shop />} />
          <Route path="/shop/:categorySlug/:slug" element={<ProductDetail />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/policy" element={<InfoPage type="policy" />} />
          <Route path="/contract" element={<InfoPage type="contract" />} />
          <Route path="/delivery" element={<InfoPage type="delivery" />} />

          {/* Admin Routes */}
          <Route path="/admin/*" element={
            <AdminLayout>
              <Routes>
                <Route index element={<AdminDashboard />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="products/:id" element={<ProductEdit />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="settings" element={<AdminCategories />} />
              </Routes>
            </AdminLayout>
          } />
        </Routes>
      </main>
      {!isAdmin && <Footer />}
      {!isAdmin && <Cart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />}
    </div>
  );
}

function App() {
  return (
    <CartProvider>
      <FavoritesProvider>
        <Router>
          <AppContent />
        </Router>
      </FavoritesProvider>
    </CartProvider>
  );
}

export default App;
