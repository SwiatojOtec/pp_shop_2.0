import ProductRentPriceTiers from './ProductRentPriceTiers';
import ProductPriceMatrix from './ProductPriceMatrix';
import ProductPriceGrid from './ProductPriceGrid';

/** Ціни tab: price, badge/sale, rent tiers, price-matrix ('linear'/'grid' categories). */
export default function ProductPriceSidebar({
    formData,
    onChange,
    isRentContext,
    priceMatrixType,
}) {
    return (
        <div className="admin-section">
            <h2 className="section-title">Ціна</h2>
            <div className="admin-form">

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

                {formData.badge === 'SALE' && (
                    <div className="form-group">
                        <label>Стара ціна (закреслена, ₴)</label>
                        <input
                            type="number"
                            value={formData.oldPrice}
                            onChange={(e) => onChange('oldPrice', e.target.value)}
                            placeholder="Ціна до знижки"
                        />
                        <p className="field-hint">Ця ціна буде відображатися закресленою на сайті.</p>
                    </div>
                )}

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
            </div>

            {priceMatrixType === 'linear' && (
                <ProductPriceMatrix
                    matrix={formData.priceMatrix}
                    onChange={(val) => onChange('priceMatrix', val)}
                />
            )}

            {priceMatrixType === 'grid' && (
                <ProductPriceGrid
                    grid={formData.priceGrid}
                    onChange={(val) => onChange('priceGrid', val)}
                />
            )}
        </div>
    );
}
