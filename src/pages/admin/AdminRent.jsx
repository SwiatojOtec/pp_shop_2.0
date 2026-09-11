import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Wrench } from 'lucide-react';
import { productsApi } from '../../services/api';
import { optimizeImageUrl } from '../../utils/imageOptimize';
import PageHeader from '../../features/admin/ui/PageHeader';
import Toolbar from '../../features/admin/ui/Toolbar';
import DataTable from '../../features/admin/ui/DataTable';
import CatalogBanner from '../../features/admin/catalog/CatalogBanner';
import { coerceDbRentPriceTiers } from '../../utils/rentPricing';
import '../../features/admin/catalog/catalog.css';

const AVAILABILITY_OPTIONS = [
    { value: 'available', label: 'Є вільні' },
    { value: 'none', label: 'Немає вільних' },
];

export default function AdminRent() {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterCategory, setCategory] = useState('');
    const [filterAvailability, setFilterAvailability] = useState('');

    useEffect(() => { loadProducts(); }, []);

    async function loadProducts() {
        setLoading(true);
        try {
            const data = await productsApi.list({ isRent: true, includeHiddenRent: true });
            setProducts(Array.isArray(data) ? data : []);
        } catch {
            setProducts([]);
        } finally {
            setLoading(false);
        }
    }

    const categoryOptions = useMemo(() => {
        const cats = new Set(products.map((p) => p.category).filter(Boolean));
        return [...cats].sort((a, b) => a.localeCompare(b, 'uk')).map((c) => ({ value: c, label: c }));
    }, [products]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return products.filter((p) => {
            const matchSearch = !q
                || p.name?.toLowerCase().includes(q)
                || p.sku?.toLowerCase().includes(q);
            const matchCat = !filterCategory || p.category === filterCategory;
            const available = Number(p.quantityAvailable || 0) > 0;
            const matchAvailability = !filterAvailability
                || (filterAvailability === 'available' && available)
                || (filterAvailability === 'none' && !available);
            return matchSearch && matchCat && matchAvailability;
        });
    }, [products, search, filterCategory, filterAvailability]);

    const columns = useMemo(() => [
        {
            key: 'name',
            label: 'Картка',
            render: (name, row) => (
                <div className="catalog-row">
                    {row.image
                        ? <img src={optimizeImageUrl(row.image, { width: 120 })} alt={name} className="catalog-row__thumb" />
                        : <div className="catalog-row__thumb catalog-row__thumb--empty"><Wrench size={16} /></div>}
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
            label: 'Тариф',
            align: 'right',
            render: (price, row) => {
                const tiers = coerceDbRentPriceTiers(row.rentPriceTiers);
                const weekPlus = tiers?.find((t) => t.minDays === 7)?.pricePerDay;
                return (
                    <div>
                        <div className="num">{price != null ? `${price} ₴/доба` : '—'}</div>
                        {weekPlus != null && weekPlus !== price && (
                            <div className="catalog-row__brand">від {weekPlus} ₴ за 7+ діб</div>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'quantityAvailable',
            label: 'Вільно',
            align: 'right',
            render: (v) => (
                <span className={`num${!v || v <= 0 ? ' catalog-row__stock--out' : ''}`}>
                    {typeof v === 'number' ? `${v} шт` : '—'}
                </span>
            ),
        },
        {
            key: 'showInRentCatalog',
            label: 'На сайті',
            render: (v) => <span className={`ds-badge ds-badge--${v !== false ? 'success' : 'neutral'}`}>{v !== false ? 'Так' : 'Ні'}</span>,
        },
        {
            key: 'images',
            label: 'Фото',
            render: (images) => {
                const count = Array.isArray(images) ? images.length : 0;
                return count > 0
                    ? <span>{count}</span>
                    : <span className="catalog-row__stock--out">немає</span>;
            },
        },
    ], []);

    return (
        <div className="catalog-list">
            <CatalogBanner />
            <PageHeader
                title="Інструмент"
                subtitle={`${products.length} карток`}
                actions={(
                    <button type="button" className="ds-btn ds-btn--primary" onClick={() => navigate('/admin/catalog/tools/new')}>
                        <Plus size={16} /> Нова картка
                    </button>
                )}
            />

            <Toolbar
                search={search}
                onSearch={setSearch}
                placeholder="Пошук за назвою або SKU..."
                filters={[
                    { key: 'availability', label: 'Вільно: всі', value: filterAvailability, options: AVAILABILITY_OPTIONS },
                    ...(categoryOptions.length > 0 ? [{ key: 'category', label: 'Всі категорії', value: filterCategory, options: categoryOptions }] : []),
                ]}
                onFilter={(key, value) => {
                    if (key === 'category') setCategory(value);
                    if (key === 'availability') setFilterAvailability(value);
                }}
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
