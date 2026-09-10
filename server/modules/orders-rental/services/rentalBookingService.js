const { Op } = require('sequelize');
const RentalBooking = require('../../../models/RentalBooking');
const RentalApplication = require('../../../models/RentalApplication');
const Order = require('../../../models/Order');
const Product = require('../../../models/Product');
const { normalizeUaPhone } = require('../../../utils/phoneUtils');
const { DEFAULT_RENTAL_DEPOSIT_PERCENT } = require('../../../constants/rentalDefaults');
const { coerceDbRentPriceTiers, getRentPricePerDayFromTiers } = require('../../../utils/rentPricing');
const { toIsoDate } = require('./rentalApplicationService');
const { saveDealWithRentalApplication } = require('./orderRentalService');
const { generateOrderNumber } = require('../utils/orderNumbering');
const { getPhysicalQuantityByProduct } = require('../../../services/inventoryService');

const ACTIVE_APP_STATUSES = ['draft', 'booked', 'active', 'overdue'];
const HOLD_STATUS = 'hold';

function rangesOverlap(aFrom, aTo, bFrom, bTo) {
    return aFrom <= bTo && aTo >= bFrom;
}

function calcInclusiveDays(from, to) {
    if (!from || !to) return 0;
    const ms = new Date(to) - new Date(from);
    if (Number.isNaN(ms) || ms < 0) return 0;
    return Math.floor(ms / 86400000) + 1;
}

function serializeBooking(row, product = null) {
    const data = row.toJSON ? row.toJSON() : row;
    return {
        id: data.id,
        productId: data.productId,
        productName: product?.name || data.productName || null,
        rentFrom: data.rentFrom,
        rentTo: data.rentTo,
        note: data.note || '',
        clientName: data.clientName || '',
        clientPhone: data.clientPhone || '',
        status: data.status,
        rentalApplicationId: data.rentalApplicationId || null,
        createdBy: data.createdBy || null,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
    };
}

function normalizeBookingPayload(body = {}) {
    const productId = parseInt(body.productId, 10);
    const rentFrom = String(body.rentFrom || '').trim();
    const rentTo = String(body.rentTo || '').trim();
    if (!Number.isFinite(productId) || productId <= 0) {
        const err = new Error('Оберіть товар оренди');
        err.status = 400;
        throw err;
    }
    if (!rentFrom || !rentTo) {
        const err = new Error('Вкажіть період оренди (з / по)');
        err.status = 400;
        throw err;
    }
    if (rentTo < rentFrom) {
        const err = new Error('Дата «по» не може бути раніше за «з»');
        err.status = 400;
        throw err;
    }
    return {
        productId,
        rentFrom,
        rentTo,
        note: body.note != null ? String(body.note).trim() : '',
        clientName: body.clientName != null ? String(body.clientName).trim() : '',
        clientPhone: body.clientPhone != null ? normalizeUaPhone(body.clientPhone) : '',
    };
}

async function findHoldConflicts({ productId, rentFrom, rentTo, excludeId = null }) {
    const where = {
        productId,
        status: HOLD_STATUS,
        rentFrom: { [Op.lte]: rentTo },
        rentTo: { [Op.gte]: rentFrom },
    };
    if (excludeId) where.id = { [Op.ne]: excludeId };
    return RentalBooking.findAll({ where, order: [['rentFrom', 'ASC']] });
}

async function assertNoHoldConflict(payload, excludeId = null) {
    const conflicts = await findHoldConflicts({ ...payload, excludeId });
    if (!conflicts.length) return;
    const err = new Error(
        `На цей період уже є бронь цього товару (${conflicts[0].rentFrom} — ${conflicts[0].rentTo})`
    );
    err.status = 409;
    err.conflicts = conflicts.map((c) => serializeBooking(c));
    throw err;
}

async function listBookings(query = {}) {
    const where = {};
    if (query.status) where.status = query.status;
    if (query.productId) {
        const pid = parseInt(query.productId, 10);
        if (Number.isFinite(pid)) where.productId = pid;
    }
    const rows = await RentalBooking.findAll({ where, order: [['rentFrom', 'ASC']] });
    const productIds = [...new Set(rows.map((r) => r.productId))];
    const products = productIds.length
        ? await Product.findAll({ where: { id: productIds }, attributes: ['id', 'name'] })
        : [];
    const byId = new Map(products.map((p) => [p.id, p]));
    return rows.map((row) => serializeBooking(row, byId.get(row.productId)));
}

async function getBookingById(id) {
    const row = await RentalBooking.findByPk(id);
    if (!row) return null;
    const product = await Product.findByPk(row.productId, { attributes: ['id', 'name'] });
    return serializeBooking(row, product);
}

async function createBooking(body, createdBy = null) {
    const payload = normalizeBookingPayload(body);
    const product = await Product.findByPk(payload.productId);
    if (!product || !product.isRent) {
        const err = new Error('Товар не знайдено в каталозі оренди');
        err.status = 404;
        throw err;
    }
    await assertNoHoldConflict(payload);
    const row = await RentalBooking.create({
        ...payload,
        status: HOLD_STATUS,
        createdBy: createdBy || null,
    });
    return serializeBooking(row, product);
}

async function updateBooking(id, body) {
    const row = await RentalBooking.findByPk(id);
    if (!row) return null;
    if (row.status !== HOLD_STATUS) {
        const err = new Error('Можна редагувати лише активні броні');
        err.status = 400;
        throw err;
    }
    const payload = normalizeBookingPayload({
        productId: body.productId ?? row.productId,
        rentFrom: body.rentFrom ?? row.rentFrom,
        rentTo: body.rentTo ?? row.rentTo,
        note: body.note !== undefined ? body.note : row.note,
        clientName: body.clientName !== undefined ? body.clientName : row.clientName,
        clientPhone: body.clientPhone !== undefined ? body.clientPhone : row.clientPhone,
    });
    await assertNoHoldConflict(payload, row.id);
    const product = await Product.findByPk(payload.productId);
    if (!product || !product.isRent) {
        const err = new Error('Товар не знайдено в каталозі оренди');
        err.status = 404;
        throw err;
    }
    await row.update(payload);
    await row.reload();
    return serializeBooking(row, product);
}

async function cancelBooking(id) {
    const row = await RentalBooking.findByPk(id);
    if (!row) return null;
    if (row.status === 'cancelled') return serializeBooking(row);
    await row.update({ status: 'cancelled' });
    await row.reload();
    const product = await Product.findByPk(row.productId, { attributes: ['id', 'name'] });
    return serializeBooking(row, product);
}

async function deleteBooking(id) {
    const row = await RentalBooking.findByPk(id);
    if (!row) return false;
    await row.destroy();
    return true;
}

function buildAppLineEvent(app, item, productNameById, orderIdByApplication) {
    const rentFrom = item.rentFrom || app.rentFrom;
    const rentTo = item.rentTo || app.rentTo;
    if (!rentFrom || !rentTo) return null;
    const productId = Number(item.productId) || null;
    return {
        id: `app-${app.id}-${productId || 'x'}-${rentFrom}`,
        source: 'application',
        kind: app.status === 'overdue' ? 'overdue' : 'application',
        status: app.status,
        productId,
        productName: item.name || productNameById.get(productId) || 'Інструмент',
        quantity: Math.max(1, Math.floor(Number(item.quantity)) || 1),
        rentFrom,
        rentTo,
        title: app.clientName || app.applicationNumber || `Заявка #${app.id}`,
        subtitle: app.applicationNumber || '',
        clientName: app.clientName || '',
        clientPhone: app.clientPhone || '',
        applicationId: app.id,
        applicationNumber: app.applicationNumber || null,
        // Ведемо на угоду, а не на застарілий маршрут заявки, якщо вона вже
        // прив'язана до Order — той самий патерн, що й у /api/warehouse/
        // product-rentals/:productId (docs/admin-redesign/03-screens.md, 1.2).
        orderId: orderIdByApplication.get(app.id) || null,
        bookingId: null,
        note: '',
    };
}

async function listCalendarEvents({ from, to } = {}) {
    const rangeFrom = from || toIsoDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const rangeTo = to || toIsoDate(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));

    const [holds, apps] = await Promise.all([
        RentalBooking.findAll({
            where: {
                status: HOLD_STATUS,
                rentFrom: { [Op.lte]: rangeTo },
                rentTo: { [Op.gte]: rangeFrom },
            },
            order: [['rentFrom', 'ASC']],
        }),
        RentalApplication.findAll({
            where: {
                status: { [Op.in]: ACTIVE_APP_STATUSES },
                [Op.or]: [
                    {
                        rentFrom: { [Op.lte]: rangeTo },
                        rentTo: { [Op.gte]: rangeFrom },
                    },
                    { rentFrom: null },
                    { rentTo: null },
                ],
            },
            order: [['rentFrom', 'ASC']],
        }),
    ]);

    const productIds = new Set();
    holds.forEach((h) => productIds.add(h.productId));
    apps.forEach((app) => {
        (app.items || []).forEach((item) => {
            const pid = Number(item.productId);
            if (Number.isFinite(pid)) productIds.add(pid);
        });
    });

    const products = productIds.size
        ? await Product.findAll({
            where: { id: [...productIds] },
            attributes: ['id', 'name', 'trackingMode'],
        })
        : [];
    const productNameById = new Map(products.map((p) => [p.id, p.name]));
    const quantityTrackedIds = products.filter((p) => p.trackingMode === 'quantity').map((p) => p.id);
    const physicalQuantityById = quantityTrackedIds.length ? await getPhysicalQuantityByProduct() : new Map();
    const productTotals = {};
    for (const pid of quantityTrackedIds) {
        productTotals[pid] = physicalQuantityById.get(pid) || 0;
    }

    const appIds = apps.map((app) => app.id);
    const linkedOrders = appIds.length
        ? await Order.findAll({
            where: { rentalApplicationId: { [Op.in]: appIds } },
            attributes: ['id', 'rentalApplicationId'],
        })
        : [];
    const orderIdByApplication = new Map(linkedOrders.map((o) => [o.rentalApplicationId, o.id]));

    const events = [];

    for (const hold of holds) {
        events.push({
            id: `hold-${hold.id}`,
            source: 'booking',
            kind: 'hold',
            status: hold.status,
            productId: hold.productId,
            productName: productNameById.get(hold.productId) || 'Інструмент',
            quantity: 1,
            rentFrom: hold.rentFrom,
            rentTo: hold.rentTo,
            title: hold.clientName || productNameById.get(hold.productId) || 'Бронь',
            subtitle: hold.note || '',
            clientName: hold.clientName || '',
            clientPhone: hold.clientPhone || '',
            applicationId: null,
            applicationNumber: null,
            bookingId: hold.id,
            note: hold.note || '',
        });
    }

    for (const app of apps) {
        const items = Array.isArray(app.items) ? app.items : [];
        if (!items.length) {
            if (app.rentFrom && app.rentTo && rangesOverlap(app.rentFrom, app.rentTo, rangeFrom, rangeTo)) {
                const evt = buildAppLineEvent(app, {}, productNameById, orderIdByApplication);
                if (evt) events.push(evt);
            }
            continue;
        }
        for (const item of items) {
            const rentFrom = item.rentFrom || app.rentFrom;
            const rentTo = item.rentTo || app.rentTo;
            if (!rentFrom || !rentTo) continue;
            if (!rangesOverlap(rentFrom, rentTo, rangeFrom, rangeTo)) continue;
            const evt = buildAppLineEvent(app, item, productNameById, orderIdByApplication);
            if (evt) events.push(evt);
        }
    }

    events.sort((a, b) => String(a.rentFrom).localeCompare(String(b.rentFrom)));
    return { from: rangeFrom, to: rangeTo, events, productTotals };
}

/**
 * Booking → deal (docs/admin-redesign/05-fixes.md, п.2). Used to create only
 * a RentalApplication with no Order, which is exactly how the 11 orphaned
 * "заявка без угоди" rows in the deals list came to exist — this creates the
 * Order directly (an "Угода" from the very first save), then lets
 * saveDealWithRentalApplication generate the linked application the same
 * way any other rent deal does, so nothing new is orphaned going forward.
 */
async function convertBookingToOrder(id, createdBy = null) {
    const row = await RentalBooking.findByPk(id);
    if (!row) return null;
    if (row.status !== HOLD_STATUS) {
        const err = new Error('Цю бронь уже конвертовано або скасовано');
        err.status = 400;
        throw err;
    }

    const product = await Product.findByPk(row.productId);
    if (!product || !product.isRent) {
        const err = new Error('Товар не знайдено в каталозі оренди');
        err.status = 404;
        throw err;
    }

    const days = calcInclusiveDays(row.rentFrom, row.rentTo) || 1;
    const qty = 1;
    const catalogPrice = parseFloat(product.price || 0) || 0;
    const rentPriceTiers = coerceDbRentPriceTiers(product.rentPriceTiers);
    const pricePerDay = getRentPricePerDayFromTiers(rentPriceTiers, catalogPrice, days);
    const replacementCost = parseFloat(product.replacementCost || 0) || 0;
    const depositPercent = DEFAULT_RENTAL_DEPOSIT_PERCENT;

    const clientName = (row.clientName || '').trim() || 'Клієнт (з календаря)';
    const clientPhone = (row.clientPhone || '').trim() || '0000000000';

    const orderNumber = await generateOrderNumber();
    const order = await Order.create({
        orderNumber,
        customerName: clientName,
        customerPhone: clientPhone,
        deliveryMethod: 'pickup',
        paymentMethod: 'invoice',
        status: 'new',
        totalAmount: (days * pricePerDay * qty).toFixed(2),
        items: [{
            id: product.id,
            name: product.name,
            sku: product.sku || '',
            price: catalogPrice,
            quantity: qty,
            unit: product.unit || 'шт',
            packSize: product.packSize || 1,
            isRent: true,
            catalogPrice,
            rentPriceTiers,
            rentFrom: row.rentFrom,
            rentTo: row.rentTo,
            rentDays: days,
            serialNumber: product.serialNumber || '',
            inventoryNumber: product.inventoryNumber || '',
            technicalCondition: product.technicalCondition || '',
            weightTotal: product.weightTotal || '',
            replacementCostPerUnit: replacementCost,
            replacementCostTotal: replacementCost * qty,
            depositPercent,
            depositAmount: (replacementCost * qty * (depositPercent / 100)).toFixed(2),
            kitItems: Array.isArray(product.kitItems) ? product.kitItems : [],
        }],
    });

    const { order: savedOrder, rentalApplication } = await saveDealWithRentalApplication(order.id, {}, {}, createdBy);
    if (row.note && rentalApplication?.id) {
        await RentalApplication.update({ notes: row.note }, { where: { id: rentalApplication.id } });
    }

    await row.update({
        status: 'converted',
        rentalApplicationId: rentalApplication?.id || null,
    });
    await row.reload();

    return {
        order: savedOrder,
        booking: serializeBooking(row, product),
    };
}

module.exports = {
    listBookings,
    getBookingById,
    createBooking,
    updateBooking,
    cancelBooking,
    deleteBooking,
    listCalendarEvents,
    convertBookingToOrder,
    serializeBooking,
};
