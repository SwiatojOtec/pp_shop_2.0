const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Helper: create JWT
const createToken = (user) => {
    return jwt.sign(
        { id: user.id, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, lastName, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Імʼя, email і пароль обовʼязкові' });
        }

        const existing = await User.findOne({ where: { email } });
        if (existing) {
            return res.status(409).json({ message: 'Користувач з таким email вже існує' });
        }

        const totalUsers = await User.count();

        const passwordHash = await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            lastName: lastName || null,
            email,
            passwordHash,
            role: totalUsers === 0 ? 'owner' : 'rent',
            status: totalUsers === 0 ? 'active' : 'pending'
        });

        // Перший користувач одразу отримує токен
        if (totalUsers === 0) {
            const token = createToken(user);
            return res.status(201).json({
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    lastName: user.lastName,
                    email: user.email,
                    role: user.role,
                    status: user.status
                }
            });
        }

        return res.status(201).json({
            message: 'Реєстрація успішна. Дочекайтесь підтвердження доступу адміністратором.',
            user: {
                id: user.id,
                name: user.name,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                status: user.status
            }
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ message: 'Помилка при реєстрації' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email і пароль обовʼязкові' });
        }

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ message: 'Невірний email або пароль' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Невірний email або пароль' });
        }

        if (user.status !== 'active') {
            return res.status(403).json({ message: 'Ваш обліковий запис ще не активований адміністратором' });
        }

        const token = createToken(user);

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                status: user.status
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Помилка при вході' });
    }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
    return res.json({ user: req.user });
});

// PATCH /api/auth/me - оновлення власного профілю
router.patch('/me', authMiddleware, async (req, res) => {
    try {
        const { name, lastName, password } = req.body;
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'Користувача не знайдено' });
        }

        if (name) user.name = name;
        if (lastName !== undefined) user.lastName = lastName || null;

        if (password) {
            if (String(password).length < 6) {
                return res.status(400).json({ message: 'Пароль має містити мінімум 6 символів' });
            }
            user.passwordHash = await bcrypt.hash(password, 10);
        }

        await user.save();

        return res.json({
            user: {
                id: user.id,
                name: user.name,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                status: user.status
            }
        });
    } catch (err) {
        console.error('Update me error:', err);
        res.status(500).json({ message: 'Помилка при оновленні профілю' });
    }
});

module.exports = router;

