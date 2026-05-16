import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClipboardList, Warehouse, ArrowRight, Wrench, CheckCircle, ShieldAlert, Truck } from 'lucide-react';
import { warehouseApi } from '../../services/api';
import { AdminPageHeader } from '../../components/admin';
import { Card } from '../../components/ui/card';
import './Admin.css';

const STATUS_RENT_LABEL = {
    active: 'Активна',
    booked: 'Заброньовано',
    overdue: 'Прострочено',
    returned: 'Повернено',
    draft: 'Чернетка',
};

function RentStatCard({ icon, label, value, valueColor }) {
    return (
        <Card className="admin-dash-stat flex items-center gap-4 hover:shadow-md transition-shadow">
            <div
                className={`p-2.5 rounded-lg bg-gray-100 ${valueColor ? '' : 'text-[#e63946]'}`}
                style={valueColor ? { color: valueColor } : {}}
            >
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
}

export default function AdminWarehouseHome() {
    const navigate = useNavigate();
    const [data, setData] = useState({
        events: [],
        productLocations: [],
        warehouseSummary: [],
        rentSummary: null,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const json = await warehouseApi.dashboard({ eventLimit: 12 });
                if (!cancelled) {
                    setData({
                        events: Array.isArray(json?.events) ? json.events : [],
                        productLocations: Array.isArray(json?.productLocations) ? json.productLocations : [],
                        warehouseSummary: Array.isArray(json?.warehouseSummary) ? json.warehouseSummary : [],
                        rentSummary: json?.rentSummary && typeof json.rentSummary === 'object' ? json.rentSummary : null,
                    });
                }
            } catch (e) {
                if (!cancelled) setError(e.message || 'Помилка завантаження');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const inRentHighlight = useMemo(
        () => data.productLocations.filter((p) => (p.activeRentals || []).length > 0),
        [data.productLocations]
    );

    const warehouseCards = useMemo(
        () => data.warehouseSummary.map((w) => ({
            id: w.warehouseId,
            name: w.warehouseName || '—',
            products: Number(w.products || 0),
            quantity: Number(w.quantity || 0),
            reserved: Number(w.reserved || 0),
        })),
        [data.warehouseSummary]
    );

    const rentSummaryDisplay = useMemo(() => {
        const rs = data.rentSummary;
        if (rs && typeof rs.totalProducts === 'number') {
            return {
                needsRepair: Number(rs.needsRepair || 0),
                total: Number(rs.totalProducts || 0),
                availableNow: Number(rs.availableNow || 0),
                unitsInRent: Number(rs.unitsInRent || 0),
            };
        }
        const pl = data.productLocations;
        if (!pl.length) {
            return { needsRepair: 0, total: 0, availableNow: 0, unitsInRent: 0 };
        }
        const isAvail = (p) => p.stockStatus === 'available' || p.stockStatus === 'in_stock';
        let units = 0;
        for (const p of pl) {
            for (const r of p.activeRentals || []) {
                units += 1;
            }
        }
        return {
            needsRepair: pl.filter((p) => p.stockStatus === 'needs_repair').length,
            total: pl.length,
            availableNow: pl.filter(isAvail).length,
            unitsInRent: units,
        };
    }, [data.rentSummary, data.productLocations]);

    const fmt = (d) => {
        if (!d) return '';
        const x = new Date(d);
        return `${String(x.getDate()).padStart(2, '0')}.${String(x.getMonth() + 1).padStart(2, '0')}.${x.getFullYear()} ${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`;
    };

    const formatEventLine = (ev) => {
        if (ev.message) return ev.message;
        if (ev.action === 'move_warehouse') {
            return `${ev.userDisplayName || 'Користувач'} · переміщення «${ev.productName || 'товар'}»`;
        }
        if (ev.action === 'send_repair') {
            return `${ev.userDisplayName || 'Користувач'} · ремонт «${ev.productName || 'товар'}»`;
        }
        return `${ev.userDisplayName || ''} · ${ev.action || 'подія'}`;
    };

    if (loading) return <p className="admin-page-muted">Завантаження…</p>;
    if (error) return <p className="admin-alert error">{error}</p>;

    return (
        <div className="admin-warehouse-home">
            <AdminPageHeader
                title="Склад"
                subtitle="Огляд складів, активних заявок і останніх подій"
                actions={
                    <Link
                        to="/admin/warehouses/positions"
                        className="btn btn-primary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
                    >
                        Позиції на складі <ArrowRight size={16} />
                    </Link>
                }
            />

            <p className="admin-dash-section-title" style={{ marginBottom: '12px' }}>Оренда інструменту</p>
            <div className="stats-grid admin-dash-stats-grid" style={{ marginBottom: '28px' }}>
                <RentStatCard
                    icon={<ShieldAlert size={22} />}
                    label="Потребує ремонту"
                    value={rentSummaryDisplay.needsRepair}
                    valueColor="#b45309"
                />
                <RentStatCard
                    icon={<Wrench size={22} />}
                    label="Всього інструменту"
                    value={rentSummaryDisplay.total}
                />
                <RentStatCard
                    icon={<CheckCircle size={22} />}
                    label="Доступно зараз"
                    value={rentSummaryDisplay.availableNow}
                    valueColor="#16a34a"
                />
                <RentStatCard
                    icon={<Truck size={22} />}
                    label="Знаходяться в оренді"
                    value={rentSummaryDisplay.unitsInRent}
                    valueColor="#2563eb"
                />
            </div>

            <section className="admin-section admin-warehouse-home__section" style={{ marginBottom: '24px' }}>
                <h2 className="admin-warehouse-home__h2">
                    <Warehouse size={20} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} />
                    Склади
                </h2>
                {warehouseCards.length === 0 ? (
                    <p className="admin-page-muted">Склади поки порожні.</p>
                ) : (
                    <div className="admin-warehouse-home__cards">
                        {warehouseCards.map((w) => (
                            <button
                                key={w.id}
                                type="button"
                                className="admin-warehouse-home__card admin-warehouse-home__card--clickable"
                                onClick={() => navigate(`/admin/warehouses/positions?warehouseId=${w.id}`)}
                                title={`Перейти до складу «${w.name}»`}
                            >
                                <div style={{ fontWeight: 800, marginBottom: '8px' }}>{w.name}</div>
                                <div style={{ fontSize: '0.9rem', color: '#555' }}>Позицій: {w.products}</div>
                                <div style={{ fontSize: '0.9rem', color: '#555' }}>Кількість: {w.quantity}</div>
                                <div style={{ fontSize: '0.9rem', color: '#555' }}>Резерв: {w.reserved}</div>
                            </button>
                        ))}
                    </div>
                )}
            </section>

            <section className="admin-section admin-warehouse-home__section" style={{ marginBottom: '24px' }}>
                <h2 className="admin-warehouse-home__h2">
                    <ClipboardList size={20} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} />
                    У активній оренді
                </h2>
                {inRentHighlight.length === 0 ? (
                    <p className="admin-page-muted">Наразі немає товарів у заявках.</p>
                ) : (
                    <div className="admin-warehouse-home__cards">
                        {inRentHighlight.map((p) => (
                            <div key={p.productId} className="admin-warehouse-home__card">
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                    {p.image && <img src={p.image} alt="" className="admin-warehouse-home__thumb" />}
                                    <div>
                                        <div style={{ fontWeight: 800 }}>{p.name}</div>
                                        <code style={{ fontSize: '0.8rem', color: '#666' }}>{p.sku}</code>
                                        <div style={{ marginTop: '8px', fontSize: '0.88rem' }}>
                                            {(p.activeRentals || []).map((r) => (
                                                <div key={r.applicationId} style={{ marginBottom: '6px' }}>
                                                    <Link
                                                        to={`/admin/rental-applications/${r.applicationId}`}
                                                        style={{ color: 'var(--admin-accent)', fontWeight: 700 }}
                                                    >
                                                        {r.applicationNumber}
                                                    </Link>
                                                    {' · '}
                                                    <span>{STATUS_RENT_LABEL[r.status] || r.status}</span>
                                                    {r.clientName && ` · ${r.clientName}`}
                                                    {(r.rentFrom || r.rentTo) && (
                                                        <span style={{ color: '#666' }}>
                                                            {' '}
                                                            ({r.rentFrom || '—'} — {r.rentTo || '—'})
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <section className="admin-section admin-warehouse-home__section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
                    <h2 className="admin-warehouse-home__h2" style={{ margin: 0 }}>Останні події</h2>
                    <Link to="/admin/warehouses/events" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
                        Всі події →
                    </Link>
                </div>
                {data.events.length === 0 ? (
                    <p className="admin-page-muted">Подій ще немає.</p>
                ) : (
                    <ul className="admin-warehouse-home__feed">
                        {data.events.map((ev) => (
                            <li key={ev.id} className="admin-warehouse-home__feed-item">
                                <span className="admin-warehouse-home__feed-time">{fmt(ev.createdAt)}</span>
                                <span className="admin-warehouse-home__feed-text">{formatEventLine(ev)}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}
