import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Package } from 'lucide-react';
import { productsApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../features/admin/ui/PageHeader';
import Toolbar from '../../features/admin/ui/Toolbar';
import DataTable from '../../features/admin/ui/DataTable';
import ConfirmDialog from '../../features/admin/ui/ConfirmDialog';
import './Admin.css';

const CATEGORY_OPTIONS = [
    { value: 'Паркетна Дошка',    label: 'Паркетна Дошка' },
    { value: 'Ламінат',           label: 'Ламінат' },
    { value: 'Вінілова підлога',  label: 'Вінілова підлога' },
    { value: 'Підвіконня',        label: 'Підвіконня' },
    { value: 'Стінові панелі',    label: 'Стінові панелі' },
    { value: 'Плінтуса',          label: 'Плінтуса' },
    { value: 'Оренда інструменту',label: 'Оренда інструменту' },
];

export default function AdminProducts() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [products, setProducts]       = useState([]);
    const [loading, setLoading]         = useState(true);
    const [search, setSearch]           = useState('');
    const [filterCategory, setCategory] = useState('');
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    useEffect(() => { loadProducts(); }, []);

    async function loadProducts() {
        setLoading(true);
        try {
            const data = await productsApi.list({ isRent: false });
            setProducts(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Помилка завантаження товарів:', err);
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

    const filtered = useMemo(() => products.filter((p) => {
        const matchSearch = !search
            || p.name?.toLowerCase().includes(search.toLowerCase())
            || p.sku?.toLowerCase().includes(search.toLowerCase());
        const matchCat = !filterCategory || p.category === filterCategory;
        return matchSearch && matchCat;
    }), [products, search, filterCategory]);

    const columns = useMemo(() => [
        {
            key: 'image',
            label: 'Фото',
            render: (val, row) => <img src={val} alt={row.name} className="admin-table-img" />,
        },
        {
            key: 'sku',
            label: 'SKU',
            render: (val) => (val ? <code className="admin-code">{val}</code> : '—'),
        },
        { key: 'name', label: 'Назва' },
        {
            key: 'price',
            label: 'Ціна',
            render: (val) => (val != null ? `${val} ₴` : '—'),
        },
        { key: 'category', label: 'Категорія' },
        {
            key: 'badge',
            label: 'Мітка',
            render: (val) => (val ? <span className={`status-badge ${val.toLowerCase()}`}>{val}</span> : null),
        },
        {
            key: 'id',
            label: 'Дії',
            align: 'right',
            render: (id, row) => (
                <button
                    type="button"
                    className="action-btn delete"
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }}
                    title="Видалити"
                >
                    <Trash2 size={16} />
                </button>
            ),
        },
    ], []);

    return (
        <div className="admin-products">
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
                        options: CATEGORY_OPTIONS,
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
