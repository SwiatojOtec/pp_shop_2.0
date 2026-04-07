import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, FileText, Trash2, Eye } from 'lucide-react';
import { API_URL } from '../../apiConfig';
import { useAuth } from '../../context/AuthContext';
import './Admin.css';

const STATUS_LABELS = {
    draft:     { label: 'Чернетка',   color: '#888',    bg: '#f1f5f9' },
    active:    { label: 'Активна',    color: '#16a34a', bg: '#f0fdf4' },
    booked:    { label: 'Заброньовано', color: '#7c3aed', bg: '#f5f3ff' },
    overdue:   { label: 'Термін повернення прострочено', color: '#b91c1c', bg: '#fee2e2' },
    returned:  { label: 'Повернуто',  color: '#2563eb', bg: '#eff6ff' },
    cancelled: { label: 'Скасована',  color: '#dc2626', bg: '#fef2f2' },
};

export default function AdminRentalApplications() {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchApplications();
    }, []);

    const fetchApplications = async () => {
        try {
            const res = await fetch(`${API_URL}/api/rental-applications`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) setApplications(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Видалити заявку?')) return;
        await fetch(`${API_URL}/api/rental-applications/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });
        setApplications(prev => prev.filter(a => a.id !== id));
    };

    const formatDate = (d) => {
        if (!d) return '—';
        const dt = new Date(d);
        return `${String(dt.getDate()).padStart(2,'0')}.${String(dt.getMonth()+1).padStart(2,'0')}.${dt.getFullYear()}`;
    };

    const filtered = applications.filter(a => {
        const matchStatus = filterStatus === 'all' || a.status === filterStatus;
        const q = search.toLowerCase();
        const matchSearch = !q || a.clientName?.toLowerCase().includes(q) || a.applicationNumber?.toLowerCase().includes(q) || a.clientPhone?.includes(q);
        return matchStatus && matchSearch;
    });

    return (
        <div className="admin-products">
            <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
                <div>
                    <h1 className="admin-title">Заявки (оренда)</h1>
                    <p style={{ color: '#888', marginTop: '4px', fontSize: '0.9rem' }}>Договори та заявки на оренду інструменту</p>
                </div>
                <Link to="/admin/rental-applications/new" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                    <Plus size={18} /> Створити заявку
                </Link>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <input
                    type="text"
                    placeholder="Пошук за клієнтом, номером, телефоном..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ flex: 1, minWidth: '220px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.9rem' }}
                />
                <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.9rem', background: '#fff' }}
                >
                    <option value="all">Всі статуси</option>
                    <option value="draft">Чернетки</option>
                    <option value="active">Активні</option>
                    <option value="booked">Заброньовані</option>
                    <option value="overdue">Прострочені</option>
                    <option value="returned">Повернуто</option>
                    <option value="cancelled">Скасовані</option>
                </select>
            </div>

            {/* Table */}
            <div className="admin-section" style={{ background: '#fff', borderRadius: '12px', border: '1px solid var(--admin-border)', overflow: 'hidden' }}>
                {loading ? (
                    <p style={{ padding: '40px', textAlign: 'center', color: '#999' }}>Завантаження...</p>
                ) : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>№ Заявки</th>
                                <th>Клієнт</th>
                                <th>Телефон</th>
                                <th>Інструменти</th>
                                <th>Оренда з — по</th>
                                <th>Сума</th>
                                <th>Статус</th>
                                <th style={{ textAlign: 'right' }}>Дії</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(app => {
                                const st = STATUS_LABELS[app.status] || STATUS_LABELS.draft;
                                const itemsArr = Array.isArray(app.items) ? app.items : [];
                                return (
                                    <tr key={app.id}>
                                        <td>
                                            <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{app.applicationNumber}</span>
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{app.clientName}</td>
                                        <td style={{ color: '#666' }}>{app.clientPhone}</td>
                                        <td style={{ color: '#666', fontSize: '0.85rem' }}>
                                            {itemsArr.length > 0
                                                ? itemsArr.slice(0, 2).map(i => i.name).join(', ') + (itemsArr.length > 2 ? ` +${itemsArr.length - 2}` : '')
                                                : <span style={{ color: '#ccc' }}>—</span>
                                            }
                                        </td>
                                        <td style={{ fontSize: '0.85rem', color: '#555' }}>
                                            {app.rentFrom ? `${formatDate(app.rentFrom)} — ${formatDate(app.rentTo)}` : '—'}
                                        </td>
                                        <td style={{ fontWeight: 700 }}>
                                            {app.totalAmount >= 0 ? `${Number(app.totalAmount).toLocaleString('uk-UA')} ₴` : '—'}
                                        </td>
                                        <td>
                                            <span style={{ background: st.bg, color: st.color, padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 }}>
                                                {st.label}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button
                                                    onClick={() => navigate(`/admin/rental-applications/${app.id}`)}
                                                    className="action-btn"
                                                    title="Переглянути / редагувати"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(app.id)}
                                                    className="action-btn delete"
                                                    title="Видалити"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: 'center', padding: '60px', color: '#bbb' }}>
                                        <FileText size={40} style={{ marginBottom: '12px', opacity: 0.3 }} />
                                        <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '6px' }}>Заявок поки немає</div>
                                        <div style={{ fontSize: '0.85rem' }}>
                                            <Link to="/admin/rental-applications/new" style={{ color: 'var(--admin-accent)' }}>Створіть першу заявку</Link>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {filtered.length > 0 && (
                <div style={{ marginTop: '12px', fontSize: '0.85rem', color: '#999' }}>
                    Показано {filtered.length} з {applications.length} заявок
                </div>
            )}
        </div>
    );
}
