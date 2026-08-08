const RentalApplication = require('../../../models/RentalApplication');
const Order = require('../../../models/Order');
const Client = require('../../../models/Client');
const { Op } = require('sequelize');
const { recalculateProductQuantity } = require('../../../services/inventoryService');
const { normalizeUaPhone } = require('../../../utils/phoneUtils');
const { parseDiscountPercent } = require('../../../utils/orderAmounts');
const { generateAppNumber } = require('../utils/orderNumbering');

function normalizeRentalPayload(body) {
    const payload = { ...body };
    if (payload.clientPhone != null) {
        payload.clientPhone = normalizeUaPhone(payload.clientPhone);
    }
    if (Array.isArray(payload.responsible)) {
        payload.responsible = payload.responsible.map((person) => ({
            ...person,
            phone: person?.phone != null ? normalizeUaPhone(person.phone) : person?.phone,
        }));
    }
    return payload;
}

async function recalcRentQuantitiesForItemsLists(itemsA, itemsB) {
    const ids = new Set();
    for (const line of [...(itemsA || []), ...(itemsB || [])]) {
        const id = Number(line.productId);
        if (Number.isFinite(id) && id > 0) ids.add(id);
    }
    await Promise.all([...ids].map((id) => recalculateProductQuantity(id)));
}

const toIsoDate = (date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const shouldBeOverdue = (app, todayIso = toIsoDate()) => {
    if (!app?.rentTo) return false;
    if (!['active', 'booked'].includes(app.status)) return false;
    return app.rentTo < todayIso;
};

const applyAutoOverdueStatus = async (app, todayIso = toIsoDate()) => {
    if (!shouldBeOverdue(app, todayIso)) return app;
    await app.update({ status: 'overdue' });
    app.status = 'overdue';
    return app;
};

const applyAutoOverdueForAll = async () => {
    const todayIso = toIsoDate();
    await RentalApplication.update(
        { status: 'overdue' },
        {
            where: {
                status: { [Op.in]: ['active', 'booked'] },
                rentTo: { [Op.lt]: todayIso }
            }
        }
    );
};

async function listApplications(query = {}) {
    await applyAutoOverdueForAll();
    const where = {};
    if (query.clientId) {
        const cid = parseInt(query.clientId, 10);
        if (!Number.isNaN(cid) && cid > 0) where.clientId = cid;
    }
    return RentalApplication.findAll({ where, order: [['createdAt', 'DESC']] });
}

async function getApplicationById(id) {
    const app = await RentalApplication.findByPk(id);
    if (!app) return null;

    await applyAutoOverdueStatus(app);

    const linkedOrder = await Order.findOne({
        where: { rentalApplicationId: app.id },
        attributes: ['id', 'orderNumber', 'discount', 'clientId'],
    });

    let clientDiscount = 0;
    if (app.clientId) {
        const client = await Client.findByPk(app.clientId, { attributes: ['discountPercent'] });
        clientDiscount = parseDiscountPercent(client?.discountPercent);
    }

    const payload = app.toJSON();
    payload.linkedOrder = linkedOrder
        ? {
            id: linkedOrder.id,
            orderNumber: linkedOrder.orderNumber,
            discount: parseDiscountPercent(linkedOrder.discount),
        }
        : null;
    payload.clientDiscount = clientDiscount;

    return payload;
}

async function createApplication(body, createdBy = null) {
    const applicationNumber = await generateAppNumber();
    const payload = normalizeRentalPayload({ ...body });
    if (payload.rentTo && ['active', 'booked'].includes(payload.status)) {
        if (payload.rentTo < toIsoDate()) payload.status = 'overdue';
    }
    const application = await RentalApplication.create({
        ...payload,
        applicationNumber,
        createdBy,
    });
    await recalcRentQuantitiesForItemsLists(application.items, []);
    return application;
}

async function updateApplication(id, body) {
    const app = await RentalApplication.findByPk(id);
    if (!app) return null;

    const prevItems = Array.isArray(app.items) ? app.items : [];
    const next = normalizeRentalPayload({ ...body });
    const nextStatus = next.status || app.status;
    const nextRentTo = next.rentTo || app.rentTo;
    if (nextRentTo && ['active', 'booked'].includes(nextStatus) && nextRentTo < toIsoDate()) {
        next.status = 'overdue';
    }
    await app.update(next);
    await app.reload();
    const newItems = Array.isArray(app.items) ? app.items : [];
    await recalcRentQuantitiesForItemsLists(prevItems, newItems);
    return app;
}

async function deleteApplication(id) {
    const app = await RentalApplication.findByPk(id);
    if (!app) return false;

    const prevItems = Array.isArray(app.items) ? app.items : [];
    await app.destroy();
    await recalcRentQuantitiesForItemsLists(prevItems, []);
    return true;
}

module.exports = {
    normalizeRentalPayload,
    recalcRentQuantitiesForItemsLists,
    toIsoDate,
    shouldBeOverdue,
    applyAutoOverdueStatus,
    applyAutoOverdueForAll,
    listApplications,
    getApplicationById,
    createApplication,
    updateApplication,
    deleteApplication,
};
