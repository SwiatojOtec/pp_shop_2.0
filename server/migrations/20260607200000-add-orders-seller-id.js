'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(`
            ALTER TABLE "Orders"
            ADD COLUMN IF NOT EXISTS "sellerId" VARCHAR(64) NOT NULL DEFAULT 'fop_pankratiev_mo';
        `);
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(`
            ALTER TABLE "Orders" DROP COLUMN IF EXISTS "sellerId";
        `);
    },
};
