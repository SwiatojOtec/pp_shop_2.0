const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

/** Nominatim usage policy: identify the app and keep well under ~1 req/sec —
 *  an in-memory cache avoids re-geocoding the same address repeatedly. No
 *  persistent store: this is low-frequency (a handful of deals a day), so
 *  losing the cache on a restart is a non-issue. */
const cache = new Map();

router.get('/', authMiddleware, async (req, res) => {
    try {
        const q = String(req.query.q || '').trim();
        if (!q) {
            return res.status(400).json({ message: 'Параметр q обовʼязковий' });
        }

        const key = q.toLowerCase();
        if (cache.has(key)) {
            return res.json(cache.get(key));
        }

        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=ua&q=${encodeURIComponent(q)}`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'pp-shop-2.0-admin (office@ppbud.info)',
                Referer: 'https://pan-parket.com',
            },
        });

        if (!response.ok) {
            return res.status(502).json({ message: 'Сервіс геокодування недоступний' });
        }

        const rows = await response.json();
        if (!Array.isArray(rows) || rows.length === 0) {
            return res.status(404).json({ message: 'Адресу не знайдено' });
        }

        const result = {
            lat: parseFloat(rows[0].lat),
            lon: parseFloat(rows[0].lon),
            displayName: rows[0].display_name,
        };
        cache.set(key, result);
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
