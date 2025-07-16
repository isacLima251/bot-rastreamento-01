const sqlite3 = require('sqlite3').verbose();
const automationService = require('../src/services/automationService');
const DEFAULT_MESSAGES = require('../src/constants/defaultMessages');

function setupDb() {
  const db = new sqlite3.Database(':memory:');
  db.serialize(() => {
    db.run('CREATE TABLE automacoes (gatilho TEXT, cliente_id INTEGER, ativo INTEGER, mensagem TEXT)');
    db.run('CREATE TABLE automacao_passos (id INTEGER PRIMARY KEY AUTOINCREMENT, gatilho TEXT, cliente_id INTEGER, ordem INTEGER, tipo TEXT, conteudo TEXT, mediaUrl TEXT, createdAt TEXT, updatedAt TEXT)');
  });
  return db;
}

describe('automationService.createDefaultAutomations', () => {
  test('inserts default automations and steps', async () => {
    const db = setupDb();
    await automationService.createDefaultAutomations(db, 1);

    const automacoes = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM automacoes', (err, rows) => err ? reject(err) : resolve(rows));
    });
    expect(automacoes).toHaveLength(Object.keys(DEFAULT_MESSAGES).length);

    const passos = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM automacao_passos', (err, rows) => err ? reject(err) : resolve(rows));
    });
    expect(passos).toHaveLength(Object.keys(DEFAULT_MESSAGES).length);
    expect(passos.every(p => p.tipo === 'texto')).toBe(true);
    db.close();
  });
});
