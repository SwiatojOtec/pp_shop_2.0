'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(`
            ALTER TABLE "Orders"
            ADD COLUMN IF NOT EXISTS "rentalApplicationId" INTEGER
            REFERENCES "RentalApplications"(id) ON DELETE SET NULL;
        `);
        await queryInterface.sequelize.query(`
            CREATE INDEX IF NOT EXISTS "Orders_rentalApplicationId_idx"
            ON "Orders" ("rentalApplicationId");
        `);
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query('DROP INDEX IF EXISTS "Orders_rentalApplicationId_idx";');
        await queryInterface.sequelize.query(`
            ALTER TABLE "Orders" DROP COLUMN IF EXISTS "rentalApplicationId";
        `);
    },
};
