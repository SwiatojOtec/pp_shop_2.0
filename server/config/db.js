const { Sequelize } = require('sequelize');
const path = require('path');

// .env.local (gitignored, per-machine) wins over .env for the DB_* vars —
// dotenv only fills in keys that aren't already set, so loading it first
// lets each developer's own local Postgres credentials override the
// committed .env without editing that file.
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
require('dotenv').config();

// Safe by default (docs/admin-redesign/03-screens.md, "Робота з базою"):
// .env's DATABASE_URL points at Railway production, so a plain
// `npm run dev` must never touch it by accident. Local Postgres is the
// default; production requires the explicit ALLOW_PROD_DB=1 opt-in.
const allowProdDb = process.env.ALLOW_PROD_DB === '1';

const sequelize = allowProdDb
    ? new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        logging: false,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false // Required for many cloud providers like Railway/Render
            }
        }
    })
    : new Sequelize(
        process.env.DB_NAME || 'pp_shop_dev',
        process.env.DB_USER || 'postgres',
        process.env.DB_PASSWORD || 'postgres',
        {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            dialect: 'postgres',
            logging: false,
        }
    );

console.log(
    allowProdDb
        ? '⚠ ALLOW_PROD_DB=1 — connected to PRODUCTION (Railway) via DATABASE_URL.'
        : `Connected to local database "${sequelize.config.database}" on ${sequelize.config.host}:${sequelize.config.port}.`
);

module.exports = sequelize;
