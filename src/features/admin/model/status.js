/* Single source of status labels and tones (docs/admin-redesign/00-plan.md,
   "Уніфіковані статуси"). Components read label/tone from here — no status
   map should be declared anywhere else. */

/* Угода (docs/admin-redesign/03-screens.md): one status chain instead of two
   independent selects — Новий → Рахунок → Оплачено → Видано → Повернуто →
   Виконано, plus Скасовано as a side-branch. See model/dealStatus.js for the
   chain/step helpers. */
export const ORDER_STATUS = {
    new:       { label: 'Новий',      tone: 'info' },
    invoice:   { label: 'Рахунок',    tone: 'warning' },
    paid:      { label: 'Оплачено',   tone: 'success' },
    in_transit: { label: 'У дорозі',  tone: 'info' },
    issued:    { label: 'Видано',     tone: 'violet' },
    returned:  { label: 'Повернуто',  tone: 'teal' },
    done:      { label: 'Виконано',   tone: 'success' },
    cancelled: { label: 'Скасовано',  tone: 'neutral' },
};

export const RENTAL_STATUS = {
    draft:     { label: 'Чернетка',     tone: 'neutral' },
    booked:    { label: 'Заброньовано', tone: 'info' },
    active:    { label: 'Активна',      tone: 'success' },
    overdue:   { label: 'Прострочено',  tone: 'danger' },
    returned:  { label: 'Повернено',    tone: 'teal' },
    cancelled: { label: 'Скасовано',    tone: 'neutral' },
};

export const STOCK_STATUS = {
    available:        { label: 'Вільний',           tone: 'success' },
    rented:           { label: 'В оренді',          tone: 'info' },
    low:              { label: 'Мало вільних',      tone: 'warning' },
    out_of_stock:     { label: 'Немає вільних',     tone: 'danger' },
    available_later:  { label: 'Буде з дати',       tone: 'violet' },
    in_procurement:   { label: 'У закупівлі',       tone: 'neutral' },
    needs_repair:     { label: 'Потребує ремонту',  tone: 'warning' },
    in_repair:        { label: 'На ремонті',        tone: 'teal' },
};

export const STATUS_DOMAINS = {
    order: ORDER_STATUS,
    rental: RENTAL_STATUS,
    stock: STOCK_STATUS,
};

export function getStatusMeta(domain, status) {
    return STATUS_DOMAINS[domain]?.[status] ?? { label: status ?? '—', tone: 'neutral' };
}

export function getStatusLabel(domain, status) {
    return getStatusMeta(domain, status).label;
}

export function getStatusOptions(domain) {
    return Object.entries(STATUS_DOMAINS[domain] ?? {}).map(([value, meta]) => ({
        value,
        label: meta.label,
    }));
}
