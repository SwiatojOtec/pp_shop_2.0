#!/usr/bin/env node
/**
 * db:export-json — exports all table data to JSON files in server/backups/json-<timestamp>/
 * Works without pg_dump. Use to restore with db:import-json.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');

const TABLES = [
    'Users', 'Categories', 'RentCategories', 'Brands', 'Currencies',
    'Products', 'Orders', 'BlogPosts', 'Clients', 'RentalApplications',
    'Warehouses', 'InventoryItems', 'WarehouseEvents',
    'Subdivisions', 'SubdivisionMembers', 'TimesheetEntries', 'SequelizeMeta',
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
        host: process.env.DB_HOST, port: process.env.DB_PORT,
        dialect: 'postgres', logging: false,
    });
}

async function tableExists(seq, name) {
    const [[row]] = await seq.query(
        `SELECT to_regclass(:n) AS r`, { replacements: { n: `"${name}"` } }
    );
    return !!row?.r;
}

async function run() {
    const seq = createSequelize();
    await seq.authenticate();
    console.log('Connected. Exporting...\n');

    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const dir = path.resolve(__dirname, '..', 'backups', `json-${ts}`);
    fs.mkdirSync(dir, { recursive: true });

    const manifest = { exportedAt: new Date().toISOString(), tables: {} };

    for (const table of TABLES) {
        if (!(await tableExists(seq, table))) {
            console.log(`  SKIP  ${table} (not found)`);
            manifest.tables[table] = { rows: 0, skipped: true };
            continue;
        }
        const [rows] = await seq.query(`SELECT * FROM "${table}"`);
        const file = path.join(dir, `${table}.json`);
        fs.writeFileSync(file, JSON.stringify(rows, null, 2));
        manifest.tables[table] = { rows: rows.length };
        console.log(`  OK    ${table.padEnd(22)} ${rows.length} rows`);
    }

    fs.writeFileSync(path.join(dir, '_manifest.json'), JSON.stringify(manifest, null, 2));
    await seq.close();

    console.log(`\nBackup saved to:\n  ${dir}`);
    console.log('\nProducts:', manifest.tables.Products?.rows ?? 0);
    console.log('\nTo restore later: node scripts/dbImportJson.js <path-to-folder>');
}

run().catch(e => { console.error(e.message); process.exit(1); });
