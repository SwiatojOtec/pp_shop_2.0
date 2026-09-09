const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const BlogPost = require('../models/BlogPost');
const User = require('../models/User');
const { Op } = require('sequelize');
const { authMiddleware, requireRole, JWT_SECRET } = require('../middleware/auth');

const BLOG_ROLES = ['owner', 'shop_manager', 'shop_rent'];

/** Публічні GET лишаються без обов'язкової авторизації (сайт), але
 *  адмінка з тим самим токеном має бачити чернетки — тому пробуємо
 *  розпізнати користувача, не блокуючи запит, якщо токена немає. */
async function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return next();
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        const user = await User.findByPk(payload.id);
        if (user && user.status === 'active') {
            req.user = { id: user.id, role: user.role };
        }
    } catch {
        // невалідний токен на публічному ендпоінті — просто показуємо як гостю
    }
    next();
}

function canSeeDrafts(req) {
    return !!req.user && BLOG_ROLES.includes(req.user.role === 'manager' ? 'shop_manager' : req.user.role);
}

// Get all posts
router.get('/', optionalAuth, async (req, res) => {
    try {
        const { search, category, status, limit } = req.query;
        const where = {};

        if (search) {
            where.title = { [Op.iLike]: `%${search}%` };
        }
        if (category) {
            where.category = category;
        }
        if (canSeeDrafts(req)) {
            if (status) where.status = status;
        } else {
            where.status = 'published';
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
router.get('/:idOrSlug', optionalAuth, async (req, res) => {
    try {
        const { idOrSlug } = req.params;
        let post;

        if (isNaN(idOrSlug)) {
            post = await BlogPost.findOne({ where: { slug: idOrSlug } });
        } else {
            post = await BlogPost.findByPk(idOrSlug);
        }

        if (!post || (post.status !== 'published' && !canSeeDrafts(req))) {
            return res.status(404).json({ message: 'Post not found' });
        }
        res.json(post);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create post (admin only)
router.post('/', authMiddleware, requireRole(['owner', 'shop_manager', 'shop_rent']), async (req, res) => {
    try {
        const post = await BlogPost.create(req.body);
        res.status(201).json(post);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error creating post' });
    }
});

// Update post (admin only)
router.put('/:id', authMiddleware, requireRole(['owner', 'shop_manager', 'shop_rent']), async (req, res) => {
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

// Delete post (admin only)
router.delete('/:id', authMiddleware, requireRole(['owner', 'shop_manager', 'shop_rent']), async (req, res) => {
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
