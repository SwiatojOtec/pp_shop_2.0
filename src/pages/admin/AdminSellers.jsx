import { useEffect, useState, useMemo } from 'react';
import { Plus, Building2 } from 'lucide-react';
import { sellersApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../features/admin/ui/PageHeader';
import DataTable from '../../features/admin/ui/DataTable';
import StatusBadge from '../../features/admin/ui/StatusBadge';
import ConfirmDialog from '../../features/admin/ui/ConfirmDialog';
import SellerFormModal from '../../features/admin/company/SellerFormModal';
import '../../features/admin/company/company.css';

const TYPE_LABELS = { fop: 'ФОП', tov: 'ТОВ' };

export default function AdminSellers() {
    const { showToast } = useToast();
    const [sellers, setSellers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formOpen, setFormOpen] = useState(false);
    const [editingSeller, setEditingSeller] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [busyId, setBusyId] = useState(null);

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        try {
            const data = await sellersApi.list();
            setSellers(Array.isArray(data) ? data : []);
        } catch (err) {
            showToast(err.message || 'Не вдалося завантажити юросіб', 'warning');
            setSellers([]);
        } finally {
            setLoading(false);
        }
    }

    const openCreate = () => { setEditingSeller(null); setFormOpen(true); };
    const startEdit = (s) => { setEditingSeller(s); setFormOpen(true); };
    const handleSaved = () => { setFormOpen(false); load(); };

    async function makeDefault(seller) {
        if (seller.isDefault) return;
        setBusyId(seller.id);
        try {
            await sellersApi.patch(seller.id, { isDefault: true });
            await load();
        } catch (err) {
            showToast(err.message || 'Помилка збереження', 'warning');
        } finally {
            setBusyId(null);
        }
    }

    async function handleDelete() {
        if (!deleteTarget) return;
        setDeleteLoading(true);
        try {
            await sellersApi.remove(deleteTarget.id);
            await load();
            setDeleteTarget(null);
        } catch (err) {
            showToast(err.message || 'Помилка видалення', 'warning');
        } finally {
            setDeleteLoading(false);
        }
    }

    const columns = useMemo(() => [
        {
            key: 'label',
            label: 'Назва',
            render: (label, s) => (
                <div className="seller-name-cell">
                    <span className="seller-name-cell__label">{label}</span>
                    <span className="seller-name-cell__type">{TYPE_LABELS[s.type] || s.type}{s.appliesVat ? ' · платник ПДВ' : ''}</span>
                </div>
            ),
        },
        {
            key: 'taxId',
            label: 'ІПН / ЄДРПОУ',
            render: (val, s) => <span className="mono">{s.taxIdLabel || 'ІПН'} {val || '—'}</span>,
        },
        {
            key: 'legalAddress',
            label: 'Адреса',
            render: (val) => val || '—',
        },
        {
            key: 'isDefault',
            label: 'За замовчуванням',
            render: (val, s) => (val ? (
                <StatusBadge tone="success" label="За замовчуванням" />
            ) : (
                <button
                    type="button"
                    className="ds-btn ds-btn--secondary ds-btn--sm"
                    onClick={() => makeDefault(s)}
                    disabled={busyId === s.id}
                >
                    Зробити основною
                </button>
            )),
        },
        {
            key: 'id',
            label: 'Дії',
            align: 'right',
            render: (_, s) => (
                <div className="company-actions-cell">
                    <button type="button" className="ds-btn ds-btn--secondary" onClick={() => startEdit(s)}>
                        Редагувати
                    </button>
                    <button
                        type="button"
                        className="ds-btn ds-btn--secondary"
                        onClick={() => setDeleteTarget(s)}
                        disabled={s.isDefault}
                        title={s.isDefault ? 'Спершу призначте іншу юрособу за замовчуванням' : 'Видалити'}
                    >
                        Видалити
                    </button>
                </div>
            ),
        },
    ], [busyId]);

    return (
        <div>
            <PageHeader
                title="Юрособи"
                subtitle={loading ? '' : `${sellers.length} юросіб`}
                actions={(
                    <button type="button" className="ds-btn ds-btn--primary" onClick={openCreate}>
                        <Plus size={16} /> Нова юрособа
                    </button>
                )}
            />

            <DataTable
                columns={columns}
                rows={sellers}
                loading={loading}
                emptyIcon={Building2}
                emptyTitle="Юросіб ще немає"
            />

            <SellerFormModal
                open={formOpen}
                seller={editingSeller}
                onClose={() => setFormOpen(false)}
                onSaved={handleSaved}
            />

            <ConfirmDialog
                open={!!deleteTarget}
                title="Видалити юрособу?"
                message={deleteTarget ? `Видалити «${deleteTarget.label}»? Угоди, що вже посилаються на неї, збережуть історичні дані документів.` : ''}
                confirmText="Видалити"
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
                loading={deleteLoading}
            />
        </div>
    );
}
