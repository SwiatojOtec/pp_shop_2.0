const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

const { sendTelegramMessage } = require('../utils/telegram');

// Create new order
router.post('/', async (req, res) => {
    try {
        const { customerName, customerPhone, customerEmail, address, deliveryMethod, paymentMethod, items, totalAmount } = req.body;

        // Generate order number: [Count Today + 1]/[Month]/[Year]
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const countToday = await Order.count({
            where: {
                createdAt: {
                    [require('sequelize').Op.gte]: startOfDay
                }
            }
        });

        const dailyNumber = countToday + 1;
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const orderNumber = `${dailyNumber}/${month}/${year}`;

        const order = await Order.create({
            orderNumber,
            customerName,
            customerPhone,
            customerEmail,
            address,
            deliveryMethod,
            paymentMethod,
            items,
            totalAmount
        });

        // Send Telegram Notification
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
${items.map(item => `- ${item.name} x ${item.quantity} (${Number(item.price).toFixed(2)} грн)`).join('\n')}
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

        res.status(201).json(order);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Get all orders (for admin later)
router.get('/', async (req, res) => {
    try {
        const orders = await Order.findAll({ order: [['createdAt', 'DESC']] });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update order
router.put('/:id', async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        await order.update(req.body);
        res.json(order);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete order
router.delete('/:id', async (req, res) => {
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
