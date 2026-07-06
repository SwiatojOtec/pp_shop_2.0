'use strict';

const { normalizePhonesField, normalizeUaPhone } = require('../utils/phoneUtils');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        const { sequelize } = queryInterface;

        const [clients] = await sequelize.query('SELECT id, phone FROM "Clients" WHERE phone IS NOT NULL');
        for (const row of clients) {
            const next = normalizePhonesField(row.phone);
            if (next && next !== row.phone) {
                await sequelize.query(
                    'UPDATE "Clients" SET phone = :phone, "updatedAt" = NOW() WHERE id = :id',
                    { replacements: { phone: next, id: row.id } }
                );
            }
        }

        const [orders] = await sequelize.query('SELECT id, "customerPhone" FROM "Orders" WHERE "customerPhone" IS NOT NULL');
        for (const row of orders) {
            const next = normalizeUaPhone(row.customerPhone);
            if (next && next !== row.customerPhone) {
                await sequelize.query(
                    'UPDATE "Orders" SET "customerPhone" = :phone, "updatedAt" = NOW() WHERE id = :id',
                    { replacements: { phone: next, id: row.id } }
                );
            }
        }

        const [apps] = await sequelize.query('SELECT id, "clientPhone" FROM "RentalApplications" WHERE "clientPhone" IS NOT NULL');
        for (const row of apps) {
            const next = normalizeUaPhone(row.clientPhone);
            if (next && next !== row.clientPhone) {
                await sequelize.query(
                    'UPDATE "RentalApplications" SET "clientPhone" = :phone, "updatedAt" = NOW() WHERE id = :id',
                    { replacements: { phone: next, id: row.id } }
                );
            }
        }
    },

    async down() {
        // irreversible
    },
};
