import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Briefcase } from 'lucide-react';
import { productsApi } from '../../services/api';
import { optimizeImageUrl } from '../../utils/imageOptimize';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../features/admin/ui/PageHeader';
import Toolbar from '../../features/admin/ui/Toolbar';
import DataTable from '../../features/admin/ui/DataTable';
import ConfirmDialog from '../../features/admin/ui/ConfirmDialog';
import CatalogBanner from '../../features/admin/catalog/CatalogBanner';
import '../../features/admin/catalog/catalog.css';

/**
 * Довідник послуг (укладка, виїзд на заміри, доставка, кошторис тощо) —
 * той самий Product, що й товар/оренда, лише з isService:true. Завдяки
 * цьому кожна послуга одразу видима в пошуку позицій угоди без жодних
 * додаткових змін (docs plan «Каталог «Послуги»»).
 */
export default function AdminServices() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    useEffect(() => { loadServices(); }, []);

    async function loadServices() {
        setLoading(true);
        try {
            const data = await productsApi.list({ isService: true, includeHiddenServices: true });
            setServices(Array.isArray(data) ? data : []);
        } catch (err) {
            showToast(err.message || 'Не вдалося завантажити послуги', 'warning');
            setServices([]);
        } finally {
            setLoading(false);
        }
    }

    async function handleDeleteConfirm() {
        if (!deleteTarget) return;
        setDeleteLoading(true);
        try {
            await productsApi.remove(deleteTarget.id);
            setServices((prev) => prev.filter((s) => s.id !== deleteTarget.id));
            setDeleteTarget(null);
        } catch (err) {
            showToast(err.message || 'Помилка видалення послуги', 'warning');
        } finally {
            setDeleteLoading(false);
        }
    }

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return services;
        return services.filter((s) =>
            s.name?.toLowerCase().includes(q) || s.category?.toLowerCase().includes(q)
        );
    }, [services, search]);

    const columns = useMemo(() => [
        {
            key: 'name',
            label: 'Послуга',
            render: (name, row) => (
                <div className="catalog-row">
                    {row.image
                        ? <img src={optimizeImageUrl(row.image, { width: 120 })} alt={name} className="catalog-row__thumb" />
                        : <div className="catalog-row__thumb catalog-row__thumb--empty"><Briefcase size={16} /></div>}
                    <div className="catalog-row__name">{name}</div>
                </div>
            ),
        },
        {
            key: 'category',
            label: 'Категорія',
            render: (v) => v || '—',
        },
        {
            key: 'price',
            label: 'Ціна',
            align: 'right',
            render: (price, row) => (
                <span className="num">{price != null ? `${price} ₴ / ${row.unit || 'послуга'}` : '—'}</span>
            ),
        },
        {
            key: 'showInServiceCatalog',
            label: 'На сайті',
            render: (v) => <span className={`ds-badge ds-badge--${v !== false ? 'success' : 'neutral'}`}>{v !== false ? 'Так' : 'Ні'}</span>,
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
                title="Послуги"
                subtitle={`${services.length} послуг`}
                actions={(
                    <button type="button" className="ds-btn ds-btn--primary" onClick={() => navigate('/admin/catalog/services/new')}>
                        <Plus size={16} /> Нова послуга
                    </button>
                )}
            />

            <Toolbar
                search={search}
                onSearch={setSearch}
                placeholder="Пошук за назвою або категорією..."
            />

            <DataTable
                columns={columns}
                rows={filtered}
                loading={loading}
                onRowClick={(row) => navigate(`/admin/catalog/services/${row.id}`)}
                emptyIcon={Briefcase}
                emptyTitle="Послуг поки немає"
                emptyDescription="Додайте укладку, виїзд на заміри, доставку чи іншу послугу — вона одразу зʼявиться в пошуку позицій угоди."
            />

            <ConfirmDialog
                open={!!deleteTarget}
                title="Видалити послугу?"
                message={deleteTarget ? `Ви впевнені, що хочете видалити «${deleteTarget.name}»? Цю дію не можна скасувати.` : ''}
                confirmText="Видалити"
                onConfirm={handleDeleteConfirm}
                onCancel={() => setDeleteTarget(null)}
                loading={deleteLoading}
            />
        </div>
    );
}
