import { resolveSellerId } from '../constants/sellers';

/** Стандартна ставка ПДВ в Україні, % */
export const UA_VAT_PERCENT = 20;
export const UA_VAT_RATE = UA_VAT_PERCENT / 100;

const TOV_SELLER_ID = 'tov_pan_pivdenbud';

function roundMoney(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
}

export function parseDiscountPercent(value) {
    if (value == null || value === '') return 0;
    if (typeof value === 'number') {
        return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
    }
    const normalized = String(value).trim().replace(/\s/g, '').replace(',', '.');
    const n = Number(normalized);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
}

function buildRentalAppIndex(rentalApplication) {
    const map = new Map();
    const items = rentalApplication?.items;
    if (!Array.isArray(items)) return map;
    for (const line of items) {
        const pid = Number(line?.productId);
        if (Number.isFinite(pid) && pid > 0) {
            map.set(pid, line);
        }
    }
    return map;
}

function isRentBillingItem(item, rentProductIds) {
    if (item?.isRent) return true;
    if (!rentProductIds) return false;
    if (rentProductIds instanceof Set) return rentProductIds.has(item?.id);
    return Array.isArray(rentProductIds) && rentProductIds.includes(item?.id);
}

function resolveRentLineNetTotal(orderItem, appLine) {
    const parsedTotal = parseFloat(appLine?.totalRental);
    if (Number.isFinite(parsedTotal) && parsedTotal > 0) {
        return roundMoney(parsedTotal);
    }

    const days = Number(appLine?.days) || 0;
    const pricePerDay = parseFloat(appLine?.pricePerDay) || 0;
    const qty = Number(appLine?.quantity) || Number(orderItem?.quantity) || 1;
    if (days > 0 && pricePerDay > 0) {
        return roundMoney(days * pricePerDay * qty);
    }

    return 0;
}

function resolveLineNetTotal(item, rentProductIds, rentalAppIndex) {
    if (isRentBillingItem(item, rentProductIds)) {
        const appLine = rentalAppIndex.get(Number(item?.id));
        const rentTotal = appLine ? resolveRentLineNetTotal(item, appLine) : 0;
        if (rentTotal > 0) return rentTotal;
    }

    return roundMoney(
        (Number(item?.price) || 0)
        * (Number(item?.quantity) || 0)
        * (Number(item?.packSize) || 1)
    );
}

export function sellerAppliesVat(sellerId) {
    return resolveSellerId(sellerId) === TOV_SELLER_ID;
}

export function calcOrderAmounts(items, discountPercent = 0, sellerId, billingOptions = {}) {
    const appliesVat = sellerAppliesVat(sellerId);
    const rentalAppIndex = buildRentalAppIndex(billingOptions.rentalApplication);
    const netSubtotal = roundMoney(
        (items || []).reduce(
            (sum, item) => sum + resolveLineNetTotal(item, billingOptions.rentProductIds, rentalAppIndex),
            0
        )
    );
    const discount = parseDiscountPercent(discountPercent);
    const netAfterDiscount = roundMoney(netSubtotal * (1 - discount / 100));

    if (!appliesVat) {
        return {
            appliesVat: false,
            vatPercent: 0,
            netSubtotal,
            netAfterDiscount,
            vatAmount: 0,
            grossSubtotal: netSubtotal,
            grossAfterDiscount: netAfterDiscount,
            total: netAfterDiscount,
        };
    }

    const grossSubtotal = roundMoney(netSubtotal * (1 + UA_VAT_RATE));
    const vatAmount = roundMoney(netAfterDiscount * UA_VAT_RATE);
    const grossAfterDiscount = roundMoney(netAfterDiscount + vatAmount);

    return {
        appliesVat: true,
        vatPercent: UA_VAT_PERCENT,
        netSubtotal,
        netAfterDiscount,
        vatAmount,
        grossSubtotal,
        grossAfterDiscount,
        total: grossAfterDiscount,
    };
}

export function calcLineDisplayAmounts(item, sellerId, billingOptions = {}) {
    const appliesVat = sellerAppliesVat(sellerId);
    const rentalAppIndex = buildRentalAppIndex(billingOptions.rentalApplication);

    if (isRentBillingItem(item, billingOptions.rentProductIds)) {
        const appLine = rentalAppIndex.get(Number(item?.id));
        if (appLine) {
            const netLine = resolveRentLineNetTotal(item, appLine);
            const days = Number(appLine.days) || 0;
            const pricePerDay = parseFloat(appLine.pricePerDay) || 0;
            const qty = Number(appLine.quantity) || Number(item.quantity) || 1;

            if (netLine > 0 && days > 0) {
                const quantity = days * qty;
                const netUnit = roundMoney(pricePerDay > 0 ? pricePerDay : netLine / quantity);
                const lineTotal = appliesVat
                    ? roundMoney(netLine * (1 + UA_VAT_RATE))
                    : netLine;
                return {
                    quantity,
                    unit: 'доба',
                    unitPrice: quantity > 0 ? roundMoney(lineTotal / quantity) : lineTotal,
                    lineTotal,
                };
            }
        }
    }

    const netUnit = (Number(item.price) || 0) * (Number(item.packSize) || 1);
    const quantity = Number(item.quantity) || 0;
    const netLine = roundMoney(netUnit * quantity);
    const lineTotal = appliesVat
        ? roundMoney(netLine * (1 + UA_VAT_RATE))
        : netLine;
    return {
        quantity,
        unit: item.unit === 'м²' ? 'уп.' : (item.unit || 'шт.'),
        unitPrice: quantity > 0 ? roundMoney(lineTotal / quantity) : lineTotal,
        lineTotal,
    };
}

export function withOrderTotal(draft, billingOptions = {}) {
    if (!draft) return draft;
    const amounts = calcOrderAmounts(draft.items, draft.discount, draft.sellerId, billingOptions);
    return { ...draft, totalAmount: amounts.total };
}

export function makeBillingOptions(rentProductIds, rentalApplication) {
    return { rentProductIds, rentalApplication };
}
