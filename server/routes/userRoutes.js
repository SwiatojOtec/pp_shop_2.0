const express = require('express');
const User = require('../models/User');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/users - список користувачів (тільки owner)
router.get('/', authMiddleware, requireRole(['owner']), async (req, res) => {
    try {
        const users = await User.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.json(users);
    } catch (err) {
        console.error('Get users error:', err);
        res.status(500).json({ message: 'Помилка при отриманні користувачів' });
    }
});

// PATCH /api/users/:id - оновити роль / статус (тільки owner)
router.patch('/:id', authMiddleware, requireRole(['owner']), async (req, res) => {
    try {
        const { role, status } = req.body;
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'Користувача не знайдено' });
        }

        if (role) user.role = role;
        if (status) user.status = status;

        await user.save();

        res.json({
            id: user.id,
            name: user.name,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            status: user.status
        });
    } catch (err) {
        console.error('Update user error:', err);
        res.status(500).json({ message: 'Помилка при оновленні користувача' });
    }
});

module.exports = router;

