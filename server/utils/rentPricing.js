const RENT_TIER_BANDS = [
    { minDays: 1, maxDays: 2, labelUa: '1–2 доби' },
    { minDays: 3, maxDays: 6, labelUa: '3–6 діб' },
    { minDays: 7, maxDays: 14, labelUa: '7–14 діб' },
    { minDays: 15, maxDays: null, labelUa: 'від 15 діб' },
];

function sameBand(a, b) {
    return a.minDays === b.minDays && (a.maxDays === b.maxDays || (a.maxDays == null && b.maxDays == null));
}

function coerceDbRentPriceTiers(value) {
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

function getRentPricePerDayFromTiers(tiers, fallbackPrice, days) {
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

module.exports = {
    RENT_TIER_BANDS,
    coerceDbRentPriceTiers,
    getRentPricePerDayFromTiers,
};
