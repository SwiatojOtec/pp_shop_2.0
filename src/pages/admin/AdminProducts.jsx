import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { AdminTable, AdminFilters, AdminPageHeader, ConfirmDialog } from '../../components/admin';
import { productsApi } from '../../services/api';
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

const COLUMNS = (navigate, onDelete) => [
    {
        key: 'image',
        label: 'Фото',
        width: '64px',
        render: (val, row) => (
            <img src={val} alt={row.name} className="admin-table-img" />
        ),
    },
    {
        key: 'sku',
        label: 'SKU',
        render: (val) => val ? <code className="admin-code">{val}</code> : '—',
    },
    { key: 'name', label: 'Назва' },
    {
        key: 'price',
        label: 'Ціна',
        render: (val) => val != null ? `${val} ₴` : '—',
    },
    { key: 'category', label: 'Категорія' },
    {
        key: 'badge',
        label: 'Мітка',
        render: (val) => val
            ? <span className={`status-badge ${val.toLowerCase()}`}>{val}</span>
            : null,
    },
    {
        key: 'id',
        label: 'Дії',
        width: '90px',
        render: (id, row) => (
            <div className="table-actions">
                <button
                    className="action-btn edit"
                    onClick={(e) => { e.stopPropagation(); navigate(`/admin/products/${id}`); }}
                    title="Редагувати"
                >
                    <Edit2 size={16} />
                </button>
                <button
                    className="action-btn delete"
                    onClick={(e) => { e.stopPropagation(); onDelete(row); }}
                    title="Видалити"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        ),
    },
];

export default function AdminProducts() {
    const navigate = useNavigate();
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
        } catch (err) {
            console.error('Помилка видалення:', err);
        } finally {
            setDeleteLoading(false);
            setDeleteTarget(null);
        }
    }

    const filtered = products.filter((p) => {
        const matchSearch = !search
            || p.name?.toLowerCase().includes(search.toLowerCase())
            || p.sku?.toLowerCase().includes(search.toLowerCase());
        const matchCat = !filterCategory || p.category === filterCategory;
        return matchSearch && matchCat;
    });

    return (
        <div className="admin-products">
            <AdminPageHeader
                title="Товари"
                subtitle={`${products.length} позицій`}
                actions={
                    <button className="btn-primary" onClick={() => navigate('/admin/products/new')}>
                        <Plus size={16} /> Додати товар
                    </button>
                }
            />

            <AdminFilters
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

            <AdminTable
                columns={COLUMNS(navigate, setDeleteTarget)}
                rows={filtered}
                loading={loading}
                empty="Товарів не знайдено"
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
