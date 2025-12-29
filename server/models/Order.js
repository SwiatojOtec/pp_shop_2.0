const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Order = sequelize.define('Order', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    customerName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    customerPhone: {
        type: DataTypes.STRING,
        allowNull: false
    },
    customerEmail: {
        type: DataTypes.STRING
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    paymentMethod: {
        type: DataTypes.STRING,
        allowNull: false
    },
    items: {
        type: DataTypes.JSONB, // Store array of items {id, name, price, quantity}
        allowNull: false
    },
    totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'pending' // pending, processing, shipped, delivered, cancelled
    }
}, { timestamps: true });

module.exports = Order;
