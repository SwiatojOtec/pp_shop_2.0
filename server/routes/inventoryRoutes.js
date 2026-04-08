const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const InventoryItem = require('../models/InventoryItem');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { recalculateProductQuantity, moveInventoryBetweenWarehouses, moveInventoryToRepairWarehouse, sendProductToRepair, sendProductToNeedsRepair, restoreProductInStock, logWarehouseEvent, userDisplayName } = require('../services/inventoryService');

const GUARD = [authMiddleware, requireRole(['owner', 'manager', 'rent', 'pivdenbud'])];

router.get('/suggest', ...GUARD, async (req, res) => {
    try {
        const qRaw = String(req.query.q || '').trim();
        const q = qRaw.length ? qRaw.slice(0, 80) : '';
        const currentWarehouseId = req.query.warehouseId ? Number(req.query.warehouseId) : null;
        if (q.length < 2) return res.json({ suggestions: [] });

        const rows = await InventoryItem.findAll({
            where: {
                [Op.or]: [
                    { quantity: { [Op.gt]: 0 } },
                    { reserved: { [Op.gt]: 0 } }
                ]
            },
            include: [
                {
                    model: Product,
                    required: true,
                    where: {
                        isRent: true,
                        [Op.or]: [
                            { name: { [Op.iLike]: `%${q}%` } },
                            { sku: { [Op.iLike]: `%${q}%` } },
                            { category: { [Op.iLike]: `%${q}%` } },
                            { brand: { [Op.iLike]: `%${q}%` } }
                        ]
                    },
                    attributes: ['id', 'name', 'sku', 'image']
                },
                { model: Warehouse, attributes: ['id', 'name'] }
            ],
            order: [[Product, 'name', 'ASC']],
            limit: 25
        });

        const out = [];
        for (const r of rows) {
            if (currentWarehouseId && r.warehouseId === currentWarehouseId) continue;
            out.push({
                productId: r.productId,
                productName: r.Product?.name,
                productSku: r.Product?.sku,
                productImage: r.Product?.image,
                warehouseId: r.warehouseId,
                warehouseName: r.Warehouse?.name,
                quantity: r.quantity,
                reserved: r.reserved
            });
        }

        res.json({ suggestions: out.slice(0, 10) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/', ...GUARD, async (req, res) => {
    try {
        const where = {};
        if (req.query.warehouseId) where.warehouseId = Number(req.query.warehouseId);
        // Не показуємо “порожні” рядки після переміщення (quantity=0),
        // щоб товар не виглядав як присутній у двох складах.
        where[Op.or] = [
            { quantity: { [Op.gt]: 0 } },
            { reserved: { [Op.gt]: 0 } }
        ];
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

router.post('/move-to-repair', ...GUARD, async (req, res) => {
    try {
        const { productId, fromWarehouseId, quantity } = req.body;
        const result = await moveInventoryToRepairWarehouse({
            productId: Number(productId),
            fromWarehouseId: Number(fromWarehouseId),
            quantity,
            user: req.user
        });
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.post('/needs-repair', ...GUARD, async (req, res) => {
    try {
        const product = await sendProductToNeedsRepair({ productId: Number(req.body.productId), user: req.user });
        res.json(product);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.post('/restore-in-stock', ...GUARD, async (req, res) => {
    try {
        const product = await restoreProductInStock({ productId: Number(req.body.productId), user: req.user });
        res.json(product);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.put('/item/:id', ...GUARD, async (req, res) => {
    try {
        const row = await InventoryItem.findByPk(req.params.id);
        if (!row) return res.status(404).json({ message: 'Позицію залишку не знайдено.' });

        const before = { quantity: row.quantity, reserved: row.reserved, minStock: row.minStock };

        const next = {};
        if (Object.prototype.hasOwnProperty.call(req.body, 'quantity')) next.quantity = Number(req.body.quantity) || 0;
        if (Object.prototype.hasOwnProperty.call(req.body, 'reserved')) next.reserved = Number(req.body.reserved) || 0;
        if (Object.prototype.hasOwnProperty.call(req.body, 'minStock')) next.minStock = Number(req.body.minStock) || 0;

        await row.update(next);
        await recalculateProductQuantity(row.productId);

        const after = { quantity: row.quantity, reserved: row.reserved, minStock: row.minStock };
        const changed = [];
        if (before.quantity !== after.quantity) changed.push(`к-сть: ${before.quantity} → ${after.quantity}`);
        if (before.reserved !== after.reserved) changed.push(`резерв: ${before.reserved} → ${after.reserved}`);
        if (before.minStock !== after.minStock) changed.push(`мін.: ${before.minStock} → ${after.minStock}`);

        if (changed.length) {
            const wh = await Warehouse.findByPk(row.warehouseId);
            const p = await Product.findByPk(row.productId);
            const msg = `${userDisplayName(req.user)} оновив залишок «${p?.name || 'товар'}» на складі «${wh?.name || '?'}» (${changed.join(', ')})`;
            await logWarehouseEvent({
                user: req.user,
                action: 'update_inventory',
                productId: row.productId,
                productName: p?.name,
                fromWarehouseId: row.warehouseId,
                fromWarehouseName: wh?.name,
                message: msg
            });
        }

        const withRelations = await InventoryItem.findByPk(row.id, {
            include: [{ model: Product }, { model: Warehouse }]
        });
        res.json(withRelations);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;
