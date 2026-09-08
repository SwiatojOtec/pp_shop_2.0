import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Eye, ClipboardList } from 'lucide-react';
import { rentalApplicationsApi } from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import PageHeader from '../../admin/ui/PageHeader';
import Toolbar from '../../admin/ui/Toolbar';
import DataTable from '../../admin/ui/DataTable';
import StatusBadge from '../../admin/ui/StatusBadge';
import ConfirmDialog from '../../admin/ui/ConfirmDialog';
import { STATUS_FILTER_OPTIONS } from '../model/rentalStatus';
import { fmtDate as fmtDateShared } from '../model/rentalDocFormat';

const fmtDate = (d) => fmtDateShared(d, '—');

export default function AdminRentalApplications({ hideHeader = false }) {
    const navigate = useNavigate();
    const { showToast } = useToast();
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
            showToast(err.message || 'Помилка видалення', 'warning');
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
            render: (v) => <code className="admin-code font-bold">{v || '—'}</code>,
        },
        {
            key: 'clientName',
            label: 'Клієнт',
            render: (v) => <span className="font-semibold">{v || '—'}</span>,
        },
        {
            key: 'clientPhone',
            label: 'Телефон',
            render: (v) => <span className="text-gray-500">{v || '—'}</span>,
        },
        {
            key: 'items',
            label: 'Інструменти',
            render: (items) => {
                const arr = Array.isArray(items) ? items : [];
                if (!arr.length) return <span className="text-gray-300">—</span>;
                const preview = arr.slice(0, 2).map((i) => i.name).join(', ');
                return (
                    <span className="text-sm text-gray-500">
                        {preview}{arr.length > 2 ? ` +${arr.length - 2}` : ''}
                    </span>
                );
            },
        },
        {
            key: 'rentFrom',
            label: 'Оренда',
            render: (_, row) => (
                <span className="text-sm text-gray-500">
                    {row.rentFrom ? `${fmtDate(row.rentFrom)} — ${fmtDate(row.rentTo)}` : '—'}
                </span>
            ),
        },
        {
            key: 'totalAmount',
            label: 'Сума',
            render: (v) => (
                <span className="font-bold">
                    {v != null && v >= 0 ? `${Number(v).toLocaleString('uk-UA')} ₴` : '—'}
                </span>
            ),
        },
        {
            key: 'status',
            label: 'Статус',
            render: (v) => <StatusBadge domain="rental" status={v} />,
        },
        {
            key: 'id',
            label: 'Дії',
            align: 'right',
            render: (id, row) => (
                <ApplicationRowActions id={id} row={row} onDelete={setDeleteTarget} navigate={navigate} />
            ),
        },
    ], [navigate]);

    return (
        <div>
            {!hideHeader && (
                <PageHeader
                    title="Заявки оренди"
                    subtitle="Договори та заявки на оренду інструменту"
                    actions={(
                        <Link to="/admin/rental-applications/new" className="ds-btn ds-btn--primary">
                            <Plus size={16} /> Створити заявку
                        </Link>
                    )}
                />
            )}

            <Toolbar
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

            <DataTable
                columns={columns}
                rows={filtered}
                loading={loading}
                emptyIcon={ClipboardList}
                emptyTitle="Заявок поки немає"
                onRowClick={(row) => navigate(`/admin/rental-applications/${row.id}`)}
            />

            {!loading && filtered.length > 0 && (
                <p className="mt-3 text-sm text-gray-400">
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
        <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
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
