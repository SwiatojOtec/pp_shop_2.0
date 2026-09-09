const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/** Юрособа-орендодавець/продавець (docs/admin-redesign/03-screens.md, «Компанія»
 *  — «Юрособи»). Заміняє src/constants/sellers.js та server/constants/sellers.js. */
const Seller = sequelize.define('Seller', {
    id: {
        // Слаг, напр. fop_pankratiev_mo — той самий id, що й у старій константі,
        // щоб посилання sellerId на угодах лишились чинними.
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
    },
    label: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    type: {
        type: DataTypes.ENUM('fop', 'tov'),
        allowNull: false,
        defaultValue: 'fop',
    },
    isDefault: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    appliesVat: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    // Особа-підписант / орендодавець (rentalLessor.name на друкованих формах)
    personName: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    fullName: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    taxIdLabel: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'ІПН',
    },
    taxId: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    legalAddress: {
        type: DataTypes.TEXT,
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
    bankName: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    bankMfo: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    iban: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    signedBy: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    rentalContractCity: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    rentalContractEdrDate: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    rentalContractEdrNumber: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, { timestamps: true });

module.exports = Seller;
