'use strict';

/**
 * docs/admin-redesign/03-screens.md, «Каталог» — shop Categories get the
 * same isActive visibility toggle rent categories already have, plus
 * usesPriceMatrix (replaces the `category.name === 'Підвіконня'` hardcode
 * in ProductEdit/ProductPriceMatrix — a flag on the category, not its name).
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(`
            ALTER TABLE "Categories"
            ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
        `);
        await queryInterface.sequelize.query(`
            ALTER TABLE "Categories"
            ADD COLUMN IF NOT EXISTS "usesPriceMatrix" BOOLEAN NOT NULL DEFAULT false;
        `);
        // Carry the current name-based rule forward as data, so existing
        // "Підвіконня" products keep their price-matrix editor.
        await queryInterface.sequelize.query(`
            UPDATE "Categories" SET "usesPriceMatrix" = true WHERE name = 'Підвіконня';
        `);
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(`
            ALTER TABLE "Categories" DROP COLUMN IF EXISTS "usesPriceMatrix";
        `);
        await queryInterface.sequelize.query(`
            ALTER TABLE "Categories" DROP COLUMN IF EXISTS "isActive";
        `);
    },
};
