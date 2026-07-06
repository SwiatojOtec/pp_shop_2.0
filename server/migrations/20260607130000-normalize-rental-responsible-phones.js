'use strict';

const { normalizeUaPhone } = require('../utils/phoneUtils');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        const { sequelize } = queryInterface;
        const [apps] = await sequelize.query(
            'SELECT id, responsible FROM "RentalApplications" WHERE responsible IS NOT NULL'
        );

        for (const row of apps) {
            let list = row.responsible;
            if (typeof list === 'string') {
                try {
                    list = JSON.parse(list);
                } catch {
                    continue;
                }
            }
            if (!Array.isArray(list) || !list.length) continue;

            const next = list.map((person) => ({
                ...person,
                phone: person?.phone != null ? normalizeUaPhone(person.phone) : person?.phone,
            }));

            const changed = JSON.stringify(next) !== JSON.stringify(list);
            if (!changed) continue;

            await sequelize.query(
                'UPDATE "RentalApplications" SET responsible = :responsible::jsonb, "updatedAt" = NOW() WHERE id = :id',
                { replacements: { responsible: JSON.stringify(next), id: row.id } }
            );
        }
    },

    async down() {
        // irreversible
    },
};
