import { useEffect, useState, useRef, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft, ClipboardList, Phone, Mail,
    FileText, Tag, Edit2, User, Plus, Check, X as XIcon,
    AlertTriangle, ShoppingCart,
} from 'lucide-react';
import { clientsApi, rentalApplicationsApi, ordersApi } from '../../services/api';
import { parsePhones } from '../../utils/phoneUtils';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import StatusBadge from '../../features/admin/ui/StatusBadge';
import DataTable from '../../features/admin/ui/DataTable';
import ClientFormModal from '../../features/admin/clients/ClientFormModal';
import '../../features/admin/clients/clients.css';
import './Admin.css';
import './AdminClientDetails.css';

function formatShopOrderNumber(value) {
    if (!value || typeof value !== 'string') return value || '—';
    const p = value.trim().split('/');
    if (p.length === 4 && p.every((x) => /^\d+$/.test(x))) {
        const [n, dd, mm, yyyy] = p;
        return `№${n} · ${dd}.${mm}.${yyyy}`;
    }
    return value;
}

function fmtDate(d) {
    if (!d) return '—';
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2,'0')}.${String(dt.getMonth()+1).padStart(2,'0')}.${dt.getFullYear()}`;
}

export default function AdminClientDetails() {
    const { id }    = useParams();
    const navigate  = useNavigate();
    const { user } = useAuth();
    const { showToast } = useToast();
    const canCreateShopOrders = user?.role !== 'rent' && user?.role !== 'pivdenbud';
    const [client,       setClient]      = useState(null);
    const [applications, setApplications]= useState([]);
    const [shopOrders, setShopOrders] = useState([]);
    const [loading,      setLoading]     = useState(true);
    const [editingNotes, setEditingNotes]= useState(false);
    const [notesDraft,   setNotesDraft]  = useState('');
    const [notesSaving,  setNotesSaving] = useState(false);
    const notesRef = useRef(null);
    const [editingClaims, setEditingClaims] = useState(false);
    const [claimsDraft, setClaimsDraft] = useState('');
    const [claimsSaving, setClaimsSaving] = useState(false);
    const claimsRef = useRef(null);
    const [formOpen, setFormOpen] = useState(false);

    useEffect(() => {
        if (!id) return;
        (async () => {
            setLoading(true);
            try {
                const parts = [
                    clientsApi.get(id),
                    rentalApplicationsApi.list({ clientId: id }),
                ];
                if (canCreateShopOrders) {
                    parts.push(ordersApi.listByClient(id));
                }
                const results = await Promise.all(parts);
                const clientData = results[0];
                const appsData = results[1];
                setClient(clientData || null);
                setApplications(Array.isArray(appsData) ? appsData : []);
                if (canCreateShopOrders && results.length > 2) {
                    const ord = results[2];
                    setShopOrders(Array.isArray(ord) ? ord : []);
                } else {
                    setShopOrders([]);
                }
            } catch {
                setClient(null);
                setApplications([]);
                setShopOrders([]);
            } finally {
                setLoading(false);
            }
        })();
    }, [id, canCreateShopOrders]);

    async function saveClaims() {
        setClaimsSaving(true);
        try {
            await clientsApi.update(id, { ...client, claims: claimsDraft });
            setClient(prev => ({ ...prev, claims: claimsDraft }));
            setEditingClaims(false);
        } catch (e) { showToast(e.message || 'Помилка збереження', 'warning'); }
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
        } catch (e) { showToast(e.message || 'Помилка збереження', 'warning'); }
        finally { setNotesSaving(false); }
    }

    function startEditNotes() {
        setNotesDraft(client.notes || '');
        setEditingNotes(true);
        setTimeout(() => notesRef.current?.focus(), 50);
    }

    function handleClientSaved(updated) {
        setClient(updated);
        setFormOpen(false);
    }

    const applicationColumns = useMemo(() => [
        { key: 'applicationNumber', label: '№ заявки', className: 'cd-cell-mono', render: (v, a) => v || `#${a.id}` },
        { key: 'rentFrom', label: 'Оренда', className: 'cd-cell-muted', render: (_, a) => `${fmtDate(a.rentFrom)} — ${fmtDate(a.rentTo)}` },
        { key: 'totalAmount', label: 'Сума', className: 'cd-cell-amount', render: (v) => `${Number(v || 0).toLocaleString('uk-UA')} ₴` },
        { key: 'status', label: 'Статус', render: (v) => <StatusBadge domain="rental" status={v} /> },
    ], []);

    const shopOrderColumns = useMemo(() => [
        { key: 'orderNumber', label: '№ замовлення', className: 'cd-cell-mono', render: (v, o) => formatShopOrderNumber(v || `#${o.id}`) },
        { key: 'createdAt', label: 'Дата', className: 'cd-cell-muted', render: (v) => fmtDate(v) },
        {
            key: 'items', label: 'Товари', className: 'cd-cell-muted cd-order-items-preview',
            render: (items = []) => {
                const line = (items || []).slice(0, 2).map((i) => `${i.name} ×${i.quantity}`).join(', ');
                return <>{line || '—'}{items.length > 2 && <span className="cd-cell-more"> +{items.length - 2}</span>}</>;
            },
        },
        { key: 'totalAmount', label: 'Сума', className: 'cd-cell-amount', render: (v) => `${Number(v || 0).toLocaleString('uk-UA')} ₴` },
        { key: 'status', label: 'Статус', render: (v) => <StatusBadge domain="order" status={v} /> },
    ], []);

    if (loading) return <div className="cd-loading">Завантаження...</div>;
    if (!client) return <div className="cd-loading cd-loading--err">Клієнта не знайдено</div>;

    const phones   = parsePhones(client.phone);
    const discount = Number(client.discountPercent || 0);
    const totalRevenue = applications.reduce((s,a) => s + Number(a.totalAmount || 0), 0);
    const activeCount  = applications.filter(a => ['active','booked'].includes(a.status)).length;
    const shopTotal    = shopOrders.reduce((s, o) => s + Number(o.totalAmount || 0), 0);
    const hasClaims = !!(client.claims && String(client.claims).trim());

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
                            <StatusBadge tone="success" label={<><Tag size={11} className="cd-badge-icon" />Знижка {discount.toFixed(0)}%</>} />
                        )}
                        {hasClaims && (
                            <StatusBadge tone="danger" label={<><AlertTriangle size={11} className="cd-badge-icon" />Претензії</>} />
                        )}
                    </div>
                </div>

                <div className="cd-header-actions">
                    <button type="button" className="cd-btn cd-btn--ghost" onClick={() => setFormOpen(true)}>
                        <Edit2 size={14} /> Редагувати
                    </button>
                    {canCreateShopOrders && (
                        <Link to={`/admin/deals?newClientId=${client.id}`} className="cd-btn cd-btn--ghost cd-btn--cart" title="Нове замовлення магазину">
                            <ShoppingCart size={14} /> Замовлення
                        </Link>
                    )}
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
                                    <span className="cd-field-label">Паспорт</span>
                                    <span className="cd-field-value">{client.passport}</span>
                                </div>
                            )}
                            {client.passportIssuedAt && (
                                <div className="cd-field">
                                    <span className="cd-field-label">Дата видачі паспорта</span>
                                    <span className="cd-field-value">{client.passportIssuedAt}</span>
                                </div>
                            )}
                            {client.ipn && (
                                <div className="cd-field">
                                    <span className="cd-field-label">ІПН</span>
                                    <span className="cd-field-value">{client.ipn}</span>
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
                                <span className={`cd-stat-value${activeCount > 0 ? ' cd-stat-value--positive' : ''}`}>{activeCount}</span>
                            </div>
                            <div className="cd-stat">
                                <span className="cd-stat-label">Знижка</span>
                                <span className={`cd-stat-value${discount > 0 ? ' cd-stat-value--positive' : ''}`}>
                                    {discount > 0 ? `${discount.toFixed(0)}%` : '—'}
                                </span>
                            </div>
                            <div className="cd-stat">
                                <span className="cd-stat-label">Сума оренди</span>
                                <span className="cd-stat-value cd-stat-value--sm">
                                    {totalRevenue > 0 ? `${totalRevenue.toLocaleString('uk-UA')} ₴` : '—'}
                                </span>
                            </div>
                            {canCreateShopOrders && (
                                <>
                                    <div className="cd-stat">
                                        <span className="cd-stat-label">Замовлень</span>
                                        <span className="cd-stat-value">{shopOrders.length}</span>
                                    </div>
                                    <div className="cd-stat">
                                        <span className="cd-stat-label">Сума магазину</span>
                                        <span className="cd-stat-value cd-stat-value--sm">
                                            {shopTotal > 0 ? `${shopTotal.toLocaleString('uk-UA')} ₴` : '—'}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                </div>

                {/* Applications + notes column */}
                <div className="cd-main">
                    <div className="cd-main-grid">
                        <div className="cd-main-primary">
                    <div className="cd-card cd-card--full">
                        <div className="cd-card-title cd-card-title--split">
                            <span className="cd-card-title-main">
                                <ClipboardList size={15} /> Історія заявок
                                {applications.length > 0 && (
                                    <span className="cd-badge-count">{applications.length}</span>
                                )}
                            </span>
                        </div>

                        {applications.length === 0 ? (
                            <div className="cd-apps-empty">
                                <ClipboardList size={36} className="cd-apps-empty-icon" />
                                <p>Заявок ще немає</p>
                            </div>
                        ) : (
                            <DataTable
                                columns={applicationColumns}
                                rows={applications}
                                onRowClick={(app) => navigate(`/admin/rental-applications/${app.id}`)}
                            />
                        )}
                    </div>

                    {canCreateShopOrders && (
                        <div className="cd-card cd-card--full">
                            <div className="cd-card-title cd-card-title--split">
                                <span className="cd-card-title-main">
                                    <ShoppingCart size={15} /> Замовлення магазину
                                    {shopOrders.length > 0 && (
                                        <span className="cd-badge-count">{shopOrders.length}</span>
                                    )}
                                </span>
                                <Link to={`/admin/deals?newClientId=${client.id}`} className="cd-new-app-link">
                                    <Plus size={13} /> Нове замовлення
                                </Link>
                            </div>

                            {shopOrders.length === 0 ? (
                                <div className="cd-apps-empty">
                                    <ShoppingCart size={36} className="cd-apps-empty-icon" />
                                    <p>Замовлень ще немає</p>
                                    <Link to={`/admin/deals?newClientId=${client.id}`} className="cd-btn cd-btn--primary cd-apps-empty-cta">
                                        <Plus size={14} /> Перше замовлення
                                    </Link>
                                </div>
                            ) : (
                                <DataTable
                                    columns={shopOrderColumns}
                                    rows={shopOrders}
                                    onRowClick={(o) => navigate(`/admin/deals/${o.id}`)}
                                />
                            )}
                        </div>
                    )}

                        </div>

                        <div className="cd-main-aside">
                            <div className="cd-card">
                                <div className="cd-card-title cd-card-title--split">
                                    <span className="cd-card-title-main">
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

                            <div className={`cd-card ${hasClaims ? 'cd-card--claims' : ''}`}>
                                <div className="cd-card-title cd-card-title--split">
                                    <span className="cd-card-title-main">
                                        <AlertTriangle size={15} /> Претензії
                                    </span>
                                    {!editingClaims && (
                                        <button type="button" className="cd-notes-edit-btn" onClick={startEditClaims}>
                                            {hasClaims ? <><Edit2 size={11} /> Редагувати</> : <><Plus size={11} /> Додати</>}
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
                                ) : hasClaims ? (
                                    <p className="cd-notes-text cd-claims-text">{client.claims}</p>
                                ) : (
                                    <p className="cd-notes-empty">Претензій немає</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ClientFormModal
                open={formOpen}
                client={client}
                onClose={() => setFormOpen(false)}
                onSaved={handleClientSaved}
            />
        </div>
    );
}
