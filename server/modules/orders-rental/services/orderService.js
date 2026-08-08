const Order = require('../../../models/Order');
const Client = require('../../../models/Client');
const { Op } = require('sequelize');
const { sendTelegramMessage } = require('../../../utils/telegram');
const { normalizeUaPhone, parsePhones, phoneTailsMatch, normalizePhonesField } = require('../../../utils/phoneUtils');
const { resolveSellerId } = require('../../../constants/sellers');
const { buildClientPatchFromForm } = require('./rentalContractService');
const { generateOrderNumber } = require('../utils/orderNumbering');

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

/** Замовлення для картки клієнта: за clientId + старі без clientId за збігом телефону. */
async function getOrdersByClient(clientId) {
    const client = await Client.findByPk(clientId);
    if (!client) {
        return [];
    }

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

    const map = new Map();
    for (const o of [...byLink, ...byPhone]) {
        if (!map.has(o.id)) map.set(o.id, o);
    }
    return [...map.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

module.exports = {
    generateOrderNumber,
    loadOrderWithClient,
    upsertClientForContract,
    persistOrder,
    getOrdersByClient,
};
