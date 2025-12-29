const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Currency = sequelize.define('Currency', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true // EUR, USD, etc.
    },
    rate: {
        type: DataTypes.DECIMAL(10, 4),
        allowNull: false,
        defaultValue: 1.0
    }
});

module.exports = Currency;
