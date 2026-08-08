import { useMemo } from 'react';
import { computeRentalTotals } from '../model/rentalTotals';

export function useRentalTotals(items, discountType, discountValue) {
    return useMemo(
        () => computeRentalTotals(items, discountType, discountValue),
        [items, discountType, discountValue],
    );
}
