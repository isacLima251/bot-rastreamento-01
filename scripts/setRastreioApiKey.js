require('dotenv').config();
const { initDb, getModels } = require('../src/database/database');

(async () => {
  const apiKey = process.env.SITERASTREIO_API_KEY;
  if (!apiKey) {
    console.error('Defina SITERASTREIO_API_KEY no .env');
    process.exit(1);
  }

  const db = await initDb().catch(err => {
    console.error('Erro ao conectar ao banco de dados:', err);
    process.exit(1);
  });

  const { User, IntegrationSetting } = getModels();

  try {
    const users = await User.findAll({ attributes: ['id'], raw: true });
    for (const { id } of users) {
      await IntegrationSetting.upsert({ user_id: id, rastreio_api_key: apiKey });
    }
    console.log(`✅ Chave atribuída para ${users.length} usuários.`);
  } catch (err) {
    console.error('Erro ao atualizar chaves:', err.message);
  } finally {
    await db.close();
  }
})();
