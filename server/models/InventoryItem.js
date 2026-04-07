const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Warehouse = require('./Warehouse');
const Product = require('./Product');

const InventoryItem = sequelize.define('InventoryItem', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    warehouseId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    productId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    reserved: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    minStock: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }
}, {
    timestamps: true,
    indexes: [{ unique: true, fields: ['warehouseId', 'productId'] }]
});

InventoryItem.belongsTo(Warehouse, { foreignKey: 'warehouseId' });
Warehouse.hasMany(InventoryItem, { foreignKey: 'warehouseId' });
InventoryItem.belongsTo(Product, { foreignKey: 'productId' });
Product.hasMany(InventoryItem, { foreignKey: 'productId' });

module.exports = InventoryItem;
