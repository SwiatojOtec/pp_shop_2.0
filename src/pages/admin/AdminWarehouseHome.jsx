import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Package, Warehouse } from 'lucide-react';
import { API_URL } from '../../apiConfig';
import { useAuth } from '../../context/AuthContext';
import './Admin.css';

const STATUS_RENT_LABEL = {
    active: 'Активна',
    booked: 'Заброньовано',
    overdue: 'Прострочено',
    returned: 'Повернено',
    draft: 'Чернетка'
};

export default function AdminWarehouseHome() {
    const { token } = useAuth();
    const [data, setData] = useState({ events: [], productLocations: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const headers = useMemo(() => ({
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    }), [token]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`${API_URL}/api/warehouse/dashboard?eventLimit=50`, { headers });
                if (!res.ok) throw new Error(await res.text());
                const json = await res.json();
                if (!cancelled) setData({
                    events: Array.isArray(json.events) ? json.events : [],
                    productLocations: Array.isArray(json.productLocations) ? json.productLocations : []
                });
            } catch (e) {
                if (!cancelled) setError(e.message || 'Помилка завантаження');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [headers]);

    const inRentHighlight = useMemo(() => (
        data.productLocations.filter((p) => (p.activeRentals || []).length > 0)
    ), [data.productLocations]);

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

    const fmt = (d) => {
        if (!d) return '';
        const x = new Date(d);
        return `${String(x.getDate()).padStart(2, '0')}.${String(x.getMonth() + 1).padStart(2, '0')}.${x.getFullYear()} ${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`;
    };

    if (loading) {
        return <p style={{ color: '#666' }}>Завантаження…</p>;
    }
    if (error) {
        return <p className="admin-alert error">{error}</p>;
    }

    return (
        <div className="admin-warehouse-home">
            <h1 className="admin-title" style={{ marginBottom: '8px' }}>Склад · головна</h1>
            <p style={{ color: '#555', fontSize: '0.95rem', marginBottom: '24px', maxWidth: '720px' }}>
                Огляд останніх дій та позицій у активних заявках оренди.
            </p>

            {inRentHighlight.length > 0 && (
                <section className="admin-section admin-warehouse-home__section" style={{ marginBottom: '24px' }}>
                    <h2 className="admin-warehouse-home__h2">
                        <ClipboardList size={20} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} />
                        У активній оренді / заявці
                    </h2>
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
                                                    <Link to={`/admin/rental-applications/${r.applicationId}`} style={{ color: 'var(--admin-accent)', fontWeight: 700 }}>
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
                </section>
            )}

            <section className="admin-section admin-warehouse-home__section">
                <h2 className="admin-warehouse-home__h2">
                    <Warehouse size={20} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} />
                    Розподіл по складах (всі орендні позиції)
                </h2>
                <div className="admin-warehouse-home__stock-grid">
                    {data.productLocations.slice(0, 80).map((p) => (
                        <div key={p.productId} className="admin-warehouse-home__stock-row">
                            <Package size={16} style={{ flexShrink: 0, opacity: 0.6 }} />
                            <span style={{ fontWeight: 600, flex: 1 }}>{p.name}</span>
                            <span style={{ fontSize: '0.85rem', color: '#666' }}>
                                {(p.warehouses || []).map((w) => (
                                    <span key={w.warehouseId} style={{ marginRight: '10px' }}>
                                        {w.warehouseName}: <strong>{w.quantity}</strong>
                                        {w.reserved > 0 && <span style={{ color: '#b45309' }}> (рез. {w.reserved})</span>}
                                    </span>
                                ))}
                                {!p.warehouses?.length && '—'}
                            </span>
                        </div>
                    ))}
                </div>
                {data.productLocations.length > 80 && (
                    <p style={{ fontSize: '0.85rem', color: '#888', marginTop: '12px' }}>
                        Показано 80 з {data.productLocations.length}. Детальна таблиця — у розділі «Залишки».
                    </p>
                )}
            </section>

            <section className="admin-section admin-warehouse-home__section" style={{ marginTop: '24px' }}>
                <h2 className="admin-warehouse-home__h2">Останні події</h2>
                {data.events.length === 0 ? (
                    <p style={{ color: '#888', fontSize: '0.95rem' }}>Подій ще немає (переміщення, ремонт тощо з’являться тут).</p>
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
