import { coerceDbRentPriceTiers } from '../../../utils/rentPricing';
import { DEFAULT_RENTAL_DEPOSIT_PERCENT } from '../../../constants/rentalDefaults';
import { normalizeTechnicalCondition } from '../../../constants/technicalConditions';
import { calcDays } from './rentalItems';

function pickFilled(...values) {
    for (const value of values) {
        if (value === null || value === undefined || value === '') continue;
        return value;
    }
    return '';
}

function pickPositiveNumber(...values) {
    for (const value of values) {
        if (value === null || value === undefined || value === '') continue;
        const n = parseFloat(value);
        if (Number.isFinite(n) && n > 0) return n;
    }
    return 0;
}

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

/**
 * Seeds rent-line enrichment (serial number, inventory number, condition,
 * weight, replacement cost, deposit %, kit) onto order items from the linked
 * rental application — the Deal screen edits these fields directly on the
 * item row now, RentalApplicationEditor is no longer embedded here. Order
 * data (quantity, dates) always wins; enrichment falls back application →
 * product catalog, matching the server's buildRentItemsFromOrder.
 */
export function enrichRentOrderItemsFromApplication(items, rentProductIds, rentalApplication, products = []) {
    const appByProduct = new Map();
    for (const line of rentalApplication?.items || []) {
        const pid = Number(line.productId);
        if (Number.isFinite(pid) && pid > 0 && !appByProduct.has(pid)) {
            appByProduct.set(pid, line);
        }
    }
    const productsById = new Map((products || []).map((p) => [p.id, p]));

    return (items || []).map((item) => {
        const isRent = item.isRent || rentProductIds?.has?.(item.id);
        if (!isRent) return item;
        const appLine = appByProduct.get(Number(item.id)) || {};
        const product = productsById.get(Number(item.id)) || {};
        const qty = Number(item.quantity) || 1;

        const replacementPerUnit = pickPositiveNumber(item.replacementCostPerUnit, appLine.replacementCostPerUnit, product.replacementCost);
        const depositPercent = parseFloat(
            pickFilled(item.depositPercent, appLine.depositPercent, DEFAULT_RENTAL_DEPOSIT_PERCENT)
        ) || DEFAULT_RENTAL_DEPOSIT_PERCENT;
        const weightFromProduct = pickPositiveNumber(product.weightTotal)
            || (pickPositiveNumber(product.weightPerUnit) ? pickPositiveNumber(product.weightPerUnit) * qty : 0);

        return {
            ...item,
            serialNumber: pickFilled(item.serialNumber, appLine.serialNumber, product.serialNumber),
            inventoryNumber: pickFilled(item.inventoryNumber, appLine.inventoryNumber, product.inventoryNumber),
            technicalCondition: normalizeTechnicalCondition(
                pickFilled(item.technicalCondition, appLine.technicalCondition, product.technicalCondition)
            ),
            weightPerUnit: pickFilled(item.weightPerUnit, product.weightPerUnit),
            weightTotal: pickPositiveNumber(item.weightTotal, appLine.weightTotal) || weightFromProduct || '',
            replacementCostPerUnit: replacementPerUnit || '',
            replacementCostTotal: (replacementPerUnit * qty).toFixed(2),
            depositPercent,
            depositAmount: ((replacementPerUnit * qty * depositPercent) / 100).toFixed(2),
            kitItems: Array.isArray(item.kitItems) && item.kitItems.length
                ? item.kitItems
                : (Array.isArray(appLine.kitItems) && appLine.kitItems.length
                    ? appLine.kitItems
                    : (Array.isArray(product.kitItems) ? product.kitItems : [])),
        };
    });
}
