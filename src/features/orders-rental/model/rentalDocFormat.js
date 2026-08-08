import { formatContractDate } from '../documents/rentalContractRef';

/** Money for on-screen / print preview (locale string). */
export function fmtPrintMoney(n) {
    return n ? Number(n).toLocaleString('uk-UA', { minimumFractionDigits: 2 }) : '—';
}

/** Money for jsPDF (fixed decimals). */
export function fmtPdfMoney(n) {
    return Number.isFinite(Number(n)) ? Number(n).toFixed(2) : '—';
}

export function fmtDate(d, emptyPlaceholder = '___.____.______') {
    if (!d) return emptyPlaceholder;
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}.${dt.getFullYear()}`;
}

export function fmtFormalUaDate(d) {
    if (!d) return '«____» _____.______';
    const { day, month, year } = formatContractDate(d);
    if (!month || day === '__') return '«____» _____.______';
    return `«${day}» ${month} ${year}`;
}

export function resolveMinRentDays(items = []) {
    const days = (items || [])
        .map((item) => Number(item?.days) || 0)
        .filter((n) => n > 0);
    if (!days.length) return '____';
    return String(Math.max(...days));
}

export function discountPctLabel(discountType, discountValue) {
    return discountType === 'percent'
        ? `${Number(discountValue || 0).toFixed(0)}%`
        : 'грн';
}
