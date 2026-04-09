import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Home, LogOut, FileText, Wrench, Building2, Warehouse, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Admin.css';

export default function AdminLayout({ children }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const role = user?.role || 'rent';
    const fullName = user ? `${user.name || ''}${user.lastName ? ' ' + user.lastName : ''}`.trim() : 'Адмін';
    const initials = user && user.name ? user.name.charAt(0).toUpperCase() : 'A';

    const baseTopMenuItems = [
        { path: '/admin', icon: <LayoutDashboard size={20} />, label: 'Дашборд' },
        { path: '/admin/rent', icon: <Wrench size={20} />, label: 'Оренда' },
        { path: '/admin/warehouses', icon: <Warehouse size={20} />, label: 'Склад' },
        { path: '/admin/pan-pivdenbud', icon: <Building2 size={20} />, label: 'ПАН ПІВДЕНЬБУД' },
    ];
    const shopMenuItems = [
        { path: '/admin/products', icon: <Package size={20} />, label: 'Товари' },
        { path: '/admin/orders', icon: <ShoppingCart size={20} />, label: 'Замовлення' },
        { path: '/admin/blog', icon: <FileText size={20} />, label: 'Блог' },
    ];

    const rentBasePaths = ['/admin', '/admin/profile', '/admin/rent', '/admin/rental-applications', '/admin/clients', '/admin/warehouses'];
    const pivdenbudPaths = [...rentBasePaths, '/admin/pan-pivdenbud'];

    const menuItems =
        role === 'rent'
            ? baseTopMenuItems.filter(item => rentBasePaths.includes(item.path))
            : role === 'pivdenbud'
                ? baseTopMenuItems.filter(item => pivdenbudPaths.includes(item.path))
                : [...baseTopMenuItems, { path: '/admin/admin', icon: <ShieldCheck size={20} />, label: 'Адмін' }];

    useEffect(() => {
        if (role === 'rent' || role === 'pivdenbud') {
            const path = location.pathname;
            const rentAllowed =
                path === '/admin' ||
                path === '/admin/' ||
                path === '/admin/profile' ||
                path === '/admin/rent' ||
                path.startsWith('/admin/rent/') ||
                path === '/admin/rental-applications' ||
                path.startsWith('/admin/rental-applications/') ||
                path === '/admin/clients' ||
                path.startsWith('/admin/clients/') ||
                path === '/admin/warehouses' ||
                path.startsWith('/admin/warehouses/');
            const pivExtra =
                role === 'pivdenbud' &&
                (path === '/admin/pan-pivdenbud' || path.startsWith('/admin/pan-pivdenbud/'));
            if (!rentAllowed && !pivExtra) {
                navigate('/admin/rent', { replace: true });
            }
        }
    }, [role, location.pathname, navigate]);

    const navLinkClass = (itemPath) => {
        const path = location.pathname;
        if (itemPath === '/admin') {
            return path === '/admin' || path === '/admin/' ? 'nav-link active' : 'nav-link';
        }
        return path === itemPath || path.startsWith(`${itemPath}/`) ? 'nav-link active' : 'nav-link';
    };

    return (
        <div className="admin-layout">
            <aside className="admin-sidebar">
                <div className="sidebar-header">
                    <div className="sidebar-brand">
                        <Link to="/admin" className="sidebar-brand-link">
                            <img
                                src="/admin-sidebar-logo.png"
                                alt="PPbud Tech · PAN PARKET"
                                className="sidebar-brand-logo"
                            />
                        </Link>
                        <span className="admin-badge">Admin</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {menuItems.map(item => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={navLinkClass(item.path)}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </Link>
                    ))}
                    {role === 'owner' && (
                        <>
                            <div className="sidebar-nav-section">Магазин</div>
                            {shopMenuItems.map(item => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`${navLinkClass(item.path)} nav-link--sub`}
                                >
                                    {item.icon}
                                    <span>{item.label}</span>
                                </Link>
                            ))}
                        </>
                    )}
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
                    <Link to="/admin/profile" className="topbar-user topbar-user-link" title="Мій кабінет">
                        <div className="user-avatar">{initials}</div>
                        <div className="topbar-user-info">
                            <span className="topbar-user-name">{fullName}</span>
                            {role === 'rent' && (
                                <span className="topbar-user-role">Менеджер з оренди</span>
                            )}
                            {role === 'pivdenbud' && (
                                <span className="topbar-user-role">ПАН ПІВДЕНЬБУД · оренда</span>
                            )}
                        </div>
                    </Link>
                </header>
                <div className="admin-content">
                    {children}
                </div>
            </main>
        </div>
    );
}
