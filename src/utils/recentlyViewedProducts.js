const STORAGE_KEY = 'pp_viewed_products_v1';
const MAX_ENTRIES = 28;

/**
 * Запис переглянутого товару (оренда або магазин). Останні — на початку списку.
 * @param {object} snapshot — мінімальні поля для картки та посилання
 */
export function recordProductView(snapshot) {
    if (!snapshot?.id || !snapshot?.slug) return;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        let list = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(list)) list = [];
        const entry = {
            id: Number(snapshot.id),
            slug: String(snapshot.slug),
            name: snapshot.name || '',
            image: snapshot.image || '',
            isRent: !!snapshot.isRent,
            category: snapshot.category || '',
            price: snapshot.price != null ? snapshot.price : null,
            rentPriceTiers: snapshot.rentPriceTiers ?? null,
            viewedAt: Date.now(),
        };
        list = list.filter((x) => x && Number(x.id) !== entry.id);
        list.unshift(entry);
        list = list.slice(0, MAX_ENTRIES);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
        /* ignore quota / private mode */
    }
}

/**
 * Історія переглядів того ж типу (оренда / магазин), без поточного товару.
 */
export function getRecentProductViews(excludeId, isRent, limit = 14) {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const list = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(list)) return [];
        return list
            .filter(
                (x) =>
                    x &&
                    Number(x.id) !== Number(excludeId) &&
                    !!x.isRent === !!isRent
            )
            .slice(0, limit);
    } catch {
        return [];
    }
}
