const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../whatsship.db');

const initDb = () => {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error("❌ Erro ao conectar ao banco de dados:", err.message);
                return reject(err);
            }
            console.log('✅ Conectado ao banco de dados SQLite.');

            const createStmts = [
                `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, password TEXT NOT NULL, api_key TEXT UNIQUE, is_admin INTEGER NOT NULL DEFAULT 0, is_active INTEGER NOT NULL DEFAULT 1, precisa_trocar_senha INTEGER NOT NULL DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`,
                `CREATE TABLE IF NOT EXISTS plans (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, price REAL NOT NULL, monthly_limit INTEGER NOT NULL, checkout_url TEXT);`,
                `CREATE TABLE IF NOT EXISTS subscriptions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL UNIQUE, plan_id INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'active', usage INTEGER NOT NULL DEFAULT 0, renewal_date TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (plan_id) REFERENCES plans(id));`,
                `CREATE TABLE IF NOT EXISTS pedidos (id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id INTEGER, nome TEXT, email TEXT, telefone TEXT NOT NULL, produto TEXT, codigoRastreio TEXT, dataPostagem TEXT, statusInterno TEXT, ultimaAtualizacao TEXT, ultimaLocalizacao TEXT, origemUltimaMovimentacao TEXT, destinoUltimaMovimentacao TEXT, descricaoUltimoEvento TEXT, mensagemUltimoStatus TEXT, fotoPerfilUrl TEXT, dataCriacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP, mensagensNaoLidas INTEGER DEFAULT 0 NOT NULL, ultimaMensagem TEXT, dataUltimaMensagem DATETIME, UNIQUE(cliente_id, telefone));`,
                `CREATE TABLE IF NOT EXISTS historico_mensagens (id INTEGER PRIMARY KEY AUTOINCREMENT, pedido_id INTEGER NOT NULL, cliente_id INTEGER, mensagem TEXT NOT NULL, tipo_mensagem TEXT, origem TEXT NOT NULL, data_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (pedido_id) REFERENCES pedidos (id) ON DELETE CASCADE);`,
                `CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id INTEGER, acao TEXT NOT NULL, detalhe TEXT, data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`,
                `CREATE TABLE IF NOT EXISTS automacoes (gatilho TEXT, cliente_id INTEGER, ativo INTEGER NOT NULL DEFAULT 0, mensagem TEXT, PRIMARY KEY (gatilho, cliente_id));`,
                `CREATE TABLE IF NOT EXISTS integrations (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, platform TEXT NOT NULL, name TEXT NOT NULL, unique_path TEXT NOT NULL UNIQUE, secret_key TEXT, status TEXT DEFAULT 'active', FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE);`,
            ];

            db.serialize(() => {
                db.run("BEGIN TRANSACTION");
                createStmts.forEach(stmt => {
                    db.run(stmt, (err) => { if (err) reject(err); });
                });
                db.run("COMMIT", (err) => {
                    if (err) return reject(err);
                    console.log("✔️ Todas as tabelas foram criadas ou já existem.");
                    resolve(db);
                });
            });
        });
    });
};

module.exports = { initDb };
