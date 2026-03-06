const express = require('express');
const router = express.Router();
const RentCategory = require('../models/RentCategory');
const { transliterate } = require('../utils/transliterate');
const { authMiddleware, requireRole } = require('../middleware/auth');

// Get all rent categories
router.get('/', async (req, res) => {
    try {
        const categories = await RentCategory.findAll({ order: [['name', 'ASC']] });
        res.json(categories);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create rent category (admin only)
router.post('/', authMiddleware, requireRole(['owner', 'manager']), async (req, res) => {
    try {
        const { name, group } = req.body;
        const slug = transliterate(name);
        const category = await RentCategory.create({ name, slug, group: group || null });
        res.status(201).json(category);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update rent category (admin only)
router.put('/:id', authMiddleware, requireRole(['owner', 'manager']), async (req, res) => {
    try {
        const category = await RentCategory.findByPk(req.params.id);
        if (!category) return res.status(404).json({ message: 'Category not found' });

        const { name, group } = req.body;
        if (name) {
            category.name = name;
            category.slug = transliterate(name);
        }
        if (group !== undefined) {
            category.group = group || null;
        }

        await category.save();
        res.json(category);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete rent category (admin only)
router.delete('/:id', authMiddleware, requireRole(['owner', 'manager']), async (req, res) => {
    try {
        const category = await RentCategory.findByPk(req.params.id);
        if (!category) return res.status(404).json({ message: 'Category not found' });
        await category.destroy();
        res.json({ message: 'Category deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;

