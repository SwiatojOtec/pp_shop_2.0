import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Plus, PackageSearch } from 'lucide-react';
import { inventoryApi } from '../../../../services/api';
import PageHeader from '../../ui/PageHeader';
import Toolbar from '../../ui/Toolbar';
import Tabs from '../../ui/Tabs';
import DataTable from '../../ui/DataTable';
import StatusBadge from '../../ui/StatusBadge';
import { useWarehouses } from '../hooks/useWarehouses';
import { useInventory } from '../hooks/useInventory';
import { useInventorySuggestions } from '../hooks/useInventorySuggestions';
import { getStockStatusBadgeProps } from '../model/stockStatus';
import { exportWarehousePdf } from '../model/exportWarehousePdf';
import { formatRentCatalogPriceCaption } from '../../../../utils/rentPricing';
import { optimizeImageUrl } from '../../../../utils/imageOptimize';
import BulkMoveModal from '../components/BulkMoveModal';
import ProductWorkDrawer from '../components/ProductWorkDrawer';
import '../stock.css';

const STATUS_FILTER_OPTIONS = [
    { value: 'in_stock', label: 'Вільний' },
    { value: 'available_later', label: 'Буде доступно з дати' },
    { value: 'in_procurement', label: 'У закупівлі' },
    { value: 'needs_repair', label: 'Потребує ремонту' },
    { value: 'in_repair', label: 'На ремонті' },
    { value: 'out_of_stock', label: 'Немає в наявності' },
];

const rentNewWithReturn = (warehouseId) =>
    `/admin/catalog/tools/new?returnTo=${encodeURIComponent('/admin/stock')}${warehouseId ? `&warehouseId=${encodeURIComponent(String(warehouseId))}` : ''}`;

export default function StockPositions() {
    const navigate = useNavigate();
    const { warehouses, selectedWarehouseId, setSelectedWarehouseId } = useWarehouses();
    const { inventory, refetch } = useInventory(selectedWarehouseId);

    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterInCatalog, setFilterInCatalog] = useState('');

    const [bulkOpen, setBulkOpen] = useState(false);
    const [workRow, setWorkRow] = useState(null);
    const [selectedIds, setSelectedIds] = useState(() => new Set());

    const selectedWarehouse = useMemo(
        () => warehouses.find((w) => w.id === selectedWarehouseId) || null,
        [warehouses, selectedWarehouseId]
    );
    const targetWarehouses = useMemo(
        () => warehouses.filter((w) => w.id !== selectedWarehouseId),
        [warehouses, selectedWarehouseId]
    );
    const warehouseTabs = useMemo(
        () => warehouses.map((w) => ({ value: String(w.id), label: w.name })),
        [warehouses]
    );

    const q = search.trim().toLowerCase();

    const filterOptions = useMemo(() => {
        const categories = new Set();
        for (const row of inventory) {
            if (row.Product?.category) categories.add(row.Product.category);
        }
        return { categories: [...categories].sort((a, b) => a.localeCompare(b, 'uk')) };
    }, [inventory]);

    const filteredInventory = useMemo(() => {
        let rows = inventory;
        if (filterStatus) {
            rows = rows.filter((row) => {
                const s = row.Product?.stockStatus;
                return filterStatus === 'in_stock' ? (s === 'in_stock' || s === 'available') : s === filterStatus;
            });
        }
        if (filterCategory) rows = rows.filter((row) => (row.Product?.category || '') === filterCategory);
        if (filterInCatalog === 'yes') rows = rows.filter((row) => row.Product?.showInRentCatalog !== false);
        if (filterInCatalog === 'no') rows = rows.filter((row) => row.Product?.showInRentCatalog === false);
        if (!q) return rows;
        return rows.filter((row) => {
            const p = row.Product;
            if (!p) return false;
            const hay = `${p.name || ''} ${p.sku || ''} ${p.inventoryNumber || ''} ${p.serialNumber || ''} ${p.category || ''} ${p.brand || ''}`.toLowerCase();
            return hay.includes(q);
        });
    }, [inventory, q, filterStatus, filterCategory, filterInCatalog]);

    const { suggestions, loading: suggestLoading } = useInventorySuggestions({
        search,
        warehouseId: selectedWarehouseId,
        hasLocalMatches: filteredInventory.length > 0,
    });

    const selectedRows = useMemo(
        () => (selectedIds.size ? filteredInventory.filter((r) => selectedIds.has(r.id)) : []),
        [filteredInventory, selectedIds]
    );

    const doBulkMove = async (toWarehouseId, qtyById) => {
        const items = selectedRows
            .map((row) => ({ productId: row.productId, quantity: Math.floor(Number(qtyById[row.id] ?? 0)) }))
            .filter((it) => it.quantity > 0);
        for (const row of selectedRows) {
            const qty = Math.floor(Number(qtyById[row.id] ?? 0));
            if (qty > 0 && qty > (row.quantity || 0)) {
                throw new Error(`Некоректна кількість для «${row.Product?.name || 'товар'}»`);
            }
        }
        await inventoryApi.bulkMove({ items, fromWarehouseId: selectedWarehouseId, toWarehouseId });
        await refetch();
        setSelectedIds(new Set());
    };

    const columns = [
        {
            key: 'name',
            label: 'Інструмент',
            render: (_, row) => {
                const p = row.Product;
                return (
                    <div className="stock-product-cell">
                        {p?.image && <img src={optimizeImageUrl(p.image, { width: 120 })} alt="" className="stock-product-thumb" />}
                        <div>
                            <div className="stock-product-name">{p?.name || '—'}</div>
                            <div className="stock-product-meta">{p?.inventoryNumber || '—'} · {p?.sku || '—'}</div>
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'status',
            label: 'Стан',
            render: (_, row) => {
                const badge = getStockStatusBadgeProps(row.Product, row);
                return <StatusBadge tone={badge.tone} label={badge.label} />;
            },
        },
        {
            key: 'quantity',
            label: 'Кількість',
            align: 'right',
            render: (_, row) => {
                const onHand = row.quantity ?? 0;
                const committed = row.committedQuantity ?? 0;
                const free = row.Product?.quantityAvailable ?? 0;
                return (
                    <div className="stock-qty-cluster">
                        <div className="stock-qty-num">
                            <span className="stock-qty-value">{onHand}</span>
                            <span className="stock-qty-label">на складі</span>
                        </div>
                        <div className="stock-qty-num">
                            <span className="stock-qty-value">{committed}</span>
                            <span className="stock-qty-label">в оренді</span>
                        </div>
                        <div className={`stock-qty-num${free > 0 ? ' stock-qty-num--free' : ' stock-qty-num--zero'}`}>
                            <span className="stock-qty-value">{free}</span>
                            <span className="stock-qty-label">вільно</span>
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'price',
            label: 'Ціна / доба',
            align: 'right',
            className: 'stock-price-cell',
            render: (_, row) => (row.Product ? formatRentCatalogPriceCaption(row.Product) : '—'),
        },
        {
            key: 'showInRentCatalog',
            label: 'У каталозі',
            render: (_, row) => (
                row.Product?.showInRentCatalog !== false
                    ? <StatusBadge tone="success" label="Показано" />
                    : <StatusBadge tone="neutral" label="Приховано" />
            ),
        },
        {
            key: 'chevron',
            label: '',
            align: 'right',
            render: () => <ChevronRight size={16} className="stock-row-chevron" />,
        },
    ];

    return (
        <div className="stock-page">
            <PageHeader
                title="Залишки"
                subtitle="Клік по рядку відкриває всі дії з товаром — переміщення, ремонт, картка, каталог, списання."
                actions={(
                    <div className="stock-toolbar-extra">
                        <button
                            type="button"
                            className="ds-btn ds-btn--secondary"
                            disabled={!filteredInventory.length}
                            onClick={() => exportWarehousePdf({ warehouseName: selectedWarehouse?.name, rows: filteredInventory })}
                        >
                            Експорт PDF
                        </button>
                        <button type="button" className="ds-btn ds-btn--primary" onClick={() => navigate(rentNewWithReturn(selectedWarehouseId))}>
                            <Plus size={16} /> Новий інструмент
                        </button>
                    </div>
                )}
            />

            <div className="stock-warehouse-tabs">
                <Tabs
                    tabs={warehouseTabs}
                    value={selectedWarehouseId ? String(selectedWarehouseId) : ''}
                    onChange={(v) => setSelectedWarehouseId(Number(v))}
                />
            </div>
            {selectedWarehouse && !selectedWarehouse.isActive && (
                <p className="stock-active-warehouse">
                    <span className="stock-inactive-tag">Склад «{selectedWarehouse.name}» неактивний</span>
                </p>
            )}

            <div className="stock-search-row">
                <Toolbar
                    search={search}
                    onSearch={setSearch}
                    placeholder="Назва, SKU, інв. №, серійний…"
                    filters={[
                        { key: 'status', label: 'Стан', value: filterStatus, options: STATUS_FILTER_OPTIONS },
                        { key: 'category', label: 'Категорія', value: filterCategory, options: filterOptions.categories.map((c) => ({ value: c, label: c })) },
                        { key: 'catalog', label: 'У каталозі', value: filterInCatalog, options: [{ value: 'yes', label: 'Так' }, { value: 'no', label: 'Ні' }] },
                    ]}
                    onFilter={(key, value) => {
                        if (key === 'status') setFilterStatus(value);
                        if (key === 'category') setFilterCategory(value);
                        if (key === 'catalog') setFilterInCatalog(value);
                    }}
                />
            </div>

            {q.length >= 2 && filteredInventory.length === 0 && (
                <div className="stock-search-hint">
                    {suggestLoading ? (
                        <span className="stock-search-hint-muted">Шукаю по інших складах…</span>
                    ) : suggestions.length > 0 ? (
                        <div>
                            <div className="stock-search-hint-title">Можливо ви шукаєте:</div>
                            {suggestions.map((s) => (
                                <button
                                    key={`${s.productId}-${s.warehouseId}`}
                                    type="button"
                                    className="stock-suggest-item"
                                    onClick={() => {
                                        if (s.warehouseId) setSelectedWarehouseId(s.warehouseId);
                                        setSearch(s.productName || search);
                                    }}
                                >
                                    <strong>{s.productName}</strong>
                                    <span>склад «{s.warehouseName}» · {s.quantity} шт.{s.reserved > 0 ? ` (рез. ${s.reserved})` : ''}</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <span className="stock-search-hint-muted">Нічого не знайдено в інших складах</span>
                    )}
                </div>
            )}

            <DataTable
                columns={columns}
                rows={filteredInventory}
                onRowClick={(row) => setWorkRow(row)}
                selection={{
                    selectedIds,
                    onToggle: (id) => setSelectedIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(id)) next.delete(id); else next.add(id);
                        return next;
                    }),
                    onToggleAll: (checked) => setSelectedIds(checked ? new Set(filteredInventory.map((r) => r.id)) : new Set()),
                }}
                emptyIcon={PackageSearch}
                emptyTitle={inventory.length ? 'Нічого не знайдено за заданим фільтром' : 'Немає позицій на цьому складі'}
            />

            {selectedRows.length > 0 && (
                <div className="stock-bulk-bar">
                    <span>Обрано: {selectedRows.length}</span>
                    <div className="stock-bulk-bar-actions">
                        <button type="button" className="ds-btn ds-btn--secondary" onClick={() => setBulkOpen(true)}>
                            Перемістити обрані
                        </button>
                        <button type="button" className="ds-btn ds-btn--secondary" onClick={() => setSelectedIds(new Set())}>
                            Очистити вибір
                        </button>
                    </div>
                </div>
            )}

            <BulkMoveModal
                open={bulkOpen}
                onClose={() => setBulkOpen(false)}
                warehouseName={selectedWarehouse?.name}
                targetWarehouses={targetWarehouses}
                selectedRows={selectedRows}
                onSubmit={doBulkMove}
            />

            <ProductWorkDrawer
                open={!!workRow}
                onClose={() => setWorkRow(null)}
                inventoryRow={workRow}
                warehouses={warehouses}
                selectedWarehouseId={selectedWarehouseId}
                onUpdated={refetch}
            />
        </div>
    );
}
