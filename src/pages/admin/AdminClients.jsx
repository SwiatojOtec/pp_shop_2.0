import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Edit2, Plus, Trash2, Phone, Mail, MapPin, User, AlertTriangle, ShoppingCart } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { clientsApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { parsePhones } from '../../utils/phoneUtils';
import PageHeader from '../../features/admin/ui/PageHeader';
import Toolbar from '../../features/admin/ui/Toolbar';
import DataTable from '../../features/admin/ui/DataTable';
import StatusBadge from '../../features/admin/ui/StatusBadge';
import ConfirmDialog from '../../features/admin/ui/ConfirmDialog';
import ClientFormModal from '../../features/admin/clients/ClientFormModal';
import '../../features/admin/clients/clients.css';
import './Admin.css';

export default function AdminClients() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showToast } = useToast();
    const canCreateShopOrders = user?.role !== 'rent' && user?.role !== 'pivdenbud';

    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [formOpen, setFormOpen] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const debounceRef = useRef(null);

    const loadClients = useCallback(async (q = '') => {
        setLoading(true);
        try {
            const params = q ? { q } : undefined;
            const data = await clientsApi.list(params);
            setClients(Array.isArray(data) ? data : []);
        } catch {
            setClients([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadClients(); }, [loadClients]);

    // Live search with debounce
    useEffect(() => {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => loadClients(search.trim()), 300);
        return () => clearTimeout(debounceRef.current);
    }, [search, loadClients]);

    const openCreate = () => { setEditingClient(null); setFormOpen(true); };
    const startEdit = (c) => { setEditingClient(c); setFormOpen(true); };
    const handleSaved = () => { setFormOpen(false); loadClients(search.trim()); };

    async function handleDelete() {
        if (!deleteTarget) return;
        setDeleteLoading(true);
        try {
            await clientsApi.remove(deleteTarget.id);
            await loadClients(search.trim());
            setDeleteTarget(null);
        } catch (e) {
            showToast(e.message || 'Помилка видалення', 'warning');
        } finally {
            setDeleteLoading(false);
        }
    }

    const columns = useMemo(() => [
        {
            key: 'fullName',
            label: 'Клієнт',
            render: (_, c) => (
                <div className="client-name-cell">
                    {c.claims && String(c.claims).trim() && (
                        <span className="client-claims-icon" title="Є претензії" aria-label="Претензії">
                            <AlertTriangle size={17} />
                        </span>
                    )}
                    <div className="client-name-block">
                        <div className="client-name">{c.fullName}</div>
                        {c.notes && <div className="client-notes-preview" title={c.notes}>{c.notes}</div>}
                    </div>
                </div>
            ),
        },
        {
            key: 'phone',
            label: 'Контакти',
            render: (_, c) => {
                const phones = parsePhones(c.phone);
                return (
                    <div>
                        {phones.map((p, i) => (
                            <div key={i} className="client-phone-row">
                                <Phone size={12} />
                                <a href={`tel:${p}`} onClick={(e) => e.stopPropagation()}>{p}</a>
                            </div>
                        ))}
                        {c.email && (
                            <div className="client-email-row">
                                <Mail size={12} />
                                <span>{c.email}</span>
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'discountPercent',
            label: 'Знижка',
            render: (val) => {
                const discount = Number(val || 0);
                return discount > 0
                    ? <StatusBadge tone="success" label={`${discount.toFixed(0)}%`} />
                    : <span className="client-muted-dash">—</span>;
            },
        },
        {
            key: 'siteAddress',
            label: 'Адреса майданчика',
            render: (val) => (val ? (
                <div className="client-address-cell">
                    <MapPin size={12} />
                    <span>{val}</span>
                </div>
            ) : <span className="client-muted-dash">—</span>),
        },
        {
            key: 'id',
            label: 'Дії',
            align: 'right',
            render: (_, c) => (
                <div className="client-actions" onClick={(e) => e.stopPropagation()}>
                    {canCreateShopOrders && (
                        <Link to={`/admin/deals?newClientId=${c.id}`} className="action-btn client-cart-link" title="Нове замовлення магазину">
                            <ShoppingCart size={15} />
                        </Link>
                    )}
                    <button type="button" className="action-btn" onClick={() => startEdit(c)} title="Редагувати">
                        <Edit2 size={15} />
                    </button>
                    <button type="button" className="action-btn delete" onClick={() => setDeleteTarget(c)} title="Видалити">
                        <Trash2 size={15} />
                    </button>
                </div>
            ),
        },
    ], [canCreateShopOrders]);

    return (
        <div>
            <PageHeader
                title="Клієнти"
                subtitle={loading ? '' : `${clients.length} клієнтів`}
                actions={(
                    <button type="button" className="ds-btn ds-btn--primary" onClick={openCreate}>
                        <Plus size={16} /> Новий клієнт
                    </button>
                )}
            />

            <Toolbar search={search} onSearch={setSearch} placeholder="Пошук за ПІБ, телефоном, email..." />

            <DataTable
                columns={columns}
                rows={clients}
                loading={loading}
                onRowClick={(c) => navigate(`/admin/clients/${c.id}`)}
                emptyIcon={User}
                emptyTitle="Клієнтів не знайдено"
            />

            <ClientFormModal
                open={formOpen}
                client={editingClient}
                onClose={() => setFormOpen(false)}
                onSaved={handleSaved}
            />

            <ConfirmDialog
                open={!!deleteTarget}
                title="Видалити клієнта?"
                message={deleteTarget ? `Видалити «${deleteTarget.fullName}»? Всі пов'язані заявки залишаться, але посилання на клієнта буде знято.` : ''}
                confirmText="Видалити"
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
                loading={deleteLoading}
            />
        </div>
    );
}
