import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft, ClipboardList, Phone, Mail, MapPin,
    FileText, Tag, Edit2, User, Plus, Check, X as XIcon,
    AlertTriangle,
} from 'lucide-react';
import { clientsApi, rentalApplicationsApi } from '../../services/api';
import { Badge } from '../../components/ui/badge';
import './Admin.css';
import './AdminClientDetails.css';

const STATUS_META = {
    draft:    { label: 'Чернетка',           variant: 'secondary' },
    active:   { label: 'Активна',            variant: 'success'   },
    booked:   { label: 'Заброньовано',       variant: 'default'   },
    overdue:  { label: 'Термін прострочено', variant: 'danger'    },
    returned: { label: 'Повернуто',          variant: 'secondary' },
    cancelled:{ label: 'Скасована',          variant: 'danger'    },
};

function parsePhones(raw) {
    if (!raw) return [];
    return raw.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);
}

function fmtDate(d) {
    if (!d) return '—';
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2,'0')}.${String(dt.getMonth()+1).padStart(2,'0')}.${dt.getFullYear()}`;
}

export default function AdminClientDetails() {
    const { id }    = useParams();
    const navigate  = useNavigate();
    const [client,       setClient]      = useState(null);
    const [applications, setApplications]= useState([]);
    const [loading,      setLoading]     = useState(true);
    const [editingNotes, setEditingNotes]= useState(false);
    const [notesDraft,   setNotesDraft]  = useState('');
    const [notesSaving,  setNotesSaving] = useState(false);
    const notesRef = useRef(null);
    const [editingClaims, setEditingClaims] = useState(false);
    const [claimsDraft, setClaimsDraft] = useState('');
    const [claimsSaving, setClaimsSaving] = useState(false);
    const claimsRef = useRef(null);

    useEffect(() => {
        if (!id) return;
        (async () => {
            setLoading(true);
            try {
                const [clientData, appsData] = await Promise.all([
                    clientsApi.get(id),
                    rentalApplicationsApi.list({ clientId: id }),
                ]);
                setClient(clientData || null);
                setApplications(Array.isArray(appsData) ? appsData : []);
            } catch {
                setClient(null);
                setApplications([]);
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    async function saveClaims() {
        setClaimsSaving(true);
        try {
            await clientsApi.update(id, { ...client, claims: claimsDraft });
            setClient(prev => ({ ...prev, claims: claimsDraft }));
            setEditingClaims(false);
        } catch (e) { alert(e.message || 'Помилка збереження'); }
        finally { setClaimsSaving(false); }
    }

    function startEditClaims() {
        setClaimsDraft(client.claims || '');
        setEditingClaims(true);
        setTimeout(() => claimsRef.current?.focus(), 50);
    }

    async function saveNotes() {
        setNotesSaving(true);
        try {
            await clientsApi.update(id, { ...client, notes: notesDraft });
            setClient(prev => ({ ...prev, notes: notesDraft }));
            setEditingNotes(false);
        } catch (e) { alert(e.message || 'Помилка збереження'); }
        finally { setNotesSaving(false); }
    }

    function startEditNotes() {
        setNotesDraft(client.notes || '');
        setEditingNotes(true);
        setTimeout(() => notesRef.current?.focus(), 50);
    }

    if (loading) return <div className="cd-loading">Завантаження...</div>;
    if (!client) return <div className="cd-loading cd-loading--err">Клієнта не знайдено</div>;

    const phones   = parsePhones(client.phone);
    const discount = Number(client.discountPercent || 0);
    const totalRevenue = applications.reduce((s,a) => s + Number(a.totalAmount || 0), 0);
    const activeCount  = applications.filter(a => ['active','booked'].includes(a.status)).length;

    return (
        <div className="cd-page">

            {/* ── Page header ── */}
            <div className="cd-header">
                <button className="cd-back" onClick={() => navigate('/admin/clients')} title="Назад">
                    <ArrowLeft size={18} />
                </button>

                <div className="cd-header-info">
                    <h1 className="cd-name">{client.fullName}</h1>
                    <div className="cd-meta-line">
                        <span className="cd-meta-id">#{client.id}</span>
                        {client.createdAt && <span className="cd-meta-date">клієнт з {fmtDate(client.createdAt)}</span>}
                        {discount > 0 && (
                            <Badge variant="success" style={{ fontSize: '0.8rem' }}>
                                <Tag size={11} style={{ marginRight: '3px', verticalAlign: 'middle' }} />
                                Знижка {discount.toFixed(0)}%
                            </Badge>
                        )}
                        {!!(client.claims && String(client.claims).trim()) && (
                            <Badge variant="danger" style={{ fontSize: '0.78rem' }} title="У клієнта є претензії">
                                <AlertTriangle size={11} style={{ marginRight: '3px', verticalAlign: 'middle' }} />
                                Претензії
                            </Badge>
                        )}
                    </div>
                </div>

                <div className="cd-header-actions">
                    <button className="cd-btn cd-btn--ghost" onClick={() => navigate('/admin/clients')}>
                        <Edit2 size={14} /> Редагувати
                    </button>
                    <Link to={`/admin/rental-applications/new?clientId=${client.id}`} className="cd-btn cd-btn--primary">
                        <Plus size={14} /> Нова заявка
                    </Link>
                </div>
            </div>

            {/* ── Body ── */}
            <div className="cd-body">

                {/* Left sidebar */}
                <div className="cd-sidebar">

                    {/* Contact card */}
                    <div className="cd-card">
                        <div className="cd-card-title">
                            <User size={15} />
                            Контактна інформація
                        </div>

                        <div className="cd-fields">
                            {phones.length > 0 && (
                                <div className="cd-field">
                                    <span className="cd-field-label">Телефон</span>
                                    <div className="cd-field-value">
                                        {phones.map((p, i) => (
                                            <a key={i} href={`tel:${p}`} className="cd-phone-link">{p}</a>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {client.email && (
                                <div className="cd-field">
                                    <span className="cd-field-label">E-mail</span>
                                    <a href={`mailto:${client.email}`} className="cd-link">{client.email}</a>
                                </div>
                            )}
                            {client.passport && (
                                <div className="cd-field">
                                    <span className="cd-field-label">Паспорт / ID</span>
                                    <span className="cd-field-value">{client.passport}</span>
                                </div>
                            )}
                            {client.address && (
                                <div className="cd-field">
                                    <span className="cd-field-label">Адреса проживання</span>
                                    <span className="cd-field-value">{client.address}</span>
                                </div>
                            )}
                            {client.siteAddress && (
                                <div className="cd-field">
                                    <span className="cd-field-label">Адреса майданчика</span>
                                    <span className="cd-field-value">{client.siteAddress}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stats card */}
                    <div className="cd-card">
                        <div className="cd-card-title">
                            <ClipboardList size={15} />
                            Статистика
                        </div>
                        <div className="cd-stats-grid">
                            <div className="cd-stat">
                                <span className="cd-stat-label">Заявок всього</span>
                                <span className="cd-stat-value">{applications.length}</span>
                            </div>
                            <div className="cd-stat">
                                <span className="cd-stat-label">Активних</span>
                                <span className="cd-stat-value" style={activeCount > 0 ? { color: '#16a34a' } : {}}>{activeCount}</span>
                            </div>
                            <div className="cd-stat">
                                <span className="cd-stat-label">Знижка</span>
                                <span className="cd-stat-value" style={discount > 0 ? { color: '#16a34a' } : {}}>
                                    {discount > 0 ? `${discount.toFixed(0)}%` : '—'}
                                </span>
                            </div>
                            <div className="cd-stat">
                                <span className="cd-stat-label">Сума оренди</span>
                                <span className="cd-stat-value" style={{ fontSize: '0.95rem' }}>
                                    {totalRevenue > 0 ? `${totalRevenue.toLocaleString('uk-UA')} ₴` : '—'}
                                </span>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Applications + notes column */}
                <div className="cd-main">
                    <div className="cd-main-grid">
                        <div className="cd-main-primary">
                    <div className="cd-card cd-card--full">
                        <div className="cd-card-title" style={{ justifyContent: 'space-between' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ClipboardList size={15} /> Історія заявок
                                {applications.length > 0 && (
                                    <span className="cd-badge-count">{applications.length}</span>
                                )}
                            </span>
                            <Link to={`/admin/rental-applications/new?clientId=${client.id}`} className="cd-new-app-link">
                                <Plus size={13} /> Нова заявка
                            </Link>
                        </div>

                        {applications.length === 0 ? (
                            <div className="cd-apps-empty">
                                <ClipboardList size={36} style={{ opacity: 0.2, marginBottom: '10px' }} />
                                <p>Заявок ще немає</p>
                                <Link to={`/admin/rental-applications/new?clientId=${client.id}`} className="cd-btn cd-btn--primary" style={{ marginTop: '12px', display: 'inline-flex' }}>
                                    <Plus size={14} /> Створити першу заявку
                                </Link>
                            </div>
                        ) : (
                            <div className="admin-table-container" style={{ marginTop: '4px' }}>
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
                                        {applications.map(app => {
                                            const sm = STATUS_META[app.status] || { label: app.status, variant: 'secondary' };
                                            return (
                                                <tr key={app.id} style={{ cursor: 'pointer' }}
                                                    onClick={() => navigate(`/admin/rental-applications/${app.id}`)}>
                                                    <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                                                        {app.applicationNumber || `#${app.id}`}
                                                    </td>
                                                    <td style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                                                        {fmtDate(app.rentFrom)} — {fmtDate(app.rentTo)}
                                                    </td>
                                                    <td style={{ fontWeight: 700 }}>
                                                        {Number(app.totalAmount || 0).toLocaleString('uk-UA')} ₴
                                                    </td>
                                                    <td><Badge variant={sm.variant}>{sm.label}</Badge></td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        <button className="action-btn"
                                                            onClick={e => { e.stopPropagation(); navigate(`/admin/rental-applications/${app.id}`); }}>
                                                            <ClipboardList size={15} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                        </div>

                        <div className="cd-main-aside">
                            <div className="cd-card">
                                <div className="cd-card-title" style={{ justifyContent: 'space-between' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <FileText size={15} /> Нотатки
                                    </span>
                                    {!editingNotes && (
                                        <button type="button" className="cd-notes-edit-btn" onClick={startEditNotes}>
                                            {client.notes ? <><Edit2 size={11} /> Редагувати</> : <><Plus size={11} /> Додати</>}
                                        </button>
                                    )}
                                </div>

                                {editingNotes ? (
                                    <div className="cd-notes-editor">
                                        <textarea
                                            ref={notesRef}
                                            value={notesDraft}
                                            onChange={e => setNotesDraft(e.target.value)}
                                            placeholder="Особливості клієнта, умови роботи..."
                                            rows={5}
                                            className="cd-notes-textarea"
                                        />
                                        <div className="cd-notes-actions">
                                            <button type="button" className="cd-btn cd-btn--primary cd-btn--sm" onClick={saveNotes} disabled={notesSaving}>
                                                <Check size={12} /> {notesSaving ? 'Збереження...' : 'Зберегти'}
                                            </button>
                                            <button type="button" className="cd-btn cd-btn--ghost cd-btn--sm" onClick={() => setEditingNotes(false)}>
                                                <XIcon size={12} /> Скасувати
                                            </button>
                                        </div>
                                    </div>
                                ) : client.notes ? (
                                    <p className="cd-notes-text">{client.notes}</p>
                                ) : (
                                    <p className="cd-notes-empty">Нотаток немає</p>
                                )}
                            </div>

                            <div className={`cd-card ${client.claims && String(client.claims).trim() ? 'cd-card--claims' : ''}`}>
                                <div className="cd-card-title" style={{ justifyContent: 'space-between' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <AlertTriangle size={15} /> Претензії
                                    </span>
                                    {!editingClaims && (
                                        <button type="button" className="cd-notes-edit-btn" onClick={startEditClaims}>
                                            {client.claims && String(client.claims).trim()
                                                ? <><Edit2 size={11} /> Редагувати</>
                                                : <><Plus size={11} /> Додати</>}
                                        </button>
                                    )}
                                </div>

                                {editingClaims ? (
                                    <div className="cd-notes-editor">
                                        <textarea
                                            ref={claimsRef}
                                            value={claimsDraft}
                                            onChange={e => setClaimsDraft(e.target.value)}
                                            placeholder="Претензії, інциденти, ризики — видно в списку клієнтів"
                                            rows={5}
                                            className="cd-notes-textarea"
                                        />
                                        <div className="cd-notes-actions">
                                            <button type="button" className="cd-btn cd-btn--primary cd-btn--sm" onClick={saveClaims} disabled={claimsSaving}>
                                                <Check size={12} /> {claimsSaving ? 'Збереження...' : 'Зберегти'}
                                            </button>
                                            <button type="button" className="cd-btn cd-btn--ghost cd-btn--sm" onClick={() => setEditingClaims(false)}>
                                                <XIcon size={12} /> Скасувати
                                            </button>
                                        </div>
                                    </div>
                                ) : client.claims && String(client.claims).trim() ? (
                                    <p className="cd-notes-text cd-claims-text">{client.claims}</p>
                                ) : (
                                    <p className="cd-notes-empty">Претензій немає</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
