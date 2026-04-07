const express = require('express');
const { Op } = require('sequelize');
const router = express.Router();
const Client = require('../models/Client');
const { authMiddleware, requireRole } = require('../middleware/auth');

const allowedRoles = ['owner', 'manager', 'rent', 'pivdenbud'];

router.get('/', authMiddleware, requireRole(allowedRoles), async (req, res) => {
    try {
        const q = String(req.query.q || '').trim();
        const where = {};
        if (q) {
            where[Op.or] = [
                { fullName: { [Op.iLike]: `%${q}%` } },
                { phone: { [Op.iLike]: `%${q}%` } },
                { email: { [Op.iLike]: `%${q}%` } }
            ];
        }
        const clients = await Client.findAll({ where, order: [['createdAt', 'DESC']] });
        res.json(clients);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/:id', authMiddleware, requireRole(allowedRoles), async (req, res) => {
    try {
        const client = await Client.findByPk(req.params.id);
        if (!client) return res.status(404).json({ message: 'Клієнта не знайдено' });
        res.json(client);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/', authMiddleware, requireRole(allowedRoles), async (req, res) => {
    try {
        const payload = {
            fullName: req.body.fullName,
            phone: req.body.phone,
            email: req.body.email || null,
            passport: req.body.passport || null,
            address: req.body.address || null,
            siteAddress: req.body.siteAddress || null,
            discountPercent: Math.max(0, Math.min(100, Number(req.body.discountPercent || 0))),
            notes: req.body.notes || null
        };
        const created = await Client.create(payload);
        res.status(201).json(created);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.put('/:id', authMiddleware, requireRole(allowedRoles), async (req, res) => {
    try {
        const client = await Client.findByPk(req.params.id);
        if (!client) return res.status(404).json({ message: 'Клієнта не знайдено' });
        await client.update({
            fullName: req.body.fullName,
            phone: req.body.phone,
            email: req.body.email || null,
            passport: req.body.passport || null,
            address: req.body.address || null,
            siteAddress: req.body.siteAddress || null,
            discountPercent: Math.max(0, Math.min(100, Number(req.body.discountPercent || 0))),
            notes: req.body.notes || null
        });
        res.json(client);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/:id', authMiddleware, requireRole(allowedRoles), async (req, res) => {
    try {
        const client = await Client.findByPk(req.params.id);
        if (!client) return res.status(404).json({ message: 'Клієнта не знайдено' });
        await client.destroy();
        res.json({ message: 'Клієнта видалено' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
