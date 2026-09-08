const { Sequelize } = require('sequelize');
require('dotenv').config();

// LOCAL_DEV=1 forces the discrete DB_* connection (no SSL) even when .env's
// DATABASE_URL is set to Railway — needed because Windows env vars can't carry
// an empty-string override through to a child process (it collapses to unset,
// so dotenv just refills DATABASE_URL from .env). See docs/admin-redesign/
// 03-screens.md, "Робота з базою": local dev must never share DATABASE_URL
// with production.
const useDiscreteVars = process.env.LOCAL_DEV || !process.env.DATABASE_URL;

const sequelize = useDiscreteVars
    ? new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'postgres',
        logging: false,
    })
    : new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        logging: false,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false // Required for many cloud providers like Railway/Render
            }
        }
    });

module.exports = sequelize;
