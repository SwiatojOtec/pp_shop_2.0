import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Eye } from 'lucide-react';
import { rentalApplicationsApi } from '../../services/api';
import { AdminPageHeader, AdminFilters, AdminTable, ConfirmDialog } from '../../components/admin';
import { Badge } from '../../components/ui/badge';
import './Admin.css';

const STATUS_META = {
    draft:    { label: 'Чернетка',     variant: 'secondary' },
    active:   { label: 'Активна',      variant: 'success'   },
    booked:   { label: 'Заброньовано', variant: 'default'   },
    overdue:  { label: 'Прострочено',  variant: 'danger'    },
    returned: { label: 'Повернуто',    variant: 'secondary' },
    cancelled:{ label: 'Скасована',    variant: 'danger'    },
};

const STATUS_FILTER_OPTIONS = [
    { value: 'draft',     label: 'Чернетки' },
    { value: 'active',    label: 'Активні' },
    { value: 'booked',    label: 'Заброньовані' },
    { value: 'overdue',   label: 'Прострочені' },
    { value: 'returned',  label: 'Повернуто' },
    { value: 'cancelled', label: 'Скасовані' },
];

function fmtDate(d) {
    if (!d) return '—';
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}.${dt.getFullYear()}`;
}

export default function AdminRentalApplications() {
    const navigate = useNavigate();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading]           = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [search, setSearch]             = useState('');
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        try {
            const data = await rentalApplicationsApi.list();
            setApplications(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            setApplications([]);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete() {
        if (!deleteTarget) return;
        setDeleteLoading(true);
        try {
            await rentalApplicationsApi.remove(deleteTarget.id);
            setApplications((prev) => prev.filter((a) => a.id !== deleteTarget.id));
            setDeleteTarget(null);
        } catch (err) {
            alert(err.message);
        } finally {
            setDeleteLoading(false);
        }
    }

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return applications.filter((a) => {
            const matchStatus = !filterStatus || a.status === filterStatus;
            const matchSearch = !q
                || a.clientName?.toLowerCase().includes(q)
                || a.applicationNumber?.toLowerCase().includes(q)
                || a.clientPhone?.includes(q);
            return matchStatus && matchSearch;
        });
    }, [applications, filterStatus, search]);

    const columns = useMemo(() => [
        {
            key: 'applicationNumber',
            label: '№ Заявки',
            render: (v) => <span className="admin-code" style={{ fontWeight: 700 }}>{v || '—'}</span>,
        },
        {
            key: 'clientName',
            label: 'Клієнт',
            render: (v) => <span style={{ fontWeight: 600 }}>{v || '—'}</span>,
        },
        {
            key: 'clientPhone',
            label: 'Телефон',
            render: (v) => <span style={{ color: '#6b7280' }}>{v || '—'}</span>,
        },
        {
            key: 'items',
            label: 'Інструменти',
            render: (items) => {
                const arr = Array.isArray(items) ? items : [];
                if (!arr.length) return <span style={{ color: '#d1d5db' }}>—</span>;
                const preview = arr.slice(0, 2).map((i) => i.name).join(', ');
                return (
                    <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                        {preview}{arr.length > 2 ? ` +${arr.length - 2}` : ''}
                    </span>
                );
            },
        },
        {
            key: 'rentFrom',
            label: 'Оренда',
            render: (_, row) => (
                <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                    {row.rentFrom ? `${fmtDate(row.rentFrom)} — ${fmtDate(row.rentTo)}` : '—'}
                </span>
            ),
        },
        {
            key: 'totalAmount',
            label: 'Сума',
            render: (v) => (
                <span style={{ fontWeight: 700 }}>
                    {v != null && v >= 0 ? `${Number(v).toLocaleString('uk-UA')} ₴` : '—'}
                </span>
            ),
        },
        {
            key: 'status',
            label: 'Статус',
            render: (v) => {
                const s = STATUS_META[v] || { label: v, variant: 'secondary' };
                return <Badge variant={s.variant}>{s.label}</Badge>;
            },
        },
        {
            key: 'id',
            label: 'Дії',
            width: '90px',
            render: (id, row) => (
                <ApplicationRowActions id={id} row={row} onDelete={setDeleteTarget} navigate={navigate} />
            ),
        },
    ], [navigate]);

    return (
        <div>
            <AdminPageHeader
                title="Заявки оренди"
                subtitle="Договори та заявки на оренду інструменту"
                actions={
                    <Link to="/admin/rental-applications/new" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                        <Plus size={16} /> Створити заявку
                    </Link>
                }
            />

            <AdminFilters
                search={search}
                onSearch={setSearch}
                placeholder="Пошук за клієнтом, номером, телефоном..."
                filters={[{
                    key: 'status',
                    label: 'Всі статуси',
                    value: filterStatus,
                    options: STATUS_FILTER_OPTIONS,
                }]}
                onFilter={(key, value) => { if (key === 'status') setFilterStatus(value); }}
            />

            <AdminTable
                columns={columns}
                rows={filtered}
                loading={loading}
                empty="Заявок поки немає"
                onRowClick={(row) => navigate(`/admin/rental-applications/${row.id}`)}
            />

            {!loading && filtered.length > 0 && (
                <p style={{ marginTop: '12px', fontSize: '0.85rem', color: '#9ca3af' }}>
                    Показано {filtered.length} з {applications.length}
                </p>
            )}

            <ConfirmDialog
                open={!!deleteTarget}
                title="Видалити заявку?"
                message={deleteTarget ? `Видалити заявку ${deleteTarget.applicationNumber || '#' + deleteTarget.id}?` : ''}
                confirmText="Видалити"
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
                loading={deleteLoading}
            />
        </div>
    );
}

function ApplicationRowActions({ id, row, onDelete, navigate }) {
    return (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
            <button
                type="button"
                className="action-btn"
                title="Відкрити"
                onClick={(e) => { e.stopPropagation(); navigate(`/admin/rental-applications/${id}`); }}
            >
                <Eye size={16} />
            </button>
            <button
                type="button"
                className="action-btn delete"
                title="Видалити"
                onClick={(e) => { e.stopPropagation(); onDelete(row); }}
            >
                <Trash2 size={16} />
            </button>
        </div>
    );
}
