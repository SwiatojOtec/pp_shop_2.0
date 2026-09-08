import { useState, useEffect } from 'react';
import { Plus, Trash2, FolderTree, Award, Image as ImageIcon, ChevronDown } from 'lucide-react';
import { categoriesApi, rentCategoriesApi, brandsApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../features/admin/ui/PageHeader';
import Tabs from '../../features/admin/ui/Tabs';
import ConfirmDialog from '../../features/admin/ui/ConfirmDialog';
import './Admin.css';

const TABS = [
    { value: 'categories', label: 'Категорії' },
    { value: 'brands', label: 'Бренди' },
];

export default function AdminSettings() {
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
    const [deleteTarget, setDeleteTarget] = useState(null); // { kind, id, label }
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
            console.error('Error fetching settings data:', err);
        }
    };

    // Category Handlers
    const handleAddCategory = async (e) => {
        e.preventDefault();
        if (!newCategory.trim()) return;
        try {
            await categoriesApi.create({ name: newCategory.trim() });
            setNewCategory('');
            fetchData();
        } catch (err) {
            showToast(err.message || 'Не вдалося додати категорію', 'warning');
        }
    };

    // Rent Category Handlers
    const handleAddRentCategory = async (e) => {
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
    };

    const handleUpdateRentCategoryGroup = async (id, group) => {
        try {
            await rentCategoriesApi.update(id, { group });
            fetchData();
        } catch (err) {
            showToast(err.message || 'Не вдалося оновити групу', 'warning');
        }
    };

    // Brand Handlers
    const handleAddBrand = async (e) => {
        e.preventDefault();
        if (!newBrand.name.trim()) return;
        try {
            await brandsApi.create(newBrand);
            setNewBrand({ name: '', logo: '' });
            fetchData();
        } catch (err) {
            showToast(err.message || 'Не вдалося додати бренд', 'warning');
        }
    };

    const handleToggleRentCategory = async (id, value) => {
        try {
            await rentCategoriesApi.patch(id, { isActive: value });
            setRentCategories(prev => prev.map(c => c.id === id ? { ...c, isActive: value } : c));
        } catch (err) {
            showToast(err.message || 'Помилка при зміні статусу категорії', 'warning');
        }
    };

    const handleToggleBrand = async (id, field, value) => {
        try {
            await brandsApi.patch(id, { [field]: value });
            setBrands(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
        } catch (err) {
            showToast(err.message || 'Не вдалося оновити бренд', 'warning');
        }
    };

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

    return (
        <div className="admin-settings-page">
            <PageHeader title="Налаштування" subtitle="Категорії, бренди та оренда" />

            <Tabs tabs={TABS} value={activeTab} onChange={setActiveTab} />

            {activeTab === 'categories' && (
                <div className="admin-section bg-white p-6 rounded-xl border border-[var(--admin-border)] mt-4">
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <div className="flex items-center gap-2 mb-5">
                                <FolderTree size={20} />
                                <h2 className="text-[1.1rem] m-0 font-extrabold">Категорії магазину</h2>
                            </div>

                            <form onSubmit={handleAddCategory} className="flex gap-2 mb-6">
                                <input
                                    type="text"
                                    placeholder="Назва нової категорії..."
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value)}
                                    className="flex-1 p-3 rounded-lg border border-gray-300"
                                />
                                <button type="submit" className="btn btn-primary">
                                    <Plus size={20} /> Додати
                                </button>
                            </form>

                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Назва</th>
                                        <th>Slug</th>
                                        <th className="text-right">Дії</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {categories.map(cat => (
                                        <tr key={cat.id}>
                                            <td className="font-semibold">{cat.name}</td>
                                            <td>{cat.slug}</td>
                                            <td className="text-right">
                                                <button
                                                    onClick={() => setDeleteTarget({ kind: 'category', id: cat.id, label: cat.name })}
                                                    className="action-btn delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-5">
                                <FolderTree size={20} />
                                <h2 className="text-[1.1rem] m-0 font-extrabold">Категорії оренди</h2>
                            </div>

                            <form onSubmit={handleAddRentCategory} className="grid grid-cols-[2fr_1fr_auto] gap-2 mb-6">
                                <input
                                    type="text"
                                    placeholder="Назва нової категорії оренди..."
                                    value={newRentCategory}
                                    onChange={(e) => setNewRentCategory(e.target.value)}
                                    className="p-3 rounded-lg border border-gray-300"
                                />
                                <input
                                    type="text"
                                    placeholder="Група (напр. Монтажне устаткування)"
                                    value={newRentGroup}
                                    onChange={(e) => setNewRentGroup(e.target.value)}
                                    className="p-3 rounded-lg border border-gray-300"
                                />
                                <button type="submit" className="btn btn-primary">
                                    <Plus size={20} /> Додати
                                </button>
                            </form>

                            {rentGroups.map(([groupName, items]) => {
                                const isOpen = openRentGroups[groupName] ?? true;
                                return (
                                    <div key={groupName} className="mb-4 border border-[var(--admin-border)] rounded-[10px] overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={() => setOpenRentGroups(prev => ({ ...prev, [groupName]: !isOpen }))}
                                            className="w-full flex justify-between items-center px-4 py-2.5 bg-slate-50 border-none cursor-pointer font-bold"
                                        >
                                            <span>{groupName}</span>
                                            <ChevronDown
                                                size={16}
                                                className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                                            />
                                        </button>
                                        {isOpen && (
                                            <table className="admin-table border-t border-[var(--admin-border)]">
                                                <thead>
                                                    <tr>
                                                        <th>Назва</th>
                                                        <th>Slug</th>
                                                        <th>Група</th>
                                                        <th className="text-center">На сайті</th>
                                                        <th className="text-right">Дії</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {items.map(cat => (
                                                        <tr key={cat.id}>
                                                            <td className="font-semibold">{cat.name}</td>
                                                            <td>{cat.slug}</td>
                                                            <td>
                                                                <input
                                                                    type="text"
                                                                    defaultValue={cat.group || ''}
                                                                    onBlur={(e) => handleUpdateRentCategoryGroup(cat.id, e.target.value)}
                                                                    placeholder="Група..."
                                                                    className="px-2 py-1.5 rounded-md border border-gray-300 w-full"
                                                                />
                                                            </td>
                                                            <td className="text-center">
                                                                <label className="brand-toggle">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={cat.isActive !== false}
                                                                        onChange={e => handleToggleRentCategory(cat.id, e.target.checked)}
                                                                    />
                                                                    <span className="brand-toggle-slider" />
                                                                </label>
                                                            </td>
                                                            <td className="text-right">
                                                                <button
                                                                    onClick={() => setDeleteTarget({ kind: 'rentCategory', id: cat.id, label: cat.name })}
                                                                    className="action-btn delete"
                                                                >
                                                                    <Trash2 size={18} />
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
                <div className="admin-section bg-white p-6 rounded-xl border border-[var(--admin-border)] mt-4">
                    <div className="flex items-center gap-2 mb-5">
                        <Award size={20} />
                        <h2 className="text-[1.1rem] m-0 font-extrabold">Управління брендами</h2>
                    </div>

                    <form onSubmit={handleAddBrand} className="grid grid-cols-[1fr_1fr_auto] gap-2 mb-6">
                        <input
                            type="text"
                            placeholder="Назва бренду..."
                            value={newBrand.name}
                            onChange={(e) => setNewBrand({ ...newBrand, name: e.target.value })}
                            className="p-3 rounded-lg border border-gray-300"
                        />
                        <input
                            type="text"
                            placeholder="URL логотипу..."
                            value={newBrand.logo}
                            onChange={(e) => setNewBrand({ ...newBrand, logo: e.target.value })}
                            className="p-3 rounded-lg border border-gray-300"
                        />
                        <button type="submit" className="btn btn-primary">
                            <Plus size={20} /> Додати
                        </button>
                    </form>

                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Лого</th>
                                <th>Назва</th>
                                <th className="text-center">Магазин</th>
                                <th className="text-center">Оренда</th>
                                <th className="text-right">Дії</th>
                            </tr>
                        </thead>
                        <tbody>
                            {brands.map(brand => (
                                <tr key={brand.id}>
                                    <td>
                                        {brand.logo ? (
                                            <img src={brand.logo} alt={brand.name} className="h-[30px] max-w-[100px] object-contain" />
                                        ) : (
                                            <ImageIcon size={20} className="text-gray-300" />
                                        )}
                                    </td>
                                    <td className="font-semibold">{brand.name}</td>
                                    <td className="text-center">
                                        <label className="brand-toggle">
                                            <input
                                                type="checkbox"
                                                checked={!!brand.isShop}
                                                onChange={e => handleToggleBrand(brand.id, 'isShop', e.target.checked)}
                                            />
                                            <span className="brand-toggle-slider" />
                                        </label>
                                    </td>
                                    <td className="text-center">
                                        <label className="brand-toggle">
                                            <input
                                                type="checkbox"
                                                checked={!!brand.isRent}
                                                onChange={e => handleToggleBrand(brand.id, 'isRent', e.target.checked)}
                                            />
                                            <span className="brand-toggle-slider" />
                                        </label>
                                    </td>
                                    <td className="text-right">
                                        <button
                                            onClick={() => setDeleteTarget({ kind: 'brand', id: brand.id, label: brand.name })}
                                            className="action-btn delete"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <ConfirmDialog
                open={!!deleteTarget}
                title="Видалити?"
                message={deleteTarget ? `Видалити «${deleteTarget.label}»? Цю дію не можна скасувати.` : ''}
                confirmText="Видалити"
                loading={deleteBusy}
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}
