import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, ShoppingBag } from 'lucide-react';
import PageHeader from '../../admin/ui/PageHeader';
import Tabs from '../../admin/ui/Tabs';
import Toolbar from '../../admin/ui/Toolbar';
import DataTable from '../../admin/ui/DataTable';
import StatusBadge from '../../admin/ui/StatusBadge';
import { getStatusOptions } from '../../admin/model/status';
import { useDealsList } from '../hooks/useDealsList';
import { formatOrderDate } from '../amounts/orderHelpers';
import { clientsApi } from '../../../services/api';
import NewDealModal from '../components/deals/NewDealModal';
import '../styles/deals-list.css';

const money = (v) => Number(v || 0).toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtRentTo = (iso) => (iso ? iso.split('-').reverse().join('.') : '—');

export default function OrdersRentalList() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [newDealOpen, setNewDealOpen] = useState(false);
    const [prefillClient, setPrefillClient] = useState(null);
    const {
        rows, total, totalPages, counts, loading,
        type, status, q, page,
        setType, setStatus, setQ, setPage,
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

    const columns = useMemo(() => [
        {
            key: 'number',
            label: '№ / дата',
            render: (_, row) => (
                <div>
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
            render: (items) => {
                const arr = Array.isArray(items) ? items : [];
                const hasRent = arr.some((i) => i.isRent);
                const hasShop = arr.some((i) => !i.isRent);
                const preview = arr.slice(0, 2).map((i) => i.name).join(', ');
                return (
                    <span className="deals-list__items">
                        {hasRent && <span className="ds-badge ds-badge--info">оренда</span>}
                        {hasShop && <span className="ds-badge ds-badge--neutral">магазин</span>}
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
    ], []);

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
        </div>
    );
}
