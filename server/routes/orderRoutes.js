const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// Create new order
router.post('/', async (req, res) => {
    try {
        const { customerName, customerPhone, customerEmail, address, paymentMethod, items, totalAmount } = req.body;

        const order = await Order.create({
            customerName,
            customerPhone,
            customerEmail,
            address,
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
