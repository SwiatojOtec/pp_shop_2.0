import { parseDiscountPercent } from '../amounts/orderAmounts';

export function computeRentalTotals(items, discountType, discountValue) {
    const totalRental = items.reduce((s, i) => s + parseFloat(i.totalRental || 0), 0);
    const totalDeposit = items.reduce((s, i) => s + parseFloat(i.depositAmount || 0), 0);
    const parsedDiscount = parseDiscountPercent(discountValue);
    const rawDiscountAmount =
        discountType === 'percent'
            ? (totalRental * Math.min(parsedDiscount, 100)) / 100
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
