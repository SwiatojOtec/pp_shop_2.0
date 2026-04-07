const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ message: 'Необхідна авторизація' });
    }

    let payload;
    try {
        payload = jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return res.status(401).json({ message: 'Невірний або протермінований токен' });
    }

    try {
        const user = await User.findByPk(payload.id);
        if (!user || user.status !== 'active') {
            return res.status(401).json({ message: 'Користувач неактивний або не знайдений' });
        }
        req.user = {
            id: user.id,
            name: user.name,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            status: user.status
        };
        next();
    } catch (err) {
        console.error('authMiddleware DB error:', err.message);
        return res.status(503).json({ message: 'Сервер тимчасово недоступний, спробуйте ще раз' });
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

