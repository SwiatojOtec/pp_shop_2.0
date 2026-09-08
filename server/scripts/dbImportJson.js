#!/usr/bin/env node
/**
 * db:import-json — restores table data exported by db:export-json (dbExportJson.js).
 * Works without pg_restore. Inserts rows as-is via each table's real Sequelize
 * model (so ARRAY vs JSONB columns serialize correctly, unlike a hand-rolled raw
 * INSERT), keeping original ids and timestamps so relations between imported
 * rows stay intact.
 *
 * Refuses to run against anything that doesn't look like a local database —
 * this is a bulk insert into (expected-empty) tables, not something to ever
 * point at a database with real data in it.
 *
 * Запуск:  node scripts/dbImportJson.js <path-to-json-folder> [--allow-remote]
 */

const fs = require('fs');
const path = require('path');
const sequelize = require('../config/db');

// Dependency order: tables others reference go first.
const TABLE_MODELS = [
    ['Users', '../models/User'],
    ['Categories', '../models/Category'],
    ['RentCategories', '../models/RentCategory'],
    ['Brands', '../models/Brand'],
    ['Currencies', '../models/Currency'],
    ['Warehouses', '../models/Warehouse'],
    ['Products', '../models/Product'],
    ['Clients', '../models/Client'],
    ['Orders', '../models/Order'],
    ['RentalApplications', '../models/RentalApplication'],
    ['InventoryItems', '../models/InventoryItem'],
    ['WarehouseEvents', '../models/WarehouseEvent'],
    ['BlogPosts', '../models/BlogPost'],
    ['Subdivisions', '../models/Subdivision'],
    ['SubdivisionMembers', '../models/SubdivisionMember'],
    ['TimesheetEntries', '../models/TimesheetEntry'],
];

function isLocalHost() {
    const host = sequelize.config.host || '';
    return host === 'localhost' || host === '127.0.0.1';
}

async function importTable(dir, table, modelPath) {
    const file = path.join(dir, `${table}.json`);
    if (!fs.existsSync(file)) {
        console.log(`  SKIP  ${table} (no export file)`);
        return;
    }
    const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!rows.length) {
        console.log(`  OK    ${table.padEnd(22)} 0 rows`);
        return;
    }
    const Model = require(modelPath);
    await Model.bulkCreate(rows, { validate: false, ignoreDuplicates: true });
    console.log(`  OK    ${table.padEnd(22)} ${rows.length} rows`);
}

async function importSequelizeMeta(dir) {
    const file = path.join(dir, 'SequelizeMeta.json');
    if (!fs.existsSync(file)) return;
    const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const row of rows) {
        await sequelize.query(
            `INSERT INTO "SequelizeMeta" (name) VALUES (:name) ON CONFLICT DO NOTHING`,
            { replacements: { name: row.name } }
        );
    }
    console.log(`  OK    SequelizeMeta           ${rows.length} rows`);
}

async function run() {
    const dir = process.argv[2];
    const allowRemote = process.argv.includes('--allow-remote');
    if (!dir) {
        console.error('Usage: node scripts/dbImportJson.js <path-to-json-folder> [--allow-remote]');
        process.exit(1);
    }
    if (!fs.existsSync(dir)) {
        console.error(`Folder not found: ${dir}`);
        process.exit(1);
    }
    if (!isLocalHost() && !allowRemote) {
        console.error(`Refusing: target host "${sequelize.config.host}" is not localhost. This is a bulk insert —`);
        console.error('pass --allow-remote only if you are certain the target is empty and this is intentional.');
        process.exit(1);
    }

    await sequelize.authenticate();
    console.log(`Connected to ${sequelize.config.host}/${sequelize.config.database}. Importing from ${dir}...\n`);

    for (const [table, modelPath] of TABLE_MODELS) {
        await importTable(dir, table, modelPath);
    }
    await importSequelizeMeta(dir);

    // Rows were inserted with their original explicit ids, so each table's
    // SERIAL sequence is still at 1 — the next real INSERT (no id given)
    // would collide with an already-imported row. Bump every sequence to
    // MAX(id) now that all rows are in.
    console.log('\nResetting id sequences to MAX(id)...');
    for (const [table] of TABLE_MODELS) {
        await sequelize.query(
            `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 1))`
        );
    }

    await sequelize.close();
    console.log('\nDone.');
}

run().catch((e) => { console.error(e.message); process.exit(1); });
