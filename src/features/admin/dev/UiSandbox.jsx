import { useState } from 'react';
import { Inbox, Plus } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Tabs from '../ui/Tabs';
import Toolbar from '../ui/Toolbar';
import DataTable from '../ui/DataTable';
import StatusBadge from '../ui/StatusBadge';
import EmptyState from '../ui/EmptyState';
import Modal from '../ui/Modal';
import ConfirmDialog from '../ui/ConfirmDialog';
import Drawer from '../ui/Drawer';
import { STATUS_DOMAINS } from '../model/status';
import './ui-sandbox.css';

const SAMPLE_ROWS = [
    { id: 1, name: 'Перфоратор Bosch GBH 2-26', status: 'available', qty: 4 },
    { id: 2, name: 'Ламінат Egger 33 клас', status: 'rented', qty: 12 },
    { id: 3, name: 'Риштування будівельне', status: 'needs_repair', qty: 1 },
];

const SAMPLE_COLUMNS = [
    { key: 'name', label: 'Назва', sortable: true },
    {
        key: 'status',
        label: 'Статус',
        render: (value) => <StatusBadge domain="stock" status={value} />,
    },
    { key: 'qty', label: 'К-сть', align: 'right', sortable: true },
];

/**
 * Component gallery for src/features/admin/ui — not linked from any nav,
 * used only to eyeball the design system in both themes
 * (docs/admin-redesign/00-plan.md, крок 1, "готово, коли").
 */
export default function UiSandbox() {
    return (
        <div className="ui-sandbox">
            <ThemeColumn theme="light" label="Світла тема" />
            <ThemeColumn theme="dark" label="Темна тема" />
        </div>
    );
}

function ThemeColumn({ theme, label }) {
    const [tab, setTab] = useState('all');
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [sortKey, setSortKey] = useState('name');
    const [sortDirection, setSortDirection] = useState('asc');
    const [modalOpen, setModalOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const handleSort = (key) => {
        if (key === sortKey) {
            setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortKey(key);
            setSortDirection('asc');
        }
    };

    return (
        <section className={`ui-sandbox-column ds-theme-${theme}`}>
            <p className="ui-sandbox-label">{label}</p>

            <PageHeader
                title="Пісочниця дизайн-системи"
                subtitle="Кожен компонент з src/features/admin/ui"
                actions={
                    <>
                        <button type="button" className="ds-btn ds-btn--secondary" onClick={() => setDrawerOpen(true)}>
                            Відкрити Drawer
                        </button>
                        <button type="button" className="ds-btn ds-btn--primary" onClick={() => setModalOpen(true)}>
                            <Plus size={16} /> Відкрити Modal
                        </button>
                    </>
                }
            />

            <Tabs
                tabs={[
                    { value: 'all', label: 'Всі', count: SAMPLE_ROWS.length },
                    { value: 'rent', label: 'Оренда', count: 2 },
                ]}
                value={tab}
                onChange={setTab}
            />

            <Toolbar
                search={search}
                onSearch={setSearch}
                placeholder="Пошук по назві..."
                filters={[
                    {
                        key: 'status',
                        label: 'Статус',
                        value: filterStatus,
                        options: Object.entries(STATUS_DOMAINS.stock).map(([value, meta]) => ({
                            value,
                            label: meta.label,
                        })),
                    },
                ]}
                onFilter={(_, value) => setFilterStatus(value)}
                actions={
                    <button type="button" className="ds-btn ds-btn--danger" onClick={() => setConfirmOpen(true)}>
                        Видалити
                    </button>
                }
            />

            <DataTable
                columns={SAMPLE_COLUMNS}
                rows={SAMPLE_ROWS}
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
            />

            <DataTable columns={SAMPLE_COLUMNS} rows={[]} loading skeletonRows={3} />

            <DataTable
                columns={SAMPLE_COLUMNS}
                rows={[]}
                emptyIcon={Inbox}
                emptyTitle="Нічого не знайдено"
                emptyDescription="Спробуйте змінити фільтри або пошуковий запит."
            />

            <div className="ui-sandbox-badges">
                {Object.entries(STATUS_DOMAINS).map(([domain, statuses]) => (
                    <div key={domain} className="ui-sandbox-badge-row">
                        {Object.keys(statuses).map((status) => (
                            <StatusBadge key={status} domain={domain} status={status} />
                        ))}
                    </div>
                ))}
            </div>

            <EmptyState
                icon={Inbox}
                title="Порожньо і тут"
                description="EmptyState окремо від таблиці — для карток і бічних панелей."
            />

            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Приклад Modal"
                footer={
                    <div className="ds-confirm-actions">
                        <button type="button" className="ds-btn ds-btn--secondary" onClick={() => setModalOpen(false)}>
                            Скасувати
                        </button>
                        <button type="button" className="ds-btn ds-btn--primary" onClick={() => setModalOpen(false)}>
                            Зберегти
                        </button>
                    </div>
                }
            >
                <p>Вміст модального вікна для перевірки токенів і теми.</p>
            </Modal>

            <ConfirmDialog
                open={confirmOpen}
                onConfirm={() => setConfirmOpen(false)}
                onCancel={() => setConfirmOpen(false)}
                message="Це демонстраційне підтвердження — нічого насправді не видаляється."
            />

            <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Приклад Drawer">
                <p>Бічна панель з фокус-трапом і блокуванням скролу.</p>
            </Drawer>
        </section>
    );
}
