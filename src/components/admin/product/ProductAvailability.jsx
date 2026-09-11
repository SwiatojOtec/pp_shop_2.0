/**
 * Unit, pack size, stock status and (shop only) manual quantity — Характеристики tab.
 * Rent quantity lives on Склад now (docs/admin-redesign/03-screens.md, «Каталог»):
 * no editable warehouse quantity here anymore, `quantityAvailable` for rent is shown
 * read-only, computed from stock.
 */
export default function ProductAvailability({ formData, onChange, isRentContext, matrixKind }) {
    const hasMatrix = matrixKind === 'linear' || matrixKind === 'grid';
    return (
        <div className="admin-section">
            <h2 className="section-title">Наявність</h2>
            <div className="admin-form">
                <div className="form-group">
                    <label>Одиниця виміру</label>
                    <select
                        value={formData.unit}
                        onChange={(e) => onChange('unit', e.target.value)}
                        disabled={matrixKind === 'linear'}
                        className={matrixKind === 'linear' ? 'input-disabled' : ''}
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

                {!hasMatrix && !isRentContext && (
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

                <div className="form-group">
                    <label>Стан</label>
                    {!isRentContext ? (
                        <select value={formData.stockStatus} onChange={(e) => onChange('stockStatus', e.target.value)}>
                            <option value="in_stock">В наявності</option>
                            <option value="on_order">Під замовлення</option>
                            <option value="out_of_stock">Немає в наявності</option>
                        </select>
                    ) : (
                        <select value={formData.stockStatus} onChange={(e) => onChange('stockStatus', e.target.value)}>
                            <option value="in_stock">В наявності</option>
                            <option value="in_procurement">У закупівлі (на папері)</option>
                            <option value="needs_repair">Потребує ремонту</option>
                            <option value="in_repair">На ремонті</option>
                            <option value="out_of_stock">Немає в наявності</option>
                            <option value="available_later">Буде доступно з дати</option>
                        </select>
                    )}
                </div>

                {isRentContext && formData.stockStatus === 'available_later' && (
                    <div className="form-group">
                        <label>Доступно з</label>
                        <input
                            type="date"
                            value={formData.availableFrom || ''}
                            onChange={(e) => onChange('availableFrom', e.target.value)}
                        />
                    </div>
                )}

                {!isRentContext ? (
                    <div className="form-group">
                        <label>Кількість на складі</label>
                        <input
                            type="number"
                            min="0"
                            value={formData.quantityAvailable}
                            onChange={(e) => onChange('quantityAvailable', e.target.value)}
                            placeholder="0"
                        />
                    </div>
                ) : (
                    <div className="form-group">
                        <label>Вільно (рахується автоматично зі складу)</label>
                        <input
                            type="number"
                            value={formData.quantityAvailable}
                            disabled
                            readOnly
                            placeholder="0"
                            className="input-disabled"
                        />
                        <p className="field-hint">Змінюється на сторінці «Склад».</p>
                    </div>
                )}
            </div>
        </div>
    );
}
