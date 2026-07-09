const { Op } = require('sequelize');
const sequelize = require('../config/db');
const Order = require('../models/Order');
const Client = require('../models/Client');
const Product = require('../models/Product');
const RentalApplication = require('../models/RentalApplication');
const { DEFAULT_RENTAL_DEPOSIT_PERCENT } = require('../constants/rentalDefaults');
const { recalculateProductQuantity } = require('./inventoryService');
const { parseDiscountPercent } = require('../utils/orderAmounts');
const { coerceDbRentPriceTiers, getRentPricePerDayFromTiers } = require('../utils/rentPricing');

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
            const catalogPrice = parseFloat(product.price || 0) || 0;
            const rentPriceTiers = coerceDbRentPriceTiers(product.rentPriceTiers);
            const rentDays = Math.max(1, Number(line.rentDays) || 1);
            const pricePerDay = getRentPricePerDayFromTiers(rentPriceTiers, catalogPrice, rentDays);
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
                catalogPrice,
                rentPriceTiers,
                pricePerDay,
                rentFrom: '',
                rentTo: '',
                days: rentDays,
                totalRental: (rentDays * pricePerDay * qty).toFixed(2),
                kitItems: Array.isArray(product.kitItems) ? product.kitItems : [],
            };
        });
}

async function resolveApplicationDiscount(order, transaction) {
    let discount = parseDiscountPercent(order.discount);
    if (discount > 0) return discount;

    if (order.clientId) {
        const client = await Client.findByPk(order.clientId, { transaction });
        if (client) {
            discount = parseDiscountPercent(client.discountPercent);
        }
    }
    return discount;
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
        const discountPercent = await resolveApplicationDiscount(order, transaction);

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
            discountType: discountPercent > 0 ? 'percent' : 'fixed',
            discountValue: discountPercent,
            discountAmount: 0,
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
