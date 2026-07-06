const { Op } = require('sequelize');
const sequelize = require('../config/db');
const Order = require('../models/Order');
const Product = require('../models/Product');
const RentalApplication = require('../models/RentalApplication');
const { DEFAULT_RENTAL_DEPOSIT_PERCENT } = require('../constants/rentalDefaults');
const { recalculateProductQuantity } = require('./inventoryService');

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

function buildRentItemsFromOrder(order, productsById) {
    const items = Array.isArray(order.items) ? order.items : [];
    return items
        .filter((line) => {
            const product = productsById.get(line.id);
            return product?.isRent;
        })
        .map((line) => {
            const product = productsById.get(line.id) || {};
            const qty = Number(line.quantity) || 1;
            const replacementCost = parseFloat(product.replacementCost || 0);
            return {
                productId: line.id,
                name: line.name || product.name || '',
                serialNumber: product.serialNumber || '',
                inventoryNumber: product.inventoryNumber || '',
                technicalCondition: product.technicalCondition || '',
                unit: line.unit || product.unit || 'шт',
                quantity: qty,
                weightTotal: product.weightTotal || '',
                replacementCostPerUnit: replacementCost,
                replacementCostTotal: replacementCost * qty,
                depositPercent: DEFAULT_RENTAL_DEPOSIT_PERCENT,
                depositAmount: (
                    replacementCost * qty * (DEFAULT_RENTAL_DEPOSIT_PERCENT / 100)
                ).toFixed(2),
                pricePerDay: parseFloat(line.price || product.price || 0),
                rentFrom: '',
                rentTo: '',
                days: 0,
                totalRental: '',
                kitItems: Array.isArray(product.kitItems) ? product.kitItems : [],
            };
        });
}

async function createOrGetRentalApplicationFromOrder(orderId, createdBy = null) {
    return sequelize.transaction(async (transaction) => {
        const order = await Order.findByPk(orderId, {
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
        if (!order) {
            const err = new Error('Замовлення не знайдено');
            err.status = 404;
            throw err;
        }

        if (order.rentalApplicationId) {
            const existing = await RentalApplication.findByPk(order.rentalApplicationId, { transaction });
            if (existing) {
                return { application: existing, created: false };
            }
            await order.update({ rentalApplicationId: null }, { transaction });
        }

        const itemIds = [...new Set(
            (order.items || []).map((line) => line.id).filter(Boolean)
        )];
        const products = itemIds.length
            ? await Product.findAll({ where: { id: itemIds, isRent: true }, transaction })
            : [];
        const productsById = new Map(products.map((p) => [p.id, p]));
        const rentItems = buildRentItemsFromOrder(order, productsById);

        if (!rentItems.length) {
            const err = new Error('У замовленні немає позицій оренди');
            err.status = 400;
            throw err;
        }

        const totalDeposit = rentItems.reduce((sum, line) => sum + parseFloat(line.depositAmount || 0), 0);
        const applicationNumber = await generateAppNumber();

        const application = await RentalApplication.create({
            applicationNumber,
            clientName: order.customerName || '',
            clientPhone: order.customerPhone || '',
            clientEmail: order.customerEmail || null,
            clientAddress: order.address || '',
            clientId: order.clientId || null,
            status: 'draft',
            items: rentItems,
            totalAmount: 0,
            depositAmount: totalDeposit.toFixed(2),
            createdBy,
        }, { transaction });

        await order.update({ rentalApplicationId: application.id }, { transaction });

        await Promise.all(
            rentItems
                .map((line) => Number(line.productId))
                .filter((id) => Number.isFinite(id) && id > 0)
                .map((id) => recalculateProductQuantity(id))
        );

        return { application, created: true };
    });
}

module.exports = {
    createOrGetRentalApplicationFromOrder,
};
