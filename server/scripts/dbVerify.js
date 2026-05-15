#!/usr/bin/env node
/**
 * db:verify — знімок кількості записів у ключових таблицях (нічого не змінює).
 *
 * Запуск: npm run db:verify  (з папки server/)
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

const TABLES = [
    'Products',
    'Orders',
    'Clients',
    'RentalApplications',
    'Categories',
    'RentCategories',
    'Brands',
    'Warehouses',
    'InventoryItems',
    'WarehouseEvents',
    'Users',
    'BlogPosts',
];

async function tableExists(sequelize, table) {
    const [rows] = await sequelize.query(
        `SELECT to_regclass(:name) AS reg`,
        { replacements: { name: `"${table}"` } }
    );
    return !!rows[0]?.reg;
}

async function countTable(sequelize, table) {
    const exists = await tableExists(sequelize, table);
    if (!exists) return { exists: false, count: 0 };
    const [rows] = await sequelize.query(`SELECT COUNT(*)::int AS c FROM "${table}"`);
    return { exists: true, count: rows[0]?.c ?? 0 };
}

async function run() {
    const sequelize = createSequelize();
    try {
        await sequelize.authenticate();
        console.log('DB connection: OK\n');

        const snapshot = {};
        for (const table of TABLES) {
            const { exists, count } = await countTable(sequelize, table);
            snapshot[table] = { exists, count };
            const label = exists ? String(count) : '(table missing)';
            console.log(`  ${table.padEnd(22)} ${label}`);
        }

        const [metaRows] = await sequelize.query(
            `SELECT name FROM "SequelizeMeta" ORDER BY name`
        ).catch(() => [[]]);

        console.log('\nSequelizeMeta migrations:');
        if (!metaRows.length) {
            console.log('  (none — run npm run migrate:baseline on existing DB)');
        } else {
            metaRows.forEach((r) => console.log(`  ✓ ${r.name}`));
        }

        const products = snapshot.Products?.count ?? 0;
        if (products === 0) {
            console.warn('\n⚠ Products count is 0. Check DATABASE_URL in .env before any migration.');
        } else {
            console.log(`\n✓ Products in DB: ${products} (data looks present)`);
        }

        return snapshot;
    } finally {
        await sequelize.close();
    }
}

run().catch((err) => {
    console.error('db:verify failed:', err.message);
    process.exit(1);
});
