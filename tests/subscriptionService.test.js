const sqlite3 = require('sqlite3').verbose();
const moment = require('moment');
const subscriptionService = require('../src/services/subscriptionService');

function setupDb() {
  const db = new sqlite3.Database(':memory:');
  db.serialize(() => {
    db.run('CREATE TABLE subscriptions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, usage INTEGER, renewal_date TEXT)');
    db.run('CREATE TABLE pedidos (id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id INTEGER, checkCount INTEGER)');
  });
  return db;
}

describe('subscriptionService.resetUsageIfNeeded', () => {
  test('resets usage and check count when renewal is due', async () => {
    const db = setupDb();
    const past = moment().subtract(1, 'day').format('YYYY-MM-DD');
    db.run('INSERT INTO subscriptions (id, user_id, usage, renewal_date) VALUES (1, 1, 5, ?)', [past]);
    db.run('INSERT INTO pedidos (cliente_id, checkCount) VALUES (1, 3)');

    await subscriptionService.resetUsageIfNeeded(db, 1);

    const sub = await new Promise((resolve, reject) => {
      db.get('SELECT usage, renewal_date FROM subscriptions WHERE id = 1', (e, row) => e ? reject(e) : resolve(row));
    });
    expect(sub.usage).toBe(0);
    const next = moment().add(1, 'month').startOf('day').format('YYYY-MM-DD');
    expect(sub.renewal_date).toBe(next);

    const pedido = await new Promise((resolve, reject) => {
      db.get('SELECT checkCount FROM pedidos WHERE cliente_id = 1', (e, row) => e ? reject(e) : resolve(row));
    });
    expect(pedido.checkCount).toBe(0);
    db.close();
  });

  test('does nothing when renewal date is in the future', async () => {
    const db = setupDb();
    const future = moment().add(5, 'days').format('YYYY-MM-DD');
    db.run('INSERT INTO subscriptions (id, user_id, usage, renewal_date) VALUES (2, 2, 4, ?)', [future]);
    db.run('INSERT INTO pedidos (cliente_id, checkCount) VALUES (2, 2)');

    await subscriptionService.resetUsageIfNeeded(db, 2);

    const sub = await new Promise((resolve, reject) => {
      db.get('SELECT usage, renewal_date FROM subscriptions WHERE id = 2', (e, row) => e ? reject(e) : resolve(row));
    });
    expect(sub.usage).toBe(4);
    expect(sub.renewal_date).toBe(future);

    const pedido = await new Promise((resolve, reject) => {
      db.get('SELECT checkCount FROM pedidos WHERE cliente_id = 2', (e, row) => e ? reject(e) : resolve(row));
    });
    expect(pedido.checkCount).toBe(2);
    db.close();
  });
});
