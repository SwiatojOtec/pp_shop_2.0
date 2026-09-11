/** Rental days = nights between dates, return day is free: 11.08 → 15.08 = 4.
 *  Minimum 1 for a same-day pickup/return. */
export function calcRentDays(from, to) {
    if (!from || !to) return 0;
    const ms = new Date(to) - new Date(from);
    if (Number.isNaN(ms) || ms < 0) return 0;
    return Math.max(1, Math.floor(ms / 86400000));
}
