import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Home, Settings, LogOut, FileText } from 'lucide-react';
import './Admin.css';

export default function AdminLayout({ children }) {
    const location = useLocation();

    const menuItems = [
        { path: '/admin', icon: <LayoutDashboard size={20} />, label: 'Дашборд' },
        { path: '/admin/products', icon: <Package size={20} />, label: 'Товари' },
        { path: '/admin/orders', icon: <ShoppingCart size={20} />, label: 'Замовлення' },
        { path: '/admin/blog', icon: <FileText size={20} />, label: 'Блог' },
        { path: '/admin/settings', icon: <Settings size={20} />, label: 'Налаштування' },
    ];

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
                    <button className="nav-link logout-btn">
                        <LogOut size={20} />
                        <span>Вийти</span>
                    </button>
                </div>
            </aside>

            <main className="admin-main">
                <header className="admin-topbar">
                    <div className="topbar-search">
                        <input type="text" placeholder="Пошук по адмінці..." />
                    </div>
                    <div className="topbar-user">
                        <div className="user-avatar">M</div>
                        <span>Микола</span>
                    </div>
                </header>
                <div className="admin-content">
                    {children}
                </div>
            </main>
        </div>
    );
}
