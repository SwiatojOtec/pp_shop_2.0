import ProductRentPriceTiers from './ProductRentPriceTiers';

/**
 * Right sidebar for ProductEdit: price, badge, category, brand, unit,
 * stock status, warehouse management (rent), and rent catalog toggle.
 */
export default function ProductPriceSidebar({
    formData,
    onChange,
    isRentContext,
    isNew,
    categories,
    brands,
    warehouses,
    inventoryRows,
    isSillCategory,
}) {
    function handleWarehouseSelect(warehouseId) {
        const matched = inventoryRows.find((r) => String(r.warehouseId) === warehouseId);
        onChange('editWarehouseId', warehouseId);
        onChange('editWarehouseQuantity', String(Number(matched?.quantity || 0)));
    }

    return (
        <div className="admin-section">
            <h2 className="section-title">Ціна та Категорія</h2>
            <div className="admin-form">

                {/* Price */}
                <div className="form-group">
                    <label>{formData.badge === 'SALE' ? 'Акційна ціна (₴)' : 'Ціна (₴)'}</label>
                    <input
                        type="number"
                        value={formData.price}
                        onChange={(e) => onChange('price', e.target.value)}
                        placeholder="Поточна ціна"
                    />
                    {isRentContext && (
                        <p className="field-hint">
                            Базова ціна для каталогу та сортування; при різних тарифах нижче автоматично
                            зберігається як мінімальна з діапазонів.
                        </p>
                    )}
                </div>

                {isRentContext && (
                    <ProductRentPriceTiers
                        value={formData.rentPriceTiers}
                        onChange={(tiers) => onChange('rentPriceTiers', tiers)}
                    />
                )}

                {/* Old price (SALE badge only) */}
                {formData.badge === 'SALE' && (
                    <div className="form-group">
                        <label>Стара ціна (закреслена, ₴)</label>
                        <input
                            type="number"
                            value={formData.oldPrice}
                            onChange={(e) => onChange('oldPrice', e.target.value)}
                            placeholder="Ціна до знижки"
                            style={{ borderColor: 'var(--admin-accent)' }}
                        />
                        <p className="field-hint" style={{ color: 'var(--admin-accent)' }}>
                            Ця ціна буде відображатися закресленою на сайті.
                        </p>
                    </div>
                )}

                {/* Badge (shop only) */}
                {!isRentContext && (
                    <div className="form-group">
                        <label>Мітка (Badge)</label>
                        <select
                            value={formData.badge || ''}
                            onChange={(e) => onChange('badge', e.target.value)}
                        >
                            <option value="">Без мітки</option>
                            <option value="SALE">Розпродаж %</option>
                            <option value="NEW">Новинка</option>
                            <option value="HOT">Хіт продажу</option>
                            <option value="TOP">Топ вибір</option>
                        </select>
                    </div>
                )}

                {/* Stock status */}
                <div className="form-group">
                    <label>Наявність</label>
                    {!isRentContext ? (
                        <select
                            value={formData.stockStatus}
                            onChange={(e) => onChange('stockStatus', e.target.value)}
                        >
                            <option value="in_stock">В наявності</option>
                            <option value="on_order">Під замовлення</option>
                            <option value="out_of_stock">Немає в наявності</option>
                        </select>
                    ) : (
                        <>
                            <select
                                value={formData.stockStatus}
                                onChange={(e) => onChange('stockStatus', e.target.value)}
                            >
                                <option value="in_stock">В наявності</option>
                                <option value="in_procurement">У закупівлі (на папері)</option>
                                <option value="needs_repair">Потребує ремонту</option>
                                <option value="in_repair">На ремонті</option>
                                <option value="out_of_stock">Немає в наявності</option>
                                <option value="available_later">Буде доступно з дати</option>
                            </select>

                            {formData.stockStatus === 'available_later' && (
                                <div style={{ marginTop: '10px' }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem' }}>
                                        Доступно з
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.availableFrom || ''}
                                        onChange={(e) => onChange('availableFrom', e.target.value)}
                                    />
                                </div>
                            )}

                            {/* Warehouse (new rent product) */}
                            {isNew && (
                                <>
                                    <div style={{ marginTop: '12px' }}>
                                        <label className="field-sublabel">Склад створення (обов&apos;язково)</label>
                                        <select
                                            value={formData.createWarehouseId || ''}
                                            onChange={(e) => onChange('createWarehouseId', e.target.value)}
                                        >
                                            <option value="">— Оберіть склад —</option>
                                            {warehouses.map((w) => (
                                                <option key={w.id} value={w.id}>{w.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div style={{ marginTop: '12px' }}>
                                        <label className="field-sublabel">Початкова кількість на обраному складі</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.createWarehouseQuantity}
                                            onChange={(e) => onChange('createWarehouseQuantity', e.target.value)}
                                            placeholder="Наприклад: 5"
                                        />
                                    </div>
                                </>
                            )}

                            {/* Warehouse (edit rent product) */}
                            {!isNew && (
                                <>
                                    <div style={{ marginTop: '12px' }}>
                                        <label className="field-sublabel">Оновити кількість на складі</label>
                                        <select
                                            value={formData.editWarehouseId || ''}
                                            onChange={(e) => handleWarehouseSelect(e.target.value)}
                                        >
                                            <option value="">— Оберіть склад —</option>
                                            {warehouses.map((w) => (
                                                <option key={w.id} value={w.id}>{w.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div style={{ marginTop: '12px' }}>
                                        <label className="field-sublabel">Кількість на обраному складі</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.editWarehouseQuantity}
                                            onChange={(e) => onChange('editWarehouseQuantity', e.target.value)}
                                            placeholder="Наприклад: 5"
                                        />
                                        <p className="field-hint">Зміна застосовується до обраного складу при збереженні.</p>
                                    </div>
                                </>
                            )}

                            {/* Quantity read-only */}
                            <div style={{ marginTop: '12px' }}>
                                <label className="field-sublabel">
                                    Кількість доступних одиниць (рахується автоматично зі складів)
                                </label>
                                <input
                                    type="number"
                                    value={formData.quantityAvailable}
                                    disabled
                                    readOnly
                                    placeholder="0"
                                    className="input-disabled"
                                />
                            </div>

                            <div style={{ marginTop: '12px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={!!formData.showInRentCatalog}
                                        onChange={(e) => onChange('showInRentCatalog', e.target.checked)}
                                        style={{ width: '16px', height: '16px' }}
                                    />
                                    Показувати в каталозі оренди
                                </label>
                            </div>
                        </>
                    )}
                </div>

                {/* Category */}
                <div className="form-group">
                    <label>Категорія</label>
                    <select
                        value={formData.category}
                        onChange={(e) => {
                            const cat = e.target.value;
                            onChange('category', cat);
                            if (cat === 'Підвіконня') onChange('unit', 'п.м.');
                        }}
                    >
                        {categories.map((cat) => (
                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                        {categories.length === 0 && <option>Спочатку додайте категорії</option>}
                    </select>
                </div>

                {/* Brand */}
                <div className="form-group">
                    <label>Бренд</label>
                    <select
                        value={formData.brand}
                        onChange={(e) => onChange('brand', e.target.value)}
                    >
                        <option value="">Оберіть бренд</option>
                        {brands.map((b) => (
                            <option key={b.id} value={b.name}>{b.name}</option>
                        ))}
                    </select>
                </div>

                {/* Unit */}
                <div className="form-group">
                    <label>Одиниця виміру</label>
                    <select
                        value={formData.unit}
                        onChange={(e) => onChange('unit', e.target.value)}
                        disabled={isSillCategory}
                        className={isSillCategory ? 'input-disabled' : ''}
                    >
                        {isRentContext ? (
                            <>
                                <option value="шт">шт (Штука)</option>
                                <option value="м²">м² (Квадратний метр, наприклад будівельні риштування)</option>
                            </>
                        ) : (
                            <>
                                <option value="м²">м² (Квадратний метр)</option>
                                <option value="шт">шт (Штука)</option>
                                <option value="п.м.">п.м. (Погонний метр)</option>
                                <option value="уп">уп (Упаковка)</option>
                            </>
                        )}
                    </select>
                </div>

                {/* Pack size (shop only, not sill) */}
                {!isSillCategory && !isRentContext && (
                    <div className="form-group">
                        <label>Площа в упаковці ({formData.unit})</label>
                        <input
                            type="number"
                            step="0.001"
                            value={formData.packSize}
                            onChange={(e) => onChange('packSize', e.target.value)}
                            placeholder="Напр: 2.25"
                        />
                        <p className="field-hint">Для розрахунку кратності пакунку.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
