'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(`
            CREATE TABLE IF NOT EXISTS "RentalBookings" (
                id                       SERIAL PRIMARY KEY,
                "productId"              INTEGER NOT NULL REFERENCES "Products"(id) ON DELETE CASCADE,
                "rentFrom"               DATE NOT NULL,
                "rentTo"                 DATE NOT NULL,
                note                     TEXT,
                "clientName"             VARCHAR(255),
                "clientPhone"            VARCHAR(64),
                status                   VARCHAR(32) NOT NULL DEFAULT 'hold',
                "rentalApplicationId"    INTEGER REFERENCES "RentalApplications"(id) ON DELETE SET NULL,
                "createdBy"              INTEGER,
                "createdAt"              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                "updatedAt"              TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);
        await queryInterface.sequelize.query(`
            CREATE INDEX IF NOT EXISTS "RentalBookings_productId_idx"
            ON "RentalBookings" ("productId");
        `);
        await queryInterface.sequelize.query(`
            CREATE INDEX IF NOT EXISTS "RentalBookings_status_idx"
            ON "RentalBookings" (status);
        `);
        await queryInterface.sequelize.query(`
            CREATE INDEX IF NOT EXISTS "RentalBookings_rent_range_idx"
            ON "RentalBookings" ("rentFrom", "rentTo");
        `);
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query('DROP INDEX IF EXISTS "RentalBookings_rent_range_idx";');
        await queryInterface.sequelize.query('DROP INDEX IF EXISTS "RentalBookings_status_idx";');
        await queryInterface.sequelize.query('DROP INDEX IF EXISTS "RentalBookings_productId_idx";');
        await queryInterface.sequelize.query('DROP TABLE IF EXISTS "RentalBookings";');
    },
};
