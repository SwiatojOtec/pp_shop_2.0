'use strict';

/**
 * Telegram-бот для клієнтів (docs plan «Telegram-бот для клієнтів»):
 * клієнт підключає свій номер через бота (кнопка "Поділитися номером"),
 * telegramChatId дозволяє надсилати йому статус замовлення без SMS/Viber.
 * telegramUsername — лише для показу в адмінці, хто саме підключився.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('Clients', 'telegramChatId', {
            type: Sequelize.STRING,
            allowNull: true,
        });
        await queryInterface.addColumn('Clients', 'telegramUsername', {
            type: Sequelize.STRING,
            allowNull: true,
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('Clients', 'telegramUsername');
        await queryInterface.removeColumn('Clients', 'telegramChatId');
    },
};
