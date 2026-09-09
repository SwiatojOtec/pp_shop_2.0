'use strict';

/**
 * docs/admin-redesign/03-screens.md, «Модель даних» — Product.trackingMode.
 * No products currently need `quantity` (no ліси/опалубка line items exist
 * in the catalog yet) — this only adds the mechanism for when they do.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE "enum_Products_trackingMode" AS ENUM ('serial', 'quantity');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);
        await queryInterface.sequelize.query(`
            ALTER TABLE "Products"
            ADD COLUMN IF NOT EXISTS "trackingMode" "enum_Products_trackingMode" NOT NULL DEFAULT 'serial';
        `);
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(`
            ALTER TABLE "Products" DROP COLUMN IF EXISTS "trackingMode";
        `);
        await queryInterface.sequelize.query(`
            DROP TYPE IF EXISTS "enum_Products_trackingMode";
        `);
    },
};
