const express = require('express');
const router = express.Router();
const InventoryItem = require('../models/InventoryItem');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { recalculateProductQuantity, moveInventoryBetweenWarehouses, sendProductToRepair } = require('../services/inventoryService');

const GUARD = [authMiddleware, requireRole(['owner', 'manager', 'rent', 'pivdenbud'])];

router.get('/', ...GUARD, async (req, res) => {
    try {
        const where = {};
        if (req.query.warehouseId) where.warehouseId = Number(req.query.warehouseId);
        const rows = await InventoryItem.findAll({
            where,
            include: [
                {
                    model: Product,
                    where: { isRent: true },
                    required: true
                    // повні поля картки оренди для адмінського «Складу»
                },
                { model: Warehouse, attributes: ['id', 'name', 'isActive'] }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/move', ...GUARD, async (req, res) => {
    try {
        const { productId, fromWarehouseId, toWarehouseId, quantity } = req.body;
        await moveInventoryBetweenWarehouses({
            productId: Number(productId),
            fromWarehouseId: Number(fromWarehouseId),
            toWarehouseId: Number(toWarehouseId),
            quantity,
            user: req.user
        });
        res.json({ ok: true });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.post('/send-repair', ...GUARD, async (req, res) => {
    try {
        const product = await sendProductToRepair({ productId: Number(req.body.productId), user: req.user });
        res.json(product);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.put('/item/:id', ...GUARD, async (req, res) => {
    try {
        const row = await InventoryItem.findByPk(req.params.id);
        if (!row) return res.status(404).json({ message: 'Позицію залишку не знайдено.' });

        const next = {};
        if (Object.prototype.hasOwnProperty.call(req.body, 'quantity')) next.quantity = Number(req.body.quantity) || 0;
        if (Object.prototype.hasOwnProperty.call(req.body, 'reserved')) next.reserved = Number(req.body.reserved) || 0;
        if (Object.prototype.hasOwnProperty.call(req.body, 'minStock')) next.minStock = Number(req.body.minStock) || 0;

        await row.update(next);
        await recalculateProductQuantity(row.productId);
        const withRelations = await InventoryItem.findByPk(row.id, {
            include: [{ model: Product }, { model: Warehouse }]
        });
        res.json(withRelations);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;
