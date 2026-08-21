const sequelize = require('../../../config/db');
const Order = require('../../../models/Order');
const Product = require('../../../models/Product');
const RentalApplication = require('../../../models/RentalApplication');
const { DEFAULT_RENTAL_DEPOSIT_PERCENT } = require('../../../constants/rentalDefaults');
const { recalculateProductQuantity } = require('../../../services/inventoryService');
const { parseDiscountPercent, roundMoney } = require('../../../utils/orderAmounts');
const { coerceDbRentPriceTiers, getRentPricePerDayFromTiers } = require('../../../utils/rentPricing');
const { generateAppNumber } = require('../utils/orderNumbering');

/** Inclusive calendar days: 11.08 → 15.08 = 5. */
function calcInclusiveDays(from, to) {
    if (!from || !to) return 0;
    const ms = new Date(to) - new Date(from);
    if (Number.isNaN(ms) || ms < 0) return 0;
    return Math.floor(ms / 86400000) + 1;
}

function buildRentItemsFromOrder(order, productsById, previousItems = []) {
    const previousByProduct = new Map();
    for (const item of previousItems || []) {
        const pid = Number(item.productId);
        if (Number.isFinite(pid) && pid > 0 && !previousByProduct.has(pid)) {
            previousByProduct.set(pid, item);
        }
    }

    const items = Array.isArray(order.items) ? order.items : [];
    return items
        .filter((line) => {
            const product = productsById.get(line.id);
            return product?.isRent;
        })
        .map((line) => {
            const product = productsById.get(line.id) || {};
            const prev = previousByProduct.get(Number(line.id)) || {};
            const qty = Number(line.quantity) || 1;
            const replacementCost = parseFloat(
                prev.replacementCostPerUnit != null && prev.replacementCostPerUnit !== ''
                    ? prev.replacementCostPerUnit
                    : (product.replacementCost || 0)
            ) || 0;
            const catalogPrice = parseFloat(product.price || prev.catalogPrice || 0) || 0;
            const rentPriceTiers = coerceDbRentPriceTiers(prev.rentPriceTiers || product.rentPriceTiers);
            const rentFrom = line.rentFrom || prev.rentFrom || '';
            const rentTo = line.rentTo || prev.rentTo || '';
            const dateDays = calcInclusiveDays(rentFrom, rentTo);
            const rentDays = dateDays > 0
                ? dateDays
                : Math.max(1, Number(line.rentDays) || Number(prev.days) || 1);
            const pricePerDay = getRentPricePerDayFromTiers(
                rentPriceTiers,
                catalogPrice || (parseFloat(prev.pricePerDay) || 0),
                rentDays
            );
            const depositPercent = parseFloat(
                prev.depositPercent != null && prev.depositPercent !== ''
                    ? prev.depositPercent
                    : DEFAULT_RENTAL_DEPOSIT_PERCENT
            ) || DEFAULT_RENTAL_DEPOSIT_PERCENT;

            return {
                productId: line.id,
                name: line.name || product.name || prev.name || '',
                serialNumber: prev.serialNumber || product.serialNumber || '',
                inventoryNumber: prev.inventoryNumber || product.inventoryNumber || '',
                technicalCondition: prev.technicalCondition || product.technicalCondition || '',
                unit: line.unit || product.unit || prev.unit || 'шт',
                quantity: qty,
                weightTotal: prev.weightTotal || product.weightTotal || '',
                replacementCostPerUnit: replacementCost,
                replacementCostTotal: replacementCost * qty,
                depositPercent,
                depositAmount: (replacementCost * qty * (depositPercent / 100)).toFixed(2),
                catalogPrice,
                rentPriceTiers,
                pricePerDay: prev.pricePerDay != null && prev.pricePerDay !== ''
                    ? prev.pricePerDay
                    : pricePerDay,
                rentFrom,
                rentTo,
                days: rentDays,
                totalRental: (rentDays * (
                    parseFloat(prev.pricePerDay != null && prev.pricePerDay !== '' ? prev.pricePerDay : pricePerDay) || 0
                ) * qty).toFixed(2),
                kitItems: Array.isArray(prev.kitItems)
                    ? prev.kitItems
                    : (Array.isArray(product.kitItems) ? product.kitItems : []),
            };
        });
}

/**
 * Mirror order commerce (client, qty, discount) onto the linked application while
 * preserving rental enrichment (serials, kit, custom deposit %).
 */
async function syncApplicationWithOrder(application, order, transaction) {
    const itemIds = [...new Set(
        (order.items || []).map((line) => line.id).filter(Boolean)
    )];
    const products = itemIds.length
        ? await Product.findAll({ where: { id: itemIds, isRent: true }, transaction })
        : [];
    const productsById = new Map(products.map((p) => [p.id, p]));
    const rentItems = buildRentItemsFromOrder(order, productsById, application.items || []);

    const orderDiscount = parseDiscountPercent(order.discount);
    const totalRental = roundMoney(
        rentItems.reduce((sum, line) => sum + (parseFloat(line.totalRental) || 0), 0)
    );
    const totalDeposit = roundMoney(
        rentItems.reduce((sum, line) => sum + (parseFloat(line.depositAmount) || 0), 0)
    );
    const discountAmount = roundMoney(Math.min((totalRental * orderDiscount) / 100, totalRental));
    const totalAmount = roundMoney(Math.max(totalRental - discountAmount, 0));

    await application.update({
        clientName: order.customerName || application.clientName || '',
        clientPhone: order.customerPhone || application.clientPhone || '',
        clientEmail: order.customerEmail || application.clientEmail || null,
        clientAddress: order.address || application.clientAddress || '',
        clientId: order.clientId || application.clientId || null,
        items: rentItems,
        depositAmount: totalDeposit,
        discountType: 'percent',
        discountValue: orderDiscount,
        discountAmount,
        totalAmount,
        rentStartTime: order.rentStartTime || application.rentStartTime || null,
    }, { transaction });

    return application;
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
                await syncApplicationWithOrder(existing, order, transaction);
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
        const discountPercent = parseDiscountPercent(order.discount);

        const totalRental = roundMoney(
            rentItems.reduce((sum, line) => sum + (parseFloat(line.totalRental) || 0), 0)
        );
        const discountAmount = roundMoney(Math.min((totalRental * discountPercent) / 100, totalRental));

        const application = await RentalApplication.create({
            applicationNumber,
            clientName: order.customerName || '',
            clientPhone: order.customerPhone || '',
            clientEmail: order.customerEmail || null,
            clientAddress: order.address || '',
            clientId: order.clientId || null,
            status: 'draft',
            items: rentItems,
            totalAmount: roundMoney(Math.max(totalRental - discountAmount, 0)),
            depositAmount: totalDeposit.toFixed(2),
            discountType: 'percent',
            discountValue: discountPercent,
            discountAmount,
            rentStartTime: order.rentStartTime || null,
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
