const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');
const { buildAnalytics } = require('../services/analyticsService');

function parseRangeParams(req) {
    const { from, to } = req.query;
    if (!from || !to) {
        return { error: 'Параметри from і to обовʼязкові (YYYY-MM-DD)' };
    }
    const fromDate = new Date(`${from}T00:00:00`);
    const toDate = new Date(`${to}T23:59:59.999`);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) || fromDate > toDate) {
        return { error: 'Некоректний період' };
    }
    return { fromDate, toDate, from, to };
}

/** Фінансова аналітика (виручка/прибуток/маржа) — чутливі дані: owner і
 *  менеджер магазину та оренди (shop_rent, єдина роль з повним доступом
 *  до обох напрямків одразу — саме той, кому потрібна зведена картина).
 *  Опційний ?productId=<id> звужує всю агрегацію до одного товару (пошук
 *  «аналітика по товару» на клієнті). Опційний ?seller=all|fop|tov|<sellerId>
 *  фільтрує за юрособою угоди. */
router.get('/summary', authMiddleware, requireRole(['owner', 'shop_rent']), async (req, res) => {
    try {
        const parsed = parseRangeParams(req);
        if (parsed.error) return res.status(400).json({ message: parsed.error });

        const productId = req.query.productId ? Number(req.query.productId) : null;
        if (req.query.productId && (!Number.isFinite(productId) || productId <= 0)) {
            return res.status(400).json({ message: 'Некоректний productId' });
        }

        const sellerFilter = req.query.seller || null;

        const result = await buildAnalytics({ fromDate: parsed.fromDate, toDate: parsed.toDate, productId, sellerFilter });
        result.range.from = parsed.from;
        result.range.to = parsed.to;
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
