const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const Product = require('../models/Product');
const { transliterate } = require('../utils/transliterate');
const { authMiddleware, requireRole } = require('../middleware/auth');

const CATEGORY_ROLES = ['owner', 'shop_manager', 'shop_rent'];

// Get all categories, with how many products use each one
router.get('/', async (req, res) => {
    try {
        const categories = await Category.findAll({ order: [['name', 'ASC']] });
        const counts = await Product.findAll({
            attributes: ['category', [Product.sequelize.fn('COUNT', Product.sequelize.col('id')), 'count']],
            where: { isRent: false },
            group: ['category'],
            raw: true,
        });
        const countByName = new Map(counts.map((c) => [c.category, Number(c.count)]));
        res.json(categories.map((c) => ({ ...c.toJSON(), productCount: countByName.get(c.name) || 0 })));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create category (admin only)
router.post('/', authMiddleware, requireRole(CATEGORY_ROLES), async (req, res) => {
    try {
        const { name } = req.body;
        // Proper transliteration for Cyrillic names
        const slug = transliterate(name);

        const category = await Category.create({ name, slug });
        res.status(201).json(category);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Rename / retag category (admin only)
router.put('/:id', authMiddleware, requireRole(CATEGORY_ROLES), async (req, res) => {
    try {
        const category = await Category.findByPk(req.params.id);
        if (!category) return res.status(404).json({ message: 'Category not found' });

        const { name, usesPriceMatrix } = req.body;
        if (name && name !== category.name) {
            const previousName = category.name;
            category.name = name;
            category.slug = transliterate(name);
            await category.save();
            await Product.update({ category: name }, { where: { category: previousName, isRent: false } });
        }
        if (usesPriceMatrix !== undefined) {
            category.usesPriceMatrix = !!usesPriceMatrix;
            await category.save();
        }

        res.json(category);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Toggle isActive flag (admin only)
router.patch('/:id', authMiddleware, requireRole(CATEGORY_ROLES), async (req, res) => {
    try {
        const category = await Category.findByPk(req.params.id);
        if (!category) return res.status(404).json({ message: 'Category not found' });

        if (req.body.isActive !== undefined) {
            if (req.body.isActive === false) {
                const usedCount = await Product.count({ where: { category: category.name, isRent: false } });
                if (usedCount > 0) {
                    return res.status(409).json({
                        message: `Неможливо вимкнути: категорію використовують ${usedCount} товар(ів). Спочатку змініть категорію у цих товарів.`
                    });
                }
            }
            category.isActive = req.body.isActive;
            await category.save();
        }

        res.json(category);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete category (admin only)
router.delete('/:id', authMiddleware, requireRole(CATEGORY_ROLES), async (req, res) => {
    try {
        const category = await Category.findByPk(req.params.id);
        if (!category) return res.status(404).json({ message: 'Category not found' });
        await category.destroy();
        res.json({ message: 'Category deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
