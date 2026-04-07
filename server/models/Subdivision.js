const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/** Підрозділ компанії (напр. бригада Пан Південьбуд): один голова + до 2 співробітників у табелі. */
const Subdivision = sequelize.define('Subdivision', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, { timestamps: true });

module.exports = Subdivision;
