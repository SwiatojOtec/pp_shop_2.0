'use strict';

/**
 * Статусні позначки клієнта (Постійний / Претензія / Хороший / Чорний
 * список) замінюють вільний текст claims. Перед видаленням стовпця claims
 * переносимо наявний текст у notes (щоб не втратити) і проставляємо
 * hasComplaint = true для рядків, де claims не порожній.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(`
            ALTER TABLE "Clients"
                ADD COLUMN IF NOT EXISTS "isRegularClient" BOOLEAN NOT NULL DEFAULT false,
                ADD COLUMN IF NOT EXISTS "hasComplaint" BOOLEAN NOT NULL DEFAULT false,
                ADD COLUMN IF NOT EXISTS "isGoodClient" BOOLEAN NOT NULL DEFAULT false,
                ADD COLUMN IF NOT EXISTS "isBlacklisted" BOOLEAN NOT NULL DEFAULT false;
        `);

        await queryInterface.sequelize.query(`
            UPDATE "Clients"
            SET
                "hasComplaint" = true,
                notes = trim(both E'\\n' from coalesce(notes, '') || E'\\n' || 'Претензія (перенесено): ' || claims)
            WHERE claims IS NOT NULL AND trim(claims) <> '';
        `);

        await queryInterface.sequelize.query(`
            ALTER TABLE "Clients" DROP COLUMN IF EXISTS claims;
        `);
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(`
            ALTER TABLE "Clients"
                ADD COLUMN IF NOT EXISTS claims TEXT,
                DROP COLUMN IF EXISTS "isRegularClient",
                DROP COLUMN IF EXISTS "hasComplaint",
                DROP COLUMN IF EXISTS "isGoodClient",
                DROP COLUMN IF EXISTS "isBlacklisted";
        `);
    },
};
