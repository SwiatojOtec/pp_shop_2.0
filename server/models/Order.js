const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Order = sequelize.define('Order', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    orderNumber: {
        type: DataTypes.STRING,
        unique: true
    },
    customerName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    customerPhone: {
        type: DataTypes.STRING,
        allowNull: false
    },
    customerEmail: {
        type: DataTypes.STRING
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    deliveryMethod: {
        type: DataTypes.STRING,
        defaultValue: 'pickup' // pickup, delivery
    },
    paymentMethod: {
        type: DataTypes.STRING,
        allowNull: false
    },
    items: {
        type: DataTypes.JSONB, // Store array of items {id, name, price, quantity}
        allowNull: false
    },
    totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    // Значення знижки — відсоток (0-100) або сума в ₴ залежно від discountType.
    // DECIMAL(10,2), не (5,2): фіксована знижка в грошах може перевищувати 999.99.
    discount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    // 'percent' (типово) або 'fixed' — конкретна сума в ₴ замість відсотка,
    // для клієнтів з індивідуальною домовленістю про фіксовану знижку.
    discountType: {
        type: DataTypes.STRING,
        defaultValue: 'percent'
    },
    clientId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    /** Deal stage: new, invoice, paid, issued, returned, done, cancelled
     *  (docs/admin-redesign/03-screens.md, «Угода» — one status chain).
     *  issued/returned only apply to deals with rental items. */
    status: {
        type: DataTypes.STRING,
        defaultValue: 'new'
    },
    sellerId: {
        type: DataTypes.STRING,
        defaultValue: 'fop_pankratiev_mo',
        allowNull: false,
    },
    rentalApplicationId: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    /** HH:MM — час початку/кінця оренди для документів (однаковий для «з» і «по»). */
    rentStartTime: {
        type: DataTypes.STRING(8),
        allowNull: true,
    },
    /** Хто створив угоду — лише для угод, створених в адмінці (публічний
     *  чекаут не має залогованого користувача, лишається null). Ім'я
     *  знято в момент створення, не через живий join на User. */
    createdByUserId: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    createdByName: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    /** Хто перевів угоду в термінальний статус (Повернуто/Виконано/
     *  Скасовано) — проставляється один раз при переході, не на кожне
     *  збереження вже закритої угоди. */
    closedByUserId: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    closedByName: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, { timestamps: true });

module.exports = Order;
