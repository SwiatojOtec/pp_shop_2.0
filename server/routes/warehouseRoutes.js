const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const Warehouse = require('../models/Warehouse');
const InventoryItem = require('../models/InventoryItem');
const { logWarehouseEvent } = require('../services/inventoryService');
const { authMiddleware, requireRole } = require('../middleware/auth');

const GUARD = [authMiddleware, requireRole(['owner', 'manager', 'rent', 'pivdenbud'])];

router.get('/', ...GUARD, async (_req, res) => {
    try {
        const rows = await Warehouse.findAll({ order: [['id', 'ASC']] });
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

router.post('/:id/request-delete', ...GUARD, async (req, res) => {
    try {
        const row = await Warehouse.findByPk(req.params.id);
        if (!row) return res.status(404).json({ message: 'Склад не знайдено.' });
        const stockRows = await InventoryItem.count({
            where: { warehouseId: row.id, quantity: { [Op.gt]: 0 } }
        });
        const message = `Запит на видалення складу «${row.name}». Позицій із залишком: ${stockRows}.`;
        await logWarehouseEvent({
            user: req.user,
            action: 'warehouse_delete_request',
            productId: 0,
            productName: 'Склад',
            fromWarehouseId: row.id,
            fromWarehouseName: row.name,
            message
        });
        res.json({ ok: true, message: 'Запит на видалення створено.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.delete('/:id', ...GUARD, async (req, res) => {
    try {
        const row = await Warehouse.findByPk(req.params.id);
        if (!row) return res.status(404).json({ message: 'Склад не знайдено.' });
        const hasAnyStock = await InventoryItem.count({ where: { warehouseId: row.id } });
        if (hasAnyStock > 0) {
            return res.status(400).json({ message: 'Склад містить позиції. Спочатку перенесіть або очистіть залишки.' });
        }
        await row.destroy();
        res.json({ message: 'Склад видалено.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
