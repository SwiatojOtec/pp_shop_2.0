const express = require('express');
const router = express.Router();
const Brand = require('../models/Brand');
const { transliterate } = require('../utils/transliterate');
const { authMiddleware, requireRole } = require('../middleware/auth');

// Get all brands (optional ?context=shop|rent filter)
router.get('/', async (req, res) => {
    try {
        const { context } = req.query;
        const where = {};
        if (context === 'shop') where.isShop = true;
        if (context === 'rent') where.isRent = true;
        const brands = await Brand.findAll({ where, order: [['name', 'ASC']] });
        res.json(brands);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create brand (admin only)
router.post('/', authMiddleware, requireRole(['owner', 'manager']), async (req, res) => {
    try {
        const { name, logo, isShop, isRent } = req.body;
        const slug = transliterate(name);
        const brand = await Brand.create({
            name, logo, slug,
            isShop: isShop !== undefined ? isShop : true,
            isRent: isRent !== undefined ? isRent : false
        });
        res.status(201).json(brand);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update brand flags (admin only)
router.patch('/:id', authMiddleware, requireRole(['owner', 'manager']), async (req, res) => {
    try {
        const brand = await Brand.findByPk(req.params.id);
        if (!brand) return res.status(404).json({ message: 'Brand not found' });
        const { isShop, isRent } = req.body;
        if (isShop !== undefined) brand.isShop = isShop;
        if (isRent !== undefined) brand.isRent = isRent;
        await brand.save();
        res.json(brand);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete brand (admin only)
router.delete('/:id', authMiddleware, requireRole(['owner', 'manager']), async (req, res) => {
    try {
        const brand = await Brand.findByPk(req.params.id);
        if (!brand) return res.status(404).json({ message: 'Brand not found' });
        await brand.destroy();
        res.json({ message: 'Brand deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
