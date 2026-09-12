'use strict';

/**
 * Нормалізований звʼязок Product → Supplier (за id, без FK-обмеження на рівні
 * БД — як і Product.category/Order.clientId). Наявні supplierUrl/supplierPrice
 * лишаються без змін — вони не використовуються в клієнті.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('Products', 'supplierId', {
            type: Sequelize.INTEGER,
            allowNull: true,
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('Products', 'supplierId');
    },
};
