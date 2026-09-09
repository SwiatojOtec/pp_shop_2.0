/**
 * Turns the flat calendar events list into a resource-timeline: one row per
 * tool, with overlapping bookings/applications for that tool stacked into
 * lanes (docs/admin-redesign/00-plan.md, УХ рішення №6 — "Календар —
 * ресурсна шкала «інструмент × дні»").
 *
 * Bookings/applications don't reserve a specific physical unit — two
 * bookings for the same product that overlap aren't necessarily a conflict
 * (the product may have several physical units). Stacking them into lanes
 * shows the real load without asserting a conflict that may not exist.
 */

export function toIsoDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function addMonths(date, delta) {
    return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

export function daysOfMonth(monthDate) {
    const end = endOfMonth(monthDate);
    const days = [];
    for (let d = 1; d <= end.getDate(); d += 1) {
        days.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), d));
    }
    return days;
}

export function addDays(date, delta) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta);
}

/** Monday-based week start (Ukrainian convention). */
export function startOfWeek(date) {
    const day = date.getDay(); // 0=Sun..6=Sat
    const diff = day === 0 ? -6 : 1 - day;
    return addDays(date, diff);
}

export function daysInRange(start, count) {
    const days = [];
    for (let i = 0; i < count; i += 1) days.push(addDays(start, i));
    return days;
}

export function rangesOverlap(aFrom, aTo, bFrom, bTo) {
    return aFrom <= bTo && aTo >= bFrom;
}

/** Greedy interval-graph lane assignment — events sorted by start, each gets
 *  the first lane whose last event already ended. */
export function assignLanes(events) {
    const sorted = [...events].sort((a, b) => String(a.rentFrom).localeCompare(String(b.rentFrom)));
    const laneEnds = [];
    const placed = sorted.map((evt) => {
        let lane = laneEnds.findIndex((end) => end < evt.rentFrom);
        if (lane === -1) {
            lane = laneEnds.length;
            laneEnds.push(evt.rentTo);
        } else {
            laneEnds[lane] = evt.rentTo;
        }
        return { ...evt, lane };
    });
    return { events: placed, laneCount: laneEnds.length || 1 };
}

/** Per-day committed quantity for a quantity-tracked product (ліси, опалубка —
 *  Product.trackingMode='quantity'): one row with a fill gauge instead of one
 *  row per physical unit. */
function buildDailyLoad(rowEvents, days) {
    const load = new Map();
    for (const day of days) {
        const iso = toIsoDate(day);
        let sum = 0;
        for (const evt of rowEvents) {
            if (evt.rentFrom <= iso && evt.rentTo >= iso) sum += Math.max(1, Number(evt.quantity) || 1);
        }
        load.set(iso, sum);
    }
    return load;
}

/**
 * Builds timeline rows for the given mode.
 *   'busy'       – only tools with at least one event in the loaded range, flat
 *   'categories' – same tools, grouped under a category header row
 *   'all'        – every rentable product, occupied or not, grouped by category
 *
 * @param {Date[]} [days] — visible days, required for trackingMode='quantity'
 *   rows (their fill gauge is computed per visible day, not per event span).
 * @param {Record<number,number>} [productTotals] — physical unit totals for
 *   quantity-tracked products, keyed by product id (server-computed).
 */
export function buildTimelineRows(events, products, mode, days = [], productTotals = {}) {
    const eventsByProduct = new Map();
    for (const evt of events) {
        const pid = Number(evt.productId);
        if (!Number.isFinite(pid)) continue;
        if (!eventsByProduct.has(pid)) eventsByProduct.set(pid, []);
        eventsByProduct.get(pid).push(evt);
    }

    const productById = new Map(products.map((p) => [p.id, p]));

    function makeRow(productId) {
        const product = productById.get(productId);
        const rowEvents = eventsByProduct.get(productId) || [];
        const base = {
            productId,
            name: product?.name || rowEvents[0]?.productName || `#${productId}`,
            sku: product?.sku || '',
            inventoryNumber: product?.inventoryNumber || '',
            category: product?.category || 'Без категорії',
        };

        if (product?.trackingMode === 'quantity') {
            return {
                ...base,
                trackingMode: 'quantity',
                total: productTotals[productId] ?? 0,
                dailyLoad: buildDailyLoad(rowEvents, days),
                events: rowEvents,
                laneCount: 1,
            };
        }

        const { events: laned, laneCount } = assignLanes(rowEvents);
        return { ...base, trackingMode: 'serial', events: laned, laneCount };
    }

    if (mode === 'all') {
        const rows = products.map((p) => makeRow(p.id));
        const groups = new Map();
        for (const row of rows) {
            if (!groups.has(row.category)) groups.set(row.category, []);
            groups.get(row.category).push(row);
        }
        return [...groups.entries()]
            .sort((a, b) => a[0].localeCompare(b[0], 'uk'))
            .map(([category, rows2]) => ({ category, rows: rows2 }));
    }

    const occupiedIds = [...eventsByProduct.keys()];
    const rows = occupiedIds.map(makeRow).sort((a, b) => a.name.localeCompare(b.name, 'uk'));

    if (mode === 'categories') {
        const groups = new Map();
        for (const row of rows) {
            if (!groups.has(row.category)) groups.set(row.category, []);
            groups.get(row.category).push(row);
        }
        return [...groups.entries()]
            .sort((a, b) => a[0].localeCompare(b[0], 'uk'))
            .map(([category, rows2]) => ({ category, rows: rows2 }));
    }

    return [{ category: null, rows }];
}
