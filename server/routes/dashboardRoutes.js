const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { buildDashboard } = require('../services/dashboardService');

// GET /api/admin/dashboard — Робочий стіл, готові рядки й числа за роллю
// (docs/admin-redesign/03-screens.md, 9.1). Будь-яка активна роль може
// відкрити цей ендпоінт — вміст фільтрується всередині buildDashboard.
router.get('/', authMiddleware, async (req, res) => {
    try {
        const data = await buildDashboard(req.user);
        res.json(data);
    } catch (err) {
        console.error('dashboard GET', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
