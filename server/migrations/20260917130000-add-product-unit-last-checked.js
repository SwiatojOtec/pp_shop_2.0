'use strict';

/**
 * Переоблік зі сканером (docs plan «Мобільний додаток — другий зріз»):
 * коли востаннє фізично підтвердили присутність цієї одиниці — без цього
 * поля переоблік нічого не запам'ятовує.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(`
            ALTER TABLE "ProductUnits"
                ADD COLUMN IF NOT EXISTS "lastCheckedAt" TIMESTAMP WITH TIME ZONE;
        `);
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(`
            ALTER TABLE "ProductUnits" DROP COLUMN IF EXISTS "lastCheckedAt";
        `);
    },
};
