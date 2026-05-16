import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit2 } from 'lucide-react';
import { productsApi } from '../../services/api';
import { AdminPageHeader, AdminFilters, AdminTable } from '../../components/admin';
import './Admin.css';

export default function AdminRent() {
    const navigate = useNavigate();
    const [products, setProducts]         = useState([]);
    const [loading, setLoading]           = useState(true);
    const [search, setSearch]             = useState('');
    const [filterCategory, setCategory]   = useState('');

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
            width: '64px',
            render: (val, row) => (
                val
                    ? <img src={val} alt={row.name} className="admin-table-img" />
                    : <span style={{ color: '#d1d5db' }}>—</span>
            ),
        },
        {
            key: 'sku',
            label: 'SKU',
            render: (v) => (v ? <code className="admin-code">{v}</code> : '—'),
        },
        { key: 'name', label: 'Назва', render: (v) => <span style={{ fontWeight: 600 }}>{v}</span> },
        {
            key: 'price',
            label: 'Ціна/доба',
            render: (v) => (v != null ? `${v} ₴` : '—'),
        },
        {
            key: 'quantityAvailable',
            label: 'На складі',
            render: (v) => (
                <span style={{ fontWeight: 700, color: v <= 2 ? '#dc2626' : '#16a34a' }}>
                    {typeof v === 'number' ? `${v} шт` : '—'}
                </span>
            ),
        },
        { key: 'category', label: 'Категорія', render: (v) => v || '—' },
        { key: 'brand', label: 'Бренд', render: (v) => v || '—' },
        {
            key: 'id',
            label: 'Дії',
            width: '52px',
            render: (id) => (
                <div className="table-actions" onClick={(e) => e.stopPropagation()}>
                    <button type="button" className="action-btn edit" title="Редагувати" onClick={() => navigate(`/admin/rent/${id}`)}>
                        <Edit2 size={16} />
                    </button>
                </div>
            ),
        },
    ], [navigate]);

    return (
        <div>
            <AdminPageHeader
                title="Каталог інструментів"
                subtitle="Інструменти, опубліковані в клієнтській оренді"
                actions={
                    <Link to="/admin/warehouses/positions" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                        <Plus size={16} /> Додати зі складу
                    </Link>
                }
            />

            <p className="admin-page-hint">
                Тут лише позиції з наявністю на складі. Нові інструменти додаються на складі; видимість у каталозі — на сторінці «Склад — позиції» або в картці товару. Видалення картки — через розділ товарів/складу, не з цього списку.
            </p>

            <AdminFilters
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

            <AdminTable
                columns={columns}
                rows={filtered}
                loading={loading}
                empty="Інструментів у каталозі поки немає"
                onRowClick={(row) => navigate(`/admin/rent/${row.id}`)}
            />
        </div>
    );
}
