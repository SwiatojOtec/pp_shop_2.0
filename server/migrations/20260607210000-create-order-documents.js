'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(`
            CREATE TABLE IF NOT EXISTS "OrderDocuments" (
                id           SERIAL PRIMARY KEY,
                "orderId"    INTEGER NOT NULL REFERENCES "Orders"(id) ON DELETE CASCADE,
                type         VARCHAR(50) NOT NULL DEFAULT 'invoice',
                "fileName"   VARCHAR(255) NOT NULL,
                "storageKey" VARCHAR(512) NOT NULL,
                "sellerId"   VARCHAR(64),
                title        VARCHAR(255),
                "createdBy"  INTEGER,
                "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);
        await queryInterface.sequelize.query(`
            CREATE INDEX IF NOT EXISTS "OrderDocuments_orderId_idx" ON "OrderDocuments" ("orderId");
        `);
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query('DROP INDEX IF EXISTS "OrderDocuments_orderId_idx";');
        await queryInterface.sequelize.query('DROP TABLE IF EXISTS "OrderDocuments";');
    },
};
