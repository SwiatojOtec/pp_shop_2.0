const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

const { sendTelegramMessage } = require('../utils/telegram');

// Create new order
router.post('/', async (req, res) => {
    try {
        const { customerName, customerPhone, customerEmail, address, deliveryMethod, paymentMethod, items, totalAmount } = req.body;

        // Generate order number: PP- + random 5 digits
        const orderNumber = `PP-${Math.floor(10000 + Math.random() * 90000)}`;

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
💰 Сума: ${totalAmount} грн

🛒 Товари:
${items.map(item => `- ${item.name} x ${item.quantity} (${item.price} грн)`).join('\n')}
        `;

        await sendTelegramMessage(message);

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
