const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/** Табель по днях для 3 співробітників (слоти 1–3). Розділення по голові підрозділу — headUserId. */
const TimesheetEntry = sequelize.define('TimesheetEntry', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    year: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    month: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    day: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    employeeSlot: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    /** Час приходу / виходу (як у паперовому табелі), 0–23 та 0–59 */
    arrivalHour: {
        type: DataTypes.SMALLINT,
        allowNull: true
    },
    arrivalMinute: {
        type: DataTypes.SMALLINT,
        allowNull: true
    },
    departureHour: {
        type: DataTypes.SMALLINT,
        allowNull: true
    },
    departureMinute: {
        type: DataTypes.SMALLINT,
        allowNull: true
    },
    updatedByUserId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    /** Голова підрозділу, якому належить цей рядок табелю (хто зберігає у вебі) */
    headUserId: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    timestamps: true,
    indexes: [{ fields: ['year', 'month', 'headUserId'] }]
});

module.exports = TimesheetEntry;
