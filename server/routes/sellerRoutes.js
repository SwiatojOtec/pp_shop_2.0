const express = require('express');
const router = express.Router();
const Seller = require('../models/Seller');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { transliterate } = require('../utils/transliterate');

const allowedRoles = ['owner'];

const FIELDS = [
    'label', 'type', 'isDefault', 'appliesVat', 'personName', 'fullName',
    'taxIdLabel', 'taxId', 'legalAddress', 'phone', 'email', 'warehouseAddress',
    'bankName', 'bankMfo', 'iban', 'signedBy',
    'rentalContractCity', 'rentalContractEdrDate', 'rentalContractEdrNumber',
];

function pickFields(body) {
    const patch = {};
    for (const key of FIELDS) {
        if (Object.prototype.hasOwnProperty.call(body, key)) patch[key] = body[key];
    }
    return patch;
}

router.get('/', authMiddleware, requireRole(allowedRoles), async (req, res) => {
    try {
        const sellers = await Seller.findAll({ order: [['isDefault', 'DESC'], ['label', 'ASC']] });
        res.json(sellers);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/', authMiddleware, requireRole(allowedRoles), async (req, res) => {
    try {
        const label = String(req.body.label || '').trim();
        if (!label) return res.status(400).json({ message: "Вкажіть назву юрособи" });

        let id = transliterate(label).replace(/-/g, '_').toLowerCase();
        let suffix = 1;
        while (await Seller.findByPk(id)) {
            id = `${transliterate(label).replace(/-/g, '_').toLowerCase()}_${++suffix}`;
        }

        const patch = pickFields(req.body);
        const created = await Seller.create({ ...patch, id, label });
        res.status(201).json(created);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.put('/:id', authMiddleware, requireRole(allowedRoles), async (req, res) => {
    try {
        const seller = await Seller.findByPk(req.params.id);
        if (!seller) return res.status(404).json({ message: 'Юрособу не знайдено' });

        const patch = pickFields(req.body);
        if (Object.prototype.hasOwnProperty.call(req.body, 'label')) {
            const label = String(req.body.label || '').trim();
            if (!label) return res.status(400).json({ message: "Назва не може бути порожньою" });
            patch.label = label;
        }
        await seller.update(patch);
        res.json(seller);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PATCH — лише прапорець «за замовчуванням» (той самий взірець, що й Category.isActive):
// призначення нової дефолтної юрособи знімає прапорець з попередньої.
router.patch('/:id', authMiddleware, requireRole(allowedRoles), async (req, res) => {
    try {
        const seller = await Seller.findByPk(req.params.id);
        if (!seller) return res.status(404).json({ message: 'Юрособу не знайдено' });

        if (Object.prototype.hasOwnProperty.call(req.body, 'isDefault') && req.body.isDefault) {
            await Seller.update({ isDefault: false }, { where: {} });
        }
        const patch = pickFields(req.body);
        await seller.update(patch);
        res.json(seller);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/:id', authMiddleware, requireRole(allowedRoles), async (req, res) => {
    try {
        const seller = await Seller.findByPk(req.params.id);
        if (!seller) return res.status(404).json({ message: 'Юрособу не знайдено' });
        if (seller.isDefault) {
            return res.status(400).json({ message: 'Не можна видалити юрособу за замовчуванням — спершу призначте іншу' });
        }
        await seller.destroy();
        res.json({ message: 'Юрособу видалено' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
