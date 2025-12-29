const express = require('express');
const router = express.Router();
const Brand = require('../models/Brand');
const { transliterate } = require('../utils/transliterate');

// Get all brands
router.get('/', async (req, res) => {
    try {
        const brands = await Brand.findAll({ order: [['name', 'ASC']] });
        res.json(brands);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create brand
router.post('/', async (req, res) => {
    try {
        const { name, logo } = req.body;
        const slug = transliterate(name);

        const brand = await Brand.create({ name, logo, slug });
        res.status(201).json(brand);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete brand
router.delete('/:id', async (req, res) => {
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
