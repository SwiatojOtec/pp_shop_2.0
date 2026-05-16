/**
 * Тарифи оренди за тривалістю (як у конкурентів): фіксовані діапазони днів + ціна ₴/доба.
 * Поле `price` на товарі залишається базовим (зазвичай мінімальний тариф) для сортування/фільтрів.
 */

export const RENT_TIER_BANDS = [
    { minDays: 1, maxDays: 2, labelUa: '1–2 доби' },
    { minDays: 3, maxDays: 6, labelUa: '3–6 діб' },
    { minDays: 7, maxDays: 14, labelUa: '7–14 діб' },
    { minDays: 15, maxDays: null, labelUa: 'від 15 діб' },
];

function sameBand(a, b) {
    return a.minDays === b.minDays && (a.maxDays === b.maxDays || (a.maxDays == null && b.maxDays == null));
}

/**
 * Нормалізує масив тарифів з БД; повертає null якщо дані неповні або некоректні.
 */
export function coerceDbRentPriceTiers(value) {
    if (!value || !Array.isArray(value) || value.length === 0) return null;
    const out = [];
    for (const band of RENT_TIER_BANDS) {
        const t = value.find((x) => sameBand(x, band));
        if (!t) return null;
        const minDays = Number(t.minDays);
        const maxDays = t.maxDays === null || t.maxDays === undefined || t.maxDays === ''
            ? null
            : Number(t.maxDays);
        const pricePerDay = Number(t.pricePerDay);
        if (!Number.isFinite(minDays) || minDays < 1) return null;
        if (maxDays != null && (!Number.isFinite(maxDays) || maxDays < minDays)) return null;
        if (!Number.isFinite(pricePerDay) || pricePerDay < 0) return null;
        out.push({
            ...band,
            labelUa:
                typeof t.labelUa === 'string' && t.labelUa.trim()
                    ? t.labelUa.trim()
                    : band.labelUa,
            pricePerDay,
        });
    }
    return out;
}

export function ensureRentTiersFormShape(dbTiers, catalogPrice) {
    const coerced = coerceDbRentPriceTiers(dbTiers);
    const base =
        catalogPrice !== null && catalogPrice !== undefined && catalogPrice !== ''
            ? String(catalogPrice)
            : '';
    return RENT_TIER_BANDS.map((band, i) => {
        const match = coerced?.[i];
        return {
            minDays: band.minDays,
            maxDays: band.maxDays,
            labelUa: band.labelUa,
            pricePerDay:
                match && match.pricePerDay != null ? String(match.pricePerDay) : base,
        };
    });
}

function parseMoney(v) {
    if (v === null || v === undefined) return null;
    const s = String(v).trim().replace(',', '.');
    if (s === '') return null;
    const n = Number(s);
    return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Повертає тарифи для API або null (одна ціна — legacy).
 * Порожні клітинки добираються з першої заповненої або з singlePrice.
 */
export function normalizeRentTiersForApi(formRows, singlePrice) {
    if (!formRows || formRows.length !== RENT_TIER_BANDS.length) {
        return { dbTiers: null };
    }
    const single = parseMoney(singlePrice);
    const parsed = formRows.map((r) => parseMoney(r.pricePerDay));
    let anchor = parsed.find((n) => n != null);
    if (anchor == null) anchor = single;
    if (anchor == null) return { dbTiers: null };

    const resolved = parsed.map((n) => (n != null ? n : anchor));
    const min = Math.min(...resolved);
    const max = Math.max(...resolved);
    if (min === max) return { dbTiers: null };

    const dbTiers = RENT_TIER_BANDS.map((band, i) => ({
        minDays: band.minDays,
        maxDays: band.maxDays,
        labelUa: band.labelUa,
        pricePerDay: resolved[i],
    }));
    return { dbTiers };
}

export function minRentTierPrice(dbTiers) {
    const list = coerceDbRentPriceTiers(dbTiers);
    if (!list || !list.length) return null;
    return Math.min(...list.map((t) => Number(t.pricePerDay)));
}

/**
 * Тариф ₴/доба для заданої кількості днів оренди.
 */
export function getRentPricePerDayFromTiers(tiers, fallbackPrice, days) {
    const list = coerceDbRentPriceTiers(tiers);
    const fb = parseFloat(fallbackPrice);
    const fallback = Number.isFinite(fb) ? fb : 0;
    const d = Math.max(1, Math.ceil(Number(days) || 1));

    if (!list || !list.length) return fallback;

    for (const t of list) {
        const maxOk = t.maxDays == null ? true : d <= t.maxDays;
        const minOk = d >= t.minDays;
        if (minOk && maxOk) return Number(t.pricePerDay) || 0;
    }
    if (d < list[0].minDays) return Number(list[0].pricePerDay) || fallback;
    return Number(list[list.length - 1].pricePerDay) || fallback;
}

/** Рядки для картки товару / деталей (завжди 4 пункти). */
export function rentTierRowsForDisplay(product) {
    const fallback = parseFloat(product?.price);
    const fb = Number.isFinite(fallback) ? fallback : 0;
    const tiers = coerceDbRentPriceTiers(product?.rentPriceTiers);
    return RENT_TIER_BANDS.map((band, i) => {
        const match = tiers?.[i];
        const price = match ? Number(match.pricePerDay) : fb;
        return {
            labelUa: band.labelUa,
            pricePerDay: Number.isFinite(price) ? price : fb,
        };
    });
}

export function rentHasVariableTiers(product) {
    const list = coerceDbRentPriceTiers(product?.rentPriceTiers);
    if (!list) return false;
    const nums = list.map((t) => Number(t.pricePerDay));
    return Math.min(...nums) !== Math.max(...nums);
}

export function formatRentCatalogPriceCaption(product) {
    const rows = rentTierRowsForDisplay(product);
    const nums = rows.map((r) => r.pricePerDay);
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const hasTiers = coerceDbRentPriceTiers(product?.rentPriceTiers) != null;
    const formatted = min.toLocaleString('uk-UA', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });
    if (hasTiers && min !== max) return `від ${formatted} ₴ / доба`;
    return `${formatted} ₴ / доба`;
}
