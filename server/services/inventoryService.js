const { Op } = require('sequelize');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const InventoryItem = require('../models/InventoryItem');
const WarehouseEvent = require('../models/WarehouseEvent');

function userDisplayName(user) {
    if (!user) return 'Система';
    const n = [user.name, user.lastName].filter(Boolean).join(' ').trim();
    return n || user.email || 'Користувач';
}

async function logWarehouseEvent({
    user,
    action,
    productId,
    productName,
    fromWarehouseId,
    toWarehouseId,
    fromWarehouseName,
    toWarehouseName,
    quantity,
    rentalApplicationId,
    rentalApplicationNumber,
    message
}) {
    await WarehouseEvent.create({
        userId: user?.id ?? null,
        userDisplayName: userDisplayName(user),
        action,
        productId,
        productName: productName || null,
        fromWarehouseId: fromWarehouseId ?? null,
        toWarehouseId: toWarehouseId ?? null,
        fromWarehouseName: fromWarehouseName || null,
        toWarehouseName: toWarehouseName || null,
        quantity: quantity ?? null,
        rentalApplicationId: rentalApplicationId ?? null,
        rentalApplicationNumber: rentalApplicationNumber || null,
        message: message || null
    });
}

async function moveInventoryBetweenWarehouses({ productId, fromWarehouseId, toWarehouseId, quantity, user }) {
    const qty = Math.floor(Number(quantity));
    if (!Number.isFinite(qty) || qty <= 0) {
        throw new Error('Кількість має бути більше 0');
    }
    if (Number(fromWarehouseId) === Number(toWarehouseId)) {
        throw new Error('Оберіть інший склад призначення');
    }

    const product = await Product.findByPk(productId);
    if (!product || !product.isRent) {
        throw new Error('Товар не знайдено або не є орендним');
    }

    const fromRow = await InventoryItem.findOne({ where: { productId, warehouseId: fromWarehouseId } });
    if (!fromRow || fromRow.quantity < qty) {
        throw new Error('Недостатньо одиниць на складі-відправнику');
    }

    const [toRow] = await InventoryItem.findOrCreate({
        where: { productId, warehouseId: toWarehouseId },
        defaults: { quantity: 0, reserved: 0, minStock: 0 }
    });

    const fromWh = await Warehouse.findByPk(fromWarehouseId);
    const toWh = await Warehouse.findByPk(toWarehouseId);

    await fromRow.update({ quantity: fromRow.quantity - qty });
    await toRow.update({ quantity: toRow.quantity + qty });
    await recalculateProductQuantity(productId);

    const msg = `${userDisplayName(user)} перемістив «${product.name}» (${qty} шт.) зі складу «${fromWh?.name || '?'}» на склад «${toWh?.name || '?'}»`;
    await logWarehouseEvent({
        user,
        action: 'move_warehouse',
        productId,
        productName: product.name,
        fromWarehouseId,
        toWarehouseId,
        fromWarehouseName: fromWh?.name,
        toWarehouseName: toWh?.name,
        quantity: qty,
        message: msg
    });

    return { ok: true };
}

async function setRentProductStockStatus({ productId, stockStatus, user, action = 'set_status' }) {
    const product = await Product.findByPk(productId);
    if (!product || !product.isRent) {
        throw new Error('Товар не знайдено або не є орендним');
    }

    const allowed = new Set(['in_stock', 'out_of_stock', 'available_later', 'in_procurement', 'needs_repair', 'in_repair']);
    if (!allowed.has(stockStatus)) {
        throw new Error('Некоректний статус');
    }

    await product.update({ stockStatus });
    const statusLabel =
        stockStatus === 'in_stock' ? 'В наявності' :
            stockStatus === 'out_of_stock' ? 'Немає в наявності' :
                stockStatus === 'available_later' ? 'Буде доступно' :
                    stockStatus === 'in_procurement' ? 'У закупівлі (на папері)' :
                        stockStatus === 'needs_repair' ? 'Потребує ремонту' :
                            stockStatus === 'in_repair' ? 'На ремонті' : stockStatus;

    const msg = `${userDisplayName(user)} змінив статус «${product.name}» на «${statusLabel}»`;
    await logWarehouseEvent({
        user,
        action,
        productId,
        productName: product.name,
        message: msg
    });
    return product;
}

async function sendProductToRepair({ productId, user }) {
    return setRentProductStockStatus({ productId, stockStatus: 'in_repair', user, action: 'send_repair' });
}

async function sendProductToNeedsRepair({ productId, user }) {
    return setRentProductStockStatus({ productId, stockStatus: 'needs_repair', user, action: 'needs_repair' });
}

async function restoreProductInStock({ productId, user }) {
    return setRentProductStockStatus({ productId, stockStatus: 'in_stock', user, action: 'restore_in_stock' });
}

const MAIN_WAREHOUSE_NAME = 'Основний склад';
const REPAIR_WAREHOUSE_NAME = 'У ремонті';

async function ensureMainWarehouse() {
    const [warehouse] = await Warehouse.findOrCreate({
        where: { name: MAIN_WAREHOUSE_NAME },
        defaults: { isActive: true, notes: 'Створено автоматично під час запуску.' }
    });
    return warehouse;
}

async function ensureRepairWarehouse() {
    const [warehouse] = await Warehouse.findOrCreate({
        where: { name: REPAIR_WAREHOUSE_NAME },
        defaults: { isActive: true, notes: 'Службовий склад для інструментів у ремонті.' }
    });
    return warehouse;
}

async function recalculateProductQuantity(productId) {
    const total = await InventoryItem.sum('quantity', { where: { productId } });
    await Product.update(
        { quantityAvailable: Number.isFinite(total) ? total : 0 },
        { where: { id: productId } }
    );
}

async function bootstrapRentInventoryFromProducts() {
    const mainWarehouse = await ensureMainWarehouse();
    const rentProducts = await Product.findAll({
        where: { isRent: true },
        attributes: ['id', 'quantityAvailable']
    });

    for (const product of rentProducts) {
        const safeQuantity = Number.isFinite(product.quantityAvailable) ? product.quantityAvailable : 0;
        const [item] = await InventoryItem.findOrCreate({
            where: { warehouseId: mainWarehouse.id, productId: product.id },
            defaults: { quantity: safeQuantity, reserved: 0, minStock: 0 }
        });

        if (item.quantity !== safeQuantity) {
            item.quantity = safeQuantity;
            await item.save();
        }
    }

    const existingProductIds = rentProducts.map((p) => p.id);
    if (existingProductIds.length) {
        await InventoryItem.destroy({
            where: {
                warehouseId: mainWarehouse.id,
                productId: { [Op.notIn]: existingProductIds }
            }
        });
    }
}

async function moveInventoryToRepairWarehouse({ productId, fromWarehouseId, quantity, user }) {
    const repairWh = await ensureRepairWarehouse();
    const fromWh = await Warehouse.findByPk(fromWarehouseId);
    await moveInventoryBetweenWarehouses({
        productId,
        fromWarehouseId,
        toWarehouseId: repairWh.id,
        quantity,
        user
    });
    // moveInventoryBetweenWarehouses already logs a move event; additionally set status.
    await setRentProductStockStatus({ productId, stockStatus: 'in_repair', user, action: 'send_repair' });
    // Provide more explicit repair message as well (optional)
    const product = await Product.findByPk(productId);
    const qty = Math.floor(Number(quantity));
    const msg = `${userDisplayName(user)} відправив «${product?.name || 'товар'}» (${qty} шт.) у ремонт зі складу «${fromWh?.name || '?'}»`;
    await logWarehouseEvent({
        user,
        action: 'send_repair_move',
        productId,
        productName: product?.name,
        fromWarehouseId,
        fromWarehouseName: fromWh?.name,
        toWarehouseId: repairWh.id,
        toWarehouseName: repairWh.name,
        quantity: qty,
        message: msg
    });
    return { ok: true, repairWarehouseId: repairWh.id };
}

module.exports = {
    MAIN_WAREHOUSE_NAME,
    REPAIR_WAREHOUSE_NAME,
    ensureMainWarehouse,
    ensureRepairWarehouse,
    recalculateProductQuantity,
    bootstrapRentInventoryFromProducts,
    logWarehouseEvent,
    userDisplayName,
    moveInventoryBetweenWarehouses,
    moveInventoryToRepairWarehouse,
    setRentProductStockStatus,
    sendProductToRepair,
    sendProductToNeedsRepair,
    restoreProductInStock
};
