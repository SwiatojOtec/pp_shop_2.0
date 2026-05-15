const { Op } = require('sequelize');
const RentalApplication = require('../models/RentalApplication');

const ACTIVE_RENT_STATUSES = ['active', 'booked', 'overdue'];

/** Наступний календарний день після rentTo (DATEONLY рядок YYYY-MM-DD). */
function addDaysIso(dateIsoStr, days) {
    if (!dateIsoStr) return null;
    const base = String(dateIsoStr).slice(0, 10);
    const d = new Date(`${base}T12:00:00.000Z`);
    if (Number.isNaN(d.getTime())) return null;
    d.setUTCDate(d.getUTCDate() + days);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/**
 * Для кожного productId: найраніше поле rentTo серед заявок, де товар у items і статус «займає» залишок.
 */
async function getRentOutDateHintsByProductIds(productIds) {
    const ids = [...new Set((productIds || []).map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0))];
    if (!ids.length) return new Map();

    const apps = await RentalApplication.findAll({
        where: { status: { [Op.in]: ACTIVE_RENT_STATUSES } },
        attributes: ['items', 'rentTo'],
    });

    const minRentToByProduct = new Map();
    for (const app of apps) {
        const rt = app.rentTo;
        if (!rt) continue;
        const rtStr = String(rt).slice(0, 10);
        for (const line of app.items || []) {
            const pid = Number(line.productId);
            if (!ids.includes(pid)) continue;
            const prev = minRentToByProduct.get(pid);
            if (prev == null || rtStr < prev) minRentToByProduct.set(pid, rtStr);
        }
    }

    const out = new Map();
    for (const pid of ids) {
        const busyUntil = minRentToByProduct.get(pid);
        if (!busyUntil) continue;
        out.set(pid, {
            rentOutBusyUntil: busyUntil,
            rentOutNextAvailableFrom: addDaysIso(busyUntil, 1),
        });
    }
    return out;
}

/**
 * Додає rentOutBusyUntil / rentOutNextAvailableFrom до JSON товарів оренди з quantityAvailable <= 0.
 */
async function attachRentCatalogHintsToProducts(productInstances) {
    const list = Array.isArray(productInstances) ? productInstances : [];
    const needyIds = list
        .filter((p) => p.isRent && typeof p.quantityAvailable === 'number' && p.quantityAvailable <= 0)
        .map((p) => p.id);
    const hints = needyIds.length ? await getRentOutDateHintsByProductIds(needyIds) : new Map();

    return list.map((p) => {
        const obj = typeof p.toJSON === 'function' ? p.toJSON() : { ...p };
        if (p.isRent && typeof p.quantityAvailable === 'number' && p.quantityAvailable <= 0) {
            const h = hints.get(p.id);
            if (h) {
                obj.rentOutBusyUntil = h.rentOutBusyUntil;
                obj.rentOutNextAvailableFrom = h.rentOutNextAvailableFrom;
            }
        }
        return obj;
    });
}

module.exports = {
    ACTIVE_RENT_STATUSES,
    addDaysIso,
    getRentOutDateHintsByProductIds,
    attachRentCatalogHintsToProducts,
};
