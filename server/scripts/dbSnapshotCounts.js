#!/usr/bin/env node
/**
 * db:snapshot — зберігає JSON-знімок кількості рядків у server/backups/ (без pg_dump).
 * Корисно порівняти до/після змін.
 */

const sequelize = require('../config/db');
const fs = require('fs');
const path = require('path');

const TABLES = [
    'Products', 'Orders', 'Clients', 'RentalApplications',
    'Categories', 'RentCategories', 'Brands',
    'Warehouses', 'InventoryItems', 'WarehouseEvents', 'Users', 'BlogPosts',
];

async function run() {
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
