import { useEffect, useState, useRef, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft, ClipboardList, Phone, Mail,
    FileText, Tag, Edit2, User, Plus, Check, X as XIcon,
    AlertTriangle, ShoppingCart, Trash2,
} from 'lucide-react';
import { clientsApi, ordersApi } from '../../services/api';
import { parsePhones } from '../../utils/phoneUtils';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import StatusBadge from '../../features/admin/ui/StatusBadge';
import DataTable from '../../features/admin/ui/DataTable';
import ConfirmDialog from '../../features/admin/ui/ConfirmDialog';
import ClientFormModal from '../../features/admin/clients/ClientFormModal';
import '../../features/admin/clients/clients.css';
import './AdminClientDetails.css';

const ORDER_NON_TURNOVER_STATUSES = ['cancelled'];
const ACTIVE_RENTAL_STATUSES = ['active', 'booked'];

function fmtDate(d) {
    if (!d) return '—';
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2,'0')}.${String(dt.getMonth()+1).padStart(2,'0')}.${dt.getFullYear()}`;
}

function fmtRentTo(iso) {
    return iso ? iso.split('-').reverse().join('.') : '—';
}

export default function AdminClientDetails() {
    const { id }    = useParams();
    const navigate  = useNavigate();
    const { user } = useAuth();
    const { showToast } = useToast();
    const canCreateShopOrders = user?.role !== 'rent' && user?.role !== 'pivdenbud';
    const [client,  setClient]  = useState(null);
    const [deals,   setDeals]   = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingNotes, setEditingNotes]= useState(false);
    const [notesDraft,   setNotesDraft]  = useState('');
    const [notesSaving,  setNotesSaving] = useState(false);
    const notesRef = useRef(null);
    const [editingClaims, setEditingClaims] = useState(false);
    const [claimsDraft, setClaimsDraft] = useState('');
    const [claimsSaving, setClaimsSaving] = useState(false);
    const claimsRef = useRef(null);
    const [formOpen, setFormOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    useEffect(() => {
        if (!id) return;
        (async () => {
            setLoading(true);
            try {
                const [clientData, dealRows] = await Promise.all([
                    clientsApi.get(id),
                    ordersApi.listByClient(id),
                ]);
                setClient(clientData || null);
                const rows = Array.isArray(dealRows) ? dealRows : [];
                setDeals(canCreateShopOrders ? rows : rows.filter((r) => r.type === 'rent'));
            } catch {
                setClient(null);
                setDeals([]);
            } finally {
                setLoading(false);
            }
        })();
    }, [id, canCreateShopOrders]);

    async function saveClaims() {
        setClaimsSaving(true);
        try {
            const updated = await clientsApi.patch(id, { claims: claimsDraft });
            setClient(updated);
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
            const updated = await clientsApi.patch(id, { notes: notesDraft });
            setClient(updated);
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

    async function handleDelete() {
        setDeleteLoading(true);
        try {
            await clientsApi.remove(id);
            navigate('/admin/clients');
        } catch (e) {
            showToast(e.message || 'Помилка видалення', 'warning');
            setDeleteLoading(false);
        }
    }

    function openDealRow(row) {
        navigate(row.kind === 'application' ? `/admin/rental-applications/${row.id}` : `/admin/deals/${row.id}`);
    }

    const dealColumns = useMemo(() => [
        {
            key: 'number',
            label: '№ / дата',
            render: (_, row) => (
                <div>
                    <div className="mono">{row.number}</div>
                    <div className="cd-cell-muted">{fmtDate(row.createdAt)}</div>
                </div>
            ),
        },
        {
            key: 'type',
            label: 'Тип',
            render: (type) => (
                <>
                    {(type === 'rent' || type === 'both') && <span className="ds-badge ds-badge--info">оренда</span>}
                    {(type === 'shop' || type === 'both') && <span className="ds-badge ds-badge--neutral">магазин</span>}
                </>
            ),
        },
        {
            key: 'items',
            label: 'Позиції',
            className: 'cd-order-items-preview',
            render: (items = []) => {
                const line = (items || []).slice(0, 2).map((i) => i.name).join(', ');
                return <>{line || '—'}{items.length > 2 && <span className="cd-cell-more"> +{items.length - 2}</span>}</>;
            },
        },
        {
            key: 'totalAmount',
            label: 'Сума',
            align: 'right',
            render: (v) => <span className="num">{Number(v || 0).toLocaleString('uk-UA')} ₴</span>,
        },
        { key: 'status', label: 'Статус', render: (v, row) => <StatusBadge domain={row.statusDomain} status={v} /> },
        {
            key: 'rentTo',
            label: 'Оренда до',
            render: (v, row) => (v ? <span className={`mono${row.isOverdue ? ' cd-claims-text' : ''}`}>{fmtRentTo(v)}</span> : <span className="cd-cell-muted">—</span>),
        },
    ], []);

    if (loading) return <div className="cd-loading">Завантаження...</div>;
    if (!client) return <div className="cd-loading cd-loading--err">Клієнта не знайдено</div>;

    const phones   = parsePhones(client.phone);
    const discount = Number(client.discountPercent || 0);
    const turnoverRows = deals.filter((d) => !ORDER_NON_TURNOVER_STATUSES.includes(d.status));
    const totalRevenue = turnoverRows.reduce((s, d) => s + Number(d.totalAmount || 0), 0);
    const activeCount = deals.filter((d) => d.isOverdue
        || (d.statusDomain === 'rental' && ACTIVE_RENTAL_STATUSES.includes(d.status))
        || (d.statusDomain === 'order' && d.status === 'issued')).length;
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
                    <button type="button" className="ds-btn ds-btn--secondary" onClick={() => setFormOpen(true)}>
                        <Edit2 size={14} /> Редагувати
                    </button>
                    {canCreateShopOrders && (
                        <Link to={`/admin/deals?newClientId=${client.id}`} className="ds-btn ds-btn--secondary" title="Нове замовлення магазину">
                            <ShoppingCart size={14} /> Нова угода
                        </Link>
                    )}
                    <button type="button" className="ds-btn ds-btn--danger" onClick={() => setDeleteOpen(true)}>
                        <Trash2 size={14} /> Видалити
                    </button>
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
                                <span className="cd-stat-label">Угод всього</span>
                                <span className="cd-stat-value">{deals.length}</span>
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
                                <span className="cd-stat-label">Оборот</span>
                                <span className="cd-stat-value cd-stat-value--sm">
                                    {totalRevenue > 0 ? `${totalRevenue.toLocaleString('uk-UA')} ₴` : '—'}
                                </span>
                            </div>
                        </div>
                    </div>

                </div>

                {/* History + notes column */}
                <div className="cd-main">
                    <div className="cd-card">
                        <div className="cd-card-title cd-card-title--split">
                            <span className="cd-card-title-main">
                                <ClipboardList size={15} /> Історія угод
                                {deals.length > 0 && (
                                    <span className="cd-badge-count">{deals.length}</span>
                                )}
                            </span>
                            {canCreateShopOrders && (
                                <Link to={`/admin/deals?newClientId=${client.id}`} className="cd-notes-edit-btn">
                                    <Plus size={11} /> Нова угода
                                </Link>
                            )}
                        </div>

                        {deals.length === 0 ? (
                            <div className="cd-apps-empty">
                                <ClipboardList size={36} className="cd-apps-empty-icon" />
                                <p>Угод ще немає</p>
                            </div>
                        ) : (
                            <DataTable
                                columns={dealColumns}
                                rows={deals}
                                rowKey={(row) => `${row.kind}-${row.id}`}
                                onRowClick={openDealRow}
                            />
                        )}
                    </div>

                    <div className="cd-notes-row">
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
                                        <button type="button" className="ds-btn ds-btn--primary ds-btn--sm" onClick={saveNotes} disabled={notesSaving}>
                                            <Check size={12} /> {notesSaving ? 'Збереження...' : 'Зберегти'}
                                        </button>
                                        <button type="button" className="ds-btn ds-btn--secondary ds-btn--sm" onClick={() => setEditingNotes(false)}>
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
                                        <button type="button" className="ds-btn ds-btn--primary ds-btn--sm" onClick={saveClaims} disabled={claimsSaving}>
                                            <Check size={12} /> {claimsSaving ? 'Збереження...' : 'Зберегти'}
                                        </button>
                                        <button type="button" className="ds-btn ds-btn--secondary ds-btn--sm" onClick={() => setEditingClaims(false)}>
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

            <ClientFormModal
                open={formOpen}
                client={client}
                onClose={() => setFormOpen(false)}
                onSaved={handleClientSaved}
            />

            <ConfirmDialog
                open={deleteOpen}
                title="Видалити клієнта?"
                message={`Видалити «${client.fullName}»? Всі пов'язані угоди залишаться, але посилання на клієнта буде знято.`}
                confirmText="Видалити"
                onConfirm={handleDelete}
                onCancel={() => setDeleteOpen(false)}
                loading={deleteLoading}
            />
        </div>
    );
}
