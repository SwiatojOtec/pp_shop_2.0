const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ message: 'Необхідна авторизація' });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        const user = await User.findByPk(payload.id);
        if (!user || user.status !== 'active') {
            return res.status(401).json({ message: 'Користувач неактивний або не знайдений' });
        }
        req.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status
        };
        next();
    } catch (err) {
        console.error('authMiddleware error:', err.message);
        return res.status(401).json({ message: 'Невірний або протермінований токен' });
    }
};

const requireRole = (allowedRoles) => (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Необхідна авторизація' });
    }
    if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Недостатньо прав' });
    }
    next();
};

module.exports = {
    authMiddleware,
    requireRole,
    JWT_SECRET
};

