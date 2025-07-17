const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const sqlitePath = process.env.DB_PATH || path.join(__dirname, '../whatsship.db');
const exportDir = path.join(__dirname, '../tmp_sqlite_export');

const pgUser = process.env.POSTGRES_USER || 'botuser';
const pgPass = process.env.POSTGRES_PASSWORD || 'botpass';
const pgDb   = process.env.POSTGRES_DB || 'botdb';
const pgHost = process.env.POSTGRES_HOST || 'localhost';
const pgPort = process.env.POSTGRES_PORT || 5432;

function run(cmd, env = {}) {
  console.log('$ ' + cmd);
  execSync(cmd, { stdio: 'inherit', env: { ...process.env, ...env }, shell: true });
}

if (!fs.existsSync(sqlitePath)) {
  console.error(`SQLite database not found at ${sqlitePath}`);
  process.exit(1);
}

fs.rmSync(exportDir, { recursive: true, force: true });
fs.mkdirSync(exportDir, { recursive: true });

const tablesOutput = execSync(`sqlite3 ${sqlitePath} ".tables"`).toString().trim();
if (!tablesOutput) {
  console.error('No tables found in the SQLite database.');
  process.exit(1);
}
const tables = tablesOutput.split(/\s+/).filter(Boolean);
console.log('Tables:', tables.join(', '));

for (const table of tables) {
  const csvPath = path.join(exportDir, `${table}.csv`);
  execSync(`sqlite3 -csv -header ${sqlitePath} "SELECT * FROM \"${table}\";" > ${csvPath}`);

  const pragma = execSync(`sqlite3 ${sqlitePath} "PRAGMA table_info(\"${table}\");"`).toString().trim();
  const columns = pragma.split('\n').map(l => l.split('|')[1]);
  const colList = columns.map(c => `\"${c}\"`).join(', ');
  const copyCmd = `psql -h ${pgHost} -p ${pgPort} -U ${pgUser} -d ${pgDb} -c \"\\copy ${table} (${colList}) FROM '${csvPath}' WITH (FORMAT csv, HEADER true)\"`;
  run(copyCmd, { PGPASSWORD: pgPass });
}

console.log('Migration finished.');
