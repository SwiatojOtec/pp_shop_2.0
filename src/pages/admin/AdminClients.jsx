import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Plus, Phone, Mail, User, AlertTriangle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { clientsApi } from '../../services/api';
import { parsePhones } from '../../utils/phoneUtils';
import PageHeader from '../../features/admin/ui/PageHeader';
import Toolbar from '../../features/admin/ui/Toolbar';
import DataTable from '../../features/admin/ui/DataTable';
import StatusBadge from '../../features/admin/ui/StatusBadge';
import ClientFormModal from '../../features/admin/clients/ClientFormModal';
import '../../features/admin/clients/clients.css';

const CLIENT_STATE = {
    overdue: { label: 'Прострочена оренда', tone: 'danger' },
    active:  { label: 'Оренда активна',      tone: 'info' },
    claims:  { label: 'Претензії',           tone: 'warning' },
    none:    { label: 'Без активних',        tone: 'neutral' },
};

const FILTER_OPTIONS = [
    { value: 'claims', label: 'З претензіями' },
    { value: 'discount', label: 'Зі знижкою' },
    { value: 'activeRent', label: 'Активна оренда' },
];

export default function AdminClients() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const search = searchParams.get('q') || '';
    const filter = searchParams.get('filter') || '';

    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formOpen, setFormOpen] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const debounceRef = useRef(null);

    const loadClients = useCallback(async (q = '', f = '') => {
        setLoading(true);
        try {
            const params = {};
            if (q) params.q = q;
            if (f) params.filter = f;
            const data = await clientsApi.list(Object.keys(params).length ? params : undefined);
            setClients(Array.isArray(data) ? data : []);
        } catch {
            setClients([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Live search with debounce, immediate reload on filter change
    useEffect(() => {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => loadClients(search.trim(), filter), search ? 300 : 0);
        return () => clearTimeout(debounceRef.current);
    }, [search, filter, loadClients]);

    function updateParams(patch) {
        const next = new URLSearchParams(searchParams);
        Object.entries(patch).forEach(([key, value]) => {
            if (!value) next.delete(key);
            else next.set(key, value);
        });
        setSearchParams(next, { replace: true });
    }

    const openCreate = () => { setEditingClient(null); setFormOpen(true); };
    const handleSaved = () => { setFormOpen(false); loadClients(search.trim(), filter); };

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
            key: 'dealsCount',
            label: 'Угод',
            align: 'right',
            render: (val) => <span className="num">{val || 0}</span>,
        },
        {
            key: 'revenue',
            label: 'Оборот',
            align: 'right',
            render: (val) => <span className="num">{val > 0 ? `${Number(val).toLocaleString('uk-UA')} ₴` : '—'}</span>,
        },
        {
            key: 'state',
            label: 'Стан',
            render: (val) => {
                const meta = CLIENT_STATE[val] || CLIENT_STATE.none;
                return <StatusBadge tone={meta.tone} label={meta.label} />;
            },
        },
    ], []);

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

            <Toolbar
                search={search}
                onSearch={(value) => updateParams({ q: value })}
                placeholder="Пошук за ПІБ, телефоном, email..."
                filters={[
                    { key: 'filter', label: 'Всі', value: filter, options: FILTER_OPTIONS },
                ]}
                onFilter={(_, value) => updateParams({ filter: value })}
            />

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
        </div>
    );
}
