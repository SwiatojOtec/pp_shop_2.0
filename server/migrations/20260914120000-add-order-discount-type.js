'use strict';

/**
 * Фіксована знижка (₴) поруч із відсотковою — для клієнтів з індивідуальною
 * домовленістю про конкретну суму, а не відсоток. `discount` розширено з
 * DECIMAL(5,2) до (10,2): фіксована сума в ₴ може перевищувати 999.99.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.changeColumn('Orders', 'discount', {
            type: Sequelize.DECIMAL(10, 2),
            defaultValue: 0,
        });
        await queryInterface.addColumn('Orders', 'discountType', {
            type: Sequelize.STRING,
            allowNull: true,
            defaultValue: 'percent',
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('Orders', 'discountType');
        await queryInterface.changeColumn('Orders', 'discount', {
            type: Sequelize.DECIMAL(5, 2),
            defaultValue: 0,
        });
    },
};
