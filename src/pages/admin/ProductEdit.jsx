import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom';
import { Save, ArrowLeft, ChevronRight } from 'lucide-react';
import { transliterate } from '../../utils/transliterate';
import { categoriesApi, rentCategoriesApi, brandsApi, warehousesApi, productsApi, inventoryApi } from '../../services/api';

import ProductBasicInfo     from '../../components/admin/product/ProductBasicInfo';
import ProductSpecs         from '../../components/admin/product/ProductSpecs';
import ProductKitItems      from '../../components/admin/product/ProductKitItems';
import ProductRelatedSearch from '../../components/admin/product/ProductRelatedSearch';
import ProductPriceMatrix   from '../../components/admin/product/ProductPriceMatrix';
import ProductGallery       from '../../components/admin/product/ProductGallery';
import ProductRentDetails   from '../../components/admin/product/ProductRentDetails';
import ProductIdentifiers   from '../../components/admin/product/ProductIdentifiers';
import ProductPriceSidebar  from '../../components/admin/product/ProductPriceSidebar';
import {
    ensureRentTiersFormShape,
    normalizeRentTiersForApi,
    minRentTierPrice,
} from '../../utils/rentPricing';

import './Admin.css';
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
    desc: '', adminNotes: '', sku: '', slug: '', groupId: '',
    stockStatus: 'in_stock', brand: '', packSize: 1.0, unit: 'м²', badge: '',
    specs: {}, priceMatrix: [], availableFrom: '', kitItems: [],
    quantityAvailable: '', showInRentCatalog: true, relatedProducts: [],
    serialNumber: '', inventoryNumber: '', technicalCondition: '',
    weightPerUnit: '', weightTotal: '', replacementCost: '', securityDeposit: '',
    competitorLinks: [], adminImages: [],
    createWarehouseId: '', createWarehouseQuantity: '',
    editWarehouseId: '', editWarehouseQuantity: '',
    rentPriceTiers: null,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProductEdit({ context = 'products' }) {
    const { id }           = useParams();
    const navigate         = useNavigate();
    const [searchParams]   = useSearchParams();
    const location         = useLocation();
    const isNew         = id === 'new';
    const isRentContext = context === 'rent';
    const warehouseIdFromQuery = searchParams.get('warehouseId');

    const [formData, setFormData]       = useState({ ...INITIAL_FORM, createWarehouseId: warehouseIdFromQuery || '' });
    const [categories, setCategories]   = useState([]);
    const [brands, setBrands]           = useState([]);
    const [warehouses, setWarehouses]   = useState([]);
    const [inventoryRows, setInventoryRows] = useState([]);
    const [loading, setLoading]         = useState(!isNew);
    const [saving, setSaving]           = useState(false);

    // Merge a single field into formData
    const update = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

    // ── Data loading ─────────────────────────────────────────────────────────

    useEffect(() => {
        if (isRentContext && isNew) update('unit', 'шт');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isRentContext, isNew]);

    useEffect(() => {
        if (isRentContext && !isNew && id) loadInventoryRows(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // Auto-populate editWarehouseId when warehouses load (new rent product)
    useEffect(() => {
        if (!isRentContext || isNew || formData.editWarehouseId || warehouses.length === 0) return;
        setFormData((prev) => ({
            ...prev,
            editWarehouseId: String(warehouses[0].id),
            editWarehouseQuantity: prev.editWarehouseQuantity || '0',
        }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [warehouses]);

    // Auto-generate slug from name (new products only)
    useEffect(() => {
        if (isNew && formData.name) {
            update('slug', transliterate(formData.name));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.name]);

    async function loadCategories() {
        try {
            const data = isRentContext ? await rentCategoriesApi.list() : await categoriesApi.list();
            setCategories(data);
            if (isNew && data.length > 0 && !formData.category) {
                update('category', data[0].name);
            }
        } catch (err) {
            console.error('loadCategories:', err);
        }
    }

    async function loadBrands() {
        try {
            const data = await brandsApi.list();
            setBrands(data);
        } catch (err) {
            console.error('loadBrands:', err);
        }
    }

    async function loadWarehouses() {
        try {
            const data = await warehousesApi.list();
            const list = Array.isArray(data) ? data : [];
            setWarehouses(list);
            if (isNew && isRentContext && !formData.createWarehouseId && list.length > 0) {
                update('createWarehouseId', String(list[0].id));
            }
        } catch (err) {
            console.error('loadWarehouses:', err);
        }
    }

    async function loadProduct() {
        try {
            const data = await productsApi.getById(id);
            if (!data) return;

            let relatedProductObjects = [];
            if (data.relatedProducts?.length > 0) {
                const relRes = await Promise.all(
                    data.relatedProducts.map((pid) =>
                        productsApi.getById(pid).catch(() => null)
                    )
                );
                relatedProductObjects = relRes.filter(Boolean).map((p) => ({
                    id: p.id, name: p.name, image: p.image, slug: p.slug,
                }));
            }

            setFormData({
                ...data,
                price:             data.price ?? '',
                oldPrice:          data.oldPrice ?? '',
                images:            data.images || [],
                adminNotes:        data.adminNotes || '',
                specs:             data.specs || {},
                priceMatrix:       data.priceMatrix || [],
                availableFrom:     data.availableFrom || '',
                kitItems:          data.kitItems || [],
                quantityAvailable: data.quantityAvailable ?? '',
                showInRentCatalog: typeof data.showInRentCatalog === 'boolean' ? data.showInRentCatalog : true,
                relatedProducts:   relatedProductObjects,
                competitorLinks:   Array.isArray(data.competitorLinks) ? data.competitorLinks : [],
                adminImages:       Array.isArray(data.adminImages) ? data.adminImages : [],
                createWarehouseId: '', createWarehouseQuantity: '',
                editWarehouseId:   '', editWarehouseQuantity: '',
                rentPriceTiers: isRentContext
                    ? ensureRentTiersFormShape(data.rentPriceTiers, data.price ?? '')
                    : null,
            });

            await loadInventoryRows(data.id);
        } catch (err) {
            console.error('loadProduct:', err);
        } finally {
            setLoading(false);
        }
    }

    async function loadInventoryRows(productId) {
        if (!isRentContext || !productId) return;
        try {
            const data = await inventoryApi.list();
            const rows = Array.isArray(data)
                ? data.filter((r) => Number(r.productId) === Number(productId))
                : [];
            setInventoryRows(rows);
            if (rows.length > 0) {
                const first = rows[0];
                setFormData((prev) => ({
                    ...prev,
                    editWarehouseId:       String(first.warehouseId || ''),
                    editWarehouseQuantity: String(Number(first.quantity || 0)),
                }));
            }
        } catch (err) {
            console.error('loadInventoryRows:', err);
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
            console.error('loadGroupData:', err);
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
        return isRentContext ? '/admin/rent' : '/admin/products';
    }

    async function handleSubmit(e) {
        e?.preventDefault();
        if (!formData.image) {
            alert('Будь ласка, додайте головне зображення товару.');
            return;
        }
        if (isRentContext && isNew && !String(formData.createWarehouseId || '').trim()) {
            alert('Оберіть склад для створення товару.');
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
                isRent:    isRentContext,
                price:     priceForApi,
                rentPriceTiers: isRentContext ? rentTiersForDb : null,
                oldPrice:  (formData.oldPrice === '' || formData.badge !== 'SALE') ? null : Number(formData.oldPrice),
                packSize:  formData.packSize === '' ? 1.0 : Number(formData.packSize),
                availableFrom: formData.availableFrom || null,
                adminNotes:    String(formData.adminNotes || '').trim() || null,
                badge:         isRentContext ? null : formData.badge,
                quantityAvailable: !isRentContext
                    ? (formData.quantityAvailable === '' ? null : Number(formData.quantityAvailable))
                    : null,
                relatedProducts: Array.isArray(formData.relatedProducts)
                    ? formData.relatedProducts.map((r) => (typeof r === 'object' ? r.id : r))
                    : [],
                competitorLinks: (formData.competitorLinks || [])
                    .map((v) => String(v || '').trim()).filter(Boolean),
                adminImages: (formData.adminImages || [])
                    .map((v) => String(v || '').trim()).filter(Boolean),
                createWarehouseId:       isRentContext && isNew  ? Number(formData.createWarehouseId)       : undefined,
                createWarehouseQuantity: isRentContext && isNew  ? Number(formData.createWarehouseQuantity || 0) : undefined,
                editWarehouseId:         isRentContext && !isNew ? Number(formData.editWarehouseId || 0)    : undefined,
                editWarehouseQuantity:   isRentContext && !isNew ? Number(formData.editWarehouseQuantity || 0) : undefined,
            };

            if (isNew) {
                await productsApi.create(payload);
            } else {
                await productsApi.update(id, payload);
            }
            navigate(afterSavePath());
        } catch (err) {
            console.error('handleSubmit:', err);
            alert(err.message || 'Сталася помилка при збереженні товару.');
        } finally {
            setSaving(false);
        }
    }

    // ── Render ────────────────────────────────────────────────────────────────

    if (loading) return <div className="admin-content">Завантаження...</div>;

    const isSillCategory = formData.category === 'Підвіконня';

    return (
        <div className="product-edit-page">
            {/* Breadcrumbs */}
            <div className="admin-breadcrumbs">
                <Link to={isRentContext ? '/admin/rent' : '/admin/products'}>
                    {isRentContext ? 'Оренда' : 'Товари'}
                </Link>
                <ChevronRight size={14} />
                <span className="breadcrumb-current">
                    {isNew
                        ? (isRentContext ? 'Новий інструмент' : 'Новий товар')
                        : formData.name}
                </span>
            </div>

            {/* Header */}
            <div className="product-edit-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button
                        type="button"
                        onClick={() => navigate(afterSavePath())}
                        className="action-btn"
                        style={{ width: '40px', height: '40px' }}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="admin-title" style={{ margin: 0 }}>
                        {isNew
                            ? (isRentContext ? 'Додати новий інструмент' : 'Додати новий товар')
                            : (isRentContext ? 'Редагувати інструмент' : 'Редагувати товар')}
                    </h1>
                </div>
                <button
                    type="button"
                    onClick={handleSubmit}
                    className="btn-primary"
                    disabled={saving}
                >
                    <Save size={18} /> {saving ? 'Збереження...' : 'Зберегти зміни'}
                </button>
            </div>

            {/* Two-column grid */}
            <div className="product-edit-grid">
                {/* ── Left column ── */}
                <div className="edit-main">
                    <ProductBasicInfo
                        formData={formData}
                        onChange={update}
                    />
                    <ProductSpecs
                        specs={formData.specs}
                        onChange={(val) => update('specs', val)}
                    />
                    {isRentContext && (
                        <ProductKitItems
                            items={formData.kitItems}
                            onChange={(val) => update('kitItems', val)}
                        />
                    )}
                    {isRentContext && (
                        <ProductRelatedSearch
                            productId={id}
                            selected={formData.relatedProducts}
                            onChange={(val) => update('relatedProducts', val)}
                        />
                    )}
                    {isSillCategory && (
                        <ProductPriceMatrix
                            matrix={formData.priceMatrix}
                            onChange={(val) => update('priceMatrix', val)}
                        />
                    )}
                    <ProductGallery
                        mainImage={formData.image}
                        images={formData.images}
                        onMainChange={(val) => update('image', val)}
                        onImagesChange={(val) => update('images', val)}
                    />
                </div>

                {/* ── Right column ── */}
                <div className="edit-sidebar">
                    <ProductPriceSidebar
                        formData={formData}
                        onChange={update}
                        isRentContext={isRentContext}
                        isNew={isNew}
                        categories={categories}
                        brands={brands}
                        warehouses={warehouses}
                        inventoryRows={inventoryRows}
                        isSillCategory={isSillCategory}
                    />
                    {isRentContext && (
                        <ProductRentDetails
                            formData={formData}
                            onChange={update}
                        />
                    )}
                    {!isRentContext && (
                        <ProductIdentifiers
                            formData={formData}
                            onChange={update}
                            onGroupIdBlur={loadGroupData}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
