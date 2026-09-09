const Order = require('../../../models/Order');
const Client = require('../../../models/Client');
const Product = require('../../../models/Product');
const RentalApplication = require('../../../models/RentalApplication');
const { Op } = require('sequelize');
const { sendTelegramMessage } = require('../../../utils/telegram');
const { normalizeUaPhone, parsePhones, phoneTailsMatch, normalizePhonesField } = require('../../../utils/phoneUtils');
const { resolveSellerId } = require('../../../constants/sellers');
const { buildClientPatchFromForm } = require('./rentalContractService');
const { generateOrderNumber } = require('../utils/orderNumbering');
const { toIsoDate } = require('./rentalApplicationService');

async function loadOrderWithClient(orderId) {
    const order = await Order.findByPk(orderId);
    if (!order) return null;

    let client = null;
    if (order.clientId) {
        client = await Client.findByPk(order.clientId);
    }

    return { order, client };
}

async function upsertClientForContract(order, patch = {}) {
    const clientPatch = buildClientPatchFromForm(patch);
    const phone = normalizePhonesField(
        clientPatch.phone || order.customerPhone || ''
    );

    if (order.clientId) {
        const client = await Client.findByPk(order.clientId);
        if (!client) {
            const err = new Error('Прив\'язаного клієнта не знайдено');
            err.status = 404;
            throw err;
        }

        await client.update({
            fullName: clientPatch.fullName || client.fullName,
            phone: phone || client.phone,
            address: clientPatch.address ?? client.address,
            passport: clientPatch.passport ?? client.passport,
            passportIssuedAt: clientPatch.passportIssuedAt ?? client.passportIssuedAt,
            ipn: clientPatch.ipn ?? client.ipn,
        });

        return client;
    }

    const created = await Client.create({
        fullName: clientPatch.fullName || order.customerName || '',
        phone: phone || normalizePhonesField(order.customerPhone || ''),
        email: order.customerEmail || null,
        address: clientPatch.address || order.address || null,
        passport: clientPatch.passport || null,
        passportIssuedAt: clientPatch.passportIssuedAt || null,
        ipn: clientPatch.ipn || null,
    });

    await order.update({ clientId: created.id });
    return created;
}

/**
 * @param {object} payload — same shape as public checkout
 * @param {{ sendTelegram?: boolean }} opts
 */
async function persistOrder(payload, { sendTelegram = false } = {}) {
    const {
        customerName,
        customerPhone: rawPhone,
        customerEmail,
        address,
        deliveryMethod,
        paymentMethod,
        items,
        totalAmount,
        discount,
        clientId: rawClientId,
        sellerId: rawSellerId,
    } = payload;

    const customerPhone = normalizeUaPhone(rawPhone);
    const sellerId = resolveSellerId(rawSellerId);

    const cid = Number(rawClientId);
    const clientId = Number.isFinite(cid) && cid > 0 ? Math.floor(cid) : null;

    const orderNumber = await generateOrderNumber();

    const order = await Order.create({
        orderNumber,
        customerName,
        customerPhone,
        customerEmail: customerEmail || null,
        address: address || null,
        deliveryMethod: deliveryMethod || 'pickup',
        paymentMethod: paymentMethod || 'invoice',
        items: Array.isArray(items) ? items : [],
        totalAmount: totalAmount != null ? Number(totalAmount) : 0,
        discount: discount != null ? Number(discount) : 0,
        clientId,
        sellerId,
    });

    if (sendTelegram) {
        const lines = (order.items || []).map(
            (item) => `- ${item.name} x ${item.quantity} (${Number(item.price).toFixed(2)} грн)`
        );
        const message = `
📦 <b>Нове замовлення: ${orderNumber}</b>
👤 Клієнт: ${customerName}
📞 Телефон: ${customerPhone}
📧 Email: ${customerEmail || 'не вказано'}
🚚 Доставка: ${deliveryMethod}
📍 Адреса: ${address || 'не вказано'}
💳 Оплата: ${paymentMethod}
💰 Сума: ${Number(totalAmount).toFixed(2)} грн

🛒 Товари:
${lines.length ? lines.join('\n') : '(поки без позицій)'}
        `;

        await sendTelegramMessage(message, {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🧾 Сформувати рахунок', callback_data: `gen_invoice_${order.id}` },
                        { text: '✏️ Редагувати', callback_data: `edit_order_${order.id}` }
                    ]
                ]
            }
        });
    }

    return order;
}

/**
 * Одна історія угод для картки клієнта (docs/admin-redesign/03-screens.md,
 * «Клієнти»): оренда й магазин разом, той самий рядок, що й у списку «Угоди»
 * (kind/type/statusDomain), а не дві незв'язані таблиці. Замовлення — за
 * clientId + старі без clientId за збігом телефону; заявки оренди без
 * власного замовлення (створені конвертацією брокінгу з календаря) — окремими
 * рядками kind:'application'.
 */
async function getOrdersByClient(clientId) {
    const client = await Client.findByPk(clientId);
    if (!client) {
        return [];
    }

    const todayIso = toIsoDate();
    const rentProducts = await Product.findAll({ where: { isRent: true }, attributes: ['id'] });
    const rentIds = new Set(rentProducts.map((p) => p.id));

    const byLink = await Order.findAll({
        where: { clientId },
        order: [['createdAt', 'DESC']]
    });

    const phoneList = parsePhones(client.phone);

    let byPhone = [];
    if (phoneList.length) {
        const candidates = await Order.findAll({
            where: { clientId: { [Op.is]: null } },
            order: [['createdAt', 'DESC']],
            limit: 2500
        });
        byPhone = candidates.filter((o) => phoneTailsMatch(client.phone, o.customerPhone));
    }

    const orderMap = new Map();
    for (const o of [...byLink, ...byPhone]) {
        if (!orderMap.has(o.id)) orderMap.set(o.id, o);
    }
    const linkedAppIds = new Set([...orderMap.values()].map((o) => o.rentalApplicationId).filter(Boolean));
    const orderRows = [...orderMap.values()].map((o) => buildOrderRow(o, rentIds, todayIso));

    const apps = await RentalApplication.findAll({ where: { clientId }, order: [['createdAt', 'DESC']] });
    const appRows = apps
        .filter((a) => !linkedAppIds.has(a.id))
        .map((a) => buildApplicationRow(a, todayIso));

    return [...orderRows, ...appRows].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

const ORDER_TERMINAL_STATUSES = ['returned', 'done', 'cancelled'];
const APPLICATION_TERMINAL_STATUSES = ['returned', 'cancelled'];

function maxRentTo(items, rentIds) {
    const dates = (items || [])
        .filter((line) => line.isRent || rentIds.has(line.id))
        .map((line) => line.rentTo)
        .filter(Boolean)
        .sort();
    return dates[dates.length - 1] || null;
}

/** Shared row shape for the unified deal history — used by both the
 *  «Угоди» list (listDeals) and a client's own history (getOrdersByClient). */
function buildOrderRow(o, rentIds, todayIso) {
    const items = (o.items || []).map((line) => ({ ...line, isRent: line.isRent || rentIds.has(line.id) }));
    const hasRent = items.some((line) => line.isRent);
    const hasShop = items.some((line) => !line.isRent);
    const rowType = hasRent && hasShop ? 'both' : hasRent ? 'rent' : 'shop';
    const rentTo = maxRentTo(items, rentIds);
    return {
        kind: 'order',
        id: o.id,
        clientId: o.clientId,
        number: o.orderNumber || `#${o.id}`,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        items,
        totalAmount: o.totalAmount,
        status: o.status,
        statusDomain: 'order',
        type: rowType,
        rentTo,
        isOverdue: !!(rentTo && rentTo < todayIso && !ORDER_TERMINAL_STATUSES.includes(o.status)),
        createdAt: o.createdAt,
    };
}

function buildApplicationRow(a, todayIso) {
    return {
        kind: 'application',
        id: a.id,
        clientId: a.clientId,
        number: a.applicationNumber || `#${a.id}`,
        customerName: a.clientName,
        customerPhone: a.clientPhone,
        items: a.items || [],
        totalAmount: a.totalAmount,
        status: a.status,
        statusDomain: 'rental',
        type: 'rent',
        rentTo: a.rentTo,
        isOverdue: !!(a.rentTo && a.rentTo < todayIso && !APPLICATION_TERMINAL_STATUSES.includes(a.status)),
        createdAt: a.createdAt,
    };
}

/**
 * Усі рядки угод (замовлення + заявки без замовлення) без пагінації — джерело
 * істини для агрегатів клієнта (docs/admin-redesign/03-screens.md, «Клієнти»):
 * той самий isOverdue/type, що й у списку «Угоди» і в картці клієнта, а не
 * окремий підрахунок лише по RentalApplication.status.
 */
async function getAllDealRows() {
    const todayIso = toIsoDate();
    const rentProducts = await Product.findAll({ where: { isRent: true }, attributes: ['id'] });
    const rentIds = new Set(rentProducts.map((p) => p.id));

    const orders = await Order.findAll();
    const orderRows = orders.map((o) => buildOrderRow(o, rentIds, todayIso));

    const linkedAppIds = new Set(orders.map((o) => o.rentalApplicationId).filter(Boolean));
    const apps = await RentalApplication.findAll();
    const appRows = apps
        .filter((a) => !linkedAppIds.has(a.id))
        .map((a) => buildApplicationRow(a, todayIso));

    return [...orderRows, ...appRows];
}

/**
 * The unified "Угоди" list (docs/admin-redesign/03-screens.md, розділ 3):
 * one table instead of separate Замовлення / Заявки оренди lists, with type
 * resolved server-side instead of the client loading the whole catalog to
 * classify rows itself.
 *
 * At today's scale (tens of rows) this classifies/filters/paginates in JS
 * after one bulk fetch rather than a SQL-level UNION across two JSONB-backed
 * tables — simpler and just as correct; revisit with real SQL pagination if
 * the deal count grows into the thousands.
 *
 * A handful of RentalApplications have no linked Order (created from a
 * RentalCalendar booking conversion, which doesn't go through an order) —
 * those still need to be reachable from this list, so they're included as
 * their own rows (opening `/admin/rental-applications/:id`, not a deal).
 */
async function listDeals({ q = '', status = '', type = 'all', page = 1, limit = 20 } = {}) {
    const todayIso = toIsoDate();
    const rentProducts = await Product.findAll({ where: { isRent: true }, attributes: ['id'] });
    const rentIds = new Set(rentProducts.map((p) => p.id));

    const orders = await Order.findAll({ order: [['createdAt', 'DESC']] });
    const orderRows = orders.map((o) => buildOrderRow(o, rentIds, todayIso));

    const linkedAppIds = new Set(orders.map((o) => o.rentalApplicationId).filter(Boolean));
    const apps = await RentalApplication.findAll({ order: [['createdAt', 'DESC']] });
    const appRows = apps
        .filter((a) => !linkedAppIds.has(a.id))
        .map((a) => buildApplicationRow(a, todayIso));

    const all = [...orderRows, ...appRows].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const counts = {
        all: all.length,
        shop: all.filter((r) => r.type === 'shop' || r.type === 'both').length,
        rent: all.filter((r) => r.type === 'rent' || r.type === 'both').length,
    };

    let rows = all;
    if (type === 'shop') rows = rows.filter((r) => r.type === 'shop' || r.type === 'both');
    if (type === 'rent') rows = rows.filter((r) => r.type === 'rent' || r.type === 'both');
    if (status) rows = rows.filter((r) => r.status === status);
    if (q.trim()) {
        const needle = q.trim().toLowerCase();
        rows = rows.filter((r) =>
            (r.customerName || '').toLowerCase().includes(needle)
            || (r.customerPhone || '').includes(needle)
            || (r.number || '').toLowerCase().includes(needle));
    }

    const total = rows.length;
    const start = (Math.max(1, page) - 1) * limit;
    const paged = rows.slice(start, start + limit);

    return { rows: paged, total, counts };
}

module.exports = {
    generateOrderNumber,
    loadOrderWithClient,
    upsertClientForContract,
    persistOrder,
    getOrdersByClient,
    listDeals,
    getAllDealRows,
};
