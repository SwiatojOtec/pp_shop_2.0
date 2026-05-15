const { Op } = require('sequelize');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const InventoryItem = require('../models/InventoryItem');
const WarehouseEvent = require('../models/WarehouseEvent');
const RentalApplication = require('../models/RentalApplication');

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

/** Скільки одиниць товару зараз зайнято активними заявками оренди (для публічного «в наявності»). */
async function sumActiveRentalQuantityForProduct(productId) {
    const pid = Number(productId);
    if (!Number.isFinite(pid)) return 0;
    const apps = await RentalApplication.findAll({
        where: { status: { [Op.in]: ['active', 'booked', 'overdue'] } },
        attributes: ['items'],
    });
    let sum = 0;
    for (const app of apps) {
        for (const line of app.items || []) {
            if (Number(line.productId) !== pid) continue;
            const q = Math.floor(Number(line.quantity));
            sum += Number.isFinite(q) && q > 0 ? q : 1;
        }
    }
    return sum;
}

async function recalculateProductQuantity(productId) {
    const product = await Product.findByPk(productId, { attributes: ['id', 'isRent'] });
    if (!product) return;

    const physicalRaw = await InventoryItem.sum('quantity', { where: { productId } });
    const physical = Number.isFinite(Number(physicalRaw))
        ? Math.max(0, Math.floor(Number(physicalRaw)))
        : 0;

    if (product.isRent) {
        const committed = await sumActiveRentalQuantityForProduct(productId);
        const free = Math.max(0, physical - committed);
        await Product.update({ quantityAvailable: free }, { where: { id: productId } });
    } else {
        await Product.update({ quantityAvailable: physical }, { where: { id: productId } });
    }
}

/** Після змін у заявках або на старті — узгодити quantityAvailable у всіх орендних товарів. */
async function syncAllRentProductQuantitiesFromApplications() {
    const rentProducts = await Product.findAll({
        where: { isRent: true },
        attributes: ['id'],
    });
    for (const p of rentProducts) {
        await recalculateProductQuantity(p.id);
    }
}

async function bootstrapRentInventoryFromProducts() {
    const mainWarehouse = await ensureMainWarehouse();
    const baseWarehouse = await Warehouse.findOne({ where: { name: 'База' } });
    const fallbackWarehouse = baseWarehouse || mainWarehouse;
    const rentProducts = await Product.findAll({
        where: { isRent: true },
        attributes: ['id', 'quantityAvailable']
    });

    for (const product of rentProducts) {
        const existingRows = await InventoryItem.count({ where: { productId: product.id } });
        if (existingRows === 0) {
            const safeQuantity = Math.max(0, Math.floor(Number(product.quantityAvailable || 0)));
            if (safeQuantity > 0) {
                await InventoryItem.create({
                    warehouseId: fallbackWarehouse.id,
                    productId: product.id,
                    quantity: safeQuantity,
                    reserved: 0,
                    minStock: 0
                });
            }
        }
        // Always sync aggregate quantity from real складські позиції.
        await recalculateProductQuantity(product.id);
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

async function restoreAllRentInventoryOneEach({ user }) {
    const mainWarehouse = await ensureMainWarehouse();
    const rentProducts = await Product.findAll({
        where: { isRent: true },
        attributes: ['id', 'name']
    });

    let touched = 0;
    for (const p of rentProducts) {
        await InventoryItem.destroy({
            where: {
                productId: p.id,
                warehouseId: { [Op.ne]: mainWarehouse.id }
            }
        });
        const [row] = await InventoryItem.findOrCreate({
            where: { warehouseId: mainWarehouse.id, productId: p.id },
            defaults: { quantity: 1, reserved: 0, minStock: 0 }
        });
        await row.update({ quantity: 1, reserved: 0 });
        await Product.update({ stockStatus: 'in_stock' }, { where: { id: p.id } });
        await recalculateProductQuantity(p.id);
        touched += 1;
    }

    await logWarehouseEvent({
        user,
        action: 'restore_all_inventory_one_each',
        productId: 0,
        productName: 'bulk restore',
        toWarehouseId: mainWarehouse.id,
        toWarehouseName: mainWarehouse.name,
        message: `${userDisplayName(user)} виконав масове відновлення: усі орендні товари повернено на «${mainWarehouse.name}» по 1 шт.`
    });

    return { ok: true, touched, warehouseId: mainWarehouse.id, warehouseName: mainWarehouse.name };
}

module.exports = {
    MAIN_WAREHOUSE_NAME,
    REPAIR_WAREHOUSE_NAME,
    ensureMainWarehouse,
    ensureRepairWarehouse,
    recalculateProductQuantity,
    syncAllRentProductQuantitiesFromApplications,
    bootstrapRentInventoryFromProducts,
    logWarehouseEvent,
    userDisplayName,
    moveInventoryBetweenWarehouses,
    moveInventoryToRepairWarehouse,
    restoreAllRentInventoryOneEach,
    setRentProductStockStatus,
    sendProductToRepair,
    sendProductToNeedsRepair,
    restoreProductInStock
};
