const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Client = sequelize.define('Client', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    fullName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    // 'individual' (фіз особа, типово) | 'fop' | 'tov'.
    clientType: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'individual'
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: false
    },
    phoneSecondary: {
        type: DataTypes.STRING,
        allowNull: true
    },
    phoneEmergency: {
        type: DataTypes.STRING,
        allowNull: true
    },
    // Telegram-бот трекінгу замовлень: chatId проставляється, коли клієнт
    // сам поділився номером у боті. telegramUsername — лише для адмінки.
    telegramChatId: {
        type: DataTypes.STRING,
        allowNull: true
    },
    telegramUsername: {
        type: DataTypes.STRING,
        allowNull: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true
    },
    passport: {
        type: DataTypes.STRING,
        allowNull: true
    },
    passportIssuedAt: {
        type: DataTypes.STRING,
        allowNull: true
    },
    // ІПН (фіз особа/ФОП) або ЄДРПОУ (ТОВ) — те саме поле, підпис у формі
    // залежить від clientType.
    ipn: {
        type: DataTypes.STRING,
        allowNull: true
    },
    // Реквізити рахунку — актуальні лише для ТОВ.
    bankName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    bankAccount: {
        type: DataTypes.STRING,
        allowNull: true
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    siteAddress: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    discountPercent: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    // Статусні позначки клієнта (список «Стан») — замінили вільний текст
    // claims: той самий сенс претензії тепер тут, булевим прапорцем.
    isRegularClient: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    hasComplaint: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    isGoodClient: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    isBlacklisted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }
}, { timestamps: true });

module.exports = Client;
