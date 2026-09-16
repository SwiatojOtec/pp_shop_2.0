/**
 * Геокодування адреси доставки + ETA для Telegram-сповіщення «У дорозі»
 * (docs plan «Статус «У дорозі» + ETA-сповіщення в Telegram-боті»).
 *
 * Той самий підхід, що й `DealRouteMap.jsx`/`server/routes/geocodeRoutes.js`
 * (публічний Nominatim + публічний OSRM, без ключів) — але викликаний прямо
 * з сервера, бо Telegram-хук спрацьовує в orderController.js, а не в
 * браузері. Порт (не імпорт) — geocodeRoutes.js віддає HTTP-роут під
 * authMiddleware, не переюзабельну функцію.
 *
 * Точка складу — той самий хардкод, що в src/constants/sellers.js
 * (OFFICE_CONTACTS.warehouseLat/warehouseLon) — дублікат на межі
 * клієнт/сервер, як і server/constants/sellers.js.
 */
const WAREHOUSE_POINT = { lat: 50.3976618, lon: 30.4818019 };

const STOPWORDS = new Set([
    'вулиця', 'вул', 'вулиці', 'будинок', 'буд', 'проспект', 'просп',
    'провулок', 'площа', 'майдан', 'село', 'селище', 'смт', 'район', 'р-н',
    'область', 'обл', 'україна', 'украина', 'м', 'місто', 'город',
]);

const KNOWN_CITIES = [
    'київ', 'львів', 'одеса', 'харків', 'дніпро', 'запоріжжя', 'вінниця',
    'полтава', 'чернігів', 'житомир', 'черкаси', 'суми', 'рівне',
    'івано-франківськ', 'тернопіль', 'луцьк', 'ужгород', 'хмельницький',
    'кропивницький', 'миколаїв', 'херсон',
];

function significantWords(text) {
    return String(text || '')
        .toLowerCase()
        .replace(/[.,]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 4 && !STOPWORDS.has(w) && !/^\d+[а-яїієґ]?$/i.test(w));
}

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

/** @returns {Promise<{lat:number, lon:number} | null>} */
async function geocodeAddress(address) {
    const q = String(address || '').trim();
    if (!q) return null;
    try {
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=ua&q=${encodeURIComponent(q)}`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'pp-shop-2.0-bot (office@ppbud.info)',
                Referer: 'https://pan-parket.com',
            },
        });
        if (!response.ok) return null;
        const rows = await response.json();
        const match = Array.isArray(rows) ? findReliableMatch(rows, q) : null;
        if (!match) return null;
        return { lat: parseFloat(match.lat), lon: parseFloat(match.lon) };
    } catch {
        return null;
    }
}

/** @returns {Promise<{distanceKm:number, etaMinutes:number} | null>} */
async function getRouteEta(origin, dest) {
    if (!origin || !dest) return null;
    try {
        const url = `https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${dest.lon},${dest.lat}?overview=false`;
        const response = await fetch(url);
        if (!response.ok) return null;
        const data = await response.json();
        const r0 = data?.routes?.[0];
        if (!r0) return null;
        return {
            distanceKm: Math.round((r0.distance / 1000) * 10) / 10,
            etaMinutes: Math.round(r0.duration / 60),
        };
    } catch {
        return null;
    }
}

module.exports = { WAREHOUSE_POINT, geocodeAddress, getRouteEta };
