'use strict';

/** Співробітники підрозділу для табеля без облікового запису (лише підпис у колонці). */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(`
            ALTER TABLE "SubdivisionMembers"
            ADD COLUMN IF NOT EXISTS "displayName" VARCHAR(120);
        `);
        await queryInterface.sequelize.query(`
            ALTER TABLE "SubdivisionMembers"
            ALTER COLUMN "userId" DROP NOT NULL;
        `);
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(`
            DELETE FROM "SubdivisionMembers" WHERE "userId" IS NULL;
        `);
        await queryInterface.sequelize.query(`
            ALTER TABLE "SubdivisionMembers"
            DROP COLUMN IF EXISTS "displayName";
        `);
        await queryInterface.sequelize.query(`
            ALTER TABLE "SubdivisionMembers"
            ALTER COLUMN "userId" SET NOT NULL;
        `);
    },
};
