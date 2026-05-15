#!/usr/bin/env node
/**
 * db:snapshot — зберігає JSON-знімок кількості рядків у server/backups/ (без pg_dump).
 * Корисно порівняти до/після змін.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');

const TABLES = [
    'Products', 'Orders', 'Clients', 'RentalApplications',
    'Categories', 'RentCategories', 'Brands',
    'Warehouses', 'InventoryItems', 'WarehouseEvents', 'Users', 'BlogPosts',
];

function createSequelize() {
    if (process.env.DATABASE_URL) {
        return new Sequelize(process.env.DATABASE_URL, {
            dialect: 'postgres',
            logging: false,
            dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
        });
    }
    return new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'postgres',
        logging: false,
    });
}

async function run() {
    const sequelize = createSequelize();
    await sequelize.authenticate();

    const counts = { at: new Date().toISOString() };
    for (const table of TABLES) {
        const [rows] = await sequelize.query(
            `SELECT COUNT(*)::int AS c FROM "${table}"`
        ).catch(() => [[{ c: null }]]);
        counts[table] = rows[0]?.c ?? null;
    }
    await sequelize.close();

    const dir = path.resolve(__dirname, '..', 'backups');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `counts-${counts.at.replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(file, JSON.stringify(counts, null, 2));
    console.log(`Snapshot saved: ${file}`);
    console.log(JSON.stringify(counts, null, 2));
}

run().catch((e) => {
    console.error(e.message);
    process.exit(1);
});
