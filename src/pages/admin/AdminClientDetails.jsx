import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import { API_URL } from '../../apiConfig';
import { useAuth } from '../../context/AuthContext';
import './Admin.css';

const STATUS_LABELS = {
    draft: 'Чернетка',
    active: 'Активна',
    booked: 'Заброньовано',
    overdue: 'Термін повернення прострочено',
    returned: 'Повернуто',
    cancelled: 'Скасована'
};

export default function AdminClientDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token } = useAuth();
    const [client, setClient] = useState(null);
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token || !id) return;
        (async () => {
            setLoading(true);
            try {
                const [cRes, aRes] = await Promise.all([
                    fetch(`${API_URL}/api/clients/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
                    fetch(`${API_URL}/api/rental-applications?clientId=${id}`, { headers: { Authorization: `Bearer ${token}` } })
                ]);
                const cData = cRes.ok ? await cRes.json() : null;
                const aData = aRes.ok ? await aRes.json() : [];
                setClient(cData);
                setApplications(Array.isArray(aData) ? aData : []);
            } finally {
                setLoading(false);
            }
        })();
    }, [token, id]);

    const fmtDate = (d) => {
        if (!d) return '—';
        const dt = new Date(d);
        return `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}.${dt.getFullYear()}`;
    };

    if (loading) return <div style={{ color: '#999' }}>Завантаження...</div>;
    if (!client) return <div style={{ color: '#dc2626' }}>Клієнта не знайдено</div>;

    return (
        <div className="admin-products">
            <div className="admin-header client-details-header">
                <div className="client-details-title-wrap">
                    <button className="action-btn" onClick={() => navigate('/admin/clients')}><ArrowLeft size={16} /></button>
                    <h1 className="admin-title" style={{ margin: 0 }}>{client.fullName}</h1>
                </div>
                <Link to={`/admin/rental-applications/new?clientId=${client.id}`} className="btn btn-primary">
                    Нова заявка для клієнта
                </Link>
            </div>

            <div className="admin-section client-details-meta" style={{ marginBottom: '16px' }}>
                <div className="client-details-meta-grid">
                    <div className="client-details-meta-item"><strong>Телефон:</strong> {client.phone || '—'}</div>
                    <div className="client-details-meta-item"><strong>E-mail:</strong> {client.email || '—'}</div>
                    <div className="client-details-meta-item"><strong>Закріплена знижка:</strong> {Number(client.discountPercent || 0).toFixed(2)}%</div>
                </div>
                <div className="client-details-addresses">
                    <div><strong>Адреса:</strong> {client.address || '—'}</div>
                    <div><strong>Майданчик:</strong> {client.siteAddress || '—'}</div>
                </div>
            </div>

            <div className="admin-section">
                <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '12px' }}>
                    Історія заявок <ClipboardList size={16} style={{ verticalAlign: 'middle' }} />
                </h2>
                <div className="admin-table-container">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>№ заявки</th>
                                <th>Оренда</th>
                                <th>Сума</th>
                                <th>Статус</th>
                                <th style={{ textAlign: 'right' }}>Дії</th>
                            </tr>
                        </thead>
                        <tbody>
                            {applications.length === 0 ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#999' }}>Заявок ще немає</td></tr>
                            ) : applications.map(app => (
                                <tr key={app.id}>
                                    <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{app.applicationNumber}</td>
                                    <td>{fmtDate(app.rentFrom)} — {fmtDate(app.rentTo)}</td>
                                    <td>{Number(app.totalAmount || 0).toLocaleString('uk-UA')} ₴</td>
                                    <td>{STATUS_LABELS[app.status] || app.status}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button className="action-btn" onClick={() => navigate(`/admin/rental-applications/${app.id}`)}>Відкрити</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
