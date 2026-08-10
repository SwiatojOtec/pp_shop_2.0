import { parseDiscountPercent } from '../amounts/orderAmounts';

/** Fixed discounts are money, so they must not be clamped to the 0-100 percent range. */
function parseDiscountAmount(value) {
    if (value == null || value === '') return 0;
    const normalized = String(value).trim().replace(/\s/g, '').replace(',', '.');
    const n = Number(normalized);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export function computeRentalTotals(items, discountType, discountValue) {
    const totalRental = items.reduce((s, i) => s + parseFloat(i.totalRental || 0), 0);
    const totalDeposit = items.reduce((s, i) => s + parseFloat(i.depositAmount || 0), 0);
    const parsedDiscount = discountType === 'percent'
        ? parseDiscountPercent(discountValue)
        : parseDiscountAmount(discountValue);
    const rawDiscountAmount =
        discountType === 'percent'
            ? (totalRental * parsedDiscount) / 100
            : parsedDiscount;
    const discountAmount = Math.min(rawDiscountAmount, totalRental);
    const totalRentalAfterDiscount = Math.max(totalRental - discountAmount, 0);
    const grandTotal = totalRentalAfterDiscount + totalDeposit;

    return {
        totalRental,
        totalDeposit,
        parsedDiscount,
        discountAmount,
        totalRentalAfterDiscount,
        grandTotal,
    };
}
