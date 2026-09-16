const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/**
 * Одна фізична одиниця орендного товару (docs plan «Фізичні одиниці
 * інструменту») — коли на одну картку (isRent, trackingMode:'serial')
 * припадає кілька однакових фізичних інструментів (напр. 3 дрилі, 1 не
 * робоча), кожен веде свій серійник/інв. номер/стан окремо, замість
 * дублювання цілої картки товару на кожен екземпляр.
 *
 * Зв'язок з Product/Warehouse — за значенням (id), без FK на рівні БД,
 * як і всі інші такі зв'язки в цьому коді.
 */
const ProductUnit = sequelize.define('ProductUnit', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    productId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    warehouseId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    serialNumber: {
        type: DataTypes.STRING,
        allowNull: true
    },
    inventoryNumber: {
        type: DataTypes.STRING,
        allowNull: true
    },
    technicalCondition: {
        type: DataTypes.STRING,
        allowNull: true
    },
    adminPhoto: {
        type: DataTypes.STRING,
        allowNull: true
    },
    // Списана/помилково додана одиниця — назавжди виключена з
    // quantityAvailable, але лишається в історії (як Warehouse.isActive).
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
}, { timestamps: true });

module.exports = ProductUnit;
