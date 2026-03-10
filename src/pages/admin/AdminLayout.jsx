import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Home, Settings, LogOut, FileText, Wrench, Users, UserCircle2, ClipboardList } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Admin.css';

export default function AdminLayout({ children }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const role = user?.role || 'rent';
    const fullName = user ? `${user.name || ''}${user.lastName ? ' ' + user.lastName : ''}`.trim() : 'Адмін';
    const initials = user && user.name ? user.name.charAt(0).toUpperCase() : 'A';

    const allMenuItems = [
        { path: '/admin', icon: <LayoutDashboard size={20} />, label: 'Дашборд' },
        { path: '/admin/profile', icon: <UserCircle2 size={20} />, label: 'Мій кабінет' },
        { path: '/admin/products', icon: <Package size={20} />, label: 'Товари' },
        { path: '/admin/rent', icon: <Wrench size={20} />, label: 'Оренда' },
        { path: '/admin/rental-applications', icon: <ClipboardList size={20} />, label: 'Заявки (оренда)' },
        { path: '/admin/orders', icon: <ShoppingCart size={20} />, label: 'Замовлення' },
        { path: '/admin/blog', icon: <FileText size={20} />, label: 'Блог' },
        { path: '/admin/settings', icon: <Settings size={20} />, label: 'Налаштування' },
        ...(role === 'owner' ? [{ path: '/admin/users', icon: <Users size={20} />, label: 'Користувачі' }] : [])
    ];

    const allowedPathsForRent = ['/admin', '/admin/profile', '/admin/rent', '/admin/rental-applications'];

    const menuItems = role === 'rent'
        ? allMenuItems.filter(item => allowedPathsForRent.includes(item.path))
        : allMenuItems;

    useEffect(() => {
        if (role === 'rent') {
            const path = location.pathname;
            const isAllowed =
                path === '/admin' ||
                path === '/admin/' ||
                path === '/admin/profile' ||
                path === '/admin/rent' ||
                path.startsWith('/admin/rent/') ||
                path === '/admin/rental-applications' ||
                path.startsWith('/admin/rental-applications/');

            if (!isAllowed) {
                navigate('/admin/rent', { replace: true });
            }
        }
    }, [role, location.pathname, navigate]);

    return (
        <div className="admin-layout">
            <aside className="admin-sidebar">
                <div className="sidebar-header">
                    <Link to="/" className="sidebar-logo">PAN PARKET</Link>
                    <span className="admin-badge">Admin</span>
                </div>

                <nav className="sidebar-nav">
                    {menuItems.map(item => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <Link to="/" className="nav-link">
                        <Home size={20} />
                        <span>На сайт</span>
                    </Link>
                    <button
                        className="nav-link logout-btn"
                        onClick={() => {
                            logout();
                            navigate('/admin/login');
                        }}
                    >
                        <LogOut size={20} />
                        <span>Вийти</span>
                    </button>
                </div>
            </aside>

            <main className="admin-main">
                <header className="admin-topbar">
                    <div className="topbar-search" />
                    <div className="topbar-user">
                        <div className="user-avatar">{initials}</div>
                        <div className="topbar-user-info">
                            <span className="topbar-user-name">{fullName}</span>
                            {role === 'rent' && (
                                <span className="topbar-user-role">Менеджер з оренди</span>
                            )}
                        </div>
                    </div>
                </header>
                <div className="admin-content">
                    {children}
                </div>
            </main>
        </div>
    );
}
