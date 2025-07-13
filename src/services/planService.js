const logger = require('../logger');

async function ensureFreePlan(tx) {
  logger.info('[ensureFreePlan] Iniciando verificacao do plano gratuito.');

  try {
    logger.info('[ensureFreePlan] Procurando pelo plano com ID 1...');
    const plan = await new Promise((resolve, reject) => {
      tx.get('SELECT * FROM plans WHERE id = ?', [1], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });

    if (plan) {
      logger.info('[ensureFreePlan] Plano gratuito ja existe. Nada a fazer.');
    } else {
      logger.info('[ensureFreePlan] Plano gratuito nao encontrado. Criando agora...');
      await new Promise((resolve, reject) => {
        tx.run(
          'INSERT INTO plans (id, name, price, monthly_limit, checkout_url) VALUES (?, ?, ?, ?, ?)',
          [1, 'Gr\u00e1tis', 0, 10, null],
          err => {
            if (err) return reject(err);
            resolve();
          }
        );
      });
      logger.info('[ensureFreePlan] Plano gratuito criado com sucesso.');
    }
  } catch (error) {
    console.error('[ensureFreePlan] ERRO CRITICO DENTRO DO HELPER:', error);
    throw error;
  }
}

const { getModels } = require('../database/database');

function findPlanByName(db, name, options = {}) {
  if (options.transaction) {
    const { Plan } = getModels();
    return Plan.findOne({ where: { name }, transaction: options.transaction, raw: true });
  }
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM plans WHERE name = ?', [name], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

module.exports = { ensureFreePlan, findPlanByName };
