const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { Client } = require('pg');
require('dotenv').config();

const sqlitePath = process.env.DB_PATH || path.join(__dirname, '../whatsship.db');

const pgClient = new Client({
  user: process.env.POSTGRES_USER || 'botuser',
  password: process.env.POSTGRES_PASSWORD || 'botpass',
  database: process.env.POSTGRES_DB || 'botdb',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10)
});

function sanitizeIdentifier(id) {
  if (!/^[A-Za-z0-9_]+$/.test(id)) {
    throw new Error(`Unsafe identifier detected: ${id}`);
  }
  return id;
}

async function migrate() {
  if (!fs.existsSync(sqlitePath)) {
    console.error(`SQLite database not found at ${sqlitePath}`);
    process.exit(1);
  }

  console.log('Connecting to databases...');
  const sqlite = new sqlite3.Database(sqlitePath);
  await pgClient.connect();

  const all = (db, sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });

  try {
    const tableRows = await all(
      sqlite,
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    );
    const tables = tableRows.map(r => sanitizeIdentifier(r.name));

    if (tables.length === 0) {
      console.error('No tables found in the SQLite database.');
      return;
    }

    console.log('Tables:', tables.join(', '));

    for (const table of tables) {
      const columnRows = await all(sqlite, `PRAGMA table_info(\"${table}\")`);
      const columns = columnRows.map(c => sanitizeIdentifier(c.name));
      if (columns.length === 0) continue;

      const colList = columns.map(c => `\"${c}\"`).join(', ');
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const insertSql = `INSERT INTO \"${table}\" (${colList}) VALUES (${placeholders})`;

      const rows = await all(sqlite, `SELECT * FROM \"${table}\"`);
      console.log(`Migrating ${table}... (${rows.length} rows)`);
      for (const row of rows) {
        const values = columns.map(c => row[c]);
        await pgClient.query(insertSql, values);
      }
    }

    console.log('Migration finished.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    sqlite.close();
    await pgClient.end();
  }
}

migrate();
