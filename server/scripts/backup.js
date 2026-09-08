#!/usr/bin/env node
/**
 * db:backup — создаёт дамп PostgreSQL через pg_dump.
 *
 * Требует: pg_dump в PATH (входит в postgresql-client).
 * Целится в ту же базу, что и весь остальной сервер (config/db.js) —
 * локальную по умолчанию, production только с ALLOW_PROD_DB=1.
 *
 * Запуск:  npm run db:backup  (из папки server/)
 */

const sequelize = require('../config/db');
const { execSync } = require('child_process');
const path = require('path');
const fs   = require('fs');

const backupsDir = path.resolve(__dirname, '..', 'backups');
if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
}

const timestamp  = new Date().toISOString().replace(/[:.]/g, '-');
const outputFile = path.join(backupsDir, `backup-${timestamp}.sql`);

const { host, port, database, username, password } = sequelize.config;
if (!host || !database) {
    console.error('ERROR: could not resolve a database to back up from config/db.js');
    process.exit(1);
}
const pgUri = `postgresql://${username}:${password}@${host}:${port}/${database}`;

console.log(`Creating backup → ${outputFile}`);
try {
    execSync(`pg_dump "${pgUri}" --no-password -F p -f "${outputFile}"`, { stdio: 'inherit' });
    console.log('Backup completed successfully.');
} catch {
    console.error('pg_dump failed. Make sure postgresql-client is installed and pg_dump is in PATH.');
    console.error('Windows: install PostgreSQL from https://www.postgresql.org/download/windows/ (include Command Line Tools)');
    console.error('Or use Railway dashboard → Postgres → Backups → Create backup');
    console.error('Ubuntu/Debian: sudo apt-get install postgresql-client');
    process.exit(1);
}
