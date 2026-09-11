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
    },
    /** Який редактор ціни показувати у картці товару цієї категорії:
     *  'linear' — калькулятор ширини (підвіконня, Product.priceMatrix),
     *  'grid' — 2-осьова матриця (хімія, Product.priceGrid), null — звичайна ціна. */
    priceMatrixType: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null
    }
});

module.exports = Category;
