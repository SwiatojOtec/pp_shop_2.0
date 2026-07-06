const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const OrderDocument = sequelize.define('OrderDocument', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    orderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'invoice',
    },
    fileName: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    storageKey: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    sellerId: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
}, { timestamps: true });

module.exports = OrderDocument;
