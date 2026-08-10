import { DEFAULT_RENTAL_DEPOSIT_PERCENT } from '../../../constants/rentalDefaults';
import { normalizeTechnicalCondition } from '../../../constants/technicalConditions';
import { getRentPricePerDayFromTiers, coerceDbRentPriceTiers } from '../../../utils/rentPricing';
import { productsApi } from '../../../services/api';
import { parseDiscountPercent } from '../amounts/orderAmounts';

export const emptyItem = () => ({
    _key: Date.now() + Math.random(),
    productId: null,
    name: '',
    serialNumber: '',
    inventoryNumber: '',
    technicalCondition: '',
    unit: 'шт',
    quantity: 1,
    weightPerUnit: '',
    weightTotal: '',
    replacementCostPerUnit: '',
    replacementCostTotal: '',
    depositPercent: DEFAULT_RENTAL_DEPOSIT_PERCENT,
    depositAmount: '',
    rentFrom: '',
    rentTo: '',
    days: 0,
    pricePerDay: '',
    totalRental: '',
    kitItems: [],
    catalogPrice: '',
    rentPriceTiers: null,
});

/** Inclusive calendar days: 11.08 → 15.08 = 5 діб (both ends count). */
export const calcDays = (from, to) => {
    if (!from || !to) return 0;
    const ms = new Date(to) - new Date(from);
    if (Number.isNaN(ms) || ms < 0) return 0;
    return Math.floor(ms / 86400000) + 1;
};

export function recalcLineTotals(item) {
    const qty = parseFloat(item.quantity || 1);
    const rawDays = calcDays(item.rentFrom, item.rentTo);
    const daysForTier = rawDays > 0 ? rawDays : 1;
    const catRaw =
        item.catalogPrice === '' || item.catalogPrice === null || item.catalogPrice === undefined
            ? NaN
            : parseFloat(item.catalogPrice);
    const fallback = Number.isFinite(catRaw) ? catRaw : (parseFloat(item.pricePerDay) || 0);
    const tiers = coerceDbRentPriceTiers(item.rentPriceTiers);
    const rate = getRentPricePerDayFromTiers(tiers, fallback, daysForTier);
    const totalRental =
        rawDays > 0 ? (rawDays * rate * qty).toFixed(2) : (0).toFixed(2);
    return {
        ...item,
        days: rawDays,
        pricePerDay: rate,
        totalRental,
    };
}

export async function enrichApplicationItem(rawItem) {
    const row = { ...emptyItem(), ...rawItem, _key: Date.now() + Math.random() };
    row.technicalCondition = normalizeTechnicalCondition(rawItem.technicalCondition);

    if (row.productId) {
        try {
            const product = await productsApi.getById(row.productId);
            if (product) {
                row.catalogPrice = parseFloat(product.price || 0) || 0;
                const tiers = coerceDbRentPriceTiers(product.rentPriceTiers);
                if (tiers) row.rentPriceTiers = tiers;
            }
        } catch {
            // keep saved values if product fetch fails
        }
    }

    if (row.catalogPrice === '' || row.catalogPrice === null || row.catalogPrice === undefined) {
        const savedCatalog = parseFloat(rawItem.catalogPrice);
        row.catalogPrice = Number.isFinite(savedCatalog) ? savedCatalog : '';
    }

    return recalcLineTotals(row);
}

export function resolveApplicationDiscount(data) {
    // A linked order owns the deal's discount, so mirror it even when the
    // application still carries an older value of its own.
    if (data?.linkedOrder) {
        const orderDiscount = parseDiscountPercent(data.linkedOrder.discount);
        return {
            discountType: 'percent',
            discountValue: orderDiscount > 0 ? String(orderDiscount) : '',
        };
    }

    const savedType = data?.discountType === 'percent' ? 'percent' : 'fixed';
    const saved = savedType === 'percent'
        ? parseDiscountPercent(data?.discountValue)
        : Math.max(0, Number(data?.discountValue) || 0);
    if (saved > 0) {
        return { discountType: savedType, discountValue: String(saved) };
    }

    const clientDiscount = parseDiscountPercent(data?.clientDiscount);
    if (clientDiscount > 0) {
        return { discountType: 'percent', discountValue: String(clientDiscount) };
    }

    return { discountType: 'fixed', discountValue: '' };
}

export function buildItemFromProduct(product) {
    const replacementCostPerUnit = parseFloat(product.replacementCost || 0);
    const depositPercent = DEFAULT_RENTAL_DEPOSIT_PERCENT;
    const depositAmount = (replacementCostPerUnit * depositPercent / 100).toFixed(2);
    const catalogPrice = parseFloat(product.price || 0) || 0;
    const rentPriceTiers = coerceDbRentPriceTiers(product.rentPriceTiers);
    const pricePerDay = getRentPricePerDayFromTiers(rentPriceTiers, catalogPrice, 1);
    return {
        ...emptyItem(),
        _key: Date.now() + Math.random(),
        productId: product.id,
        name: product.name,
        serialNumber: product.serialNumber || '',
        inventoryNumber: product.inventoryNumber || '',
        technicalCondition: normalizeTechnicalCondition(product.technicalCondition),
        unit: product.unit || 'шт',
        quantity: 1,
        weightPerUnit: product.weightPerUnit || '',
        weightTotal: product.weightTotal || '',
        replacementCostPerUnit: replacementCostPerUnit || '',
        replacementCostTotal: replacementCostPerUnit || '',
        depositPercent,
        depositAmount,
        catalogPrice,
        rentPriceTiers,
        pricePerDay,
        kitItems: product.kitItems || [],
    };
}
