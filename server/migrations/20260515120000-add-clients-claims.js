'use strict';

/** Додає поле претензій до клієнтів (оренда). */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(`
            ALTER TABLE "Clients" ADD COLUMN IF NOT EXISTS "claims" TEXT;
        `);
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(`
            ALTER TABLE "Clients" DROP COLUMN IF EXISTS "claims";
        `);
    },
};
