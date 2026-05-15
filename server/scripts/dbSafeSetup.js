#!/usr/bin/env node
/**
 * db:safe-setup — безпечна підготовка існуючої БД до Sequelize migrations.
 *
 * 1. Знімок таблиць (verify)
 * 2. Нагадування / спроба pg_dump backup
 * 3. Позначити baseline як застосований (без CREATE TABLE на існуючих даних)
 * 4. Показати статус міграцій
 *
 * НЕ запускає migrate:undo. НЕ видаляє дані.
 *
 * Запуск: npm run db:safe-setup  (з папки server/)
 */

require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');
const { Sequelize } = require('sequelize');

const BASELINE = '20240101000000-initial-baseline.js';

function createSequelize() {
    if (process.env.DATABASE_URL) {
        return new Sequelize(process.env.DATABASE_URL, {
            dialect: 'postgres',
            logging: false,
            dialectOptions: {
                ssl: { require: true, rejectUnauthorized: false },
            },
        });
    }
    return new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'postgres',
        logging: false,
    });
}

async function countProducts(sequelize) {
    const [rows] = await sequelize.query(
        `SELECT COUNT(*)::int AS c FROM "Products"`
    ).catch(() => [[{ c: 0 }]]);
    return rows[0]?.c ?? 0;
}

async function markBaseline(sequelize) {
    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS "SequelizeMeta" (
            name VARCHAR(255) PRIMARY KEY NOT NULL
        )
    `);
    const [rows] = await sequelize.query(
        `SELECT name FROM "SequelizeMeta" WHERE name = :name`,
        { replacements: { name: BASELINE } }
    );
    if (rows.length === 0) {
        await sequelize.query(
            `INSERT INTO "SequelizeMeta" (name) VALUES (:name)`,
            { replacements: { name: BASELINE } }
        );
        console.log(`✓ Baseline marked: ${BASELINE}`);
    } else {
        console.log(`✓ Baseline already marked: ${BASELINE}`);
    }
}

async function run() {
    console.log('=== DB safe setup (existing database) ===\n');

    const sequelize = createSequelize();
    await sequelize.authenticate();
    const beforeCount = await countProducts(sequelize);
    console.log(`Products before: ${beforeCount}\n`);

    if (beforeCount === 0) {
        console.warn('WARNING: No products found. Confirm DATABASE_URL points to the correct database.');
        console.warn('Aborting safe-setup to avoid marking wrong DB.\n');
        await sequelize.close();
        process.exit(1);
    }

    await sequelize.close();

    console.log('Step 1/3: Table snapshot (db:verify)...\n');
    execSync('node scripts/dbVerify.js', { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });

    console.log('\nStep 2/3: Backup (db:backup)...\n');
    try {
        execSync('node scripts/backup.js', { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
    } catch {
        console.warn('\n⚠ Automatic backup failed (pg_dump not installed or not in PATH).');
        console.warn('  Before migrate, create a backup manually:');
        console.warn('  • Railway dashboard → your Postgres → Backups → Create backup');
        console.warn('  • Or install PostgreSQL client and run: npm run db:backup\n');
        const readline = require('readline');
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        await new Promise((resolve) => {
            rl.question('Continue without local .sql backup? (yes/no): ', (answer) => {
                rl.close();
                if (!/^y(es)?$/i.test(String(answer).trim())) {
                    console.log('Stopped. Create a backup first, then run npm run db:safe-setup again.');
                    process.exit(1);
                }
                resolve();
            });
        });
    }

    console.log('\nStep 3/3: Mark baseline migration (no schema changes)...\n');
    const seq2 = createSequelize();
    await seq2.authenticate();
    await markBaseline(seq2);
    const afterCount = await countProducts(seq2);
    await seq2.close();

    console.log(`\nProducts after:  ${afterCount}`);
    if (afterCount !== beforeCount) {
        console.error('ERROR: Product count changed! Investigate before continuing.');
        process.exit(1);
    }
    console.log('✓ Product count unchanged.\n');

    console.log('Migration status:\n');
    try {
        execSync('npx sequelize-cli db:migrate:status', {
            stdio: 'inherit',
            cwd: path.resolve(__dirname, '..'),
        });
    } catch {
        console.log('(sequelize-cli status unavailable — baseline is still marked in SequelizeMeta)');
    }

    console.log('\n=== Done ===');
    console.log('Safe rules for this project:');
    console.log('  • NEVER run: npm run migrate:undo  (drops tables in baseline down())');
    console.log('  • NEVER run: npm run seed on production (force: true wipes Products)');
    console.log('  • New schema changes: add a NEW migration file, then npm run migrate');
    console.log('  • Before risky changes: npm run db:backup && npm run db:verify\n');
}

run().catch((err) => {
    console.error('db:safe-setup failed:', err.message);
    process.exit(1);
});
