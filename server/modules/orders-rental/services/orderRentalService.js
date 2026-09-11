const sequelize = require('../../../config/db');
const Order = require('../../../models/Order');
const Product = require('../../../models/Product');
const Client = require('../../../models/Client');
const RentalApplication = require('../../../models/RentalApplication');
const { DEFAULT_RENTAL_DEPOSIT_PERCENT } = require('../../../constants/rentalDefaults');
const { recalculateProductQuantity } = require('../../../services/inventoryService');
const { parseDiscountPercent, roundMoney, calcRentDays } = require('../../../utils/orderAmounts');
const { coerceDbRentPriceTiers, getRentPricePerDayFromTiers } = require('../../../utils/rentPricing');
const { generateAppNumber, generateOrderNumber } = require('../utils/orderNumbering');
const { recalcRentQuantitiesForItemsLists, shouldBeOverdue } = require('./rentalApplicationService');

/** First value among `a`/`b` that isn't null/undefined/''. */
function pickFilled(...values) {
    for (const v of values) {
        if (v != null && v !== '') return v;
    }
    return values[values.length - 1];
}

/**
 * Builds RentalApplication.items from the order's own rent-catalog lines.
 * Enrichment fields (serial number, condition, kit, weight, replacement cost,
 * deposit %, rate override) are edited directly on the order line now (the
 * Deal screen's Позиції card) — `line` is checked first, `prev` (the
 * previously-saved application line) is a fallback for continuity, and the
 * product catalog is the last resort.
 */
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
                pickFilled(line.replacementCostPerUnit, prev.replacementCostPerUnit, product.replacementCost, 0)
            ) || 0;
            const catalogPrice = parseFloat(product.price || prev.catalogPrice || 0) || 0;
            const rentPriceTiers = coerceDbRentPriceTiers(prev.rentPriceTiers || product.rentPriceTiers);
            const rentFrom = line.rentFrom || prev.rentFrom || '';
            const rentTo = line.rentTo || prev.rentTo || '';
            const dateDays = calcRentDays(rentFrom, rentTo);
            const rentDays = dateDays > 0
                ? dateDays
                : Math.max(1, Number(line.rentDays) || Number(prev.days) || 1);
            const pricePerDay = getRentPricePerDayFromTiers(
                rentPriceTiers,
                catalogPrice || (parseFloat(prev.pricePerDay) || 0),
                rentDays
            );
            const depositPercent = parseFloat(
                pickFilled(line.depositPercent, prev.depositPercent, DEFAULT_RENTAL_DEPOSIT_PERCENT)
            ) || DEFAULT_RENTAL_DEPOSIT_PERCENT;
            const resolvedPricePerDay = pickFilled(line.pricePerDay, prev.pricePerDay, pricePerDay);

            return {
                productId: line.id,
                name: line.name || product.name || prev.name || '',
                serialNumber: pickFilled(line.serialNumber, prev.serialNumber, product.serialNumber, ''),
                inventoryNumber: pickFilled(line.inventoryNumber, prev.inventoryNumber, product.inventoryNumber, ''),
                technicalCondition: pickFilled(line.technicalCondition, prev.technicalCondition, product.technicalCondition, ''),
                unit: line.unit || product.unit || prev.unit || 'шт',
                quantity: qty,
                weightTotal: pickFilled(line.weightTotal, prev.weightTotal, product.weightTotal, ''),
                replacementCostPerUnit: replacementCost,
                replacementCostTotal: replacementCost * qty,
                depositPercent,
                depositAmount: (replacementCost * qty * (depositPercent / 100)).toFixed(2),
                catalogPrice,
                rentPriceTiers,
                pricePerDay: resolvedPricePerDay,
                rentFrom,
                rentTo,
                days: rentDays,
                totalRental: (rentDays * (parseFloat(resolvedPricePerDay) || 0) * qty).toFixed(2),
                kitItems: Array.isArray(line.kitItems)
                    ? line.kitItems
                    : (Array.isArray(prev.kitItems)
                        ? prev.kitItems
                        : (Array.isArray(product.kitItems) ? product.kitItems : [])),
            };
        });
}

/**
 * The deal's single status chain (Order.status) drives the internal
 * RentalApplication.status — the rental app no longer has its own editable
 * status in the Deal screen. Mapping keeps existing RentalApplication-status
 * consumers (inventory committed-quantity calc, calendar, auto-overdue) working
 * unchanged: paid+ reserves stock (`booked`), issued means physically out
 * (`active`), returned/done both mean the tool is back (`returned`).
 */
function deriveRentalStatusFromDealStage(dealStatus) {
    switch (dealStatus) {
        case 'paid': return 'booked';
        case 'issued': return 'active';
        case 'returned':
        case 'done': return 'returned';
        case 'cancelled': return 'cancelled';
        default: return 'draft'; // new, invoice
    }
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

/**
 * The Deal screen's single "Зберегти" button — one transaction that saves the
 * order AND (when the order has rental-catalog lines) the linked rental
 * application, instead of two sequential requests with no rollback
 * (docs/admin-redesign/03-screens.md, «Угода»).
 *
 * @param {number} orderId
 * @param {object} orderPatch — already-whitelisted Order fields (see updateOrder)
 * @param {{ clientPassport?: string, clientSiteAddress?: string, responsible?: Array }} dealExtras
 *   — rental-only fields with no Order-side home; identity (name/phone/email/
 *   address/clientId) is always mirrored from the order itself, not sent separately.
 */
async function saveDealWithRentalApplication(orderId, orderPatch, dealExtras = {}, createdBy = null) {
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

        await order.update(orderPatch, { transaction });

        const itemIds = [...new Set(
            (order.items || []).map((line) => line.id).filter(Boolean)
        )];
        const products = itemIds.length
            ? await Product.findAll({ where: { id: itemIds, isRent: true }, transaction })
            : [];
        const productsById = new Map(products.map((p) => [p.id, p]));
        const hasRentItems = (order.items || []).some((line) => productsById.get(line.id)?.isRent);

        let application = null;
        let prevItems = [];

        if (hasRentItems) {
            let existing = order.rentalApplicationId
                ? await RentalApplication.findByPk(order.rentalApplicationId, { transaction })
                : null;
            if (order.rentalApplicationId && !existing) {
                await order.update({ rentalApplicationId: null }, { transaction });
            }

            prevItems = existing?.items || [];
            const rentItems = buildRentItemsFromOrder(order, productsById, prevItems);
            const orderDiscount = parseDiscountPercent(order.discount);
            const totalRental = roundMoney(
                rentItems.reduce((sum, line) => sum + (parseFloat(line.totalRental) || 0), 0)
            );
            const totalDeposit = roundMoney(
                rentItems.reduce((sum, line) => sum + (parseFloat(line.depositAmount) || 0), 0)
            );
            const discountAmount = roundMoney(Math.min((totalRental * orderDiscount) / 100, totalRental));
            const totalAmount = roundMoney(Math.max(totalRental - discountAmount, 0));
            const rentFromDates = rentItems.map((l) => l.rentFrom).filter(Boolean).sort();
            const rentToDates = rentItems.map((l) => l.rentTo).filter(Boolean).sort();
            const rentTo = rentToDates[rentToDates.length - 1] || null;
            let status = deriveRentalStatusFromDealStage(order.status);
            // A deal save must never silently un-overdue an application — only
            // the auto-overdue sweep (applyAutoOverdueStatus/-ForAll) or an
            // explicit "Повернуто"/"Виконано" step may clear it.
            if (shouldBeOverdue({ rentTo, status })) {
                status = 'overdue';
            }

            const fields = {
                clientName: order.customerName || '',
                clientPhone: order.customerPhone || '',
                clientEmail: order.customerEmail || null,
                clientAddress: order.address || '',
                clientId: order.clientId || null,
                clientPassport: dealExtras.clientPassport ?? existing?.clientPassport ?? '',
                clientSiteAddress: dealExtras.clientSiteAddress ?? existing?.clientSiteAddress ?? '',
                responsible: Array.isArray(dealExtras.responsible) ? dealExtras.responsible : (existing?.responsible || []),
                items: rentItems,
                rentFrom: rentFromDates[0] || null,
                rentTo,
                rentStartTime: order.rentStartTime || null,
                depositAmount: totalDeposit,
                discountType: 'percent',
                discountValue: orderDiscount,
                discountAmount,
                totalAmount,
                status,
            };

            if (existing) {
                await existing.update(fields, { transaction });
                application = existing;
            } else {
                const applicationNumber = await generateAppNumber();
                application = await RentalApplication.create({
                    ...fields,
                    applicationNumber,
                    createdBy,
                }, { transaction });
                await order.update({ rentalApplicationId: application.id }, { transaction });
            }
        }

        await order.reload({ transaction });

        const newItems = application?.items || [];
        await recalcRentQuantitiesForItemsLists(prevItems, newItems);

        return { order, rentalApplication: application ? application.toJSON() : null };
    });
}

/** Inverse of deriveRentalStatusFromDealStage — starting point for a deal
 *  created from an existing application's status (05-fixes.md, п.2). */
function deriveDealStatusFromRentalStatus(rentalStatus) {
    switch (rentalStatus) {
        case 'booked': return 'paid';
        case 'active':
        case 'overdue': return 'issued';
        case 'returned': return 'returned';
        case 'cancelled': return 'cancelled';
        default: return 'new'; // draft
    }
}

/**
 * Reverse of buildRentItemsFromOrder: turns an orphaned application's own
 * items (enrichment already filled in — serial, condition, kit, deposit)
 * into order items, so the new deal doesn't start with an empty list.
 */
function buildOrderItemsFromApplication(items, productsById) {
    return (items || []).map((line) => {
        const product = productsById.get(Number(line.productId)) || {};
        const qty = Math.max(1, Number(line.quantity) || 1);
        const catalogPrice = parseFloat(line.catalogPrice || product.price || 0) || 0;
        const replacementCostPerUnit = parseFloat(line.replacementCostPerUnit || product.replacementCost || 0) || 0;
        return {
            id: Number(line.productId),
            name: line.name || product.name || '',
            sku: product.sku || '',
            price: catalogPrice,
            quantity: qty,
            unit: line.unit || product.unit || 'шт',
            packSize: product.packSize || 1,
            isRent: true,
            catalogPrice,
            rentPriceTiers: coerceDbRentPriceTiers(line.rentPriceTiers || product.rentPriceTiers),
            rentFrom: line.rentFrom || '',
            rentTo: line.rentTo || '',
            rentDays: Number(line.days) || 1,
            serialNumber: line.serialNumber || product.serialNumber || '',
            inventoryNumber: line.inventoryNumber || product.inventoryNumber || '',
            technicalCondition: line.technicalCondition || product.technicalCondition || '',
            weightTotal: line.weightTotal || product.weightTotal || '',
            replacementCostPerUnit,
            replacementCostTotal: parseFloat(line.replacementCostTotal || replacementCostPerUnit * qty) || 0,
            depositPercent: parseFloat(line.depositPercent) || DEFAULT_RENTAL_DEPOSIT_PERCENT,
            depositAmount: line.depositAmount || 0,
            kitItems: Array.isArray(line.kitItems) ? line.kitItems : (Array.isArray(product.kitItems) ? product.kitItems : []),
        };
    });
}

/**
 * "Створити угоду" for an orphaned rental application (docs/admin-redesign/
 * 05-fixes.md, п.2) — these are applications from before calendar-booking
 * conversion created a deal directly (see convertBookingToApplication in
 * rentalBookingService.js), so they never got an Order. Creates one, links
 * it, and immediately re-syncs the application from that order through the
 * normal saveDealWithRentalApplication pipeline so totals/deposit/status
 * end up computed the same way a hand-built deal would be, not hand-rolled
 * here.
 */
async function convertApplicationToOrder(applicationId, createdBy = null) {
    const order = await sequelize.transaction(async (transaction) => {
        const application = await RentalApplication.findByPk(applicationId, {
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
        if (!application) {
            const err = new Error('Заявку не знайдено');
            err.status = 404;
            throw err;
        }

        const alreadyLinked = await Order.findOne({ where: { rentalApplicationId: application.id }, transaction });
        if (alreadyLinked) {
            const err = new Error('Заявка вже прив\'язана до угоди');
            err.status = 400;
            throw err;
        }

        const items = Array.isArray(application.items) ? application.items : [];
        const productIds = [...new Set(items.map((l) => Number(l.productId)).filter((id) => Number.isFinite(id) && id > 0))];
        const products = productIds.length
            ? await Product.findAll({ where: { id: productIds }, transaction })
            : [];
        const productsById = new Map(products.map((p) => [p.id, p]));

        let clientName = (application.clientName || '').trim();
        let clientEmail = application.clientEmail || null;
        if (!clientName && application.clientId) {
            const client = await Client.findByPk(application.clientId, { transaction });
            clientName = client?.fullName || '';
            clientEmail = clientEmail || client?.email || null;
        }

        const orderNumber = await generateOrderNumber();
        const discount = application.discountType === 'percent' ? parseDiscountPercent(application.discountValue) : 0;

        return Order.create({
            orderNumber,
            customerName: clientName || 'Клієнт',
            customerPhone: application.clientPhone || '0000000000',
            customerEmail: clientEmail,
            address: application.clientAddress || null,
            deliveryMethod: 'pickup',
            paymentMethod: 'invoice',
            items: buildOrderItemsFromApplication(items, productsById),
            totalAmount: parseFloat(application.totalAmount) || 0,
            discount,
            clientId: application.clientId || null,
            status: deriveDealStatusFromRentalStatus(application.status),
            rentalApplicationId: application.id,
            rentStartTime: application.rentStartTime || null,
        }, { transaction });
    });

    const { order: savedOrder } = await saveDealWithRentalApplication(order.id, {}, {}, createdBy);
    return savedOrder;
}

module.exports = {
    buildRentItemsFromOrder,
    deriveRentalStatusFromDealStage,
    deriveDealStatusFromRentalStatus,
    createOrGetRentalApplicationFromOrder,
    saveDealWithRentalApplication,
    convertApplicationToOrder,
};
