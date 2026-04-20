import React, { useEffect, useMemo, useState } from 'react';
import { API_URL } from '../../apiConfig';
import { useAuth } from '../../context/AuthContext';
import './Admin.css';

const fmt = (d) => {
    if (!d) return '—';
    const x = new Date(d);
    return `${String(x.getDate()).padStart(2, '0')}.${String(x.getMonth() + 1).padStart(2, '0')}.${x.getFullYear()} ${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`;
};

export default function AdminAdminHome() {
    const { token } = useAuth();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busyId, setBusyId] = useState(null);

    const headers = useMemo(() => ({
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    }), [token]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError('');
            try {
                const res = await fetch(`${API_URL}/api/warehouse/delete-requests`, { headers });
                if (!res.ok) throw new Error('Не вдалося завантажити запити');
                const data = await res.json();
                if (!cancelled) setRows(Array.isArray(data) ? data : []);
            } catch (e) {
                if (!cancelled) setError(e.message || 'Помилка');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [headers]);

    const reload = async () => {
        const res = await fetch(`${API_URL}/api/warehouse/delete-requests`, { headers });
        const data = res.ok ? await res.json() : [];
        setRows(Array.isArray(data) ? data : []);
    };

    const handleAction = async (id, action) => {
        if (!id) return;
        setBusyId(id);
        try {
            const res = await fetch(`${API_URL}/api/warehouse/delete-requests/${id}/${action}`, {
                method: 'POST',
                headers
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || 'Не вдалося виконати дію');
            await reload();
        } catch (e) {
            window.alert(e.message || 'Помилка');
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="admin-products">
            <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1 className="admin-title" style={{ margin: 0 }}>Адмін · головна</h1>
            </div>

            <div className="admin-section">
                <h2 style={{ fontSize: '1rem', marginBottom: '12px', fontWeight: 800 }}>Запити на видалення складів</h2>
                {loading ? (
                    <p style={{ color: '#777' }}>Завантаження…</p>
                ) : error ? (
                    <p style={{ color: '#b91c1c' }}>{error}</p>
                ) : rows.length === 0 ? (
                    <p style={{ color: '#777' }}>Поки немає запитів.</p>
                ) : (
                    <div className="admin-table-container">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Час</th>
                                    <th>Хто</th>
                                    <th>Склад</th>
                                    <th>Повідомлення</th>
                                    <th style={{ textAlign: 'right' }}>Дії</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r) => (
                                    <tr key={r.id}>
                                        <td>{fmt(r.createdAt)}</td>
                                        <td>{r.userDisplayName || '—'}</td>
                                        <td>{r.fromWarehouseName || '—'}</td>
                                        <td>{r.message || '—'}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button
                                                    type="button"
                                                    className="btn btn-primary"
                                                    style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                                                    disabled={busyId === r.id}
                                                    onClick={() => handleAction(r.id, 'approve')}
                                                >
                                                    Підтвердити
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-secondary"
                                                    style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                                                    disabled={busyId === r.id}
                                                    onClick={() => handleAction(r.id, 'reject')}
                                                >
                                                    Відхилити
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

