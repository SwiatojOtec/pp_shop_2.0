'use strict';

/**
 * docs/admin-redesign/03-screens.md, крок 4.3, «Угода» — one status chain
 * (Новий → Рахунок → Оплачено → Видано → Повернуто → Виконано) replaces the
 * old independent Order.status / RentalApplication.status selects.
 *
 * Only Orders.status changes vocabulary (pending/invoice_sent/paid/processing/
 * completed/cancelled → new/invoice/paid/issued/returned/done/cancelled).
 * RentalApplications.status keeps its existing values (draft/booked/active/
 * overdue/returned/cancelled) — it's now server-derived from the deal's stage
 * instead of user-selected, but the vocabulary itself didn't change so no data
 * migration is needed there.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(`
            UPDATE "Orders" SET status = 'new' WHERE status = 'pending';
        `);
        await queryInterface.sequelize.query(`
            UPDATE "Orders" SET status = 'invoice' WHERE status = 'invoice_sent';
        `);
        await queryInterface.sequelize.query(`
            UPDATE "Orders" SET status = 'issued' WHERE status = 'processing';
        `);
        await queryInterface.sequelize.query(`
            UPDATE "Orders" SET status = 'done' WHERE status = 'completed';
        `);
        await queryInterface.sequelize.query(`
            ALTER TABLE "Orders" ALTER COLUMN status SET DEFAULT 'new';
        `);
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(`
            ALTER TABLE "Orders" ALTER COLUMN status SET DEFAULT 'pending';
        `);
        await queryInterface.sequelize.query(`
            UPDATE "Orders" SET status = 'completed' WHERE status = 'done';
        `);
        await queryInterface.sequelize.query(`
            UPDATE "Orders" SET status = 'processing' WHERE status = 'issued';
        `);
        await queryInterface.sequelize.query(`
            UPDATE "Orders" SET status = 'invoice_sent' WHERE status = 'invoice';
        `);
        await queryInterface.sequelize.query(`
            UPDATE "Orders" SET status = 'pending' WHERE status = 'new';
        `);
    },
};
