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

// api.ukrainealarm.com: м. Київ і Київська область — окремі регіони
// верхнього рівня ("State"), Київ не є дочірнім щодо області. ID перевірені
// живим запитом до /api/v3/regions і стабільні (адміністративні одиниці).
const KYIV_CITY_REGION_ID = '31';
const KYIV_OBLAST_REGION_ID = '14';

/**
 * Пріоритет: тривога в самому Києві переважає тривогу в області (частіше
 * область "запалюється" на кілька хвилин раніше за місто) — власник хоче
 * бачити ранній сигнал по області, який перемикається на "Київ", щойно
 * тривога дійде безпосередньо до міста.
 *
 * Один запит на весь список тривог по Україні, а не по одному на кожен
 * регіон — free-тір ключа явно чутливий до частоти запитів (кілька
 * паралельних /alerts/{id} поспіль стабільно ловили 401, хоча ключ і
 * region id перевірені й правильні).
 */
async function getAirRaid() {
    const apiKey = process.env.UKRAINEALARM_API_KEY;
    if (!apiKey) return { configured: false, status: 'unknown' };

    if (isFresh(cache.airRaid, TTL.airRaid)) return cache.airRaid.value;
    try {
        const res = await fetch('https://api.ukrainealarm.com/api/v3/alerts', {
            headers: { Authorization: apiKey },
        });
        if (!res.ok) throw new Error(`ukrainealarm.com відповів ${res.status}`);
        const data = await res.json();
        const entries = Array.isArray(data) ? data : [];
        const findAlert = (regionId) => entries.find((e) => e.regionId === regionId)?.activeAlerts?.[0] || null;
        const cityAlert = findAlert(KYIV_CITY_REGION_ID);
        const oblastAlert = findAlert(KYIV_OBLAST_REGION_ID);

        const active = cityAlert ? { level: 'city', alert: cityAlert } : oblastAlert ? { level: 'oblast', alert: oblastAlert } : null;
        const value = active
            ? {
                configured: true,
                status: active.level,
                type: active.alert.type || null,
                since: active.alert.activeAlertLevels?.[0]?.createdAt || active.alert.lastUpdate || null,
            }
            : { configured: true, status: 'clear', type: null, since: null };

        cache.airRaid = { at: Date.now(), value };
        return value;
    } catch (err) {
        // Не видаємо "спокійно" на помилці — краще показати "статус
        // невідомий", ніж хибно заспокоїти.
        return { configured: true, status: 'unknown', error: err.message };
    }
}

async function buildStatusBar() {
    const [currency, weather, airRaid] = await Promise.all([getCurrency(), getWeather(), getAirRaid()]);
    return { currency, weather, airRaid };
}

module.exports = { buildStatusBar };
