'use strict';

/**
 * Телефон клієнта розбито на три поля: phone (основний, вже існує),
 * phoneSecondary (додатковий), phoneEmergency (екстрений).
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(`
            ALTER TABLE "Clients"
                ADD COLUMN IF NOT EXISTS "phoneSecondary" VARCHAR(50),
                ADD COLUMN IF NOT EXISTS "phoneEmergency" VARCHAR(50);
        `);
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(`
            ALTER TABLE "Clients"
                DROP COLUMN IF EXISTS "phoneSecondary",
                DROP COLUMN IF EXISTS "phoneEmergency";
        `);
    },
};
