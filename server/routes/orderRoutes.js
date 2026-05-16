const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { sendTelegramMessage } = require('../utils/telegram');
const { Op } = require('sequelize');

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
        discount
    } = payload;

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
        discount: discount != null ? Number(discount) : 0
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
router.post('/admin', authMiddleware, requireRole(['owner', 'manager']), async (req, res) => {
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
                discount
            },
            { sendTelegram: false }
        );

        res.status(201).json(order);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Get all orders (admin only)
router.get('/', authMiddleware, requireRole(['owner', 'manager']), async (req, res) => {
    try {
        const orders = await Order.findAll({ order: [['createdAt', 'DESC']] });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update order (admin only)
router.put('/:id', authMiddleware, requireRole(['owner', 'manager']), async (req, res) => {
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
router.delete('/:id', authMiddleware, requireRole(['owner', 'manager']), async (req, res) => {
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
