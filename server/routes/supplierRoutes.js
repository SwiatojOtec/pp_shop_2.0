const express = require('express');
const router = express.Router();
const Supplier = require('../models/Supplier');
const { authMiddleware, requireRole } = require('../middleware/auth');

const allowedRoles = ['owner'];

const FIELDS = [
    'name', 'contactPerson', 'phone', 'email',
    'warehouseAddress', 'officeAddress', 'discountPercent', 'notes', 'isActive',
];

function pickFields(body) {
    const patch = {};
    for (const key of FIELDS) {
        if (Object.prototype.hasOwnProperty.call(body, key)) patch[key] = body[key];
    }
    return patch;
}

// Читання доступне будь-якому автентифікованому співробітнику (не лише
// owner) — картку товару редагують ще й shop_manager/shop_rent/rent/
// pivdenbud (server/routes/productRoutes.js), їм потрібен цей список для
// вибору постачальника. Керування записами (нижче) лишається лише owner.
router.get('/', authMiddleware, async (req, res) => {
    try {
        const suppliers = await Supplier.findAll({ order: [['name', 'ASC']] });
        res.json(suppliers);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/', authMiddleware, requireRole(allowedRoles), async (req, res) => {
    try {
        const name = String(req.body.name || '').trim();
        if (!name) return res.status(400).json({ message: 'Вкажіть назву постачальника' });

        const patch = pickFields(req.body);
        const created = await Supplier.create({ ...patch, name });
        res.status(201).json(created);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.put('/:id', authMiddleware, requireRole(allowedRoles), async (req, res) => {
    try {
        const supplier = await Supplier.findByPk(req.params.id);
        if (!supplier) return res.status(404).json({ message: 'Постачальника не знайдено' });

        const patch = pickFields(req.body);
        if (Object.prototype.hasOwnProperty.call(req.body, 'name')) {
            const name = String(req.body.name || '').trim();
            if (!name) return res.status(400).json({ message: 'Назва не може бути порожньою' });
            patch.name = name;
        }
        await supplier.update(patch);
        res.json(supplier);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.patch('/:id', authMiddleware, requireRole(allowedRoles), async (req, res) => {
    try {
        const supplier = await Supplier.findByPk(req.params.id);
        if (!supplier) return res.status(404).json({ message: 'Постачальника не знайдено' });

        const patch = pickFields(req.body);
        await supplier.update(patch);
        res.json(supplier);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/:id', authMiddleware, requireRole(allowedRoles), async (req, res) => {
    try {
        const supplier = await Supplier.findByPk(req.params.id);
        if (!supplier) return res.status(404).json({ message: 'Постачальника не знайдено' });
        await supplier.destroy();
        res.json({ message: 'Постачальника видалено' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
