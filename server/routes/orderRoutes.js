const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Client = require('../models/Client');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { sendTelegramMessage } = require('../utils/telegram');
const { Op } = require('sequelize');

function parsePhones(raw) {
    if (!raw) return [];
    return String(raw).split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
}

function digitsOnly(s) {
    return String(s || '').replace(/\D/g, '');
}

async function generateOrderNumber() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const countToday = await Order.count({
        where: {
            createdAt: {
                [Op.gte]: startOfDay
            }
        }
    });

    const dailyNumber = countToday + 1;
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${dailyNumber}/${day}/${month}/${year}`;
}

/**
 * @param {object} payload — same shape as public checkout
 * @param {{ sendTelegram?: boolean }} opts
 */
async function persistOrder(payload, { sendTelegram = false } = {}) {
    const {
        customerName,
        customerPhone,
        customerEmail,
        address,
        deliveryMethod,
        paymentMethod,
        items,
        totalAmount,
        discount,
        clientId: rawClientId
    } = payload;

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
        clientId
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

// Create new order (public checkout — з Telegram)
router.post('/', async (req, res) => {
    try {
        const {
            customerName,
            customerPhone,
            customerEmail,
            address,
            deliveryMethod,
            paymentMethod,
            items,
            totalAmount,
            discount
        } = req.body;

        const order = await persistOrder(
            {
                customerName,
                customerPhone,
                customerEmail,
                address,
                deliveryMethod,
                paymentMethod,
                items,
                totalAmount,
                discount
            },
            { sendTelegram: true }
        );

        res.status(201).json(order);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Створення замовлення з адмінки (без Telegram — щоб не спамити при чернетках)
router.post('/admin', authMiddleware, requireRole(['owner', 'shop_manager', 'shop_rent']), async (req, res) => {
    try {
        const {
            customerName,
            customerPhone,
            customerEmail,
            address,
            deliveryMethod,
            paymentMethod,
            items,
            totalAmount,
            discount,
            clientId
        } = req.body;

        if (!String(customerName || '').trim() || !String(customerPhone || '').trim()) {
            return res.status(400).json({ message: "Потрібні ім'я клієнта та телефон" });
        }

        const order = await persistOrder(
            {
                customerName: String(customerName).trim(),
                customerPhone: String(customerPhone).trim(),
                customerEmail,
                address,
                deliveryMethod,
                paymentMethod,
                items,
                totalAmount,
                discount,
                clientId
            },
            { sendTelegram: false }
        );

        res.status(201).json(order);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

/** Замовлення для картки клієнта: за clientId + старі без clientId за збігом телефону. */
router.get('/by-client/:clientId', authMiddleware, requireRole(['owner', 'shop_manager', 'shop_rent']), async (req, res) => {
    try {
        const clientId = parseInt(req.params.clientId, 10);
        if (Number.isNaN(clientId) || clientId <= 0) {
            return res.status(400).json({ message: 'Некоректний id клієнта' });
        }

        const client = await Client.findByPk(clientId);
        if (!client) {
            return res.json([]);
        }

        const byLink = await Order.findAll({
            where: { clientId },
            order: [['createdAt', 'DESC']]
        });

        const phoneNorms = [
            ...new Set(
                parsePhones(client.phone)
                    .map(digitsOnly)
                    .filter((d) => d.length >= 9)
                    .map((d) => d.slice(-10))
            )
        ];

        let byPhone = [];
        if (phoneNorms.length) {
            const candidates = await Order.findAll({
                where: { clientId: { [Op.is]: null } },
                order: [['createdAt', 'DESC']],
                limit: 2500
            });
            byPhone = candidates.filter((o) => {
                const od = digitsOnly(o.customerPhone);
                if (od.length < 9) return false;
                const tail = od.slice(-10);
                return phoneNorms.some((p) => tail === p || od.endsWith(p) || p.endsWith(tail));
            });
        }

        const map = new Map();
        for (const o of [...byLink, ...byPhone]) {
            if (!map.has(o.id)) map.set(o.id, o);
        }
        const merged = [...map.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(merged);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get all orders (admin only)
router.get('/', authMiddleware, requireRole(['owner', 'shop_manager', 'shop_rent']), async (req, res) => {
    try {
        const orders = await Order.findAll({ order: [['createdAt', 'DESC']] });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update order (admin only)
router.put('/:id', authMiddleware, requireRole(['owner', 'shop_manager', 'shop_rent']), async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        await order.update(req.body);
        res.json(order);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete order (admin only)
router.delete('/:id', authMiddleware, requireRole(['owner', 'shop_manager', 'shop_rent']), async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        await order.destroy();
        res.json({ message: 'Order deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
