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

async function sendProductToRepair({ productId, user }) {
    const product = await Product.findByPk(productId);
    if (!product || !product.isRent) {
        throw new Error('Товар не знайдено або не є орендним');
    }
    await product.update({ stockStatus: 'in_repair' });
    const msg = `${userDisplayName(user)} відправив «${product.name}» у ремонт`;
    await logWarehouseEvent({
        user,
        action: 'send_repair',
        productId,
        productName: product.name,
        message: msg
    });
    return product;
}

const MAIN_WAREHOUSE_NAME = 'Основний склад';

async function ensureMainWarehouse() {
    const [warehouse] = await Warehouse.findOrCreate({
        where: { name: MAIN_WAREHOUSE_NAME },
        defaults: { isActive: true, notes: 'Створено автоматично під час запуску.' }
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

module.exports = {
    MAIN_WAREHOUSE_NAME,
    ensureMainWarehouse,
    recalculateProductQuantity,
    bootstrapRentInventoryFromProducts,
    logWarehouseEvent,
    userDisplayName,
    moveInventoryBetweenWarehouses,
    sendProductToRepair
};
