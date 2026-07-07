'use strict';

module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(`
            ALTER TABLE "Clients"
                ADD COLUMN IF NOT EXISTS ipn VARCHAR(20),
                ADD COLUMN IF NOT EXISTS "passportIssuedAt" VARCHAR(20);
        `);
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(`
            ALTER TABLE "Clients"
                DROP COLUMN IF EXISTS ipn,
                DROP COLUMN IF EXISTS "passportIssuedAt";
        `);
    },
};
