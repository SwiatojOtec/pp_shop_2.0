import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Package } from 'lucide-react';
import { productsApi, categoriesApi } from '../../services/api';
import { optimizeImageUrl } from '../../utils/imageOptimize';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../features/admin/ui/PageHeader';
import Toolbar from '../../features/admin/ui/Toolbar';
import DataTable from '../../features/admin/ui/DataTable';
import ConfirmDialog from '../../features/admin/ui/ConfirmDialog';
import CatalogBanner from '../../features/admin/catalog/CatalogBanner';
import '../../features/admin/catalog/catalog.css';

export default function AdminProducts() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterCategory, setCategory] = useState('');
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    useEffect(() => {
        loadProducts();
        categoriesApi.list().then((data) => setCategories(Array.isArray(data) ? data : [])).catch(() => setCategories([]));
    }, []);

    async function loadProducts() {
        setLoading(true);
        try {
            const data = await productsApi.list({ isRent: false });
            setProducts(Array.isArray(data) ? data : []);
        } catch (err) {
            showToast(err.message || 'Не вдалося завантажити товари', 'warning');
            setProducts([]);
        } finally {
            setLoading(false);
        }
    }

    async function handleDeleteConfirm() {
        if (!deleteTarget) return;
        setDeleteLoading(true);
        try {
            await productsApi.remove(deleteTarget.id);
            setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
            setDeleteTarget(null);
        } catch (err) {
            showToast(err.message || 'Помилка видалення товару', 'warning');
        } finally {
            setDeleteLoading(false);
        }
    }

    const categoryOptions = useMemo(
        () => categories.map((c) => ({ value: c.name, label: c.name })),
        [categories]
    );

    const filtered = useMemo(() => products.filter((p) => {
        const matchSearch = !search
            || p.name?.toLowerCase().includes(search.toLowerCase())
            || p.sku?.toLowerCase().includes(search.toLowerCase());
        const matchCat = !filterCategory || p.category === filterCategory;
        return matchSearch && matchCat;
    }), [products, search, filterCategory]);

    const columns = useMemo(() => [
        {
            key: 'name',
            label: 'Товар',
            render: (name, row) => (
                <div className="catalog-row">
                    {row.image
                        ? <img src={optimizeImageUrl(row.image, { width: 120 })} alt={name} className="catalog-row__thumb" />
                        : <div className="catalog-row__thumb catalog-row__thumb--empty"><Package size={16} /></div>}
                    <div>
                        <div className="catalog-row__name">{name}</div>
                        {row.sku && <div className="mono catalog-row__sku">{row.sku}</div>}
                    </div>
                </div>
            ),
        },
        {
            key: 'category',
            label: 'Категорія / бренд',
            render: (category, row) => (
                <div>
                    <div>{category || '—'}</div>
                    {row.brand && <div className="catalog-row__brand">{row.brand}</div>}
                </div>
            ),
        },
        {
            key: 'price',
            label: 'Ціна',
            align: 'right',
            render: (val) => <span className="num">{val != null ? `${val} ₴` : '—'}</span>,
        },
        {
            key: 'quantityAvailable',
            label: 'Залишок',
            align: 'right',
            render: (val) => (
                <span className={`num${val == null || val <= 0 ? ' catalog-row__stock--out' : ''}`}>
                    {val != null ? val : '—'}
                </span>
            ),
        },
        {
            key: 'badge',
            label: 'Мітка',
            render: (val) => (val ? <span className="ds-badge ds-badge--accent">{val}</span> : null),
        },
        {
            key: 'id',
            label: 'Дії',
            align: 'right',
            render: (id, row) => (
                <button
                    type="button"
                    className="ds-icon-btn"
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }}
                    title="Видалити"
                >
                    <Trash2 size={16} />
                </button>
            ),
        },
    ], []);

    return (
        <div className="catalog-list">
            <CatalogBanner />
            <PageHeader
                title="Товари"
                subtitle={`${products.length} позицій`}
                actions={(
                    <button type="button" className="ds-btn ds-btn--primary" onClick={() => navigate('/admin/catalog/goods/new')}>
                        <Plus size={16} /> Додати товар
                    </button>
                )}
            />

            <Toolbar
                search={search}
                onSearch={setSearch}
                placeholder="Пошук за назвою або SKU..."
                filters={[
                    {
                        key: 'category',
                        label: 'Всі категорії',
                        value: filterCategory,
                        options: categoryOptions,
                    },
                ]}
                onFilter={(_, val) => setCategory(val)}
            />

            <DataTable
                columns={columns}
                rows={filtered}
                loading={loading}
                onRowClick={(row) => navigate(`/admin/catalog/goods/${row.id}`)}
                emptyIcon={Package}
                emptyTitle="Товарів не знайдено"
            />

            <ConfirmDialog
                open={!!deleteTarget}
                title="Видалити товар?"
                message={deleteTarget ? `Ви впевнені, що хочете видалити «${deleteTarget.name}»? Цю дію не можна скасувати.` : ''}
                confirmText="Видалити"
                onConfirm={handleDeleteConfirm}
                onCancel={() => setDeleteTarget(null)}
                loading={deleteLoading}
            />
        </div>
    );
}
