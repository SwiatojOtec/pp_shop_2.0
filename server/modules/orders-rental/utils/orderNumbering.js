const { Op } = require('sequelize');
const Order = require('../../../models/Order');
const RentalApplication = require('../../../models/RentalApplication');

/** Daily order number: `{n}/{DD}/{MM}/{YYYY}`. Race-prone under concurrent creates. */
async function generateOrderNumber() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const countToday = await Order.count({
        where: {
            createdAt: {
                [Op.gte]: startOfDay,
            },
        },
    });

    const dailyNumber = countToday + 1;
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${dailyNumber}/${day}/${month}/${year}`;
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
