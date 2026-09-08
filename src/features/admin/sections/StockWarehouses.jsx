import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { warehouseApi, warehousesApi } from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import PageHeader from '../../admin/ui/PageHeader';
import DataTable from '../../admin/ui/DataTable';
import StatusBadge from '../../admin/ui/StatusBadge';
import ConfirmDialog from '../../admin/ui/ConfirmDialog';
import CreateWarehouseModal from '../stock/components/CreateWarehouseModal';
import { useWarehouses } from '../stock/hooks/useWarehouses';
import '../stock/stock.css';

/* Was AdminAdminHome.jsx → the unreachable /admin/admin screen, then a bare
   delete-request queue at Склад → Склади. Now the full warehouse table
   (docs/admin-redesign/03-screens.md, 1.4) — create, request-delete and
   approve/reject all live on the one screen that owns warehouse lifecycle. */

const SERVICE_NAMES = ['Основний склад', 'У ремонті'];

export default function StockWarehouses() {
    const { showToast } = useToast();
    const { createWarehouse } = useWarehouses();
    const [warehouses, setWarehouses] = useState([]);
    const [summaryByWarehouse, setSummaryByWarehouse] = useState(new Map());
    const [pendingByWarehouse, setPendingByWarehouse] = useState(new Map());
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [approveTarget, setApproveTarget] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            const [list, dash, pending] = await Promise.all([
                warehousesApi.list(),
                warehouseApi.dashboard(),
                warehouseApi.deleteRequests(),
            ]);
            setWarehouses(Array.isArray(list) ? list : []);
            setSummaryByWarehouse(new Map((dash?.warehouseSummary || []).map((s) => [s.warehouseId, s])));
            setPendingByWarehouse(new Map(
                (Array.isArray(pending) ? pending : [])
                    .filter((r) => r.action === 'warehouse_delete_request')
                    .map((r) => [r.fromWarehouseId, r])
            ));
        } catch (e) {
            showToast(e.message || 'Помилка завантаження', 'warning');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const requestDelete = async () => {
        if (!deleteTarget) return;
        setBusyId(deleteTarget.id);
        try {
            const data = await warehousesApi.requestDelete(deleteTarget.id);
            showToast(data?.message || 'Запит створено.', 'success');
            setDeleteTarget(null);
            await load();
        } catch (e) {
            showToast(e.message || 'Не вдалося створити запит.', 'warning');
        } finally {
            setBusyId(null);
        }
    };

    const decide = async (accept) => {
        if (!approveTarget) return;
        const { request } = approveTarget;
        setBusyId(request.fromWarehouseId);
        try {
            if (accept) await warehouseApi.approveDeleteRequest(request.id);
            else await warehouseApi.rejectDeleteRequest(request.id);
            showToast(accept ? 'Склад видалено.' : 'Запит відхилено.', 'success');
            setApproveTarget(null);
            await load();
        } catch (e) {
            showToast(e.message || 'Помилка', 'warning');
        } finally {
            setBusyId(null);
        }
    };

    const pendingCount = pendingByWarehouse.size;

    const columns = [
        {
            key: 'name',
            label: 'Склад',
            render: (_, w) => (
                <div>
                    <div className="stock-product-name">{w.name}</div>
                    {w.notes && <div className="stock-warehouses-service-pill">{w.notes}</div>}
                </div>
            ),
        },
        {
            key: 'products',
            label: 'Позицій',
            align: 'right',
            className: 'stock-price-cell',
            render: (_, w) => summaryByWarehouse.get(w.id)?.products ?? 0,
        },
        {
            key: 'quantity',
            label: 'Одиниць',
            align: 'right',
            className: 'stock-price-cell',
            render: (_, w) => summaryByWarehouse.get(w.id)?.quantity ?? 0,
        },
        {
            key: 'state',
            label: 'Стан',
            render: (_, w) => {
                if (SERVICE_NAMES.includes(w.name)) return <StatusBadge tone="neutral" label="Службовий" />;
                if (pendingByWarehouse.has(w.id)) return <StatusBadge tone="warning" label="Запит на видалення" />;
                if (!w.isActive) return <StatusBadge tone="neutral" label="Неактивний" />;
                return <StatusBadge tone="success" label="Активний" />;
            },
        },
        {
            key: 'actions',
            label: 'Дії',
            align: 'right',
            render: (_, w) => {
                if (SERVICE_NAMES.includes(w.name)) return null;
                const pending = pendingByWarehouse.get(w.id);
                if (pending) {
                    return (
                        <div className="stock-toolbar-extra">
                            <button
                                type="button"
                                className="ds-btn ds-btn--primary"
                                disabled={busyId === w.id}
                                onClick={() => setApproveTarget({ warehouse: w, request: pending })}
                            >
                                Підтвердити
                            </button>
                            <button
                                type="button"
                                className="ds-btn ds-btn--secondary"
                                disabled={busyId === w.id}
                                onClick={() => setApproveTarget({ warehouse: w, request: pending, reject: true })}
                            >
                                Відхилити
                            </button>
                        </div>
                    );
                }
                return (
                    <button type="button" className="ds-btn ds-btn--secondary" onClick={() => setDeleteTarget(w)}>
                        Запит на видалення
                    </button>
                );
            },
        },
    ];

    return (
        <div className="stock-page">
            <PageHeader
                title="Склади"
                subtitle={`${warehouses.length} складів`}
                actions={(
                    <button type="button" className="ds-btn ds-btn--primary" onClick={() => setCreateOpen(true)}>
                        <Plus size={16} /> Створити склад
                    </button>
                )}
            />

            {pendingCount > 0 && (
                <div className="stock-warehouses-banner">
                    {pendingCount} {pendingCount === 1 ? 'запит' : 'запитів'} на видалення складу чекають рішення
                </div>
            )}

            <DataTable
                columns={columns}
                rows={warehouses}
                loading={loading}
                rowKey={(w) => w.id}
                emptyTitle="Складів ще немає"
            />

            <CreateWarehouseModal
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                onCreate={async (data) => {
                    const created = await createWarehouse(data);
                    await load();
                    return created;
                }}
            />

            <ConfirmDialog
                open={!!deleteTarget}
                title="Запит на видалення складу?"
                message={deleteTarget ? `Створити запит на видалення складу «${deleteTarget.name}»? Його розгляне власник.` : ''}
                confirmText="Створити запит"
                loading={busyId === deleteTarget?.id}
                onConfirm={requestDelete}
                onCancel={() => setDeleteTarget(null)}
            />

            <ConfirmDialog
                open={!!approveTarget && !approveTarget.reject}
                title="Підтвердити видалення складу?"
                message={approveTarget ? `Склад «${approveTarget.warehouse.name}» буде видалено. На ньому ${summaryByWarehouse.get(approveTarget.warehouse.id)?.products ?? 0} позицій — переконайтесь, що вони вже перенесені: порожній склад видаляється, непорожній — ні.` : ''}
                confirmText="Видалити склад"
                loading={busyId === approveTarget?.warehouse?.id}
                onConfirm={() => decide(true)}
                onCancel={() => setApproveTarget(null)}
            />

            <ConfirmDialog
                open={!!approveTarget?.reject}
                title="Відхилити запит?"
                message={approveTarget ? `Запит на видалення складу «${approveTarget.warehouse.name}» буде відхилено.` : ''}
                confirmText="Відхилити"
                danger={false}
                loading={busyId === approveTarget?.warehouse?.id}
                onConfirm={() => decide(false)}
                onCancel={() => setApproveTarget(null)}
            />
        </div>
    );
}
