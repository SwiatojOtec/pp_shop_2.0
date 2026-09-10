import { RENT_TIER_BANDS } from '../../../utils/rentPricing';

/**
 * Редагування 4 тарифів ₴/доба для оренди (фіксовані діапазони днів).
 * value: масив з 4 елементів { minDays, maxDays, labelUa, pricePerDay } (pricePerDay — рядок у формі).
 */
export default function ProductRentPriceTiers({ value, onChange }) {
    const rows =
        value && value.length === RENT_TIER_BANDS.length
            ? value
            : RENT_TIER_BANDS.map((b) => ({ ...b, pricePerDay: '' }));

    const setTierPrice = (index, priceStr) => {
        const next = rows.map((row, i) =>
            i === index ? { ...row, pricePerDay: priceStr } : row
        );
        onChange(next);
    };

    return (
        <div className="form-group rent-price-tiers">
            <label>Тарифи оренди (₴ за добу)</label>
            <p className="field-hint rent-price-tiers-hint">
                Якщо всі чотири значення однакові — зберігається одна базова ціна. Якщо відрізняються —
                на сайті показується список діапазонів як у конкурентів.
            </p>
            <div className="rent-price-tiers-list">
                {rows.map((row, index) => (
                    <div key={`${row.minDays}-${row.maxDays ?? 'x'}`} className="rent-price-tier-row">
                        <span className="rent-price-tier-label">{row.labelUa}</span>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.pricePerDay}
                            onChange={(e) => setTierPrice(index, e.target.value)}
                            placeholder="₴"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
