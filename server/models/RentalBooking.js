const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const RentalBooking = sequelize.define('RentalBooking', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    rentFrom: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    rentTo: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    note: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    clientName: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    clientPhone: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'hold', // hold | converted | cancelled
    },
    rentalApplicationId: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
}, {
    tableName: 'RentalBookings',
    timestamps: true,
});

module.exports = RentalBooking;
