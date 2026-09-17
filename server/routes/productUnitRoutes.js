const express = require('express');
const router = express.Router();
const ProductUnit = require('../models/ProductUnit');
const Product = require('../models/Product');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { recalculateProductQuantity } = require('../services/inventoryService');

// Той самий рівень доступу, що й на редагування orenda-товарів
// (server/routes/productRoutes.js) — довідник одиниць живе на картці товару.
const allowedRoles = ['owner', 'shop_manager', 'shop_rent', 'rent', 'pivdenbud'];

const FIELDS = ['warehouseId', 'serialNumber', 'inventoryNumber', 'technicalCondition', 'adminPhoto', 'isActive'];

function pickFields(body) {
    const patch = {};
    for (const key of FIELDS) {
        if (Object.prototype.hasOwnProperty.call(body, key)) patch[key] = body[key];
    }
    if (patch.warehouseId === '') patch.warehouseId = null;
    return patch;
}

// Плаский список одиниць (переоблік, друк наліпок) — не прив'язаний до
// одного товару, на відміну від /products/:productId/units нижче.
router.get('/product-units', authMiddleware, requireRole(allowedRoles), async (req, res) => {
    try {
        const where = {};
        if (req.query.warehouseId) where.warehouseId = Number(req.query.warehouseId);
        if (req.query.isActive === 'true') where.isActive = true;
        else if (req.query.isActive === 'false') where.isActive = false;

        const units = await ProductUnit.findAll({
            where,
            include: [{ model: Product, attributes: ['id', 'name', 'sku'] }],
            order: [['id', 'ASC']],
        });
        res.json(units);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Одна одиниця за id — сканер у мобільному додатку знаходить її саме так
// (QR кодує "PPU:<id>").
router.get('/product-units/:id', authMiddleware, requireRole(allowedRoles), async (req, res) => {
    try {
        const unit = await ProductUnit.findByPk(req.params.id, {
            include: [{ model: Product, attributes: ['id', 'name', 'sku'] }],
        });
        if (!unit) return res.status(404).json({ message: 'Одиницю не знайдено' });
        res.json(unit);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// "Підтверджено на місці" під час переобліку — проставляє lastCheckedAt,
// опційно приймає стан/активність в тому самому запиті зі сканера.
router.post('/product-units/:id/check', authMiddleware, requireRole(allowedRoles), async (req, res) => {
    try {
        const unit = await ProductUnit.findByPk(req.params.id);
        if (!unit) return res.status(404).json({ message: 'Одиницю не знайдено' });

        const patch = pickFields(req.body);
        patch.lastCheckedAt = new Date();
        await unit.update(patch);
        await recalculateProductQuantity(unit.productId);
        res.json(unit);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.get('/products/:productId/units', authMiddleware, requireRole(allowedRoles), async (req, res) => {
    try {
        const units = await ProductUnit.findAll({
            where: { productId: req.params.productId },
            order: [['id', 'ASC']],
        });
        res.json(units);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/products/:productId/units', authMiddleware, requireRole(allowedRoles), async (req, res) => {
    try {
        const productId = Number(req.params.productId);
        if (!Number.isFinite(productId)) return res.status(400).json({ message: 'Некоректний товар' });

        const created = await ProductUnit.create({ ...pickFields(req.body), productId });
        await recalculateProductQuantity(productId);
        res.status(201).json(created);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.put('/product-units/:id', authMiddleware, requireRole(allowedRoles), async (req, res) => {
    try {
        const unit = await ProductUnit.findByPk(req.params.id);
        if (!unit) return res.status(404).json({ message: 'Одиницю не знайдено' });

        await unit.update(pickFields(req.body));
        await recalculateProductQuantity(unit.productId);
        res.json(unit);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/product-units/:id', authMiddleware, requireRole(allowedRoles), async (req, res) => {
    try {
        const unit = await ProductUnit.findByPk(req.params.id);
        if (!unit) return res.status(404).json({ message: 'Одиницю не знайдено' });

        const productId = unit.productId;
        await unit.destroy();
        await recalculateProductQuantity(productId);
        res.json({ message: 'Одиницю видалено' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
