import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Package, ShoppingBag, TrendingUp, Wrench, CheckCircle, Clock,
    AlertTriangle, ClipboardList, FileClock, ShieldAlert, WrenchIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { productsApi, ordersApi } from '../../services/api';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { AdminTable } from '../../components/admin';
import RentDashboard from './RentDashboard';
import './Admin.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS = {
    pending:    { label: 'Очікує',   variant: 'warning'   },
    processing: { label: 'В роботі', variant: 'default'   },
    completed:  { label: 'Виконано', variant: 'success'   },
    cancelled:  { label: 'Скасовано',variant: 'danger'    },
};

function formatDate(d) {
    if (!d) return '';
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}.${dt.getFullYear()}`;
}

function getRentStatusBadge(p) {
    const status = p.stockStatus;
    if (status === 'in_stock' || status === 'available') return <Badge variant="success">Доступний</Badge>;
    if (status === 'available_later') return <Badge variant="warning">З {formatDate(p.availableFrom)}</Badge>;
    if (status === 'in_procurement')  return <Badge className="bg-purple-100 text-purple-800">У закупівлі</Badge>;
    if (status === 'needs_repair')    return <Badge variant="warning">Потребує ремонту</Badge>;
    if (status === 'in_repair')       return <Badge variant="danger">На ремонті</Badge>;
    return <Badge variant="danger">Недоступний</Badge>;
}

// ─── Stat card component ──────────────────────────────────────────────────────

function StatCard({ icon, label, value, valueColor, accent, as: As = 'div', to }) {
    const content = (
        <Card className={`admin-dash-stat flex items-center gap-4 hover:shadow-md transition-shadow ${accent ? 'border-l-4 border-l-[#e63946]' : ''}`}>
            <div className={`p-2.5 rounded-lg bg-gray-100 ${valueColor ? '' : 'text-[#e63946]'}`} style={valueColor ? { color: valueColor } : {}}>
                {icon}
            </div>
            <div className="flex flex-col gap-0.5">
                <span className="text-xs text-gray-500 font-medium">{label}</span>
                <span className="text-xl font-bold" style={valueColor ? { color: valueColor } : {}}>
                    {value}
                </span>
            </div>
        </Card>
    );

    if (As === 'link') {
        return <Link to={to} className="no-underline text-inherit">{content}</Link>;
    }
    return content;
}

// ─── Table column definitions ─────────────────────────────────────────────────

const ORDER_COLUMNS = [
    { key: 'id',           label: 'ID',      width: '60px', render: (v) => `#${v}` },
    { key: 'customerName', label: 'Клієнт'   },
    { key: 'totalAmount',  label: 'Сума',     render: (v) => `${v} ₴` },
    {
        key: 'status', label: 'Статус',
        render: (v) => {
            const s = STATUS_LABELS[v] || { label: v, variant: 'secondary' };
            return <Badge variant={s.variant}>{s.label}</Badge>;
        },
    },
];

// ─── Main dashboard for owner / manager ──────────────────────────────────────

function AdminOwnerDashboard({ user }) {
    const [shopStats,    setShopStats]   = useState({ products: 0, orders: 0, revenue: 0 });
    const [recentOrders, setRecentOrders] = useState([]);
    const [rentStats,    setRentStats]   = useState({ total: 0, available: 0, availableLater: 0, inProcurement: 0, needsRepair: 0, inRepair: 0, lowStock: 0 });
    const [loading,      setLoading]    = useState(true);

    useEffect(() => {
        async function loadAll() {
            try {
                const [products, orders, rent] = await Promise.all([
                    productsApi.list(),
                    ordersApi.list(),
                    productsApi.list({ isRent: true, includeHiddenRent: true }),
                ]);

                const shopProducts = Array.isArray(products) ? products.filter((p) => !p.isRent) : [];
                const safeOrders   = Array.isArray(orders)   ? orders   : [];
                const safeRent     = Array.isArray(rent)      ? rent     : [];

                const revenue = safeOrders.reduce((s, o) => s + parseFloat(o.totalAmount || 0), 0);
                const isAvail = (p) => p.stockStatus === 'available' || p.stockStatus === 'in_stock';

                setShopStats({ products: shopProducts.length, orders: safeOrders.length, revenue: revenue.toFixed(2) });
                setRecentOrders(safeOrders.slice(0, 5));
                setRentStats({
                    total:          safeRent.length,
                    available:      safeRent.filter(isAvail).length,
                    availableLater: safeRent.filter((p) => p.stockStatus === 'available_later').length,
                    inProcurement:  safeRent.filter((p) => p.stockStatus === 'in_procurement').length,
                    needsRepair:    safeRent.filter((p) => p.stockStatus === 'needs_repair').length,
                    inRepair:       safeRent.filter((p) => p.stockStatus === 'in_repair').length,
                    lowStock:       safeRent.filter((p) => isAvail(p) && p.quantityAvailable != null && p.quantityAvailable <= 2).length,
                });
            } catch (err) {
                console.error('Dashboard load error:', err);
            } finally {
                setLoading(false);
            }
        }
        loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="admin-dashboard">
            {/* Header */}
            <div className="dashboard-header">
                <h1 className="admin-title">Дашборд</h1>
                <p className="admin-subtitle">
                    Вітаємо{user ? `, ${user.name}${user.lastName ? ' ' + user.lastName : ''}` : ''}! Ось загальна картина.
                </p>
            </div>

            {/* ── Shop stats ── */}
            <p className="admin-dash-section-title">Магазин</p>
            <div className="stats-grid admin-dash-stats-grid">
                <StatCard icon={<Package size={22} />}     label="Товарів у магазині" value={shopStats.products} />
                <StatCard icon={<ShoppingBag size={22} />} label="Замовлень"           value={shopStats.orders}   />
                <StatCard icon={<TrendingUp size={22} />}  label="Загальна виручка"    value={`${shopStats.revenue} ₴`} />
            </div>

            {/* ── Rent stats ── */}
            <p className="admin-dash-section-title admin-dash-section-title--spaced">Оренда інструменту</p>
            <div className="stats-grid admin-dash-stats-grid">
                <StatCard icon={<Wrench size={22} />}      label="Всього інструментів" value={rentStats.total} />
                <StatCard icon={<CheckCircle size={22} />} label="Доступні зараз"      value={rentStats.available}      valueColor="#16a34a" />
                <StatCard icon={<Clock size={22} />}       label="Буде доступно"        value={rentStats.availableLater} valueColor="#d97706" />
                <StatCard icon={<FileClock size={22} />}   label="У закупівлі"          value={rentStats.inProcurement}  valueColor="#7c3aed" />
                <StatCard icon={<ShieldAlert size={22} />} label="Потребує ремонту"     value={rentStats.needsRepair}    valueColor="#b45309" />
                <StatCard icon={<WrenchIcon size={22} />}  label="На ремонті"           value={rentStats.inRepair}       valueColor="#dc2626" />
                <StatCard as="link" to="/admin/rental-applications"
                    icon={<ClipboardList size={22} />}
                    label="Заявки оренди"
                    value="Переглянути →"
                    valueColor="#e63946"
                />
                {rentStats.lowStock > 0 && (
                    <StatCard icon={<AlertTriangle size={22} />}
                        label="Мало на складі (≤2 шт)"
                        value={rentStats.lowStock}
                        valueColor="#dc2626"
                        accent
                    />
                )}
            </div>

            {/* ── Recent orders ── */}
            <Card className="admin-dash-orders-card">
                <CardContent className="admin-dash-orders-body">
                    <div className="admin-dash-orders-head">
                        <h2 className="text-base font-bold uppercase tracking-wide">Останні замовлення</h2>
                        <Link to="/admin/orders" className="text-sm font-bold text-[#e63946] no-underline hover:underline">
                            Всі замовлення →
                        </Link>
                    </div>
                    <AdminTable columns={ORDER_COLUMNS} rows={recentOrders} loading={loading} empty="Замовлень поки немає" />
                </CardContent>
            </Card>
        </div>
    );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
    const { user } = useAuth();

    if (user?.role === 'rent' || user?.role === 'pivdenbud') {
        return <RentDashboard />;
    }

    return <AdminOwnerDashboard user={user} />;
}
