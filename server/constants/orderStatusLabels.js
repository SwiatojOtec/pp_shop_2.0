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
    issued: 'Видано',
    returned: 'Повернуто',
    done: 'Виконано',
    cancelled: 'Скасовано',
};

function getOrderStatusLabel(status) {
    return ORDER_STATUS_LABELS[status] || status || '—';
}

module.exports = { ORDER_STATUS_LABELS, getOrderStatusLabel };
