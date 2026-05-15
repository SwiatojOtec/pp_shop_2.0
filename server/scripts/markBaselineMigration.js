#!/usr/bin/env node
/**
 * markBaselineMigration — вставляет запись о baseline-миграции в SequelizeMeta,
 * чтобы Sequelize CLI знал, что начальная схема уже применена.
 *
 * Запускается ОДИН РАЗ на СУЩЕСТВУЮЩЕЙ базе данных перед первым использованием миграций.
 *
 * Запуск:  npm run migrate:baseline  (из папки server/)
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

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

const sequelize = createSequelize();

const BASELINE = '20240101000000-initial-baseline.js';

async function run() {
    try {
        await sequelize.authenticate();

        // Create SequelizeMeta table if it doesn't exist
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS "SequelizeMeta" (
                name VARCHAR(255) PRIMARY KEY NOT NULL
            )
        `);

        const [rows] = await sequelize.query(
            `SELECT name FROM "SequelizeMeta" WHERE name = :name`,
            { replacements: { name: BASELINE } }
        );

        if (rows.length > 0) {
            console.log(`Baseline migration is already marked as applied: ${BASELINE}`);
        } else {
            await sequelize.query(
                `INSERT INTO "SequelizeMeta" (name) VALUES (:name)`,
                { replacements: { name: BASELINE } }
            );
            console.log(`Baseline migration marked as applied: ${BASELINE}`);
        }

        console.log('\nYou can now use:');
        console.log('  npm run migrate          — apply pending migrations');
        console.log('  npm run migrate:status   — list migration status');
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

run();
