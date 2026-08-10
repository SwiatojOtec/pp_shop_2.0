/**
 * Keep application line enrichment (serial, kit, deposit %) while quantity,
 * name and rent period follow the order — one list of goods on the deal.
 * Each order line may have its own rentFrom / rentTo.
 * Catalog fields (replacement, weight, kit) fill from the product when the
 * application line is new / empty.
 */
import { calcDays, recalcLineTotals } from './rentalItems';
import { DEFAULT_RENTAL_DEPOSIT_PERCENT } from '../../../constants/rentalDefaults';
import { coerceDbRentPriceTiers, getRentPricePerDayFromTiers } from '../../../utils/rentPricing';
import { normalizeTechnicalCondition } from '../../../constants/technicalConditions';

/**
 * Estimate deposit from order rent lines + catalog products before/without
 * opening the rental application editor.
 */
export function estimateOrderDeposit(orderItems, products, rentProductIds) {
    const byId = new Map((products || []).map((p) => [p.id, p]));
    return (orderItems || []).reduce((sum, line) => {
        const isRent = line?.isRent || rentProductIds?.has?.(line?.id);
        if (!isRent) return sum;
        const product = byId.get(line.id) || {};
        const qty = Number(line.quantity) || 1;
        const replacement = parseFloat(product.replacementCost || 0) || 0;
        return sum + replacement * qty * (DEFAULT_RENTAL_DEPOSIT_PERCENT / 100);
    }, 0);
}

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

export function mergeOrderLinesIntoRentalItems(orderItems, rentProductIds, rentalItems, products = []) {
    const rentLines = (orderItems || []).filter(
        (line) => line?.isRent || rentProductIds?.has?.(line?.id)
    );
    const previousByProduct = new Map();
    for (const item of rentalItems || []) {
        const pid = Number(item.productId);
        if (Number.isFinite(pid) && pid > 0 && !previousByProduct.has(pid)) {
            previousByProduct.set(pid, item);
        }
    }
    const productsById = new Map((products || []).map((p) => [p.id, p]));

    return rentLines.map((line) => {
        const prev = previousByProduct.get(Number(line.id)) || {};
        const product = productsById.get(Number(line.id)) || {};
        const qty = Number(line.quantity) || 1;
        const rentFrom = line.rentFrom || prev.rentFrom || '';
        const rentTo = line.rentTo || prev.rentTo || '';
        const dateDays = calcDays(rentFrom, rentTo);
        const daysFromOrder = Math.max(1, Number(line.rentDays) || 1);
        const days = dateDays > 0 ? dateDays : daysFromOrder;

        const catalogPrice = parseFloat(
            pickFilled(prev.catalogPrice, line.catalogPrice, product.price, line.price)
        ) || 0;
        const rentPriceTiers = coerceDbRentPriceTiers(
            prev.rentPriceTiers || line.rentPriceTiers || product.rentPriceTiers
        );
        const pricePerDay = getRentPricePerDayFromTiers(
            rentPriceTiers,
            catalogPrice || (parseFloat(prev.pricePerDay) || 0),
            days
        );

        const replacementPerUnit = pickPositiveNumber(
            prev.replacementCostPerUnit,
            product.replacementCost
        );
        const depositPercent = parseFloat(
            pickFilled(prev.depositPercent, DEFAULT_RENTAL_DEPOSIT_PERCENT)
        ) || DEFAULT_RENTAL_DEPOSIT_PERCENT;
        const weightFromProduct = pickPositiveNumber(product.weightTotal)
            || (
                pickPositiveNumber(product.weightPerUnit)
                    ? pickPositiveNumber(product.weightPerUnit) * qty
                    : 0
            );
        const weightTotal = pickPositiveNumber(prev.weightTotal) || weightFromProduct || '';
        const kitItems = Array.isArray(prev.kitItems) && prev.kitItems.length
            ? prev.kitItems
            : (Array.isArray(product.kitItems) ? product.kitItems : []);

        const merged = recalcLineTotals({
            ...prev,
            _key: prev._key || `${line.id}-${Date.now()}-${Math.random()}`,
            productId: line.id,
            name: line.name || prev.name || product.name || '',
            quantity: qty,
            unit: line.unit || prev.unit || product.unit || 'шт',
            catalogPrice: catalogPrice || prev.catalogPrice || '',
            rentPriceTiers: rentPriceTiers || prev.rentPriceTiers || null,
            pricePerDay: pickFilled(prev.pricePerDay, pricePerDay),
            rentFrom,
            rentTo,
            days,
            replacementCostPerUnit: replacementPerUnit || '',
            replacementCostTotal: (replacementPerUnit * qty).toFixed(2),
            depositPercent,
            depositAmount: ((replacementPerUnit * qty * depositPercent) / 100).toFixed(2),
            kitItems,
            serialNumber: pickFilled(prev.serialNumber, product.serialNumber),
            inventoryNumber: pickFilled(prev.inventoryNumber, product.inventoryNumber),
            technicalCondition: normalizeTechnicalCondition(
                pickFilled(prev.technicalCondition, product.technicalCondition)
            ),
            weightPerUnit: pickFilled(prev.weightPerUnit, product.weightPerUnit),
            weightTotal,
        });

        if (!(rentFrom && rentTo)) {
            const rate = parseFloat(merged.pricePerDay) || 0;
            return {
                ...merged,
                days: daysFromOrder,
                totalRental: (daysFromOrder * rate * qty).toFixed(2),
            };
        }
        return merged;
    });
}
