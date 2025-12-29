const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

const { Op } = require('sequelize');

// Get all products with filtering and search
router.get('/', async (req, res) => {
    try {
        const { search, category, brand, minPrice, maxPrice, sort, badge } = req.query;
        let where = {};

        if (search) {
            where.name = { [Op.iLike]: `%${search}%` };
        }

        if (category) {
            where.category = category;
        }

        if (badge) {
            where.badge = badge;
        }

        if (minPrice || maxPrice) {
            where.price = {};
            if (minPrice) where.price[Op.gte] = parseFloat(minPrice);
            if (maxPrice) where.price[Op.lte] = parseFloat(maxPrice);
        }

        let order = [['createdAt', 'DESC']];
        if (sort === 'price_asc') order = [['price', 'ASC']];
        if (sort === 'price_desc') order = [['price', 'DESC']];
        if (sort === 'popular') order = [['rating', 'DESC']];

        const products = await Product.findAll({ where, order });
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get single product by slug
router.get('/:slug', async (req, res) => {
    try {
        const product = await Product.findOne({ where: { slug: req.params.slug } });
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.json(product);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get single product by ID
router.get('/by-id/:id', async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.json(product);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create product
router.post('/', async (req, res) => {
    try {
        const data = req.body;

        // Auto-generate SKU if not provided
        if (!data.sku) {
            const count = await Product.count();
            data.sku = `PP-${String(count + 1).padStart(5, '0')}`;
        }

        // Auto-generate slug if not provided
        if (!data.slug && data.name) {
            data.slug = data.name.toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .replace(/\s+/g, '-');
        }

        const product = await Product.create(data);
        res.status(201).json(product);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update product
router.put('/:id', async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });
        await product.update(req.body);
        res.json(product);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete product
router.delete('/:id', async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });
        await product.destroy();
        res.json({ message: 'Product deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
