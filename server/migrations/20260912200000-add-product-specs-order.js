'use strict';

/**
 * Порядок показу характеристик товару (drag-and-drop в адмінці). `specs`
 * сам лишається JSONB-обʼєктом (client-side каталог фільтрує за ним через
 * where.specs = { [key]: value } у productRoutes.js — це працює тільки з
 * ключами обʼєкта), тому порядок зберігаємо окремо, масивом ключів.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('Products', 'specsOrder', {
            type: Sequelize.ARRAY(Sequelize.STRING),
            allowNull: true,
            defaultValue: [],
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('Products', 'specsOrder');
    },
};
