import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, ShoppingBag, FilePlus2, Trash2 } from 'lucide-react';
import PageHeader from '../../admin/ui/PageHeader';
import Tabs from '../../admin/ui/Tabs';
import Toolbar from '../../admin/ui/Toolbar';
import DataTable from '../../admin/ui/DataTable';
import StatusBadge from '../../admin/ui/StatusBadge';
import ConfirmDialog from '../../admin/ui/ConfirmDialog';
import { getStatusOptions } from '../../admin/model/status';
import { useDealsList } from '../hooks/useDealsList';
import { formatOrderDate } from '../amounts/orderHelpers';
import { clientsApi, rentalApplicationsApi } from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import NewDealModal from '../components/deals/NewDealModal';
import '../styles/deals-list.css';

const money = (v) => Number(v || 0).toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtRentTo = (iso) => (iso ? iso.split('-').reverse().join('.') : '—');

export default function OrdersRentalList() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const [newDealOpen, setNewDealOpen] = useState(false);
    const [prefillClient, setPrefillClient] = useState(null);
    const [convertingId, setConvertingId] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteBusy, setDeleteBusy] = useState(false);
    const {
        rows, total, totalPages, counts, loading,
        type, status, q, page,
        setType, setStatus, setQ, setPage, reload,
    } = useDealsList();

    useEffect(() => {
        const raw = searchParams.get('newClientId');
        if (!raw) return;
        const cid = parseInt(raw, 10);
        setSearchParams((prev) => {
            const n = new URLSearchParams(prev);
            n.delete('newClientId');
            return n;
        }, { replace: true });
        if (Number.isNaN(cid) || cid <= 0) return;
        (async () => {
            try {
                const client = await clientsApi.get(cid);
                setPrefillClient(client);
                setNewDealOpen(true);
            } catch {
                // client no longer exists — just open the blank modal
                setNewDealOpen(true);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const tabs = useMemo(() => ([
        { value: 'all', label: 'Всі', count: counts.all },
        { value: 'shop', label: 'Магазин', count: counts.shop },
        { value: 'rent', label: 'Оренда', count: counts.rent },
        { value: 'calendar', label: 'Календар' },
    ]), [counts]);

    function handleTabChange(value) {
        if (value === 'calendar') {
            navigate('/admin/deals/calendar');
            return;
        }
        setType(value);
    }

    function openRow(row) {
        if (row.kind === 'application') {
            navigate(`/admin/rental-applications/${row.id}`);
        } else {
            navigate(`/admin/deals/${row.id}`);
        }
    }

    const handleConvertToOrder = useCallback(async (row) => {
        if (convertingId) return;
        setConvertingId(row.id);
        try {
            const { order } = await rentalApplicationsApi.convertToOrder(row.id);
            showToast('Угоду створено', 'success');
            reload();
            if (order?.id) navigate(`/admin/deals/${order.id}`);
        } catch (err) {
            showToast(err.message || 'Не вдалося створити угоду', 'warning');
        } finally {
            setConvertingId(null);
        }
    }, [convertingId, showToast, reload, navigate]);

    async function confirmDeleteApplication() {
        if (!deleteTarget) return;
        setDeleteBusy(true);
        try {
            await rentalApplicationsApi.remove(deleteTarget.id);
            showToast('Заявку видалено', 'success');
            setDeleteTarget(null);
            reload();
        } catch (err) {
            showToast(err.message || 'Не вдалося видалити заявку', 'warning');
        } finally {
            setDeleteBusy(false);
        }
    }

    const columns = useMemo(() => [
        {
            key: 'number',
            label: '№ / дата',
            render: (_, row) => (
                <div title={row.kind === 'application' ? 'Заявка оренди без угоди — конвертуйте або видаліть' : undefined}>
                    <div className="mono">{row.number}</div>
                    <div className="deals-list__date">{formatOrderDate(row.createdAt)}</div>
                </div>
            ),
        },
        {
            key: 'customerName',
            label: 'Клієнт',
            render: (_, row) => (
                <div>
                    <div className="deals-list__client-name">{row.customerName || '—'}</div>
                    <div className="mono deals-list__client-phone">{row.customerPhone || ''}</div>
                </div>
            ),
        },
        {
            key: 'items',
            label: 'Позиції',
            render: (items, row) => {
                const arr = Array.isArray(items) ? items : [];
                const preview = arr.slice(0, 2).map((i) => i.name).join(', ');
                return (
                    <span className="deals-list__items">
                        {row.kind === 'application' ? (
                            <span className="ds-badge ds-badge--neutral">заявка</span>
                        ) : (
                            <>
                                {(row.type === 'rent' || row.type === 'both') && <span className="ds-badge ds-badge--info">оренда</span>}
                                {(row.type === 'shop' || row.type === 'both') && <span className="ds-badge ds-badge--neutral">магазин</span>}
                            </>
                        )}
                        {preview && <span className="deals-list__items-desc"> · {preview}{arr.length > 2 ? ` +${arr.length - 2}` : ''}</span>}
                    </span>
                );
            },
        },
        {
            key: 'totalAmount',
            label: 'Сума',
            align: 'right',
            render: (v) => <span className="num">{money(v)} ₴</span>,
        },
        {
            key: 'status',
            label: 'Статус',
            render: (v, row) => <StatusBadge domain={row.statusDomain} status={v} />,
        },
        {
            key: 'rentTo',
            label: 'Оренда до',
            render: (v, row) => (
                v ? <span className={`mono${row.isOverdue ? ' deals-list__overdue' : ''}`}>{fmtRentTo(v)}</span> : <span className="deals-list__dash">—</span>
            ),
        },
        {
            key: 'actions',
            label: '',
            align: 'right',
            render: (_, row) => {
                if (row.kind !== 'application') return null;
                return (
                    <div className="deals-list__row-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            className="ds-btn ds-btn--secondary"
                            disabled={!!convertingId}
                            onClick={() => handleConvertToOrder(row)}
                            title="Перетворити заявку на угоду"
                        >
                            <FilePlus2 size={14} />
                            {convertingId === row.id ? 'Створюємо…' : 'Створити угоду'}
                        </button>
                        <button
                            type="button"
                            className="ds-icon-btn ds-icon-btn--danger"
                            onClick={() => setDeleteTarget(row)}
                            title="Видалити заявку"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                );
            },
        },
    ], [convertingId, handleConvertToOrder]);

    return (
        <div>
            <PageHeader title="Угоди" subtitle="Замовлення магазину та оренди" />

            <Tabs tabs={tabs} value={type} onChange={handleTabChange} />

            <Toolbar
                search={q}
                onSearch={(value) => setQ(value)}
                placeholder="Пошук за ім'ям, телефоном або № угоди..."
                filters={[
                    { key: 'status', label: 'Всі статуси', value: status, options: getStatusOptions('order') },
                ]}
                onFilter={(key, value) => { if (key === 'status') setStatus(value); }}
                actions={(
                    <button type="button" className="ds-btn ds-btn--primary" onClick={() => setNewDealOpen(true)}>
                        <Plus size={16} /> Нова угода
                    </button>
                )}
            />

            <DataTable
                columns={columns}
                rows={rows}
                rowKey={(row) => `${row.kind}-${row.id}`}
                loading={loading}
                onRowClick={openRow}
                emptyIcon={ShoppingBag}
                emptyTitle="Угод не знайдено"
            />

            {totalPages > 1 && (
                <div className="deals-list__pager">
                    <button type="button" className="ds-btn ds-btn--secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                        Назад
                    </button>
                    <span className="deals-list__pager-info">{page} з {totalPages} · {total} угод</span>
                    <button type="button" className="ds-btn ds-btn--secondary" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                        Далі
                    </button>
                </div>
            )}

            <NewDealModal
                open={newDealOpen}
                prefillClient={prefillClient}
                onClose={() => { setNewDealOpen(false); setPrefillClient(null); }}
            />

            <ConfirmDialog
                open={!!deleteTarget}
                title="Видалити заявку?"
                message={`Заявку ${deleteTarget?.number || ''} без прив'язаної угоди буде видалено безповоротно.`}
                confirmText="Видалити"
                loading={deleteBusy}
                onConfirm={confirmDeleteApplication}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}
