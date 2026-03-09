const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const RentalApplication = sequelize.define('RentalApplication', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    applicationNumber: {
        type: DataTypes.STRING,
        unique: true
        // e.g. RA-2024-001
    },
    // Client info
    clientName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    clientPhone: {
        type: DataTypes.STRING,
        allowNull: false
    },
    clientEmail: {
        type: DataTypes.STRING,
        allowNull: true
    },
    clientPassport: {
        type: DataTypes.STRING,
        allowNull: true
    },
    clientAddress: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    clientSiteAddress: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    responsible: {
        type: DataTypes.JSONB,
        defaultValue: []
    },
    // Rental period
    rentFrom: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    rentTo: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    // Items: [{productId, name, inventoryNumber, serialNumber, quantity, pricePerDay, days, total}]
    items: {
        type: DataTypes.JSONB,
        defaultValue: []
    },
    // Financial
    totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    depositAmount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    depositPaid: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    // Status: draft, active, returned, cancelled
    status: {
        type: DataTypes.STRING,
        defaultValue: 'draft'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    // Who created the application
    createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, { timestamps: true });

module.exports = RentalApplication;
