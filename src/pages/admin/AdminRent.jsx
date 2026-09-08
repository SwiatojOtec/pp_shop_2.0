import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronDown, ChevronRight, Wrench } from 'lucide-react';
import { productsApi } from '../../services/api';
import PageHeader from '../../features/admin/ui/PageHeader';
import Toolbar from '../../features/admin/ui/Toolbar';
import DataTable from '../../features/admin/ui/DataTable';
import './Admin.css';

export default function AdminRent() {
    const navigate = useNavigate();
    const [products, setProducts]         = useState([]);
    const [loading, setLoading]           = useState(true);
    const [search, setSearch]             = useState('');
    const [filterCategory, setCategory]   = useState('');
    const [zeroBlockOpen, setZeroBlockOpen] = useState(false);
    const [zeroRows, setZeroRows]         = useState([]);
    const [zeroLoading, setZeroLoading]   = useState(false);

    useEffect(() => { loadProducts(); }, []);

    async function loadProducts() {
        setLoading(true);
        try {
            const data = await productsApi.list({ isRent: true });
            const rows = Array.isArray(data) ? data : [];
            setProducts(rows.filter((p) => Number(p.quantityAvailable || 0) > 0));
        } catch (err) {
            console.error(err);
            setProducts([]);
        } finally {
            setLoading(false);
        }
    }

    async function loadZeroQtyRows() {
        setZeroLoading(true);
        try {
            const data = await productsApi.list({ isRent: true, includeHiddenRent: true });
            const rows = Array.isArray(data) ? data : [];
            setZeroRows(rows.filter((p) => Number(p.quantityAvailable || 0) <= 0));
        } catch (err) {
            console.error(err);
            setZeroRows([]);
        } finally {
            setZeroLoading(false);
        }
    }

    function toggleZeroBlock() {
        setZeroBlockOpen((prev) => {
            const next = !prev;
            if (next) loadZeroQtyRows();
            return next;
        });
    }

    const categoryOptions = useMemo(() => {
        const cats = new Set(products.map((p) => p.category).filter(Boolean));
        return [...cats].sort().map((c) => ({ value: c, label: c }));
    }, [products]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return products.filter((p) => {
            const matchSearch = !q
                || p.name?.toLowerCase().includes(q)
                || p.sku?.toLowerCase().includes(q);
            const matchCat = !filterCategory || p.category === filterCategory;
            return matchSearch && matchCat;
        });
    }, [products, search, filterCategory]);

    const columns = useMemo(() => [
        {
            key: 'image',
            label: 'Фото',
            render: (val, row) => (
                val ? <img src={val} alt={row.name} className="admin-table-img" /> : <span className="text-gray-300">—</span>
            ),
        },
        {
            key: 'sku',
            label: 'SKU',
            render: (v) => (v ? <code className="admin-code">{v}</code> : '—'),
        },
        { key: 'name', label: 'Назва', render: (v) => <span className="font-semibold">{v}</span> },
        {
            key: 'price',
            label: 'Ціна/доба',
            render: (v) => (v != null ? `${v} ₴` : '—'),
        },
        {
            key: 'quantityAvailable',
            label: 'На складі',
            render: (v) => (
                <span className={`font-bold ${v <= 2 ? 'text-red-600' : 'text-green-600'}`}>
                    {typeof v === 'number' ? `${v} шт` : '—'}
                </span>
            ),
        },
        { key: 'category', label: 'Категорія', render: (v) => v || '—' },
        { key: 'brand', label: 'Бренд', render: (v) => v || '—' },
    ], []);

    const zeroColumns = useMemo(() => [
        { key: 'name', label: 'Назва', render: (v) => <span className="font-semibold">{v}</span> },
        { key: 'sku', label: 'SKU', render: (v) => (v ? <code className="admin-code">{v}</code> : '—') },
        {
            key: 'quantityAvailable',
            label: 'Вільно',
            render: (v) => (typeof v === 'number' ? `${v} шт` : '—'),
        },
        { key: 'showInRentCatalog', label: 'У каталозі', render: (v) => (v !== false ? 'Так' : 'Ні') },
    ], []);

    return (
        <div>
            <PageHeader
                title="Каталог інструментів"
                subtitle="Інструменти, опубліковані в клієнтській оренді"
                actions={(
                    <button type="button" className="ds-btn ds-btn--secondary" onClick={() => navigate('/admin/stock')}>
                        <Plus size={16} /> Додати зі складу
                    </button>
                )}
            />

            <p className="admin-page-hint">
                Тут лише позиції з наявністю на складі. Нові інструменти додаються на складі; видимість у каталозі — на сторінці «Склад — позиції» або в картці товару.
                Повне видалення картки — кнопка «Видалити картку» на сторінці редагування інструмента; картки з 0 вільних (не на сайті) — у блоці нижче.
            </p>

            <div className="mb-4">
                <button
                    type="button"
                    className="ds-btn ds-btn--secondary"
                    onClick={toggleZeroBlock}
                >
                    {zeroBlockOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    Картки без вільної наявності (не в каталозі на сайті)
                    {zeroRows.length > 0 && <span className="text-gray-500 font-semibold"> — {zeroRows.length}</span>}
                </button>
                {zeroBlockOpen && (
                    <div className="mt-3">
                        <DataTable
                            columns={zeroColumns}
                            rows={zeroRows}
                            loading={zeroLoading}
                            onRowClick={(row) => navigate(`/admin/catalog/tools/${row.id}`)}
                            emptyIcon={Wrench}
                            emptyTitle="Таких карток немає"
                        />
                    </div>
                )}
            </div>

            <Toolbar
                search={search}
                onSearch={setSearch}
                placeholder="Пошук за назвою або SKU..."
                filters={categoryOptions.length > 0 ? [{
                    key: 'category',
                    label: 'Всі категорії',
                    value: filterCategory,
                    options: categoryOptions,
                }] : []}
                onFilter={(key, value) => { if (key === 'category') setCategory(value); }}
            />

            <DataTable
                columns={columns}
                rows={filtered}
                loading={loading}
                onRowClick={(row) => navigate(`/admin/catalog/tools/${row.id}`)}
                emptyIcon={Wrench}
                emptyTitle="Інструментів у каталозі поки немає"
            />
        </div>
    );
}
