const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Product = sequelize.define('Product', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    slug: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    oldPrice: {
        type: DataTypes.DECIMAL(10, 2)
    },
    image: {
        type: DataTypes.STRING,
        allowNull: false
    },
    images: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: []
    },
    badge: {
        type: DataTypes.STRING
    },
    colors: {
        type: DataTypes.ARRAY(DataTypes.STRING)
    },
    rating: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    reviews: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    sku: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    category: {
        type: DataTypes.STRING,
        allowNull: false
    },
    brand: {
        type: DataTypes.STRING
    },
    desc: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    specs: {
        type: DataTypes.JSONB, // Flexible characteristics
        defaultValue: {}
    },
    currency: {
        type: DataTypes.STRING,
        defaultValue: 'UAH'
    },
    unit: {
        type: DataTypes.STRING,
        defaultValue: 'м²'
    },
    packSize: {
        type: DataTypes.FLOAT,
        defaultValue: 1.0
    },
    priceMatrix: {
        type: DataTypes.JSONB, // For windowsills width/thickness/price
        defaultValue: []
    },
    groupId: {
        type: DataTypes.STRING // For grouping variants/colors
    },
    supplierUrl: {
        type: DataTypes.STRING
    },
    supplierPrice: {
        type: DataTypes.DECIMAL(10, 2)
    },
    stockStatus: {
        type: DataTypes.STRING,
        defaultValue: 'in_stock' // in_stock, on_order, out_of_stock
    }
});

module.exports = Product;
