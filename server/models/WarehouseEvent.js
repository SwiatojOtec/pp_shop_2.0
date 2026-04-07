const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/** Журнал дій по складу (стрічка «Останні події»). */
const WarehouseEvent = sequelize.define('WarehouseEvent', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    userDisplayName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    action: {
        type: DataTypes.STRING,
        allowNull: false
        // move_warehouse | send_repair | view_in_rent
    },
    productId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    productName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    fromWarehouseId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    toWarehouseId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    fromWarehouseName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    toWarehouseName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    rentalApplicationId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    rentalApplicationNumber: {
        type: DataTypes.STRING,
        allowNull: true
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    timestamps: true,
    updatedAt: false,
    indexes: [{ fields: ['createdAt'] }]
});

module.exports = WarehouseEvent;
