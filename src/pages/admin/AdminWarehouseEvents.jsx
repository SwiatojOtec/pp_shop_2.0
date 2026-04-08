import React, { useEffect, useMemo, useState } from 'react';
import { API_URL } from '../../apiConfig';
import { useAuth } from '../../context/AuthContext';
import './Admin.css';

const fmt = (d) => {
    if (!d) return '';
    const x = new Date(d);
    return `${String(x.getDate()).padStart(2, '0')}.${String(x.getMonth() + 1).padStart(2, '0')}.${x.getFullYear()} ${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`;
};

export default function AdminWarehouseEvents() {
    const { token } = useAuth();
    const headers = useMemo(() => ({ ...(token ? { Authorization: `Bearer ${token}` } : {}) }), [token]);

    const [users, setUsers] = useState([]);
    const [userId, setUserId] = useState('');
    const [productQuery, setProductQuery] = useState('');
    const [productResults, setProductResults] = useState([]);
    const [productId, setProductId] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');

    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [offset, setOffset] = useState(0);
    const limit = 50;
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        (async () => {
            const res = await fetch(`${API_URL}/api/warehouse/events/users`, { headers });
            const data = res.ok ? await res.json() : [];
            setUsers(Array.isArray(data) ? data : []);
        })();
    }, [headers]);

    const buildQuery = (nextOffset = 0) => {
        const q = new URLSearchParams();
        q.set('limit', String(limit));
        q.set('offset', String(nextOffset));
        if (userId) q.set('userId', userId);
        if (productId) q.set('productId', productId);
        if (from) q.set('from', from);
        if (to) q.set('to', to);
        return q.toString();
    };

    const load = async ({ reset = false } = {}) => {
        const nextOffset = reset ? 0 : offset;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/api/warehouse/events?${buildQuery(nextOffset)}`, { headers });
            if (!res.ok) throw new Error(await res.text());
            const json = await res.json();
            const rows = Array.isArray(json.events) ? json.events : [];
            setEvents((prev) => (reset ? rows : [...prev, ...rows]));
            setOffset(nextOffset + rows.length);
            setHasMore(rows.length >= limit);
        } catch (e) {
            setError(e.message || 'Помилка');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load({ reset: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, productId, from, to]);

    useEffect(() => {
        let cancelled = false;
        const q = productQuery.trim();
        if (!q || q.length < 2) {
            setProductResults([]);
            return;
        }
        const t = setTimeout(async () => {
            try {
                const res = await fetch(`${API_URL}/api/products?search=${encodeURIComponent(q)}&isRent=true&includeHiddenRent=true&limit=8`, { headers });
                const data = res.ok ? await res.json() : [];
                if (!cancelled) setProductResults(Array.isArray(data) ? data : []);
            } catch {
                if (!cancelled) setProductResults([]);
            }
        }, 250);
        return () => { cancelled = true; clearTimeout(t); };
    }, [productQuery, headers]);

    return (
        <div className="admin-warehouse-events">
            <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '18px', flexWrap: 'wrap' }}>
                <div>
                    <h1 className="admin-title" style={{ margin: 0 }}>Події складу</h1>
                    <p style={{ margin: '10px 0 0', color: '#555', fontSize: '0.92rem' }}>
                        Всі зафіксовані зміни: переміщення, ремонт, правки кількості/резерву тощо.
                    </p>
                </div>
            </div>

            <div className="admin-section" style={{ background: '#fff', border: '1px solid var(--admin-border)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                <div className="admin-form">
                    <div className="form-row" style={{ gridTemplateColumns: '1.1fr 1.6fr 1fr 1fr' }}>
                        <div className="form-group">
                            <label>Користувач</label>
                            <select value={userId} onChange={(e) => setUserId(e.target.value)}>
                                <option value="">Всі</option>
                                {users.map((u) => (
                                    <option key={u.userId} value={u.userId}>{u.userDisplayName}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group" style={{ position: 'relative' }}>
                            <label>Товар</label>
                            <input
                                type="text"
                                value={productQuery}
                                onChange={(e) => {
                                    setProductQuery(e.target.value);
                                    setProductId('');
                                }}
                                placeholder="Почніть вводити назву або SKU..."
                            />
                            {productResults.length > 0 && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--admin-border)', borderRadius: '10px', zIndex: 50, marginTop: '6px', overflow: 'hidden', boxShadow: '0 10px 24px rgba(0,0,0,0.08)' }}>
                                    {productResults.map((p) => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => {
                                                setProductId(String(p.id));
                                                setProductQuery(`${p.name}${p.sku ? ` (${p.sku})` : ''}`);
                                                setProductResults([]);
                                            }}
                                            style={{ width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none', background: 'transparent', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                                        >
                                            <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{p.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{p.sku || ''}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="form-group">
                            <label>Дата від</label>
                            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>Дата до</label>
                            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                            setUserId('');
                            setProductId('');
                            setProductQuery('');
                            setProductResults([]);
                            setFrom('');
                            setTo('');
                        }}
                    >
                        Скинути фільтри
                    </button>
                </div>
            </div>

            {error && <p className="admin-alert error">{error}</p>}

            <div className="admin-section" style={{ background: '#fff', border: '1px solid var(--admin-border)', borderRadius: '12px', padding: '12px 16px' }}>
                {events.length === 0 && !loading ? (
                    <p style={{ color: '#888', margin: 0, padding: '12px 0' }}>Подій не знайдено.</p>
                ) : (
                    <ul className="admin-warehouse-home__feed" style={{ marginTop: 0 }}>
                        {events.map((ev) => (
                            <li key={ev.id} className="admin-warehouse-home__feed-item">
                                <span className="admin-warehouse-home__feed-time">{fmt(ev.createdAt)}</span>
                                <span className="admin-warehouse-home__feed-text">{ev.message || `${ev.userDisplayName || ''} · ${ev.action || 'подія'}`}</span>
                            </li>
                        ))}
                    </ul>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                    <button type="button" className="btn btn-secondary" disabled={loading || !hasMore} onClick={() => load({ reset: false })}>
                        {loading ? 'Завантаження…' : hasMore ? 'Показати ще' : 'Більше немає'}
                    </button>
                </div>
            </div>
        </div>
    );
}

