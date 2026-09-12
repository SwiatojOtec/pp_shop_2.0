/**
 * Смужка під хедером адмінки: курс валют, погода в Києві, час і повітряна
 * тривога — усе, що допомагає зорієнтуватись при плануванні доставки.
 * Кожне джерело кешується окремо й падає незалежно від інших (якщо, напр.,
 * НБУ недоступний — погода й тривога однаково повернуться).
 */

const KYIV_LAT = 50.4501;
const KYIV_LON = 30.5234;

const cache = { currency: null, weather: null, airRaid: null };
const TTL = { currency: 60 * 60 * 1000, weather: 15 * 60 * 1000, airRaid: 60 * 1000 };

function isFresh(entry, ttl) {
    return entry && Date.now() - entry.at < ttl;
}

async function getCurrency() {
    if (isFresh(cache.currency, TTL.currency)) return cache.currency.value;
    try {
        const res = await fetch('https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json');
        if (!res.ok) throw new Error(`НБУ відповів ${res.status}`);
        const rows = await res.json();
        const usd = rows.find((r) => r.cc === 'USD');
        const eur = rows.find((r) => r.cc === 'EUR');
        const value = {
            usd: usd ? usd.rate : null,
            eur: eur ? eur.rate : null,
            date: usd?.exchangedate || eur?.exchangedate || null,
        };
        cache.currency = { at: Date.now(), value };
        return value;
    } catch (err) {
        return { usd: null, eur: null, date: null, error: err.message };
    }
}

// Спрощений мапінг Open-Meteo weather_code → коротка позначка (WMO code table).
function weatherLabel(code) {
    if (code == null) return '';
    if (code === 0) return 'Ясно';
    if ([1, 2, 3].includes(code)) return 'Хмарно';
    if ([45, 48].includes(code)) return 'Туман';
    if ([51, 53, 55, 56, 57].includes(code)) return 'Мряка';
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Дощ';
    if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Сніг';
    if ([95, 96, 99].includes(code)) return 'Гроза';
    return '';
}

async function getWeather() {
    if (isFresh(cache.weather, TTL.weather)) return cache.weather.value;
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${KYIV_LAT}&longitude=${KYIV_LON}&current=temperature_2m,weather_code,is_day&timezone=Europe%2FKyiv`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Open-Meteo відповів ${res.status}`);
        const data = await res.json();
        const current = data.current || {};
        const value = {
            tempC: current.temperature_2m ?? null,
            code: current.weather_code ?? null,
            label: weatherLabel(current.weather_code),
            isDay: current.is_day === 1,
        };
        cache.weather = { at: Date.now(), value };
        return value;
    } catch (err) {
        return { tempC: null, code: null, label: '', isDay: true, error: err.message };
    }
}

async function getAirRaid() {
    const token = process.env.ALERTS_IN_UA_TOKEN;
    if (!token) return { configured: false, active: false };

    if (isFresh(cache.airRaid, TTL.airRaid)) return cache.airRaid.value;
    try {
        const res = await fetch(`https://api.alerts.in.ua/v1/alerts/active.json?token=${encodeURIComponent(token)}`);
        if (!res.ok) throw new Error(`alerts.in.ua відповів ${res.status}`);
        const data = await res.json();
        const alerts = Array.isArray(data?.alerts) ? data.alerts : [];
        // Місто Київ — окремий регіон від Київської області в цьому API;
        // шукаємо саме його, а не область (для доставки важливе саме місто).
        const kyivAlert = alerts.find((a) => String(a.location_title || '').trim() === 'м. Київ');
        const value = {
            configured: true,
            active: !!kyivAlert,
            type: kyivAlert?.alert_type || null,
            since: kyivAlert?.started_at || null,
        };
        cache.airRaid = { at: Date.now(), value };
        return value;
    } catch (err) {
        return { configured: true, active: false, error: err.message };
    }
}

async function buildStatusBar() {
    const [currency, weather, airRaid] = await Promise.all([getCurrency(), getWeather(), getAirRaid()]);
    return { currency, weather, airRaid };
}

module.exports = { buildStatusBar };
