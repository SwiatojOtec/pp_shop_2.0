'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(`
            ALTER TABLE "Orders"
            ADD COLUMN IF NOT EXISTS "rentStartTime" VARCHAR(8);
        `);
        await queryInterface.sequelize.query(`
            ALTER TABLE "RentalApplications"
            ADD COLUMN IF NOT EXISTS "rentStartTime" VARCHAR(8);
        `);
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(`
            ALTER TABLE "Orders"
            DROP COLUMN IF EXISTS "rentStartTime";
        `);
        await queryInterface.sequelize.query(`
            ALTER TABLE "RentalApplications"
            DROP COLUMN IF EXISTS "rentStartTime";
        `);
    },
};
