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
    instruction: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    adminNotes: {
        type: DataTypes.TEXT,
        allowNull: true // Внутрішні нотатки для адмінів (не для клієнтської частини)
    },
    specs: {
        type: DataTypes.JSONB, // Flexible characteristics
        defaultValue: {}
    },
    /** Порядок показу ключів `specs` (drag-and-drop в адмінці). Окреме поле,
     * а не масив пар — `specs` лишається об'єктом, бо за ним фільтрує
     * клієнтський каталог через JSONB-запит (server/routes/productRoutes.js,
     * `where.specs = { [key]: value }`), а це працює тільки з ключами
     * об'єкта, не з масивом. Ключ, якого нема в specsOrder (ще не
     * впорядкований, або доданий пізніше), показується після впорядкованих —
     * дивись getOrderedSpecEntries на клієнті. */
    specsOrder: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: []
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
    /** 2-осьова матриця цін (хімія: фасовка × ступінь глянцю тощо) —
     *  { axisXLabel, axisYLabel, xValues, yValues, cells: [{x,y,price}] }.
     *  Окрема колонка від priceMatrix, бо форма несумісна (масив vs об'єкт). */
    priceGrid: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: null
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
    supplierId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    stockStatus: {
        type: DataTypes.STRING,
        defaultValue: 'in_stock' // in_stock, on_order, out_of_stock
    },
    availableFrom: {
        type: DataTypes.DATEONLY, // Для оренди: дата, коли знову буде доступно
        allowNull: true
    },
    isRent: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    /** 'serial' — кожна фізична одиниця обліковується окремо (звичайний інструмент).
     *  'quantity' — тільки загальна кількість (ліси, опалубка): у календарі один рядок
     *  зі шкалою завантаження замість рядка на кожну одиницю. */
    trackingMode: {
        type: DataTypes.ENUM('serial', 'quantity'),
        allowNull: false,
        defaultValue: 'serial'
    },
    /** Тарифи ₴/доба за діапазонами днів (оренда); null = одна ціна з поля price */
    rentPriceTiers: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: null
    },
    showInRentCatalog: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    kitItems: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: [] // Для оренди: перелік елементів комплекту
    },
    relatedProducts: {
        type: DataTypes.ARRAY(DataTypes.INTEGER),
        defaultValue: [] // IDs of related products shown on detail page
    },
    quantityAvailable: {
        type: DataTypes.INTEGER,
        allowNull: true // Для оренди: скільки одиниць доступно
    },
    serialNumber: {
        type: DataTypes.STRING,
        allowNull: true
    },
    inventoryNumber: {
        type: DataTypes.STRING,
        allowNull: true
    },
    technicalCondition: {
        type: DataTypes.STRING,
        allowNull: true
    },
    weightPerUnit: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    weightTotal: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    replacementCost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    securityDeposit: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    competitorLinks: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: [] // Для оренди: посилання на товари конкурентів для моніторингу цін
    },
    adminImages: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: [] // Внутрішні фото для адмінки (не для клієнтської частини)
    }
});

module.exports = Product;
