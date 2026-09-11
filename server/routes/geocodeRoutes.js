const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

/** Nominatim usage policy: identify the app and keep well under ~1 req/sec —
 *  an in-memory cache avoids re-geocoding the same address repeatedly. No
 *  persistent store: this is low-frequency (a handful of deals a day), so
 *  losing the cache on a restart is a non-issue. */
const cache = new Map();

const STOPWORDS = new Set([
    'вулиця', 'вул', 'вулиці', 'будинок', 'буд', 'проспект', 'просп',
    'провулок', 'площа', 'майдан', 'село', 'селище', 'смт', 'район', 'р-н',
    'область', 'обл', 'україна', 'украина', 'м', 'місто', 'город',
]);

/** Same street name can legitimately exist in several Ukrainian cities
 *  (very common post-2022 with patriotic renames) — if the query names one
 *  of these, the match's own city must agree, not just share a random word
 *  with the query (an oblast name derived from the city, e.g. "Київська
 *  область", would otherwise pass a plain substring check). */
const KNOWN_CITIES = [
    'київ', 'львів', 'одеса', 'харків', 'дніпро', 'запоріжжя', 'вінниця',
    'полтава', 'чернігів', 'житомир', 'черкаси', 'суми', 'рівне',
    'івано-франківськ', 'тернопіль', 'луцьк', 'ужгород', 'хмельницький',
    'кропивницький', 'миколаїв', 'херсон',
];

/** Significant, non-generic words from an address string — used to sanity-
 *  check a Nominatim match. Bare house numbers (with an optional letter
 *  suffix, e.g. "12а") are dropped, not just short words. */
function significantWords(text) {
    return String(text || '')
        .toLowerCase()
        .replace(/[.,]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 4 && !STOPWORDS.has(w) && !/^\d+[а-яїієґ]?$/i.test(w));
}

/** Nominatim has patchy coverage for recently renamed Ukrainian streets
 *  (decommunization-era renames especially) — instead of returning nothing,
 *  it falls back to fuzzy-matching just the house number (or a same-named
 *  street in a different city) anywhere in the country, silently producing
 *  a wrong-city pin. Requiring a query word in the candidate's display name,
 *  plus — when the query names a known city — requiring that city to match
 *  the candidate's own structured city field, catches both failure modes
 *  instead of trusting the top result blindly. */
function findReliableMatch(rows, query) {
    const words = significantWords(query);
    if (!words.length) return rows[0] || null;

    const lowerQuery = query.toLowerCase();
    const mentionedCity = KNOWN_CITIES.find((c) => lowerQuery.includes(c));

    return rows.find((row) => {
        const name = String(row.display_name || '').toLowerCase();
        if (!words.some((w) => name.includes(w))) return false;

        if (mentionedCity) {
            const city = String(
                row.address?.city || row.address?.town || row.address?.village || ''
            ).toLowerCase();
            if (!city.includes(mentionedCity)) return false;
        }
        return true;
    }) || null;
}

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

        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=ua&q=${encodeURIComponent(q)}`;
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
        const match = Array.isArray(rows) ? findReliableMatch(rows, q) : null;
        if (!match) {
            return res.status(404).json({ message: 'Адресу не вдалося точно визначити (можливо, вулиця ще не додана в OpenStreetMap)' });
        }

        const result = {
            lat: parseFloat(match.lat),
            lon: parseFloat(match.lon),
            displayName: match.display_name,
        };
        cache.set(key, result);
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
