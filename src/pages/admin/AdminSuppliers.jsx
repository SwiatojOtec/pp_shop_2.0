import { useEffect, useState, useMemo } from 'react';
import { Plus, Truck, Trash2 } from 'lucide-react';
import { suppliersApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../features/admin/ui/PageHeader';
import DataTable from '../../features/admin/ui/DataTable';
import Switch from '../../features/admin/ui/Switch';
import ConfirmDialog from '../../features/admin/ui/ConfirmDialog';
import SupplierFormModal from '../../features/admin/catalog/SupplierFormModal';
import '../../features/admin/company/company.css';

export default function AdminSuppliers() {
    const { showToast } = useToast();
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formOpen, setFormOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [busyId, setBusyId] = useState(null);

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        try {
            const data = await suppliersApi.list();
            setSuppliers(Array.isArray(data) ? data : []);
        } catch (err) {
            showToast(err.message || 'Не вдалося завантажити постачальників', 'warning');
            setSuppliers([]);
        } finally {
            setLoading(false);
        }
    }

    const openCreate = () => { setEditingSupplier(null); setFormOpen(true); };
    const startEdit = (s) => { setEditingSupplier(s); setFormOpen(true); };
    const handleSaved = () => { setFormOpen(false); load(); };

    async function toggleActive(supplier, value) {
        setBusyId(supplier.id);
        try {
            await suppliersApi.patch(supplier.id, { isActive: value });
            setSuppliers((prev) => prev.map((s) => (s.id === supplier.id ? { ...s, isActive: value } : s)));
        } catch (err) {
            showToast(err.message || 'Не вдалося оновити постачальника', 'warning');
        } finally {
            setBusyId(null);
        }
    }

    async function handleDelete() {
        if (!deleteTarget) return;
        setDeleteLoading(true);
        try {
            await suppliersApi.remove(deleteTarget.id);
            await load();
            setDeleteTarget(null);
        } catch (err) {
            showToast(err.message || 'Помилка видалення', 'warning');
        } finally {
            setDeleteLoading(false);
        }
    }

    const columns = useMemo(() => [
        { key: 'name', label: 'Назва' },
        { key: 'contactPerson', label: 'Контактна особа', render: (v) => v || '—' },
        { key: 'phone', label: 'Телефон', render: (v) => v || '—' },
        {
            key: 'discountPercent',
            label: 'Знижка',
            align: 'right',
            render: (v) => (v != null ? `${v}%` : '—'),
        },
        {
            key: 'isActive',
            label: 'Активний',
            align: 'center',
            render: (v, s) => (
                <div onClick={(e) => e.stopPropagation()}>
                    <Switch
                        checked={v !== false}
                        onChange={(checked) => toggleActive(s, checked)}
                        label={`Активний: ${s.name}`}
                        disabled={busyId === s.id}
                    />
                </div>
            ),
        },
        {
            key: 'id',
            label: 'Дії',
            align: 'right',
            render: (_, s) => (
                <button
                    type="button"
                    className="ds-icon-btn"
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(s); }}
                    title="Видалити"
                >
                    <Trash2 size={16} />
                </button>
            ),
        },
    ], [busyId]);

    return (
        <div>
            <PageHeader
                title="Постачальники"
                subtitle={loading ? '' : `${suppliers.length} постачальників`}
                actions={(
                    <button type="button" className="ds-btn ds-btn--primary" onClick={openCreate}>
                        <Plus size={16} /> Новий постачальник
                    </button>
                )}
            />

            <DataTable
                columns={columns}
                rows={suppliers}
                loading={loading}
                onRowClick={startEdit}
                emptyIcon={Truck}
                emptyTitle="Постачальників ще немає"
            />

            <SupplierFormModal
                open={formOpen}
                supplier={editingSupplier}
                onClose={() => setFormOpen(false)}
                onSaved={handleSaved}
            />

            <ConfirmDialog
                open={!!deleteTarget}
                title="Видалити постачальника?"
                message={deleteTarget ? `Видалити «${deleteTarget.name}»? Товари, привʼязані до нього, збережуть посилання, доки ви не оберете іншого постачальника. Цю дію не можна скасувати.` : ''}
                confirmText="Видалити"
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
                loading={deleteLoading}
            />
        </div>
    );
}
