'use strict';

/**
 * docs/admin-redesign — нова вкладка «Постачальники» в Каталозі: облік
 * складу/офісу/знижки постачальника, готує ґрунт під майбутній звʼязок
 * Product → Supplier.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('Suppliers', {
            id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
            name: { type: Sequelize.STRING, allowNull: false },
            contactPerson: { type: Sequelize.STRING, allowNull: true },
            phone: { type: Sequelize.STRING, allowNull: true },
            email: { type: Sequelize.STRING, allowNull: true },
            warehouseAddress: { type: Sequelize.TEXT, allowNull: true },
            officeAddress: { type: Sequelize.TEXT, allowNull: true },
            discountPercent: { type: Sequelize.DECIMAL(5, 2), allowNull: true, defaultValue: 0 },
            notes: { type: Sequelize.TEXT, allowNull: true },
            isActive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
            createdAt: { type: Sequelize.DATE, allowNull: false },
            updatedAt: { type: Sequelize.DATE, allowNull: false },
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('Suppliers');
    },
};
