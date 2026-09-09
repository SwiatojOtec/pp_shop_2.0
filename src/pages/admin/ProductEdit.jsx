import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom';
import { Save, ArrowLeft, ChevronRight, Trash2 } from 'lucide-react';
import { transliterate } from '../../utils/transliterate';
import { categoriesApi, rentCategoriesApi, brandsApi, warehousesApi, productsApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

import Tabs from '../../features/admin/ui/Tabs';
import ConfirmDialog from '../../features/admin/ui/ConfirmDialog';
import ProductBasicInfo from '../../components/admin/product/ProductBasicInfo';
import ProductCategoryBrand from '../../components/admin/product/ProductCategoryBrand';
import ProductIdentifiers from '../../components/admin/product/ProductIdentifiers';
import ProductAvailability from '../../components/admin/product/ProductAvailability';
import ProductSpecs from '../../components/admin/product/ProductSpecs';
import ProductGallery from '../../components/admin/product/ProductGallery';
import ProductKitItems from '../../components/admin/product/ProductKitItems';
import ProductRelatedSearch from '../../components/admin/product/ProductRelatedSearch';
import ProductRentDetails from '../../components/admin/product/ProductRentDetails';
import ProductPriceSidebar from '../../components/admin/product/ProductPriceSidebar';
import {
    ensureRentTiersFormShape,
    normalizeRentTiersForApi,
    minRentTierPrice,
} from '../../utils/rentPricing';

import '../../components/admin/product/ProductEdit.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeAdminReturnPath(raw) {
    if (!raw || typeof raw !== 'string') return null;
    try {
        const p = decodeURIComponent(raw.trim());
        if (!p.startsWith('/admin') || p.includes('://')) return null;
        return p.split('?')[0];
    } catch {
        return null;
    }
}

const INITIAL_FORM = {
    name: '', price: '', oldPrice: '', category: '', image: '', images: [],
    desc: '', instruction: '', adminNotes: '', sku: '', slug: '', groupId: '',
    stockStatus: 'in_stock', brand: '', packSize: 1.0, unit: 'м²', badge: '',
    specs: {}, priceMatrix: [], availableFrom: '', kitItems: [],
    quantityAvailable: '', showInRentCatalog: true, relatedProducts: [],
    serialNumber: '', inventoryNumber: '', technicalCondition: '',
    weightPerUnit: '', weightTotal: '', replacementCost: '', securityDeposit: '',
    competitorLinks: [], adminImages: [],
    createWarehouseId: '', createWarehouseQuantity: '',
    rentPriceTiers: null,
};

const TABS_BASE = [
    { value: 'basic', label: 'Основне' },
    { value: 'pricing', label: 'Ціни' },
    { value: 'photos', label: 'Фото' },
    { value: 'specs', label: 'Характеристики' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProductEdit({ context = 'products' }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showToast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const isNew = id === 'new';
    const isRentContext = context === 'rent';
    const warehouseIdFromQuery = searchParams.get('warehouseId');
    const tab = searchParams.get('tab') || 'basic';

    const [formData, setFormData] = useState({ ...INITIAL_FORM, createWarehouseId: warehouseIdFromQuery || '' });
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
    const [leaveTarget, setLeaveTarget] = useState(null);

    const canDeleteProduct = user && ['owner', 'shop_manager', 'shop_rent', 'rent', 'pivdenbud'].includes(user.role);

    // Merge a single field into formData — the only path user edits take, so
    // it's also where "unsaved changes" tracking lives.
    const update = (field, value) => {
        setDirty(true);
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const tabs = useMemo(
        () => (isRentContext ? [...TABS_BASE, { value: 'rent', label: 'Оренда' }] : TABS_BASE),
        [isRentContext]
    );
    const activeTab = tabs.some((t) => t.value === tab) ? tab : 'basic';
    const setTab = (value) => setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value === 'basic') next.delete('tab');
        else next.set('tab', value);
        return next;
    }, { replace: true });

    const selectedCategory = categories.find((c) => c.name === formData.category);
    const usesPriceMatrix = !!selectedCategory?.usesPriceMatrix;

    // ── Data loading ─────────────────────────────────────────────────────────

    useEffect(() => {
        if (isRentContext && isNew) setFormData((prev) => ({ ...prev, unit: 'шт' }));
        loadCategories();
        loadBrands();
        if (isRentContext) loadWarehouses();
        if (!isNew) loadProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    useEffect(() => {
        if (!isRentContext || !isNew) return;
        setFormData((prev) => {
            if (prev.rentPriceTiers && prev.rentPriceTiers.length === 4) return prev;
            return {
                ...prev,
                rentPriceTiers: ensureRentTiersFormShape(null, prev.price ?? ''),
            };
        });
    }, [isRentContext, isNew]);

    // Auto-generate slug from name (new products only)
    useEffect(() => {
        if (isNew && formData.name) {
            setFormData((prev) => ({ ...prev, slug: transliterate(formData.name) }));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.name]);

    // Unsaved-changes warning on tab close / refresh / external navigation.
    useEffect(() => {
        if (!dirty) return undefined;
        const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [dirty]);

    async function loadCategories() {
        try {
            const data = isRentContext ? await rentCategoriesApi.list() : await categoriesApi.list();
            setCategories(data);
            if (isNew && data.length > 0 && !formData.category) {
                setFormData((prev) => ({ ...prev, category: data[0].name }));
            }
        } catch (err) {
            showToast(err.message || 'Не вдалося завантажити категорії', 'warning');
        }
    }

    async function loadBrands() {
        try {
            const data = await brandsApi.list();
            setBrands(data);
        } catch (err) {
            showToast(err.message || 'Не вдалося завантажити бренди', 'warning');
        }
    }

    async function loadWarehouses() {
        try {
            const data = await warehousesApi.list();
            const list = Array.isArray(data) ? data : [];
            setWarehouses(list);
            if (isNew && isRentContext && !formData.createWarehouseId && list.length > 0) {
                setFormData((prev) => ({ ...prev, createWarehouseId: String(list[0].id) }));
            }
        } catch (err) {
            showToast(err.message || 'Не вдалося завантажити склади', 'warning');
        }
    }

    async function loadProduct() {
        try {
            const data = await productsApi.getById(id);
            if (!data) return;

            // One bulk request instead of one GET per related product.
            let relatedProductObjects = [];
            if (data.relatedProducts?.length > 0) {
                const rows = await productsApi.list({ ids: data.relatedProducts.join(',') }).catch(() => []);
                relatedProductObjects = (Array.isArray(rows) ? rows : []).map((p) => ({
                    id: p.id, name: p.name, image: p.image, slug: p.slug,
                }));
            }

            setFormData({
                ...data,
                price: data.price ?? '',
                oldPrice: data.oldPrice ?? '',
                images: data.images || [],
                adminNotes: data.adminNotes || '',
                instruction: data.instruction || '',
                specs: data.specs || {},
                priceMatrix: data.priceMatrix || [],
                availableFrom: data.availableFrom || '',
                kitItems: data.kitItems || [],
                quantityAvailable: data.quantityAvailable ?? '',
                showInRentCatalog: typeof data.showInRentCatalog === 'boolean' ? data.showInRentCatalog : true,
                relatedProducts: relatedProductObjects,
                competitorLinks: Array.isArray(data.competitorLinks) ? data.competitorLinks : [],
                adminImages: Array.isArray(data.adminImages) ? data.adminImages : [],
                createWarehouseId: '', createWarehouseQuantity: '',
                rentPriceTiers: isRentContext
                    ? ensureRentTiersFormShape(data.rentPriceTiers, data.price ?? '')
                    : null,
            });
        } catch (err) {
            showToast(err.message || 'Не вдалося завантажити товар', 'warning');
        } finally {
            setLoading(false);
        }
    }

    async function loadGroupData(groupId) {
        if (!isNew || !groupId) return;
        try {
            const products = await productsApi.list({ groupId });
            const rows = Array.isArray(products) ? products : [];
            if (rows.length > 0) {
                const t = rows[0];
                setFormData((prev) => ({
                    ...prev,
                    price: t.price, category: t.category, desc: t.desc,
                    specs: t.specs || {}, priceMatrix: t.priceMatrix || [],
                }));
            }
        } catch (err) {
            showToast(err.message || 'Не вдалося підтягнути дані колекції', 'warning');
        }
    }

    // ── Save ──────────────────────────────────────────────────────────────────

    function afterSavePath() {
        const fromQuery = safeAdminReturnPath(searchParams.get('returnTo'));
        if (fromQuery) return fromQuery;
        const fromState = location.state?.returnTo
            ? safeAdminReturnPath(location.state.returnTo)
            : null;
        if (fromState) return fromState;
        return isRentContext ? '/admin/catalog/tools' : '/admin/catalog/goods';
    }

    function goBack() {
        if (dirty) {
            setLeaveTarget(afterSavePath());
            setLeaveConfirmOpen(true);
            return;
        }
        navigate(afterSavePath());
    }

    async function handleSubmit(e) {
        e?.preventDefault();
        if (!formData.image) {
            showToast('Будь ласка, додайте головне зображення товару.', 'warning');
            setTab('photos');
            return;
        }
        if (isRentContext && isNew && !String(formData.createWarehouseId || '').trim()) {
            showToast('Оберіть склад для створення товару.', 'warning');
            setTab('rent');
            return;
        }

        setSaving(true);
        try {
            let priceForApi = formData.price === '' ? null : Number(formData.price);
            let rentTiersForDb = null;
            if (isRentContext && Array.isArray(formData.rentPriceTiers)) {
                const { dbTiers } = normalizeRentTiersForApi(formData.rentPriceTiers, formData.price);
                rentTiersForDb = dbTiers;
                if (dbTiers) {
                    const m = minRentTierPrice(dbTiers);
                    if (m != null) priceForApi = m;
                }
            }

            const payload = {
                ...formData,
                isRent: isRentContext,
                price: priceForApi,
                rentPriceTiers: isRentContext ? rentTiersForDb : null,
                oldPrice: (formData.oldPrice === '' || formData.badge !== 'SALE') ? null : Number(formData.oldPrice),
                packSize: formData.packSize === '' ? 1.0 : Number(formData.packSize),
                availableFrom: formData.availableFrom || null,
                adminNotes: String(formData.adminNotes || '').trim() || null,
                instruction: String(formData.instruction || '').trim() || null,
                badge: isRentContext ? null : formData.badge,
                quantityAvailable: !isRentContext
                    ? (formData.quantityAvailable === '' ? null : Number(formData.quantityAvailable))
                    : undefined,
                relatedProducts: Array.isArray(formData.relatedProducts)
                    ? formData.relatedProducts.map((r) => (typeof r === 'object' ? r.id : r))
                    : [],
                competitorLinks: (formData.competitorLinks || [])
                    .map((v) => String(v || '').trim()).filter(Boolean),
                adminImages: (formData.adminImages || [])
                    .map((v) => String(v || '').trim()).filter(Boolean),
                createWarehouseId: isRentContext && isNew ? Number(formData.createWarehouseId) : undefined,
                createWarehouseQuantity: isRentContext && isNew ? Number(formData.createWarehouseQuantity || 0) : undefined,
            };

            if (isNew) {
                await productsApi.create(payload);
            } else {
                await productsApi.update(id, payload);
            }
            setDirty(false);
            navigate(afterSavePath());
        } catch (err) {
            showToast(err.message || 'Сталася помилка при збереженні товару.', 'warning');
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteProduct() {
        if (isNew || !id) return;
        setDeleteLoading(true);
        try {
            await productsApi.remove(id);
            navigate(isRentContext ? '/admin/catalog/tools' : '/admin/catalog/goods');
        } catch (err) {
            showToast(err.message || 'Не вдалося видалити товар. Можливі зв\'язані замовлення або заявки — спробуйте приховати картку з каталогу.', 'warning');
        } finally {
            setDeleteLoading(false);
            setDeleteOpen(false);
        }
    }

    // ── Render ────────────────────────────────────────────────────────────────

    if (loading) return <div className="od-loading">Завантаження...</div>;

    return (
        <div className="product-edit-page">
            <div className="admin-breadcrumbs">
                <Link to={isRentContext ? '/admin/catalog/tools' : '/admin/catalog/goods'}>
                    {isRentContext ? 'Інструмент' : 'Товари'}
                </Link>
                <ChevronRight size={14} />
                <span className="breadcrumb-current">
                    {isNew
                        ? (isRentContext ? 'Новий інструмент' : 'Новий товар')
                        : formData.name}
                </span>
            </div>

            <div className="product-edit-header product-edit-header--sticky">
                <div className="product-edit-header-left">
                    <button type="button" onClick={goBack} className="ds-icon-btn">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="product-edit-title">
                        {isNew
                            ? (isRentContext ? 'Додати новий інструмент' : 'Додати новий товар')
                            : (isRentContext ? 'Редагувати інструмент' : 'Редагувати товар')}
                    </h1>
                    {dirty && <span className="product-edit-dirty">Є незбережені зміни</span>}
                </div>
                <div className="product-edit-header-actions">
                    {!isNew && canDeleteProduct && (
                        <button
                            type="button"
                            className="ds-btn ds-btn--secondary product-edit-delete-btn"
                            onClick={() => setDeleteOpen(true)}
                            disabled={deleteLoading || saving}
                        >
                            <Trash2 size={18} /> Видалити картку
                        </button>
                    )}
                    <button type="button" onClick={handleSubmit} className="ds-btn ds-btn--primary" disabled={saving}>
                        <Save size={18} /> {saving ? 'Збереження...' : 'Зберегти зміни'}
                    </button>
                </div>
            </div>

            <ConfirmDialog
                open={deleteOpen}
                title={isRentContext ? 'Видалити інструмент?' : 'Видалити товар?'}
                message={
                    formData.name
                        ? `Безповоротно видалити «${formData.name}»? Рядки складу для цієї картки будуть прибрані.`
                        : 'Безповоротно видалити цю картку?'
                }
                confirmText="Видалити"
                onConfirm={handleDeleteProduct}
                onCancel={() => setDeleteOpen(false)}
            />

            <ConfirmDialog
                open={leaveConfirmOpen}
                danger={false}
                title="Є незбережені зміни"
                message="Якщо вийти зараз, зміни на цій сторінці буде втрачено."
                confirmText="Вийти без збереження"
                onConfirm={() => { setLeaveConfirmOpen(false); navigate(leaveTarget); }}
                onCancel={() => setLeaveConfirmOpen(false)}
            />

            <Tabs tabs={tabs} value={activeTab} onChange={setTab} />

            <div className="product-edit-tabbody">
                {activeTab === 'basic' && (
                    <>
                        <ProductBasicInfo formData={formData} onChange={update} />
                        <ProductCategoryBrand formData={formData} onChange={update} categories={categories} brands={brands} />
                        {!isRentContext && (
                            <ProductIdentifiers formData={formData} onChange={update} onGroupIdBlur={loadGroupData} />
                        )}
                    </>
                )}

                {activeTab === 'pricing' && (
                    <ProductPriceSidebar
                        formData={formData}
                        onChange={update}
                        isRentContext={isRentContext}
                        usesPriceMatrix={usesPriceMatrix}
                    />
                )}

                {activeTab === 'photos' && (
                    <ProductGallery
                        mainImage={formData.image}
                        images={formData.images}
                        onMainChange={(val) => update('image', val)}
                        onImagesChange={(val) => update('images', val)}
                    />
                )}

                {activeTab === 'specs' && (
                    <>
                        <ProductAvailability
                            formData={formData}
                            onChange={update}
                            isRentContext={isRentContext}
                            usesPriceMatrix={usesPriceMatrix}
                        />
                        <ProductSpecs specs={formData.specs} onChange={(val) => update('specs', val)} />
                    </>
                )}

                {activeTab === 'rent' && isRentContext && (
                    <>
                        <div className="admin-section">
                            <h2 className="section-title">Оренда</h2>
                            <div className="admin-form">
                                <div className="form-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={!!formData.showInRentCatalog}
                                            onChange={(e) => update('showInRentCatalog', e.target.checked)}
                                            style={{ width: '16px', height: '16px' }}
                                        />
                                        Показувати в каталозі оренди
                                    </label>
                                </div>
                                {isNew && (
                                    <>
                                        <div className="form-group">
                                            <label className="field-sublabel">Склад створення (обов&apos;язково)</label>
                                            <select
                                                value={formData.createWarehouseId || ''}
                                                onChange={(e) => update('createWarehouseId', e.target.value)}
                                            >
                                                <option value="">— Оберіть склад —</option>
                                                {warehouses.map((w) => (
                                                    <option key={w.id} value={w.id}>{w.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="field-sublabel">Початкова кількість на обраному складі</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={formData.createWarehouseQuantity}
                                                onChange={(e) => update('createWarehouseQuantity', e.target.value)}
                                                placeholder="Наприклад: 5"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                        <ProductKitItems items={formData.kitItems} onChange={(val) => update('kitItems', val)} />
                        <ProductRelatedSearch productId={id} selected={formData.relatedProducts} onChange={(val) => update('relatedProducts', val)} />
                        <ProductRentDetails formData={formData} onChange={update} />
                    </>
                )}
            </div>
        </div>
    );
}
