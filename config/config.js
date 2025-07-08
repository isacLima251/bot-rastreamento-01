require('dotenv').config();
const path = require('path');

const DB_CLIENT = process.env.DB_CLIENT || 'sqlite';

let development;
if (DB_CLIENT === 'postgres') {
  development = {
    username: process.env.POSTGRES_USER || 'botuser',
    password: process.env.POSTGRES_PASSWORD || 'botpass',
    database: process.env.POSTGRES_DB || 'botdb',
    host: process.env.POSTGRES_HOST || 'db',
    port: process.env.POSTGRES_PORT || 5432,
    dialect: 'postgres',
    logging: false
  };
} else {
  development = {
    dialect: 'sqlite',
    storage: process.env.DB_PATH || path.join(__dirname, '../whatsship.db'),
    logging: false
  };
}

module.exports = {
  development,
  test: development,
  production: development
};
