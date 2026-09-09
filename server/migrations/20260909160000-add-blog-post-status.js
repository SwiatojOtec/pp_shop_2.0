'use strict';

/**
 * docs/admin-redesign/03-screens.md, «Блог» + «Модель даних» п.3: стаття
 * зараз потрапляє на сайт одразу після збереження — додаємо status
 * (draft/published), за замовчуванням published для наявних записів,
 * щоб нічого не зникло з сайту при накочуванні.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE "enum_BlogPosts_status" AS ENUM ('draft', 'published');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);
        await queryInterface.sequelize.query(`
            ALTER TABLE "BlogPosts"
            ADD COLUMN IF NOT EXISTS "status" "enum_BlogPosts_status" NOT NULL DEFAULT 'published';
        `);
    },

    async down(queryInterface) {
        await queryInterface.sequelize.query(`
            ALTER TABLE "BlogPosts" DROP COLUMN IF EXISTS "status";
        `);
        await queryInterface.sequelize.query(`
            DROP TYPE IF EXISTS "enum_BlogPosts_status";
        `);
    },
};
