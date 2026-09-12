'use strict';

/**
 * docs — «Угода»: видно, хто створив угоду і хто її закрив (перевів у
 * термінальний статус: Повернуто/Виконано/Скасовано). Ім'я знімається в
 * момент дії (createdByName/closedByName), а не рахується через живий
 * join на User — той самий патерн, що й WarehouseEvent.userDisplayName,
 * переживає перейменування чи видалення користувача.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('Orders', 'createdByUserId', { type: Sequelize.INTEGER, allowNull: true });
        await queryInterface.addColumn('Orders', 'createdByName', { type: Sequelize.STRING, allowNull: true });
        await queryInterface.addColumn('Orders', 'closedByUserId', { type: Sequelize.INTEGER, allowNull: true });
        await queryInterface.addColumn('Orders', 'closedByName', { type: Sequelize.STRING, allowNull: true });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('Orders', 'createdByUserId');
        await queryInterface.removeColumn('Orders', 'createdByName');
        await queryInterface.removeColumn('Orders', 'closedByUserId');
        await queryInterface.removeColumn('Orders', 'closedByName');
    },
};
