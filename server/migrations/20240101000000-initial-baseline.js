'use strict';

/**
 * BASELINE MIGRATION — represents the schema as of the initial refactoring.
 *
 * Since all tables already exist in production, the `up` function uses
 * CREATE TABLE IF NOT EXISTS so it's safe to run against an existing database.
 *
 * If you need to make schema changes in the future, create a new migration
 * file with a later timestamp and add your ALTER TABLE / CREATE TABLE
 * statements there.
 *
 * To mark this baseline as "already applied" without running it against an
 * existing DB, run:
 *   npx sequelize-cli db:migrate:status   ← see which are pending
 *   npx sequelize-cli db:migrate           ← will apply IF NOT EXISTS queries safely
 */

module.exports = {
    async up(queryInterface, Sequelize) {
        const t = await queryInterface.sequelize.transaction();
        try {
            // ── Users ─────────────────────────────────────────────────────
            await queryInterface.sequelize.query(`
                CREATE TABLE IF NOT EXISTS "Users" (
                    id          SERIAL PRIMARY KEY,
                    name        VARCHAR(255),
                    "lastName"  VARCHAR(255),
                    email       VARCHAR(255) UNIQUE NOT NULL,
                    password    VARCHAR(255) NOT NULL,
                    role        VARCHAR(50)  NOT NULL DEFAULT 'rent',
                    status      VARCHAR(50)  NOT NULL DEFAULT 'pending',
                    "createdAt" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                    "updatedAt" TIMESTAMPTZ  NOT NULL DEFAULT NOW()
                )
            `, { transaction: t });

            // ── Categories ────────────────────────────────────────────────
            await queryInterface.sequelize.query(`
                CREATE TABLE IF NOT EXISTS "Categories" (
                    id          SERIAL PRIMARY KEY,
                    name        VARCHAR(255) UNIQUE NOT NULL,
                    slug        VARCHAR(255),
                    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            `, { transaction: t });

            // ── RentCategories ────────────────────────────────────────────
            await queryInterface.sequelize.query(`
                CREATE TABLE IF NOT EXISTS "RentCategories" (
                    id          SERIAL PRIMARY KEY,
                    name        VARCHAR(255) UNIQUE NOT NULL,
                    slug        VARCHAR(255),
                    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            `, { transaction: t });

            // ── Brands ────────────────────────────────────────────────────
            await queryInterface.sequelize.query(`
                CREATE TABLE IF NOT EXISTS "Brands" (
                    id          SERIAL PRIMARY KEY,
                    name        VARCHAR(255) UNIQUE NOT NULL,
                    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            `, { transaction: t });

            // ── Currencies ────────────────────────────────────────────────
            await queryInterface.sequelize.query(`
                CREATE TABLE IF NOT EXISTS "Currencies" (
                    id          SERIAL PRIMARY KEY,
                    code        VARCHAR(10)  NOT NULL,
                    rate        FLOAT        NOT NULL DEFAULT 1,
                    "createdAt" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                    "updatedAt" TIMESTAMPTZ  NOT NULL DEFAULT NOW()
                )
            `, { transaction: t });

            // ── Products ──────────────────────────────────────────────────
            await queryInterface.sequelize.query(`
                CREATE TABLE IF NOT EXISTS "Products" (
                    id                   SERIAL PRIMARY KEY,
                    name                 VARCHAR(255),
                    slug                 VARCHAR(255) UNIQUE,
                    sku                  VARCHAR(255) UNIQUE,
                    "groupId"            VARCHAR(255),
                    price                FLOAT,
                    "oldPrice"           FLOAT,
                    "packSize"           FLOAT DEFAULT 1,
                    unit                 VARCHAR(50)  DEFAULT 'м²',
                    category             VARCHAR(255),
                    brand                VARCHAR(255),
                    image                TEXT,
                    images               JSONB  DEFAULT '[]',
                    desc                 TEXT,
                    "adminNotes"         TEXT,
                    badge                VARCHAR(50),
                    "stockStatus"        VARCHAR(50)  DEFAULT 'in_stock',
                    "isRent"             BOOLEAN      DEFAULT false,
                    specs                JSONB  DEFAULT '{}',
                    "priceMatrix"        JSONB  DEFAULT '[]',
                    "availableFrom"      DATE,
                    "kitItems"           JSONB  DEFAULT '[]',
                    "quantityAvailable"  INTEGER,
                    "showInRentCatalog"  BOOLEAN      DEFAULT true,
                    "relatedProducts"    JSONB  DEFAULT '[]',
                    "serialNumber"       VARCHAR(255),
                    "inventoryNumber"    VARCHAR(255),
                    "technicalCondition" VARCHAR(255),
                    "weightPerUnit"      FLOAT,
                    "weightTotal"        FLOAT,
                    "replacementCost"    FLOAT,
                    "securityDeposit"    FLOAT,
                    "competitorLinks"    JSONB  DEFAULT '[]',
                    "adminImages"        JSONB  DEFAULT '[]',
                    "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    "updatedAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            `, { transaction: t });

            // ── Orders ────────────────────────────────────────────────────
            await queryInterface.sequelize.query(`
                CREATE TABLE IF NOT EXISTS "Orders" (
                    id               SERIAL PRIMARY KEY,
                    "customerName"   VARCHAR(255),
                    "customerPhone"  VARCHAR(255),
                    "customerEmail"  VARCHAR(255),
                    items            JSONB DEFAULT '[]',
                    "totalAmount"    FLOAT DEFAULT 0,
                    status           VARCHAR(50) DEFAULT 'pending',
                    notes            TEXT,
                    "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            `, { transaction: t });

            // ── BlogPosts ─────────────────────────────────────────────────
            await queryInterface.sequelize.query(`
                CREATE TABLE IF NOT EXISTS "BlogPosts" (
                    id          SERIAL PRIMARY KEY,
                    title       VARCHAR(255),
                    slug        VARCHAR(255) UNIQUE,
                    content     TEXT,
                    image       TEXT,
                    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            `, { transaction: t });

            // ── Clients ───────────────────────────────────────────────────
            await queryInterface.sequelize.query(`
                CREATE TABLE IF NOT EXISTS "Clients" (
                    id          SERIAL PRIMARY KEY,
                    name        VARCHAR(255),
                    phone       VARCHAR(255),
                    email       VARCHAR(255),
                    address     TEXT,
                    notes       TEXT,
                    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            `, { transaction: t });

            // ── RentalApplications ────────────────────────────────────────
            await queryInterface.sequelize.query(`
                CREATE TABLE IF NOT EXISTS "RentalApplications" (
                    id              SERIAL PRIMARY KEY,
                    "clientId"      INTEGER,
                    items           JSONB   DEFAULT '[]',
                    "startDate"     DATE,
                    "endDate"       DATE,
                    status          VARCHAR(50) DEFAULT 'draft',
                    "totalAmount"   FLOAT,
                    notes           TEXT,
                    "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            `, { transaction: t });

            // ── Warehouses ────────────────────────────────────────────────
            await queryInterface.sequelize.query(`
                CREATE TABLE IF NOT EXISTS "Warehouses" (
                    id          SERIAL PRIMARY KEY,
                    name        VARCHAR(255) UNIQUE NOT NULL,
                    type        VARCHAR(50)  DEFAULT 'main',
                    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            `, { transaction: t });

            // ── InventoryItems ────────────────────────────────────────────
            await queryInterface.sequelize.query(`
                CREATE TABLE IF NOT EXISTS "InventoryItems" (
                    id            SERIAL PRIMARY KEY,
                    "warehouseId" INTEGER,
                    "productId"   INTEGER,
                    quantity      INTEGER DEFAULT 0,
                    "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            `, { transaction: t });

            // ── WarehouseEvents ───────────────────────────────────────────
            await queryInterface.sequelize.query(`
                CREATE TABLE IF NOT EXISTS "WarehouseEvents" (
                    id            SERIAL PRIMARY KEY,
                    "warehouseId" INTEGER,
                    "productId"   INTEGER,
                    type          VARCHAR(50),
                    quantity      INTEGER,
                    notes         TEXT,
                    "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            `, { transaction: t });

            // ── Subdivisions ──────────────────────────────────────────────
            await queryInterface.sequelize.query(`
                CREATE TABLE IF NOT EXISTS "Subdivisions" (
                    id          SERIAL PRIMARY KEY,
                    name        VARCHAR(255),
                    "headUserId" INTEGER,
                    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            `, { transaction: t });

            // ── SubdivisionMembers ────────────────────────────────────────
            await queryInterface.sequelize.query(`
                CREATE TABLE IF NOT EXISTS "SubdivisionMembers" (
                    id               SERIAL PRIMARY KEY,
                    "subdivisionId"  INTEGER,
                    "userId"         INTEGER,
                    "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            `, { transaction: t });

            // ── TimesheetEntries ──────────────────────────────────────────
            await queryInterface.sequelize.query(`
                CREATE TABLE IF NOT EXISTS "TimesheetEntries" (
                    id              SERIAL PRIMARY KEY,
                    "headUserId"    INTEGER,
                    "employeeSlot"  INTEGER,
                    year            INTEGER,
                    month           INTEGER,
                    day             INTEGER,
                    hours           FLOAT DEFAULT 0,
                    notes           TEXT,
                    "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            `, { transaction: t });

            await t.commit();
        } catch (err) {
            await t.rollback();
            throw err;
        }
    },

    async down(queryInterface) {
        // Drop in reverse dependency order
        const tables = [
            'TimesheetEntries', 'SubdivisionMembers', 'Subdivisions',
            'WarehouseEvents', 'InventoryItems', 'Warehouses',
            'RentalApplications', 'Clients', 'BlogPosts',
            'Orders', 'Products', 'Currencies', 'Brands',
            'RentCategories', 'Categories', 'Users',
        ];
        for (const table of tables) {
            await queryInterface.dropTable(table, { ifExists: true });
        }
    },
};
