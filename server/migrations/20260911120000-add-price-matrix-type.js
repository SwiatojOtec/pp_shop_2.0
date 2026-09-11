'use strict';

/**
 * Матриця цін хімії (фасовка × ступінь глянцю) поряд з уже наявною матрицею
 * підвіконня (ширина). `usesPriceMatrix` — булевий і розрізняє лише
 * "є/немає", тому не годиться для другого типу матриці. Додаємо
 * `priceMatrixType` (null | 'linear' | 'grid') і бекафілимо 'linear' з
 * колишнього `usesPriceMatrix = true` (сьогодні це лише «Підвіконня»).
 * Стару колонку `usesPriceMatrix` навмисно не чіпаємо — вона вже на проді,
 * прибрати її можна окремим кроком пізніше.
 *
 * Products.priceGrid — окрема колонка (не перевикористовуємо priceMatrix,
 * форма якого — масив {width,price} — несумісна з 2-осьовою матрицею).
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(`
            ALTER TABLE "Categories"
            ADD COLUMN IF NOT EXISTS "priceMatrixType" VARCHAR(255) NULL;
        `);
        await queryInterface.sequelize.query(`
            UPDATE "Categories" SET "priceMatrixType" = 'linear' WHERE "usesPriceMatrix" = true;
        `);
        await queryInterface.sequelize.query(`
            ALTER TABLE "Products"
            ADD COLUMN IF NOT EXISTS "priceGrid" JSONB NULL;
        `);
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(`
            ALTER TABLE "Products" DROP COLUMN IF EXISTS "priceGrid";
        `);
        await queryInterface.sequelize.query(`
            ALTER TABLE "Categories" DROP COLUMN IF EXISTS "priceMatrixType";
        `);
    },
};
