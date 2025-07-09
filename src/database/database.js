const { Sequelize, DataTypes, QueryTypes } = require('sequelize');
const path = require('path');

const DB_CLIENT = process.env.DB_CLIENT || 'sqlite';
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../whatsship.db');

function createWrapper(sequelize) {
  return {
    run(sql, params = [], cb) {
      sequelize.query(sql, { replacements: params })
        .then(([res, meta]) => {
          const ctx = {
            lastID: (meta && (meta.lastID || meta.insertId)) || (res && res[0] && res[0].id),
            changes: meta && (meta.rowCount || meta.affectedRows)
          };
          if (cb) cb.call(ctx, null);
        })
        .catch(err => cb && cb(err));
    },
    get(sql, params = [], cb) {
      sequelize.query(sql, { replacements: params, type: QueryTypes.SELECT })
        .then(rows => cb(null, rows[0]))
        .catch(err => cb(err));
    },
    all(sql, params = [], cb) {
      sequelize.query(sql, { replacements: params, type: QueryTypes.SELECT })
        .then(rows => cb(null, rows))
        .catch(err => cb(err));
    },
    prepare(sql) {
      return {
        run(...args) {
          const cb = typeof args[args.length - 1] === 'function' ? args.pop() : null;
          sequelize.query(sql, { replacements: args })
            .then(([res, meta]) => {
              const ctx = {
                lastID: (meta && (meta.lastID || meta.insertId)) || (res && res[0] && res[0].id),
                changes: meta && (meta.rowCount || meta.affectedRows)
              };
              if (cb) cb.call(ctx, null);
            })
            .catch(err => cb && cb(err));
        },
        finalize(cb) { if (cb) cb(); }
      };
    },
    serialize(cb) { if (cb) cb(); }
  };
}

function defineModels(sequelize) {
  const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    email: { type: DataTypes.STRING, unique: true, allowNull: false },
    password: { type: DataTypes.STRING, allowNull: false },
    api_key: { type: DataTypes.STRING, unique: true },
    is_admin: { type: DataTypes.INTEGER, defaultValue: 0 },
    is_active: { type: DataTypes.INTEGER, defaultValue: 1 },
    precisa_trocar_senha: { type: DataTypes.INTEGER, defaultValue: 1 },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, { tableName: 'users', timestamps: false });

  const Plan = sequelize.define('Plan', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    price: { type: DataTypes.FLOAT, allowNull: false },
    monthly_limit: { type: DataTypes.INTEGER, allowNull: false },
    checkout_url: { type: DataTypes.STRING }
  }, { tableName: 'plans', timestamps: false });

  const Subscription = sequelize.define('Subscription', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    plan_id: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.STRING, defaultValue: 'active' },
    usage: { type: DataTypes.INTEGER, defaultValue: 0 },
    renewal_date: { type: DataTypes.DATE }
  }, { tableName: 'subscriptions', timestamps: false });

  const Pedido = sequelize.define('Pedido', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    cliente_id: DataTypes.INTEGER,
    nome: DataTypes.STRING,
    email: DataTypes.STRING,
    telefone: { type: DataTypes.STRING, allowNull: false },
    produto: DataTypes.STRING,
    codigoRastreio: DataTypes.STRING,
    dataPostagem: DataTypes.STRING,
    statusInterno: DataTypes.STRING,
    ultimaAtualizacao: DataTypes.STRING,
    ultimaLocalizacao: DataTypes.STRING,
    origemUltimaMovimentacao: DataTypes.STRING,
    destinoUltimaMovimentacao: DataTypes.STRING,
    descricaoUltimoEvento: DataTypes.STRING,
    mensagemUltimoStatus: DataTypes.STRING,
    notas: DataTypes.TEXT,
    fotoPerfilUrl: DataTypes.STRING,
    dataCriacao: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    mensagensNaoLidas: { type: DataTypes.INTEGER, defaultValue: 0 },
    ultimaMensagem: DataTypes.STRING,
    dataUltimaMensagem: DataTypes.DATE
  }, {
    tableName: 'pedidos',
    timestamps: false,
    indexes: [{ unique: true, fields: ['cliente_id', 'telefone'] }]
  });

  const Historico = sequelize.define('HistoricoMensagem', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    pedido_id: { type: DataTypes.INTEGER, allowNull: false },
    cliente_id: DataTypes.INTEGER,
    mensagem: { type: DataTypes.TEXT, allowNull: false },
    tipo_mensagem: DataTypes.STRING,
    origem: { type: DataTypes.STRING, allowNull: false },
    data_envio: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, { tableName: 'historico_mensagens', timestamps: false });

  const Log = sequelize.define('Log', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    cliente_id: DataTypes.INTEGER,
    acao: { type: DataTypes.STRING, allowNull: false },
    detalhe: DataTypes.STRING,
    data_criacao: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, { tableName: 'logs', timestamps: false });

  const Automacao = sequelize.define('Automacao', {
    gatilho: { type: DataTypes.STRING, primaryKey: true },
    cliente_id: { type: DataTypes.INTEGER, primaryKey: true },
    ativo: { type: DataTypes.INTEGER, defaultValue: 0 },
    mensagem: DataTypes.STRING
  }, { tableName: 'automacoes', timestamps: false });

  const Integration = sequelize.define('Integration', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    platform: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    unique_path: { type: DataTypes.STRING, allowNull: false, unique: true },
    secret_key: DataTypes.STRING,
    status: { type: DataTypes.STRING, defaultValue: 'active' }
  }, { tableName: 'integrations', timestamps: false });

  const IntegrationSetting = sequelize.define('IntegrationSetting', {
    user_id: { type: DataTypes.INTEGER, primaryKey: true },
    postback_secret: DataTypes.STRING,
    rastreio_api_key: DataTypes.STRING,
    webhook_url: DataTypes.STRING
  }, { tableName: 'integration_settings', timestamps: false });

  const UserSetting = sequelize.define('UserSetting', {
    user_id: { type: DataTypes.INTEGER, primaryKey: true },
    create_contact_on_message: { type: DataTypes.INTEGER, defaultValue: 0 }
  }, { tableName: 'user_settings', timestamps: false });

  // relationships
  User.hasOne(Subscription, { foreignKey: 'user_id' });
  Subscription.belongsTo(User, { foreignKey: 'user_id' });
  Plan.hasMany(Subscription, { foreignKey: 'plan_id' });
  Subscription.belongsTo(Plan, { foreignKey: 'plan_id' });

  Pedido.hasMany(Historico, { foreignKey: 'pedido_id' });
  Historico.belongsTo(Pedido, { foreignKey: 'pedido_id' });

  return { User, Plan, Subscription, Pedido, Historico, Log, Automacao, Integration, IntegrationSetting, UserSetting };
}

let sequelize;
let models;

async function initDb() {
  if (DB_CLIENT === 'postgres') {
    sequelize = new Sequelize(
      process.env.POSTGRES_DB || 'botdb',
      process.env.POSTGRES_USER || 'botuser',
      process.env.POSTGRES_PASSWORD || 'botpass',
      {
        host: process.env.POSTGRES_HOST || 'db',
        port: process.env.POSTGRES_PORT || 5432,
        dialect: 'postgres',
        logging: false,
      }
    );
  } else {
    sequelize = new Sequelize({ dialect: 'sqlite', storage: DB_PATH, logging: false });
  }

  await sequelize.authenticate();
  models = defineModels(sequelize);
  await sequelize.sync();

  // inserir planos padrao se tabela estiver vazia
  const [rows] = await sequelize.query('SELECT COUNT(*) AS count FROM plans');
  const count = parseInt(rows[0].count, 10);
  if (count === 0) {
    const defaultPlans = [
      ['Gr\u00e1tis', 0, 10, null],
      ['Start', 39.99, 50, 'https://payment.ticto.app/O6073F635'],
      ['Basic', 59.99, 100, 'https://payment.ticto.app/O8EC5C302'],
      ['Pro', 99.99, 250, 'https://payment.ticto.app/OEE2CBEAA'],
    ];
    for (const p of defaultPlans) {
      await sequelize.query('INSERT INTO plans (name, price, monthly_limit, checkout_url) VALUES (?, ?, ?, ?)', { replacements: p });
    }
  }

  console.log(`\u2705 Conectado ao banco de dados ${DB_CLIENT}.`);
  module.exports.sequelize = sequelize;
  module.exports.models = models;
  return createWrapper(sequelize);
}

function getSequelize() {
  return sequelize;
}

function getModels() {
  return models;
}

module.exports = { initDb, getSequelize, getModels };
