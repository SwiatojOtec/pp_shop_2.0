'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(`
            ALTER TABLE "Products"
            ADD COLUMN IF NOT EXISTS instruction TEXT;
        `);
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(`
            ALTER TABLE "Products"
            DROP COLUMN IF EXISTS instruction;
        `);
    },
};
