const express = require('express');
const router = express.Router();
const Warehouse = require('../models/Warehouse');
const { authMiddleware, requireRole } = require('../middleware/auth');

const GUARD = [authMiddleware, requireRole(['owner', 'manager', 'rent', 'pivdenbud'])];

router.get('/', ...GUARD, async (_req, res) => {
    try {
        const rows = await Warehouse.findAll({ order: [['createdAt', 'DESC']] });
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/', ...GUARD, async (req, res) => {
    try {
        const { name, isActive = true, notes = null } = req.body || {};
        if (!name || !String(name).trim()) {
            return res.status(400).json({ message: "Поле 'name' обов'язкове." });
        }
        const row = await Warehouse.create({ name: String(name).trim(), isActive, notes });
        res.status(201).json(row);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.put('/:id', ...GUARD, async (req, res) => {
    try {
        const row = await Warehouse.findByPk(req.params.id);
        if (!row) return res.status(404).json({ message: 'Склад не знайдено.' });
        const next = {};
        if (typeof req.body.name === 'string') next.name = req.body.name.trim();
        if (typeof req.body.isActive === 'boolean') next.isActive = req.body.isActive;
        if (Object.prototype.hasOwnProperty.call(req.body, 'notes')) next.notes = req.body.notes;
        await row.update(next);
        res.json(row);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.delete('/:id', ...GUARD, async (req, res) => {
    try {
        const row = await Warehouse.findByPk(req.params.id);
        if (!row) return res.status(404).json({ message: 'Склад не знайдено.' });
        await row.destroy();
        res.json({ message: 'Склад видалено.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
