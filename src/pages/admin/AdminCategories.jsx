import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, ChevronDown, Image as ImageIcon } from 'lucide-react';
import { categoriesApi, rentCategoriesApi, brandsApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Tabs from '../../features/admin/ui/Tabs';
import ConfirmDialog from '../../features/admin/ui/ConfirmDialog';
import Switch from '../../features/admin/ui/Switch';
import CatalogBanner from '../../features/admin/catalog/CatalogBanner';
import '../../features/admin/catalog/catalog.css';

const TABS = [
    { value: 'categories', label: 'Категорії' },
    { value: 'brands', label: 'Бренди' },
];

const NEW_GROUP_VALUE = '__new__';

/** <select> of existing groups + "Нова група" → reveals a text input. */
function GroupPicker({ value, groups, onChange, placeholder = 'Група' }) {
    const [creating, setCreating] = useState(false);

    if (creating || (value && !groups.includes(value))) {
        return (
            <input
                type="text"
                defaultValue={value}
                autoFocus={creating}
                placeholder="Нова назва групи..."
                className="catalog-input"
                onBlur={(e) => {
                    setCreating(false);
                    onChange(e.target.value.trim());
                }}
            />
        );
    }

    return (
        <select
            className="catalog-select"
            value={value || ''}
            onChange={(e) => {
                if (e.target.value === NEW_GROUP_VALUE) {
                    setCreating(true);
                    return;
                }
                onChange(e.target.value);
            }}
        >
            <option value="">{placeholder}</option>
            {groups.map((g) => (
                <option key={g} value={g}>{g}</option>
            ))}
            <option value={NEW_GROUP_VALUE}>+ Нова група</option>
        </select>
    );
}

export default function AdminCategories() {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('categories');
    const [categories, setCategories] = useState([]);
    const [rentCategories, setRentCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [newCategory, setNewCategory] = useState('');
    const [newRentCategory, setNewRentCategory] = useState('');
    const [newRentGroup, setNewRentGroup] = useState('');
    const [newBrand, setNewBrand] = useState({ name: '', logo: '' });
    const [openRentGroups, setOpenRentGroups] = useState({});
    const [deleteTarget, setDeleteTarget] = useState(null); // { kind, id, label, count }
    const [deleteBusy, setDeleteBusy] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [cats, rentCats, brandRows] = await Promise.all([
                categoriesApi.list(),
                rentCategoriesApi.list(),
                brandsApi.list(),
            ]);
            setCategories(Array.isArray(cats) ? cats : []);
            setRentCategories(Array.isArray(rentCats) ? rentCats : []);
            setBrands(Array.isArray(brandRows) ? brandRows : []);
        } catch (err) {
            showToast(err.message || 'Не вдалося завантажити довідники', 'warning');
        }
    };

    const rentGroupNames = useMemo(
        () => [...new Set(rentCategories.map((c) => c.group).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'uk')),
        [rentCategories]
    );

    async function handleAddCategory(e) {
        e.preventDefault();
        if (!newCategory.trim()) return;
        try {
            await categoriesApi.create({ name: newCategory.trim() });
            setNewCategory('');
            fetchData();
        } catch (err) {
            showToast(err.message || 'Не вдалося додати категорію', 'warning');
        }
    }

    async function handleRenameCategory(id, name) {
        const trimmed = name.trim();
        const current = categories.find((c) => c.id === id);
        if (!trimmed || trimmed === current?.name) return;
        try {
            await categoriesApi.update(id, { name: trimmed });
            fetchData();
        } catch (err) {
            showToast(err.message || 'Не вдалося перейменувати категорію', 'warning');
        }
    }

    async function handleToggleCategory(id, value) {
        try {
            await categoriesApi.patch(id, { isActive: value });
            setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, isActive: value } : c)));
        } catch (err) {
            showToast(err.message || 'Помилка при зміні статусу категорії', 'warning');
        }
    }

    async function handleAddRentCategory(e) {
        e.preventDefault();
        if (!newRentCategory.trim()) return;
        try {
            await rentCategoriesApi.create({
                name: newRentCategory.trim(),
                group: newRentGroup.trim() || null,
            });
            setNewRentCategory('');
            setNewRentGroup('');
            fetchData();
        } catch (err) {
            showToast(err.message || 'Не вдалося додати категорію оренди', 'warning');
        }
    }

    async function handleUpdateRentCategoryGroup(id, group) {
        try {
            await rentCategoriesApi.update(id, { group: group || null });
            fetchData();
        } catch (err) {
            showToast(err.message || 'Не вдалося оновити групу', 'warning');
        }
    }

    async function handleToggleRentCategory(id, value) {
        try {
            await rentCategoriesApi.patch(id, { isActive: value });
            setRentCategories((prev) => prev.map((c) => (c.id === id ? { ...c, isActive: value } : c)));
        } catch (err) {
            showToast(err.message || 'Помилка при зміні статусу категорії', 'warning');
        }
    }

    async function handleAddBrand(e) {
        e.preventDefault();
        if (!newBrand.name.trim()) return;
        try {
            await brandsApi.create(newBrand);
            setNewBrand({ name: '', logo: '' });
            fetchData();
        } catch (err) {
            showToast(err.message || 'Не вдалося додати бренд', 'warning');
        }
    }

    async function handleToggleBrand(id, field, value) {
        try {
            await brandsApi.patch(id, { [field]: value });
            setBrands((prev) => prev.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
        } catch (err) {
            showToast(err.message || 'Не вдалося оновити бренд', 'warning');
        }
    }

    async function handleConfirmDelete() {
        if (!deleteTarget) return;
        setDeleteBusy(true);
        try {
            if (deleteTarget.kind === 'category') await categoriesApi.remove(deleteTarget.id);
            else if (deleteTarget.kind === 'rentCategory') await rentCategoriesApi.remove(deleteTarget.id);
            else if (deleteTarget.kind === 'brand') await brandsApi.remove(deleteTarget.id);
            await fetchData();
            setDeleteTarget(null);
        } catch (err) {
            showToast(err.message || 'Помилка видалення', 'warning');
        } finally {
            setDeleteBusy(false);
        }
    }

    const rentGroups = Object.entries(
        rentCategories.reduce((acc, cat) => {
            const group = cat.group || 'Без групи';
            if (!acc[group]) acc[group] = [];
            acc[group].push(cat);
            return acc;
        }, {})
    );

    const deleteMessage = deleteTarget
        ? `Видалити «${deleteTarget.label}»?${deleteTarget.count ? ` Її використовують ${deleteTarget.count} карток(и) — вони залишаться з цією назвою в полі категорії.` : ''} Цю дію не можна скасувати.`
        : '';

    return (
        <div className="catalog-taxonomy">
            <CatalogBanner />
            <Tabs tabs={TABS} value={activeTab} onChange={setActiveTab} />

            {activeTab === 'categories' && (
                <div className="catalog-taxonomy-grid">
                    <div className="ds-card">
                        <div className="ds-card-h"><h2>Категорії магазину</h2></div>
                        <div className="ds-card-b">
                            <form onSubmit={handleAddCategory} className="catalog-add-row">
                                <input
                                    type="text"
                                    placeholder="Назва нової категорії..."
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value)}
                                    className="catalog-input"
                                />
                                <button type="submit" className="ds-btn ds-btn--primary">
                                    <Plus size={16} /> Додати
                                </button>
                            </form>

                            <table className="ds-table">
                                <thead>
                                    <tr>
                                        <th className="ds-table-th">Назва</th>
                                        <th className="ds-table-th ds-table-th--center">На сайті</th>
                                        <th className="ds-table-th ds-table-th--right">Дії</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {categories.map((cat) => (
                                        <tr className="ds-table-row" key={cat.id}>
                                            <td className="ds-table-td">
                                                <input
                                                    type="text"
                                                    defaultValue={cat.name}
                                                    className="catalog-input catalog-input--inline"
                                                    onBlur={(e) => handleRenameCategory(cat.id, e.target.value)}
                                                />
                                            </td>
                                            <td className="ds-table-td ds-table-td--center">
                                                <Switch
                                                    checked={cat.isActive !== false}
                                                    onChange={(v) => handleToggleCategory(cat.id, v)}
                                                    label={`На сайті: ${cat.name}`}
                                                />
                                            </td>
                                            <td className="ds-table-td ds-table-td--right">
                                                <button
                                                    type="button"
                                                    className="ds-icon-btn"
                                                    onClick={() => setDeleteTarget({ kind: 'category', id: cat.id, label: cat.name, count: cat.productCount })}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="ds-card">
                        <div className="ds-card-h"><h2>Категорії оренди</h2></div>
                        <div className="ds-card-b">
                            <form onSubmit={handleAddRentCategory} className="catalog-add-row catalog-add-row--rent">
                                <input
                                    type="text"
                                    placeholder="Назва нової категорії оренди..."
                                    value={newRentCategory}
                                    onChange={(e) => setNewRentCategory(e.target.value)}
                                    className="catalog-input"
                                />
                                <GroupPicker
                                    value={newRentGroup}
                                    groups={rentGroupNames}
                                    onChange={setNewRentGroup}
                                    placeholder="Без групи"
                                />
                                <button type="submit" className="ds-btn ds-btn--primary">
                                    <Plus size={16} /> Додати
                                </button>
                            </form>

                            {rentGroups.map(([groupName, items]) => {
                                const isOpen = openRentGroups[groupName] ?? true;
                                return (
                                    <div key={groupName} className="catalog-group">
                                        <button
                                            type="button"
                                            onClick={() => setOpenRentGroups((prev) => ({ ...prev, [groupName]: !isOpen }))}
                                            className="catalog-group__head"
                                        >
                                            <span>{groupName}</span>
                                            <ChevronDown size={16} className={`catalog-group__chevron${isOpen ? ' is-open' : ''}`} />
                                        </button>
                                        {isOpen && (
                                            <table className="ds-table">
                                                <thead>
                                                    <tr>
                                                        <th className="ds-table-th">Назва</th>
                                                        <th className="ds-table-th">Група</th>
                                                        <th className="ds-table-th ds-table-th--center">На сайті</th>
                                                        <th className="ds-table-th ds-table-th--right">Дії</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {items.map((cat) => (
                                                        <tr className="ds-table-row" key={cat.id}>
                                                            <td className="ds-table-td">
                                                                <input
                                                                    type="text"
                                                                    defaultValue={cat.name}
                                                                    className="catalog-input catalog-input--inline"
                                                                    onBlur={(e) => {
                                                                        const name = e.target.value.trim();
                                                                        if (name && name !== cat.name) {
                                                                            rentCategoriesApi.update(cat.id, { name }).then(fetchData).catch((err) => showToast(err.message || 'Не вдалося перейменувати', 'warning'));
                                                                        }
                                                                    }}
                                                                />
                                                            </td>
                                                            <td className="ds-table-td">
                                                                <GroupPicker
                                                                    value={cat.group || ''}
                                                                    groups={rentGroupNames}
                                                                    onChange={(g) => handleUpdateRentCategoryGroup(cat.id, g)}
                                                                    placeholder="Без групи"
                                                                />
                                                            </td>
                                                            <td className="ds-table-td ds-table-td--center">
                                                                <Switch
                                                                    checked={cat.isActive !== false}
                                                                    onChange={(v) => handleToggleRentCategory(cat.id, v)}
                                                                    label={`На сайті: ${cat.name}`}
                                                                />
                                                            </td>
                                                            <td className="ds-table-td ds-table-td--right">
                                                                <button
                                                                    type="button"
                                                                    className="ds-icon-btn"
                                                                    onClick={() => setDeleteTarget({ kind: 'rentCategory', id: cat.id, label: cat.name, count: cat.productCount })}
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'brands' && (
                <div className="ds-card">
                    <div className="ds-card-h"><h2>Бренди</h2></div>
                    <div className="ds-card-b">
                        <form onSubmit={handleAddBrand} className="catalog-add-row catalog-add-row--brand">
                            <input
                                type="text"
                                placeholder="Назва бренду..."
                                value={newBrand.name}
                                onChange={(e) => setNewBrand({ ...newBrand, name: e.target.value })}
                                className="catalog-input"
                            />
                            <input
                                type="text"
                                placeholder="URL логотипу..."
                                value={newBrand.logo}
                                onChange={(e) => setNewBrand({ ...newBrand, logo: e.target.value })}
                                className="catalog-input"
                            />
                            <button type="submit" className="ds-btn ds-btn--primary">
                                <Plus size={16} /> Додати
                            </button>
                        </form>

                        <table className="ds-table">
                            <thead>
                                <tr>
                                    <th className="ds-table-th">Лого</th>
                                    <th className="ds-table-th">Назва</th>
                                    <th className="ds-table-th ds-table-th--center">Магазин</th>
                                    <th className="ds-table-th ds-table-th--center">Оренда</th>
                                    <th className="ds-table-th ds-table-th--right">Дії</th>
                                </tr>
                            </thead>
                            <tbody>
                                {brands.map((brand) => (
                                    <tr className="ds-table-row" key={brand.id}>
                                        <td className="ds-table-td">
                                            {brand.logo ? (
                                                <img src={brand.logo} alt={brand.name} className="catalog-brand-logo" />
                                            ) : (
                                                <ImageIcon size={18} className="catalog-brand-logo-placeholder" />
                                            )}
                                        </td>
                                        <td className="ds-table-td">{brand.name}</td>
                                        <td className="ds-table-td ds-table-td--center">
                                            <Switch
                                                checked={!!brand.isShop}
                                                onChange={(v) => handleToggleBrand(brand.id, 'isShop', v)}
                                                label={`Магазин: ${brand.name}`}
                                            />
                                        </td>
                                        <td className="ds-table-td ds-table-td--center">
                                            <Switch
                                                checked={!!brand.isRent}
                                                onChange={(v) => handleToggleBrand(brand.id, 'isRent', v)}
                                                label={`Оренда: ${brand.name}`}
                                            />
                                        </td>
                                        <td className="ds-table-td ds-table-td--right">
                                            <button
                                                type="button"
                                                className="ds-icon-btn"
                                                onClick={() => setDeleteTarget({ kind: 'brand', id: brand.id, label: brand.name })}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <ConfirmDialog
                open={!!deleteTarget}
                title="Видалити?"
                message={deleteMessage}
                confirmText="Видалити"
                loading={deleteBusy}
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}
