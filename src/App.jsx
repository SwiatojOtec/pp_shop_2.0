import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
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
import NotFound from './pages/NotFound';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProducts from './pages/admin/AdminProducts';
import ProductEdit from './pages/admin/ProductEdit';
import AdminBlog from './pages/admin/AdminBlog';
import AdminBlogEdit from './pages/admin/AdminBlogEdit';
import AdminOrders from './pages/admin/AdminOrders';
import AdminCategories from './pages/admin/AdminCategories';
import AdminRent from './pages/admin/AdminRent';
import AdminRentEdit from './pages/admin/AdminRentEdit';
import AdminRentalApplications from './pages/admin/AdminRentalApplications';
import AdminRentalApplicationForm from './pages/admin/AdminRentalApplicationForm';
import PanPivdenbud from './pages/admin/PanPivdenbud';
import AdminLayout from './pages/admin/AdminLayout';
import AdminLogin from './pages/admin/AdminLogin';
import AdminRegister from './pages/admin/AdminRegister';
import AdminUsers from './pages/admin/AdminUsers';
import AdminProfile from './pages/admin/AdminProfile';
import AdminClients from './pages/admin/AdminClients';
import AdminClientDetails from './pages/admin/AdminClientDetails';
import AdminWarehouseLayout from './pages/admin/AdminWarehouseLayout';
import AdminWarehouseHome from './pages/admin/AdminWarehouseHome';
import AdminWarehousePositions from './pages/admin/AdminWarehousePositions';
import AdminWarehouseEvents from './pages/admin/AdminWarehouseEvents';
import AdminAdminHome from './pages/admin/AdminAdminHome';
import AdminAdminLayout from './pages/admin/AdminAdminLayout';
import { CartProvider } from './context/CartContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Cart from './components/Cart';

function RequireAdmin({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="admin-content" style={{ padding: '80px', textAlign: 'center' }}>Перевірка доступу...</div>;
  }

  if (!user) {
    return <AdminLogin />;
  }

  return children;
}

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
          <Route path="/orenda/:slug" element={<ProductDetail />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/policy" element={<InfoPage type="policy" />} />
          <Route path="/contract" element={<InfoPage type="contract" />} />
          <Route path="/delivery" element={<InfoPage type="delivery" />} />

          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/register" element={<AdminRegister />} />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminLayout>
                  <AdminDashboard />
                </AdminLayout>
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/profile"
            element={
              <RequireAdmin>
                <AdminLayout>
                  <AdminProfile />
                </AdminLayout>
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/products"
            element={
              <RequireAdmin>
                <AdminLayout>
                  <AdminProducts />
                </AdminLayout>
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/products/:id"
            element={
              <RequireAdmin>
                <AdminLayout>
                  <ProductEdit />
                </AdminLayout>
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/rent"
            element={
              <RequireAdmin>
                <AdminLayout>
                  <AdminRent />
                </AdminLayout>
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/rent/:id"
            element={
              <RequireAdmin>
                <AdminLayout>
                  <AdminRentEdit />
                </AdminLayout>
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/rental-applications"
            element={
              <RequireAdmin>
                <AdminLayout>
                  <AdminRentalApplications />
                </AdminLayout>
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/rental-applications/new"
            element={
              <RequireAdmin>
                <AdminLayout>
                  <AdminRentalApplicationForm />
                </AdminLayout>
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/rental-applications/:id"
            element={
              <RequireAdmin>
                <AdminLayout>
                  <AdminRentalApplicationForm />
                </AdminLayout>
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/pan-pivdenbud"
            element={
              <RequireAdmin>
                <AdminLayout>
                  <PanPivdenbud />
                </AdminLayout>
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <RequireAdmin>
                <AdminLayout>
                  <AdminOrders />
                </AdminLayout>
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/blog"
            element={
              <RequireAdmin>
                <AdminLayout>
                  <AdminBlog />
                </AdminLayout>
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/blog/:id"
            element={
              <RequireAdmin>
                <AdminLayout>
                  <AdminBlogEdit />
                </AdminLayout>
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/settings"
            element={<Navigate to="/admin/admin/settings" replace />}
          />
          <Route
            path="/admin/clients"
            element={
              <RequireAdmin>
                <AdminLayout>
                  <AdminClients />
                </AdminLayout>
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/clients/:id"
            element={
              <RequireAdmin>
                <AdminLayout>
                  <AdminClientDetails />
                </AdminLayout>
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/warehouses"
            element={
              <RequireAdmin>
                <AdminLayout>
                  <AdminWarehouseLayout />
                </AdminLayout>
              </RequireAdmin>
            }
          >
            <Route index element={<AdminWarehouseHome />} />
            <Route path="positions" element={<AdminWarehousePositions />} />
            <Route path="events" element={<AdminWarehouseEvents />} />
          </Route>
          <Route
            path="/admin/admin"
            element={
              <RequireAdmin>
                <AdminLayout>
                  <AdminAdminLayout />
                </AdminLayout>
              </RequireAdmin>
            }
          >
            <Route index element={<AdminAdminHome />} />
            <Route path="settings" element={<AdminCategories />} />
            <Route path="users" element={<AdminUsers />} />
          </Route>
          <Route
            path="/admin/users"
            element={<Navigate to="/admin/admin/users" replace />}
          />

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
