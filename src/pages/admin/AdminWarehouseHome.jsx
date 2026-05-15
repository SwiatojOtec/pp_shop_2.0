import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClipboardList, Warehouse, ArrowRight } from 'lucide-react';
import { warehouseApi } from '../../services/api';
import { AdminPageHeader } from '../../components/admin';
import './Admin.css';

const STATUS_RENT_LABEL = {
    active: 'Активна',
    booked: 'Заброньовано',
    overdue: 'Прострочено',
    returned: 'Повернено',
    draft: 'Чернетка',
};

export default function AdminWarehouseHome() {
    const navigate = useNavigate();
    const [data, setData] = useState({ events: [], productLocations: [], warehouseSummary: [] });
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
