import { getStatusMeta } from '../../model/status';

const formatDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}.${dt.getFullYear()}`;
};

/**
 * The effective stock status for a rent product row (docs/admin-redesign/00-plan.md,
 * "Уніфіковані статуси" — one status source, no more per-screen label maps).
 * Falls back to the raw stockStatus when free units go to zero, matching the
 * previous AdminWarehousePositions behaviour: a product manually marked
 * "available" still shows as rented/out-of-stock once nothing is free.
 *
 * @param {object|null} product
 * @param {{quantity:number}|null} item — this warehouse's InventoryItem row; omit for a global (non per-warehouse) view
 */
export function getEffectiveStockStatusKey(product, item = null) {
    if (!product) return null;
    if (product.stockStatus === 'needs_repair') return 'needs_repair';
    if (product.stockStatus === 'in_repair') return 'in_repair';
    if (product.stockStatus === 'out_of_stock') return 'out_of_stock';

    const free = typeof product.quantityAvailable === 'number' ? product.quantityAvailable : null;
    const rowQty = item != null ? Math.max(0, Math.floor(Number(item.quantity) || 0)) : null;

    if (free != null && free <= 0) {
        return rowQty == null || rowQty > 0 ? 'rented' : 'out_of_stock';
    }

    if (product.stockStatus === 'available' || product.stockStatus === 'in_stock') return 'available';
    if (product.stockStatus === 'available_later') return 'available_later';
    if (product.stockStatus === 'in_procurement') return 'in_procurement';
    return null;
}

/** StatusBadge props for a stock row — keeps the extra context the raw label carried
 *  (the "на папері" caveat, the concrete available-from date) instead of flattening
 *  everything to the short dictionary term. */
export function getStockStatusBadgeProps(product, item = null) {
    const key = getEffectiveStockStatusKey(product, item);
    if (!key) return { label: product?.stockStatus || '—', tone: 'neutral' };
    const meta = getStatusMeta('stock', key);
    if (key === 'in_procurement') return { label: 'У закупівлі (на папері)', tone: meta.tone };
    if (key === 'available_later') return { label: `З ${formatDate(product.availableFrom)}`, tone: meta.tone };
    return { label: meta.label, tone: meta.tone };
}
