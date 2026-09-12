const { Op } = require('sequelize');
const Order = require('../../../models/Order');
const RentalApplication = require('../../../models/RentalApplication');

/**
 * Daily order number: `{n}/{DD}/{MM}/{YYYY}`. Race-prone under concurrent
 * creates. Numbering is based on the highest `{n}` already used today
 * (parsed from existing orderNumber strings), not a row count — a count
 * undercounts as soon as any order created earlier today is deleted, which
 * then collides with a surviving order's number (unique constraint) and
 * blocks every new deal for the rest of the day.
 */
async function generateOrderNumber() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const suffix = `/${day}/${month}/${year}`;

    const todaysOrders = await Order.findAll({
        where: { orderNumber: { [Op.like]: `%${suffix}` } },
        attributes: ['orderNumber'],
    });
    const maxNumber = todaysOrders.reduce((max, o) => {
        const n = parseInt(String(o.orderNumber).split('/')[0], 10);
        return Number.isFinite(n) && n > max ? n : max;
    }, 0);

    return `${maxNumber + 1}${suffix}`;
}

/** Rental application number: `RA-{YYYY}-{NNN}`. Race-prone under concurrent creates. */
async function generateAppNumber() {
    const year = new Date().getFullYear();
    const last = await RentalApplication.findOne({
        where: { applicationNumber: { [Op.like]: `RA-${year}-%` } },
        order: [['id', 'DESC']],
    });
    const nextNum = last
        ? String(parseInt(last.applicationNumber.split('-')[2], 10) + 1).padStart(3, '0')
        : '001';
    return `RA-${year}-${nextNum}`;
}

module.exports = {
    generateOrderNumber,
    generateAppNumber,
};
