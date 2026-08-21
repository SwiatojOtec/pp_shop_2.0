import { formatContractDate } from '../documents/rentalContractRef';
import { calcDays } from './rentalItems';

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

/** Normalize "9:5" / "09:05:00" → "09:05", or '' if empty/invalid. */
export function normalizeRentTime(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const m = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!m) return '';
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (!Number.isFinite(h) || !Number.isFinite(min) || h > 23 || min > 59) return '';
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/** Date + optional time on a second line (for table cells). */
export function fmtDateWithTime(d, time, emptyPlaceholder = '___.____.______') {
    const date = fmtDate(d, emptyPlaceholder);
    const t = normalizeRentTime(time);
    if (!t || !d) return date;
    return `${date}\n${t}`;
}

/** Signature date line with optional time suffix. */
export function fmtSignatureDateLine(time) {
    const t = normalizeRentTime(time);
    return t ? `Дата: ____/____/________  ${t}` : 'Дата: ____/____/________';
}

export function fmtFormalUaDate(d) {
    if (!d) return '«____» _____.______';
    const { day, month, year } = formatContractDate(d);
    if (!month || day === '__') return '«____» _____.______';
    return `«${day}» ${month} ${year}`;
}

/** DDMMYY/N — same format as server `formatDailyDocumentNumber`. */
export function formatDailyDocumentNumber(date = new Date(), sequence = 1) {
    const dt = date instanceof Date ? date : new Date(date);
    const stamp = `${String(dt.getDate()).padStart(2, '0')}${String(dt.getMonth() + 1).padStart(2, '0')}${String(dt.getFullYear()).slice(-2)}`;
    return `${stamp}/${Math.max(1, Number(sequence) || 1)}`;
}

export function resolveMinRentDays(items = []) {
    const days = (items || [])
        .map((item) => {
            const fromDates = calcDays(item?.rentFrom, item?.rentTo);
            return fromDates > 0 ? fromDates : (Number(item?.days) || 0);
        })
        .filter((n) => n > 0);
    if (!days.length) return '____';
    return String(Math.max(...days));
}

export function discountPctLabel(discountType, discountValue) {
    return discountType === 'percent'
        ? `${Number(discountValue || 0).toFixed(0)}%`
        : 'грн';
}
