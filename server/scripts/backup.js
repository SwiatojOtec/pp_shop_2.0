#!/usr/bin/env node
/**
 * db:backup — создаёт дамп PostgreSQL через pg_dump.
 *
 * Требует: pg_dump в PATH (входит в postgresql-client).
 * Использует: DATABASE_URL или дискретные DB_* переменные из .env.
 *
 * Запуск:  npm run db:backup  (из папки server/)
 */

require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');
const fs   = require('fs');

const backupsDir = path.resolve(__dirname, '..', 'backups');
if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
}

const timestamp  = new Date().toISOString().replace(/[:.]/g, '-');
const outputFile = path.join(backupsDir, `backup-${timestamp}.sql`);

let pgUri;

if (process.env.DATABASE_URL) {
    pgUri = process.env.DATABASE_URL;
} else {
    const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT = 5432, DB_NAME } = process.env;
    if (!DB_USER || !DB_NAME) {
        console.error('ERROR: DATABASE_URL or DB_* variables are not set in .env');
        process.exit(1);
    }
    pgUri = `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
}

console.log(`Creating backup → ${outputFile}`);
try {
    execSync(`pg_dump "${pgUri}" --no-password -F p -f "${outputFile}"`, { stdio: 'inherit' });
    console.log('Backup completed successfully.');
} catch (err) {
    console.error('pg_dump failed. Make sure postgresql-client is installed and pg_dump is in PATH.');
    console.error('Windows: install PostgreSQL from https://www.postgresql.org/download/windows/ (include Command Line Tools)');
    console.error('Or use Railway dashboard → Postgres → Backups → Create backup');
    console.error('Ubuntu/Debian: sudo apt-get install postgresql-client');
    process.exit(1);
}
