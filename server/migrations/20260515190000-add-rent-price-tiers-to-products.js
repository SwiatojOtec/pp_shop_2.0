'use strict';

/** Диференційовані тарифи оренди (₴/доба) за тривалістю — JSONB на Products. */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(`
            ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "rentPriceTiers" JSONB;
        `);
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('Products', 'rentPriceTiers');
    },
};
