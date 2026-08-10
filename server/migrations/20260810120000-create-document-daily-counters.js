'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(`
            CREATE TABLE IF NOT EXISTS "DocumentDailyCounters" (
                scope          VARCHAR(64) NOT NULL,
                day_key        VARCHAR(10) NOT NULL,
                last_sequence  INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (scope, day_key)
            );
        `);
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query('DROP TABLE IF EXISTS "DocumentDailyCounters";');
    },
};
