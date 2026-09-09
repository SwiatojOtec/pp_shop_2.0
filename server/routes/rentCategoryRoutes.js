const express = require('express');
const router = express.Router();
const RentCategory = require('../models/RentCategory');
const Product = require('../models/Product');
const { transliterate } = require('../utils/transliterate');
const { authMiddleware, requireRole } = require('../middleware/auth');

// Get all rent categories, with how many products use each one
router.get('/', async (req, res) => {
    try {
        const categories = await RentCategory.findAll({ order: [['name', 'ASC']] });
        const counts = await Product.findAll({
            attributes: ['category', [Product.sequelize.fn('COUNT', Product.sequelize.col('id')), 'count']],
            where: { isRent: true },
            group: ['category'],
            raw: true,
        });
        const countByName = new Map(counts.map((c) => [c.category, Number(c.count)]));
        res.json(categories.map((c) => ({ ...c.toJSON(), productCount: countByName.get(c.name) || 0 })));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create rent category (admin only)
router.post('/', authMiddleware, requireRole(['owner', 'rent', 'pivdenbud', 'shop_rent']), async (req, res) => {
    try {
        const { name, group } = req.body;
        const slug = transliterate(name);
        const category = await RentCategory.create({ name, slug, group: group || null });
        res.status(201).json(category);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Toggle isActive flag (admin only)
router.patch('/:id', authMiddleware, requireRole(['owner', 'rent', 'pivdenbud', 'shop_rent']), async (req, res) => {
    try {
        const category = await RentCategory.findByPk(req.params.id);
        if (!category) return res.status(404).json({ message: 'Category not found' });

        if (req.body.isActive !== undefined) {
            // Block deactivation if products are using this category
            if (req.body.isActive === false) {
                const usedCount = await Product.count({ where: { category: category.name } });
                if (usedCount > 0) {
                    return res.status(409).json({
                        message: `Неможливо вимкнути: категорію використовують ${usedCount} товар(ів). Спочатку змініть категорію у цих товарів.`
                    });
                }
            }
            category.isActive = req.body.isActive;
        }

        await category.save();
        res.json(category);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update rent category (admin only)
router.put('/:id', authMiddleware, requireRole(['owner', 'rent', 'pivdenbud', 'shop_rent']), async (req, res) => {
    try {
        const category = await RentCategory.findByPk(req.params.id);
        if (!category) return res.status(404).json({ message: 'Category not found' });

        const { name, group } = req.body;
        if (name && name !== category.name) {
            const previousName = category.name;
            category.name = name;
            category.slug = transliterate(name);
            await Product.update({ category: name }, { where: { category: previousName, isRent: true } });
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
router.delete('/:id', authMiddleware, requireRole(['owner', 'rent', 'pivdenbud', 'shop_rent']), async (req, res) => {
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

