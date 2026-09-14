'use strict';

/**
 * Тип клієнта (фіз особа / ФОП / ТОВ) + реквізити рахунку для ТОВ.
 * ІПН лишається тим самим полем — для ТОВ у ньому зберігається ЄДРПОУ,
 * підпис поля в формі залежить від clientType.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(`
            ALTER TABLE "Clients"
                ADD COLUMN IF NOT EXISTS "clientType" VARCHAR(20) DEFAULT 'individual',
                ADD COLUMN IF NOT EXISTS "bankName" VARCHAR(255),
                ADD COLUMN IF NOT EXISTS "bankAccount" VARCHAR(255);
        `);
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(`
            ALTER TABLE "Clients"
                DROP COLUMN IF EXISTS "clientType",
                DROP COLUMN IF EXISTS "bankName",
                DROP COLUMN IF EXISTS "bankAccount";
        `);
    },
};
