export const ORDER_STATUS_OPTIONS = [
    { value: 'pending',       label: 'Новий' },
    { value: 'invoice_sent',  label: 'Рахунок виставлено' },
    { value: 'paid',          label: 'Оплачено' },
    { value: 'processing',    label: 'В роботі' },
    { value: 'completed',     label: 'Виконано' },
    { value: 'cancelled',     label: 'Скасовано' },
];

export const ORDER_STATUS_VARIANT = {
    pending:      'warning',
    invoice_sent: 'secondary',
    paid:         'success',
    processing:   'default',
    completed:    'success',
    cancelled:    'danger',
};

export const DELIVERY_LABELS = {
    pickup: 'Самовивіз',
    delivery: 'Доставка',
};

export const PAYMENT_LABELS = {
    invoice: 'Рахунок',
    cash: 'Готівка',
    card: 'Картка',
};

export function getOrderStatusLabel(status) {
    return ORDER_STATUS_OPTIONS.find((o) => o.value === status)?.label || status;
}

export function formatOrderNumberDisplay(value) {
    if (!value || typeof value !== 'string') return value || '—';
    const p = value.trim().split('/');
    if (p.length === 4 && p.every((x) => /^\d+$/.test(x))) {
        const [n, dd, mm, yyyy] = p;
        return `№${n} · ${dd}.${mm}.${yyyy}`;
    }
    return value;
}

export function formatOrderDate(d) {
    if (!d) return '—';
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}.${dt.getFullYear()}`;
}

export function calcOrderTotal(items) {
    return (items || []).reduce(
        (s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 0) * (Number(i.packSize) || 1),
        0
    );
}

export function orderHasShopItems(order, rentProductIds) {
    return (order.items || []).some((i) => !rentProductIds.has(i.id));
}

export function orderHasRentItems(order, rentProductIds) {
    return (order.items || []).some((i) => rentProductIds.has(i.id));
}
