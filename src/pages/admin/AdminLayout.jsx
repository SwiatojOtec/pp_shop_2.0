import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Package, ShoppingCart, Home, LogOut, FileText,
    Wrench, Building2, Warehouse, Settings, Users, ClipboardList,
    ContactRound, ChevronRight, Network,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
    ROLE_LABELS,
    hasShopAccess,
    hasRentAccess,
    canUseTimesheet,
} from '../../utils/adminRoles';
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
    { path: '/admin/blog',     icon: <FileText size={18} />,     label: 'Блог' },
];

const ENTERPRISE_SECTION = [
    { path: '/admin/pan-pivdenbud',  icon: <Building2 size={18} />, label: 'ПАН ПІВДЕНЬБУД' },
    { path: '/admin/users',          icon: <Users size={18} />,     label: 'Користувачі' },
    { path: '/admin/subdivisions',   icon: <Network size={18} />,   label: 'Підрозділи' },
    { path: '/admin/settings',       icon: <Settings size={18} />,  label: 'Налаштування' },
];

const BASE_PATHS = ['/admin', '/admin/profile'];
const ORDERS_PATH = '/admin/orders';
const RENT_PATHS = [
    ...BASE_PATHS,
    '/admin/rental-applications', '/admin/clients',
    '/admin/rent', '/admin/warehouses',
];
const SHOP_PATHS = [
    ...BASE_PATHS,
    '/admin/products', '/admin/blog',
];
const PIVDENBUD_PATHS = ['/admin/pan-pivdenbud'];

function pathAllowed(pathname, prefixes) {
    return prefixes.some((a) => pathname === a || pathname.startsWith(`${a}/`));
}

function allowedPrefixesForUser(role, isSubdivisionHead) {
    if (role === 'owner') return null;
    const prefixes = [...BASE_PATHS];
    if (hasRentAccess(role) || hasShopAccess(role)) prefixes.push(ORDERS_PATH);
    if (hasRentAccess(role)) prefixes.push(...RENT_PATHS.filter((p) => !BASE_PATHS.includes(p)));
    if (hasShopAccess(role)) prefixes.push(...SHOP_PATHS.filter((p) => !BASE_PATHS.includes(p)));
    if (canUseTimesheet(role, isSubdivisionHead)) prefixes.push(...PIVDENBUD_PATHS);
    return [...new Set(prefixes)];
}

function defaultPathForRole(role) {
    if (hasRentAccess(role) && !hasShopAccess(role)) return '/admin/rent';
    if (hasShopAccess(role) && !hasRentAccess(role)) return '/admin/products';
    return '/admin';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminLayout({ children }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const role = user?.role || 'rent';
    const isSubdivisionHead = !!user?.isSubdivisionHead;
    const fullName = user ? `${user.name || ''}${user.lastName ? ' ' + user.lastName : ''}`.trim() : 'Адмін';
    const initials = user?.name ? user.name.charAt(0).toUpperCase() : 'A';

    // ── Route guard ───────────────────────────────────────────────────────────
    useEffect(() => {
        if (role === 'owner') return;
        const allowed = allowedPrefixesForUser(role, isSubdivisionHead);
        if (!allowed) return;
        const p = location.pathname;
        if (!pathAllowed(p, allowed)) {
            navigate(defaultPathForRole(role), { replace: true });
        }
    }, [role, isSubdivisionHead, location.pathname, navigate]);

    // ── Active class ──────────────────────────────────────────────────────────
    const isActive = (itemPath) => {
        const p = location.pathname;
        if (itemPath === '/admin') return p === '/admin' || p === '/admin/';
        return p === itemPath || p.startsWith(`${itemPath}/`);
    };
    const cls = (path) => `nav-link${isActive(path) ? ' active' : ''}`;

    const showShop = hasShopAccess(role);
    const showRent = hasRentAccess(role);
    const showOrders = showShop || showRent;
    const showEnterprise = role === 'owner';
    const showPivdenbud = canUseTimesheet(role, isSubdivisionHead);

    const roleLabel = ROLE_LABELS[role] || role;

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
                    <Link to="/admin" className={cls('/admin')}>
                        <LayoutDashboard size={18} />
                        <span>Дашборд</span>
                    </Link>

                    {showOrders && (
                        <Link to={ORDERS_PATH} className={cls(ORDERS_PATH)}>
                            <ShoppingCart size={18} />
                            <span>Замовлення</span>
                        </Link>
                    )}

                    {showRent && (
                        <>
                            <div className="sidebar-nav-section">Оренда</div>
                            {RENT_SECTION.map(item => (
                                <Link key={item.path} to={item.path} className={`${cls(item.path)} nav-link--sub`}>
                                    {item.icon}
                                    <span>{item.label}</span>
                                </Link>
                            ))}
                        </>
                    )}

                    {showPivdenbud && (
                        <Link to="/admin/pan-pivdenbud" className={`${cls('/admin/pan-pivdenbud')} nav-link--sub`}>
                            <Building2 size={18} />
                            <span>ПАН ПІВДЕНЬБУД</span>
                        </Link>
                    )}

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

            <main className="admin-main">
                <header className="admin-topbar">
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
    if (map[pathname]) return map[pathname];
    if (pathname.startsWith('/admin/orders/')) return 'Замовлення';
    const entry = Object.entries(map).find(([k]) => k !== '/admin' && pathname.startsWith(k + '/'));
    return entry ? entry[1] : '';
}
