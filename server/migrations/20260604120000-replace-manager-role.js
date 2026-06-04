'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(`
            UPDATE "Users" SET role = 'shop_manager' WHERE role = 'manager'
        `);
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(`
            UPDATE "Users" SET role = 'manager' WHERE role = 'shop_manager'
        `);
    },
};
