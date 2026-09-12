const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { buildStatusBar } = require('../services/statusBarService');

/** Курс валют / погода / повітряна тривога для смужки під хедером адмінки —
 *  не чутливі дані, доступно будь-якому залогованому співробітнику. */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const result = await buildStatusBar();
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
