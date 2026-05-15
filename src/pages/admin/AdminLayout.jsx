import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Package, ShoppingCart, Home, LogOut, FileText,
    Wrench, Building2, Warehouse, Settings, Users, ClipboardList,
    ContactRound, ChevronRight, Network,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Admin.css';

// ─── Nav config ──────────────────────────────────────────────────────────────

const RENT_SECTION = [
    { path: '/admin/rental-applications', icon: <ClipboardList size={18} />, label: 'Заявки оренди' },
    { path: '/admin/clients',             icon: <ContactRound size={18} />,  label: 'Клієнти' },
    { path: '/admin/rent',                icon: <Wrench size={18} />,        label: 'Каталог інструментів' },
    { path: '/admin/warehouses',          icon: <Warehouse size={18} />,     label: 'Склад' },
];

const SHOP_SECTION = [
    { path: '/admin/products', icon: <Package size={18} />,      label: 'Товари' },
    { path: '/admin/orders',   icon: <ShoppingCart size={18} />, label: 'Замовлення' },
    { path: '/admin/blog',     icon: <FileText size={18} />,     label: 'Блог' },
];

const ENTERPRISE_SECTION = [
    { path: '/admin/pan-pivdenbud',  icon: <Building2 size={18} />, label: 'ПАН ПІВДЕНЬБУД' },
    { path: '/admin/users',          icon: <Users size={18} />,     label: 'Користувачі' },
    { path: '/admin/subdivisions',   icon: <Network size={18} />,   label: 'Підрозділи' },
    { path: '/admin/settings',       icon: <Settings size={18} />,  label: 'Налаштування' },
];

// Allowed paths for rent / pivdenbud roles
const RENT_ALLOWED = [
    '/admin', '/admin/profile',
    '/admin/rental-applications', '/admin/clients',
    '/admin/rent', '/admin/warehouses',
];
const PIVDENBUD_EXTRA = ['/admin/pan-pivdenbud'];

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminLayout({ children }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const role     = user?.role || 'rent';
    const fullName = user ? `${user.name || ''}${user.lastName ? ' ' + user.lastName : ''}`.trim() : 'Адмін';
    const initials = user?.name ? user.name.charAt(0).toUpperCase() : 'A';

    // ── Route guard ───────────────────────────────────────────────────────────
    useEffect(() => {
        if (role !== 'rent' && role !== 'pivdenbud') return;
        const p = location.pathname;
        const allowed = RENT_ALLOWED.some(a => p === a || p.startsWith(a + '/'));
        const extra   = role === 'pivdenbud' && PIVDENBUD_EXTRA.some(a => p === a || p.startsWith(a + '/'));
        if (!allowed && !extra) navigate('/admin/rent', { replace: true });
    }, [role, location.pathname, navigate]);

    // ── Active class ──────────────────────────────────────────────────────────
    const isActive = (itemPath) => {
        const p = location.pathname;
        if (itemPath === '/admin') return p === '/admin' || p === '/admin/';
        return p === itemPath || p.startsWith(`${itemPath}/`);
    };
    const cls = (path) => `nav-link${isActive(path) ? ' active' : ''}`;

    // ── Sections by role ──────────────────────────────────────────────────────
    const showShop       = role !== 'rent' && role !== 'pivdenbud';
    const showEnterprise = role !== 'rent' && role !== 'pivdenbud';
    const showPivdenbud  = role === 'pivdenbud';

    const roleLabel = {
        owner:     'Власник',
        manager:   'Менеджер',
        rent:      'Менеджер оренди',
        pivdenbud: 'ПАН ПІВДЕНЬБУД',
    }[role] || role;

    return (
        <div className="admin-layout">
            {/* ── Sidebar ── */}
            <aside className="admin-sidebar">
                <div className="sidebar-header">
                    <div className="sidebar-brand">
                        <Link to="/admin" className="sidebar-brand-link">
                            <img src="/admin-sidebar-logo.png" alt="PPbud Tech · PAN PARKET" className="sidebar-brand-logo" />
                        </Link>
                        <span className="admin-badge">Admin</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {/* Dashboard — always visible */}
                    <Link to="/admin" className={cls('/admin')}>
                        <LayoutDashboard size={18} />
                        <span>Дашборд</span>
                    </Link>

                    {/* ── ОРЕНДА ── */}
                    <div className="sidebar-nav-section">Оренда</div>
                    {RENT_SECTION.map(item => (
                        <Link key={item.path} to={item.path} className={`${cls(item.path)} nav-link--sub`}>
                            {item.icon}
                            <span>{item.label}</span>
                        </Link>
                    ))}

                    {/* pivdenbud — only ПАН ПІВДЕНЬБУД extra */}
                    {showPivdenbud && (
                        <Link to="/admin/pan-pivdenbud" className={`${cls('/admin/pan-pivdenbud')} nav-link--sub`}>
                            <Building2 size={18} />
                            <span>ПАН ПІВДЕНЬБУД</span>
                        </Link>
                    )}

                    {/* ── МАГАЗИН ── */}
                    {showShop && (
                        <>
                            <div className="sidebar-nav-section">Магазин</div>
                            {SHOP_SECTION.map(item => (
                                <Link key={item.path} to={item.path} className={`${cls(item.path)} nav-link--sub`}>
                                    {item.icon}
                                    <span>{item.label}</span>
                                </Link>
                            ))}
                        </>
                    )}

                    {/* ── ПІДПРИЄМСТВО ── */}
                    {showEnterprise && (
                        <>
                            <div className="sidebar-nav-section">Підприємство</div>
                            {ENTERPRISE_SECTION.map(item => (
                                <Link key={item.path} to={item.path} className={`${cls(item.path)} nav-link--sub`}>
                                    {item.icon}
                                    <span>{item.label}</span>
                                </Link>
                            ))}
                        </>
                    )}
                </nav>

                <div className="sidebar-footer">
                    <Link to="/" className="nav-link" title="Перейти на сайт">
                        <Home size={18} />
                        <span>На сайт</span>
                    </Link>
                    <button
                        className="nav-link logout-btn"
                        onClick={() => { logout(); navigate('/admin/login'); }}
                    >
                        <LogOut size={18} />
                        <span>Вийти</span>
                    </button>
                </div>
            </aside>

            {/* ── Main ── */}
            <main className="admin-main">
                <header className="admin-topbar">
                    {/* Breadcrumb placeholder */}
                    <div className="topbar-breadcrumb">
                        <span className="topbar-breadcrumb-role">{roleLabel}</span>
                        <ChevronRight size={14} className="topbar-breadcrumb-sep" />
                        <span className="topbar-breadcrumb-page">
                            {getPageTitle(location.pathname)}
                        </span>
                    </div>
                    <Link to="/admin/profile" className="topbar-user topbar-user-link" title="Мій кабінет">
                        <div className="user-avatar">{initials}</div>
                        <div className="topbar-user-info">
                            <span className="topbar-user-name">{fullName}</span>
                            <span className="topbar-user-role">{roleLabel}</span>
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

// ─── Helper: page title from path ────────────────────────────────────────────

function getPageTitle(pathname) {
    const map = {
        '/admin':                        'Дашборд',
        '/admin/rental-applications':    'Заявки оренди',
        '/admin/clients':                'Клієнти',
        '/admin/rent':                   'Каталог інструментів',
        '/admin/warehouses':             'Склад',
        '/admin/warehouses/positions':   'Склад · Позиції',
        '/admin/warehouses/events':      'Склад · Журнал подій',
        '/admin/products':               'Товари',
        '/admin/orders':                 'Замовлення',
        '/admin/blog':                   'Блог',
        '/admin/pan-pivdenbud':          'ПАН ПІВДЕНЬБУД',
        '/admin/users':                  'Користувачі',
        '/admin/subdivisions':           'Підрозділи',
        '/admin/settings':               'Налаштування',
        '/admin/profile':                'Мій кабінет',
    };
    // Exact match first
    if (map[pathname]) return map[pathname];
    // Prefix match
    const entry = Object.entries(map).find(([k]) => k !== '/admin' && pathname.startsWith(k + '/'));
    return entry ? entry[1] : '';
}
