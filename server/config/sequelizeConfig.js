require('dotenv').config();

/**
 * Sequelize CLI config.
 * Uses DATABASE_URL if set (Railway/Render), otherwise discrete DB_* vars.
 */

const base = {
    dialect: 'postgres',
    logging: false,
};

const config = process.env.DATABASE_URL
    ? {
          ...base,
          url: process.env.DATABASE_URL,
          dialectOptions: {
              ssl: { require: true, rejectUnauthorized: false },
          },
      }
    : {
          ...base,
          username: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
          host:     process.env.DB_HOST,
          port:     process.env.DB_PORT,
      };

module.exports = {
    development: config,
    production:  config,
};
