import { useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, ShoppingCart, ContactRound, Warehouse, Wrench, FileText,
    Building2, Users, Home, LogOut, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
    ROLE_LABELS,
    hasShopAccess,
    hasRentAccess,
    canUseTimesheet,
    isTimesheetViewer,
} from '../../utils/adminRoles';
import '../../features/admin/ui/admin-shell.css';

// ─── Flat nav (docs/admin-redesign/00-plan.md, "Нова структура розділів") ──────

const NAV_ITEMS = [
    { path: '/admin',           icon: <LayoutDashboard size={16} />, label: 'Робочий стіл', show: () => true },
    { path: '/admin/deals',     icon: <ShoppingCart size={16} />,    label: 'Угоди',         show: (r) => hasShopAccess(r) || hasRentAccess(r) },
    { path: '/admin/clients',   icon: <ContactRound size={16} />,    label: 'Клієнти',       show: (r) => hasShopAccess(r) || hasRentAccess(r) },
    { path: '/admin/stock',     icon: <Warehouse size={16} />,       label: 'Склад',         show: (r) => hasRentAccess(r) },
    { path: '/admin/catalog',   icon: <Wrench size={16} />,          label: 'Каталог',       show: (r) => hasShopAccess(r) || hasRentAccess(r) },
    { path: '/admin/blog',      icon: <FileText size={16} />,        label: 'Блог',          show: (r) => hasShopAccess(r) },
    { path: '/admin/timesheet', icon: <Building2 size={16} />,       label: 'Табель',        show: (r, head) => canUseTimesheet(r, head) || isTimesheetViewer(r) },
    { path: '/admin/company',   icon: <Users size={16} />,           label: 'Компанія',      show: (r) => r === 'owner' },
];

const BREADCRUMB_TITLES = {
    '/admin': 'Робочий стіл',
    '/admin/deals': 'Угоди',
    '/admin/clients': 'Клієнти',
    '/admin/stock': 'Склад',
    '/admin/catalog': 'Каталог',
    '/admin/blog': 'Блог',
    '/admin/timesheet': 'Табель',
    '/admin/company': 'Компанія',
    '/admin/profile': 'Мій кабінет',
};

function pathAllowed(pathname, prefixes) {
    return prefixes.some((p) => {
        // '/admin' is the dashboard index route, always allowed — but as a
        // prefix it would startsWith-match every /admin/* route for every
        // role, silently defeating the guard below. Exact match only.
        if (p === '/admin') return pathname === '/admin' || pathname === '/admin/';
        return pathname === p || pathname.startsWith(`${p}/`);
    });
}

function allowedPrefixesForRole(role, isSubdivisionHead) {
    if (role === 'owner') return null;
    const prefixes = ['/admin', '/admin/profile', ...NAV_ITEMS.filter((item) => item.show(role, isSubdivisionHead)).map((item) => item.path)];
    // Not a nav destination (no "Угоди"-style list of its own) but reachable
    // from Угоди/Календар for whoever can already see rent deals — same
    // audience as RENTAL_APP_ROLES server-side (server/modules/orders-rental/
    // routes/rentalApplicationRoutes.js), which is rent access, not shop.
    if (hasRentAccess(role)) prefixes.push('/admin/rental-applications');
    return prefixes;
}

function getBreadcrumbTitle(pathname) {
    if (BREADCRUMB_TITLES[pathname]) return BREADCRUMB_TITLES[pathname];
    const entry = Object.entries(BREADCRUMB_TITLES)
        .filter(([path]) => path !== '/admin' && pathname.startsWith(`${path}/`))
        .sort((a, b) => b[0].length - a[0].length)[0];
    return entry ? entry[1] : '';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const role = user?.role || 'rent';
    const isSubdivisionHead = !!user?.isSubdivisionHead;
    const fullName = user ? `${user.name || ''}${user.lastName ? ' ' + user.lastName : ''}`.trim() : 'Адмін';
    const initials = user?.name ? user.name.charAt(0).toUpperCase() : 'A';
    const roleLabel = ROLE_LABELS[role] || role;

    // ── Route guard ───────────────────────────────────────────────────────────
    useEffect(() => {
        const allowed = allowedPrefixesForRole(role, isSubdivisionHead);
        if (!allowed) return;
        if (!pathAllowed(location.pathname, allowed)) {
            navigate('/admin', { replace: true });
        }
    }, [role, isSubdivisionHead, location.pathname, navigate]);

    const isActive = (itemPath) => {
        const p = location.pathname;
        if (itemPath === '/admin') return p === '/admin' || p === '/admin/';
        return p === itemPath || p.startsWith(`${itemPath}/`);
    };

    return (
        <div className="ds-shell">
            {/* ── Sidebar ── */}
            <aside className="ds-shell-side">
                <div className="ds-shell-side-top">
                    <Link to="/admin">
                        <img src="/admin-sidebar-logo.png" alt="PPbud Tech · PAN PARKET" className="ds-shell-logo" />
                    </Link>
                </div>

                <nav className="ds-shell-nav">
                    {NAV_ITEMS.filter((item) => item.show(role, isSubdivisionHead)).map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`ds-shell-nav-item${isActive(item.path) ? ' ds-shell-nav-item--active' : ''}`}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="ds-shell-side-bot">
                    <Link to="/" className="ds-shell-nav-item" title="Перейти на сайт">
                        <Home size={16} />
                        <span>На сайт</span>
                    </Link>
                    <button
                        type="button"
                        className="ds-shell-nav-item ds-shell-nav-item--logout"
                        onClick={() => { logout(); navigate('/admin/login'); }}
                    >
                        <LogOut size={16} />
                        <span>Вийти</span>
                    </button>
                </div>
            </aside>

            <main className="ds-shell-main">
                <header className="ds-shell-topbar">
                    <div className="ds-shell-breadcrumb">
                        <span className="ds-shell-breadcrumb-role">{roleLabel}</span>
                        <ChevronRight size={14} className="ds-shell-breadcrumb-sep" />
                        <span className="ds-shell-breadcrumb-page">
                            {getBreadcrumbTitle(location.pathname)}
                        </span>
                    </div>
                    <Link to="/admin/profile" className="ds-shell-user ds-shell-user-link" title="Мій кабінет">
                        <div className="ds-shell-avatar">{initials}</div>
                        <div className="ds-shell-user-info">
                            <span className="ds-shell-user-name">{fullName}</span>
                            <span className="ds-shell-user-role">{roleLabel}</span>
                        </div>
                    </Link>
                </header>
                <div className="ds-shell-content">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
