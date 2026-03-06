const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const RentCategory = sequelize.define('RentCategory', {
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
    group: {
        type: DataTypes.STRING, // Для адмін-групування (папки)
        allowNull: true
    }
});

module.exports = RentCategory;

