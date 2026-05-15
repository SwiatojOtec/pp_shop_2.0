import React, { useEffect, useState } from 'react';
import { warehouseApi } from '../../services/api';
import { AdminPageHeader } from '../../components/admin';
import './Admin.css';

const fmt = (d) => {
    if (!d) return '—';
    const x = new Date(d);
    return `${String(x.getDate()).padStart(2, '0')}.${String(x.getMonth() + 1).padStart(2, '0')}.${x.getFullYear()} ${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`;
};

export default function AdminAdminHome() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busyId, setBusyId] = useState(null);

    const reload = async () => {
        const data = await warehouseApi.deleteRequests();
        setRows(Array.isArray(data) ? data : []);
    };

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError('');
            try {
                const data = await warehouseApi.deleteRequests();
                if (!cancelled) setRows(Array.isArray(data) ? data : []);
            } catch (e) {
                if (!cancelled) setError(e.message || 'Помилка');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const handleAction = async (id, action) => {
        if (!id) return;
        setBusyId(id);
        try {
            if (action === 'approve') {
                await warehouseApi.approveDeleteRequest(id);
            } else {
                await warehouseApi.rejectDeleteRequest(id);
            }
            await reload();
        } catch (e) {
            window.alert(e.message || 'Помилка');
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="admin-products">
            <AdminPageHeader title="Адмін · головна" subtitle={rows.length > 0 ? `${rows.length} запитів на розгляді` : 'Запити на видалення складів'} />

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

