const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/** Постачальник товарів (docs — вкладка «Постачальники» в Каталозі): склад,
 *  офіс, знижка при закупівлі. Product.supplierId посилається сюди за
 *  значенням, без FK-обмеження на рівні БД (як і інші звʼязки в цьому коді). */
const Supplier = sequelize.define('Supplier', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    contactPerson: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    warehouseAddress: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    officeAddress: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    discountPercent: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0,
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
}, { timestamps: true });

module.exports = Supplier;
