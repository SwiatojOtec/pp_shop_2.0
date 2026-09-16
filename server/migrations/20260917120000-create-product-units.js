'use strict';

/**
 * Фізичні одиниці орендного товару (docs plan «Фізичні одиниці
 * інструменту»): коли trackingMode:'serial' і на картці кілька однакових
 * фізичних інструментів (напр. 3 дрилі, 1 не робоча), кожен веде свій
 * серійник/інв. номер/стан окремо — замість дублювання картки товару на
 * кожен екземпляр.
 *
 * Бекфіл: для кожного serial-товару створюється стільки рядків
 * ProductUnits, скільки фізично є одиниць (SUM InventoryItems.quantity —
 * не quantityAvailable, те вже за мінусом зайнятих оренди). Одиниця №1
 * успадковує наявні serialNumber/inventoryNumber/technicalCondition
 * товару (нічого не втрачається); одиниці №2+ — порожні, готові для
 * дозаповнення реальних серійників під час ревізії складу.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
    async up(queryInterface) {
        // IF NOT EXISTS — на випадок, якщо sequelize.sync() (server/index.js,
        // виконується щоразу на старті сервера) уже встиг автостворити
        // порожню таблицю з визначення моделі раніше за цю міграцію.
        await queryInterface.sequelize.query(`
            CREATE TABLE IF NOT EXISTS "ProductUnits" (
                id SERIAL PRIMARY KEY,
                "productId" INTEGER NOT NULL,
                "warehouseId" INTEGER,
                "serialNumber" VARCHAR(255),
                "inventoryNumber" VARCHAR(255),
                "technicalCondition" VARCHAR(255),
                "adminPhoto" VARCHAR(255),
                "isActive" BOOLEAN NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            );
        `);

        // WHERE NOT EXISTS — бекфіл ідемпотентний: товар, для якого одиниці
        // вже є (напр. повторний запуск), не отримує дублікатів.
        await queryInterface.sequelize.query(`
            INSERT INTO "ProductUnits" ("productId", "warehouseId", "serialNumber", "inventoryNumber", "technicalCondition", "isActive", "createdAt", "updatedAt")
            SELECT
                p.id,
                wh."warehouseId",
                CASE WHEN gs.n = 1 THEN p."serialNumber" ELSE NULL END,
                CASE WHEN gs.n = 1 THEN p."inventoryNumber" ELSE NULL END,
                CASE WHEN gs.n = 1 THEN p."technicalCondition" ELSE NULL END,
                true,
                NOW(), NOW()
            FROM "Products" p
            JOIN LATERAL (
                SELECT
                    COALESCE(SUM(quantity), 0)::int AS qty,
                    (array_agg("warehouseId"))[1] AS "warehouseId"
                FROM "InventoryItems"
                WHERE "productId" = p.id
            ) wh ON true
            CROSS JOIN LATERAL generate_series(1, wh.qty) AS gs(n)
            WHERE p."isRent" = true AND p."trackingMode" = 'serial' AND wh.qty > 0
              AND NOT EXISTS (SELECT 1 FROM "ProductUnits" pu WHERE pu."productId" = p.id);
        `);
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(`DROP TABLE IF EXISTS "ProductUnits";`);
    },
};
