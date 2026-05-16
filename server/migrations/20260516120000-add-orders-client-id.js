'use strict';

/** Зв'язок замовлення магазину з карткою клієнта (адмінка, історія на картці). */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(`
            ALTER TABLE "Orders" ADD COLUMN IF NOT EXISTS "clientId" INTEGER REFERENCES "Clients"("id") ON DELETE SET NULL;
        `);
        await queryInterface.sequelize.query(`
            CREATE INDEX IF NOT EXISTS "Orders_clientId_idx" ON "Orders" ("clientId");
        `);
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(`
            DROP INDEX IF EXISTS "Orders_clientId_idx";
        `);
        await queryInterface.sequelize.query(`
            ALTER TABLE "Orders" DROP COLUMN IF EXISTS "clientId";
        `);
    },
};
