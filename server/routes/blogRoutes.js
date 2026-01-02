const express = require('express');
const router = express.Router();
const BlogPost = require('../models/BlogPost');
const { Op } = require('sequelize');

// Get all posts
router.get('/', async (req, res) => {
    try {
        const { search, category, limit } = req.query;
        const where = {};

        if (search) {
            where.title = { [Op.iLike]: `%${search}%` };
        }
        if (category) {
            where.category = category;
        }

        const options = {
            where,
            order: [['date', 'DESC']]
        };

        if (limit) {
            options.limit = parseInt(limit);
        }

        const posts = await BlogPost.findAll(options);
        res.json(posts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get single post by ID or Slug
router.get('/:idOrSlug', async (req, res) => {
    try {
        const { idOrSlug } = req.params;
        let post;

        if (isNaN(idOrSlug)) {
            post = await BlogPost.findOne({ where: { slug: idOrSlug } });
        } else {
            post = await BlogPost.findByPk(idOrSlug);
        }

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        res.json(post);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create post
router.post('/', async (req, res) => {
    try {
        const post = await BlogPost.create(req.body);
        res.status(201).json(post);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error creating post' });
    }
});

// Update post
router.put('/:id', async (req, res) => {
    try {
        const post = await BlogPost.findByPk(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        await post.update(req.body);
        res.json(post);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error updating post' });
    }
});

// Delete post
router.delete('/:id', async (req, res) => {
    try {
        const post = await BlogPost.findByPk(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        await post.destroy();
        res.json({ message: 'Post deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error deleting post' });
    }
});

module.exports = router;
