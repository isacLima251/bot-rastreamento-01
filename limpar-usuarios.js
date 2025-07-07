require('dotenv').config();
const { initDb } = require('./src/database/database');

(async () => {
  const db = await initDb().catch(err => {
    console.error('Erro ao conectar ao banco de dados:', err);
    process.exit(1);
  });

  const run = (sql) => new Promise((resolve, reject) => {
    db.run(sql, err => err ? reject(err) : resolve());
  });

  try {
    await run('BEGIN TRANSACTION');
    await run('DELETE FROM historico_mensagens');
    await run('DELETE FROM pedidos');
    await run('DELETE FROM subscriptions');
    await run('DELETE FROM users');
    await run('COMMIT');
    console.log('✅ Banco de dados limpo com sucesso. Todos os usuários e dados relacionados foram apagados.');
  } catch (err) {
    await run('ROLLBACK').catch(() => {});
    console.error('Erro ao limpar banco de dados:', err);
  } finally {
    db.close();
  }
})();
