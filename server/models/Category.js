const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Category = sequelize.define('Category', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    slug: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    /** Показувати ProductPriceMatrix у картці товару цієї категорії (раніше — за назвою "Підвіконня"). */
    usesPriceMatrix: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
});

module.exports = Category;
