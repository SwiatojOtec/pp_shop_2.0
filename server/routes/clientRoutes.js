const express = require('express');
const { Op } = require('sequelize');
const router = express.Router();
const Client = require('../models/Client');
const { authMiddleware, requireRole } = require('../middleware/auth');

const { phoneTailsMatch, normalizePhonesField, normalizeUaPhone } = require('../utils/phoneUtils');

const allowedRoles = ['owner', 'shop_manager', 'shop_rent', 'rent', 'pivdenbud'];

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

router.get('/lookup', authMiddleware, requireRole(allowedRoles), async (req, res) => {
    try {
        const raw = String(req.query.phone || '').trim();
        const normalized = normalizeUaPhone(raw);
        if (normalized.length < 12) {
            return res.json({ found: false, client: null });
        }
        const tail = normalized.slice(-9);
        const candidates = await Client.findAll({
            where: { phone: { [Op.iLike]: `%${tail}%` } },
            limit: 30,
            order: [['updatedAt', 'DESC']]
        });
        const client = candidates.find((c) => phoneTailsMatch(c.phone, normalized)) || null;
        res.json({ found: !!client, client });
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
            phone: normalizePhonesField(req.body.phone),
            email: req.body.email || null,
            passport: req.body.passport || null,
            passportIssuedAt: req.body.passportIssuedAt || req.body.passportIssued || null,
            ipn: req.body.ipn || null,
            address: req.body.address || null,
            siteAddress: req.body.siteAddress || null,
            discountPercent: Math.max(0, Math.min(100, Number(req.body.discountPercent || 0))),
            notes: req.body.notes || null,
            claims: req.body.claims || null
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
        const updates = {
            fullName: req.body.fullName,
            phone: normalizePhonesField(req.body.phone),
            email: req.body.email || null,
            passport: req.body.passport || null,
            passportIssuedAt: req.body.passportIssuedAt || req.body.passportIssued || null,
            ipn: req.body.ipn || null,
            address: req.body.address || null,
            siteAddress: req.body.siteAddress || null,
            discountPercent: Math.max(0, Math.min(100, Number(req.body.discountPercent || 0))),
            notes: req.body.notes || null,
        };
        if (Object.prototype.hasOwnProperty.call(req.body, 'claims')) {
            updates.claims = req.body.claims || null;
        }
        await client.update(updates);
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
