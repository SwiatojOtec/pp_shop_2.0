import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Save, ArrowLeft, ChevronRight, Trash2 } from 'lucide-react';
import { transliterate } from '../../utils/transliterate';
import { productsApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

import ConfirmDialog from '../../features/admin/ui/ConfirmDialog';
import ProductBasicInfo from '../../components/admin/product/ProductBasicInfo';
import ProductGallery from '../../components/admin/product/ProductGallery';

import '../../components/admin/product/ProductEdit.css';

const UNIT_OPTIONS = ['послуга', 'виїзд', 'м²', 'шт', 'компл.'];

const INITIAL_FORM = {
    name: '', desc: '', instruction: '', adminNotes: '',
    category: '', price: '', unit: 'послуга',
    image: '', images: [], slug: '',
    showInServiceCatalog: true,
};

/**
 * Редактор послуги — свідомо НЕ ProductEdit.jsx з новим context: той файл
 * глибоко галузиться на isRentContext через дочірні компоненти заради
 * полів (варіанти, priceMatrix/priceGrid, тарифи оренди, склад), яких
 * послузі не треба. Один екран без вкладок; послуга зберігається як
 * Product з isService:true, isRent:false — щоб одразу зʼявитись у пошуку
 * позицій угоди (docs plan «Каталог «Послуги»»).
 */
export default function ServiceEdit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showToast } = useToast();
    const isNew = id === 'new';

    const [formData, setFormData] = useState(INITIAL_FORM);
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const canDelete = user && ['owner', 'shop_manager', 'shop_rent', 'rent', 'pivdenbud'].includes(user.role);

    const update = (field, value) => {
        setDirty(true);
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    useEffect(() => {
        if (!isNew) loadService();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    useEffect(() => {
        if (isNew && formData.name) {
            setFormData((prev) => ({ ...prev, slug: transliterate(formData.name) }));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.name]);

    useEffect(() => {
        if (!dirty) return undefined;
        const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [dirty]);

    async function loadService() {
        try {
            const data = await productsApi.getById(id);
            if (!data) return;
            setFormData({
                ...INITIAL_FORM,
                ...data,
                price: data.price ?? '',
                images: data.images || [],
                adminNotes: data.adminNotes || '',
                instruction: data.instruction || '',
                category: data.category || '',
                unit: data.unit || 'послуга',
                showInServiceCatalog: typeof data.showInServiceCatalog === 'boolean' ? data.showInServiceCatalog : true,
            });
        } catch (err) {
            showToast(err.message || 'Не вдалося завантажити послугу', 'warning');
        } finally {
            setLoading(false);
        }
    }

    function goBack() {
        navigate('/admin/catalog/services');
    }

    async function handleSubmit(e) {
        e?.preventDefault();
        if (!formData.name.trim()) {
            showToast('Вкажіть назву послуги.', 'warning');
            return;
        }
        if (!formData.image) {
            showToast('Додайте головне зображення послуги.', 'warning');
            return;
        }
        if (formData.price === '' || Number.isNaN(Number(formData.price))) {
            showToast('Вкажіть ціну послуги.', 'warning');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...formData,
                isRent: false,
                isService: true,
                price: Number(formData.price),
                category: formData.category.trim() || null,
                adminNotes: String(formData.adminNotes || '').trim() || null,
            };
            if (isNew) {
                await productsApi.create(payload);
            } else {
                await productsApi.update(id, payload);
            }
            setDirty(false);
            goBack();
        } catch (err) {
            showToast(err.message || 'Сталася помилка при збереженні послуги.', 'warning');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (isNew || !id) return;
        setDeleteLoading(true);
        try {
            await productsApi.remove(id);
            goBack();
        } catch (err) {
            showToast(err.message || 'Не вдалося видалити послугу.', 'warning');
        } finally {
            setDeleteLoading(false);
            setDeleteOpen(false);
        }
    }

    if (loading) return <div className="od-loading">Завантаження...</div>;

    return (
        <div className="product-edit-page">
            <div className="admin-breadcrumbs">
                <Link to="/admin/catalog/services">Послуги</Link>
                <ChevronRight size={14} />
                <span className="breadcrumb-current">{isNew ? 'Нова послуга' : formData.name}</span>
            </div>

            <div className="product-edit-header product-edit-header--sticky">
                <div className="product-edit-header-left">
                    <button type="button" onClick={goBack} className="ds-icon-btn">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="product-edit-title">{isNew ? 'Додати нову послугу' : 'Редагувати послугу'}</h1>
                    {dirty && <span className="product-edit-dirty">Є незбережені зміни</span>}
                </div>
                <div className="product-edit-header-actions">
                    {!isNew && canDelete && (
                        <button
                            type="button"
                            className="ds-btn ds-btn--secondary product-edit-delete-btn"
                            onClick={() => setDeleteOpen(true)}
                            disabled={deleteLoading || saving}
                        >
                            <Trash2 size={18} /> Видалити послугу
                        </button>
                    )}
                    <button type="button" onClick={handleSubmit} className="ds-btn ds-btn--primary" disabled={saving}>
                        <Save size={18} /> {saving ? 'Збереження...' : 'Зберегти зміни'}
                    </button>
                </div>
            </div>

            <ConfirmDialog
                open={deleteOpen}
                title="Видалити послугу?"
                message={formData.name ? `Безповоротно видалити «${formData.name}»?` : 'Безповоротно видалити цю послугу?'}
                confirmText="Видалити"
                onConfirm={handleDelete}
                onCancel={() => setDeleteOpen(false)}
            />

            <div className="product-edit-tabbody">
                <ProductBasicInfo formData={formData} onChange={update} />

                <div className="admin-section">
                    <h2 className="section-title">Деталі послуги</h2>
                    <div className="admin-form">
                        <div className="form-group">
                            <label>Категорія (необов&apos;язково)</label>
                            <input
                                type="text"
                                value={formData.category}
                                onChange={(e) => update('category', e.target.value)}
                                placeholder="Наприклад: Укладка, Виїзди, Логістика"
                            />
                        </div>
                        <div className="form-group">
                            <label>Ціна, ₴</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.price}
                                onChange={(e) => update('price', e.target.value)}
                                placeholder="0"
                            />
                        </div>
                        <div className="form-group">
                            <label>Одиниця</label>
                            <select value={formData.unit} onChange={(e) => update('unit', e.target.value)}>
                                {UNIT_OPTIONS.map((u) => (
                                    <option key={u} value={u}>{u}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={!!formData.showInServiceCatalog}
                                    onChange={(e) => update('showInServiceCatalog', e.target.checked)}
                                    style={{ width: '16px', height: '16px' }}
                                />
                                Показувати на сайті («Послуги»)
                            </label>
                        </div>
                    </div>
                </div>

                <ProductGallery
                    mainImage={formData.image}
                    images={formData.images}
                    onMainChange={(val) => update('image', val)}
                    onImagesChange={(val) => update('images', val)}
                />
            </div>
        </div>
    );
}
