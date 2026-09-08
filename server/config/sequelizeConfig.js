const path = require('path');

// .env.local (gitignored, per-machine) wins over .env — see config/db.js.
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
require('dotenv').config();

/**
 * Sequelize CLI config. Safe by default (docs/admin-redesign/03-screens.md,
 * "Робота з базою"): local Postgres unless ALLOW_PROD_DB=1 is explicitly
 * set — `npm run migrate` must never touch .env's DATABASE_URL (Railway
 * production) by accident.
 */

const allowProdDb = process.env.ALLOW_PROD_DB === '1';

const base = {
    dialect: 'postgres',
    logging: false,
};

const config = allowProdDb
    ? {
          ...base,
          url: process.env.DATABASE_URL,
          dialectOptions: {
              ssl: { require: true, rejectUnauthorized: false },
          },
      }
    : {
          ...base,
          username: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_NAME || 'pp_shop_dev',
          host:     process.env.DB_HOST || 'localhost',
          port:     process.env.DB_PORT || 5432,
      };

module.exports = {
    development: config,
    production:  config,
};
