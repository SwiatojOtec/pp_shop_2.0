/**
 * Дзеркало ORDER_STATUS із src/features/admin/model/status.js — клієнтський
 * ESM-модуль звідти не заримпортити на сервері (як cash-продавець у
 * server/constants/sellers.js / src/constants/sellers.js). Лише лейбли,
 * потрібні для тексту Telegram-сповіщень клієнту.
 */
const ORDER_STATUS_LABELS = {
    new: 'Новий',
    invoice: 'Рахунок',
    paid: 'Оплачено',
    in_transit: 'У дорозі',
    issued: 'Видано',
    returned: 'Повернуто',
    done: 'Виконано',
    cancelled: 'Скасовано',
};

// Дзеркало RENTAL_STATUS із того самого клієнтського status.js — заявки
// оренди без окремого замовлення (getOrdersByClient повертає й такі рядки,
// statusDomain: 'rental') мають свій набір статусів, відмінний від Order.
const RENTAL_STATUS_LABELS = {
    draft: 'Чернетка',
    booked: 'Заброньовано',
    active: 'Активна',
    overdue: 'Прострочено',
    returned: 'Повернено',
    cancelled: 'Скасовано',
};

function getOrderStatusLabel(status) {
    return ORDER_STATUS_LABELS[status] || status || '—';
}

/** Рядок з getOrdersByClient може бути і Order (statusDomain 'order'), і
 *  самостійною RentalApplication (statusDomain 'rental') — лейбл статусу
 *  треба брати з правильного словника. */
function getDealStatusLabel(row) {
    const labels = row?.statusDomain === 'rental' ? RENTAL_STATUS_LABELS : ORDER_STATUS_LABELS;
    return labels[row?.status] || row?.status || '—';
}

module.exports = { ORDER_STATUS_LABELS, RENTAL_STATUS_LABELS, getOrderStatusLabel, getDealStatusLabel };
