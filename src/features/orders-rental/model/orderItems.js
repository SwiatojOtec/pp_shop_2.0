import { coerceDbRentPriceTiers } from '../../../utils/rentPricing';
import { calcDays } from './rentalItems';

/** Prefer inclusive days from rentFrom/rentTo; fall back to stored rentDays. */
export function resolveOrderItemRentDays(item) {
    const fromDates = calcDays(item?.rentFrom, item?.rentTo);
    if (fromDates > 0) return fromDates;
    return Math.max(1, Number(item?.rentDays) || 1);
}

function withResolvedRentDays(item) {
    const rentFrom = item.rentFrom || '';
    const rentTo = item.rentTo || '';
    return {
        ...item,
        isRent: true,
        rentFrom,
        rentTo,
        rentDays: resolveOrderItemRentDays({ ...item, rentFrom, rentTo }),
    };
}

export function buildOrderItemFromProduct(product) {
    const item = {
        id: product.id,
        name: product.name,
        sku: product.sku || '',
        price: product.price,
        quantity: 1,
        unit: product.unit,
        packSize: product.packSize || 1,
        isRent: !!product.isRent,
    };
    if (product.isRent) {
        item.catalogPrice = parseFloat(product.price || 0) || 0;
        item.rentPriceTiers = coerceDbRentPriceTiers(product.rentPriceTiers);
        item.rentFrom = '';
        item.rentTo = '';
        item.rentDays = 1;
    }
    return item;
}

export function normalizeOrderItems(items, rentProductIds) {
    return (items || []).map((item) => {
        const isRent = item.isRent || rentProductIds.has(item.id);
        if (!isRent) return { ...item };
        return withResolvedRentDays(item);
    });
}

export function enrichOrderItemsFromProducts(items, products, rentProductIds) {
    const byId = new Map((products || []).map((p) => [p.id, p]));
    return normalizeOrderItems(items, rentProductIds).map((item) => {
        const isRent = item.isRent || rentProductIds.has(item.id);
        if (!isRent) return item;
        const product = byId.get(item.id);
        if (!product) return item;
        return withResolvedRentDays({
            ...item,
            catalogPrice: item.catalogPrice ?? (parseFloat(product.price) || 0),
            rentPriceTiers: coerceDbRentPriceTiers(item.rentPriceTiers)
                || coerceDbRentPriceTiers(product.rentPriceTiers),
        });
    });
}
