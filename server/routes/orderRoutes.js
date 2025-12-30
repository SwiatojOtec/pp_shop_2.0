const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

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

// Update order status
router.put('/:id', async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        await order.update({ status: req.body.status });
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
