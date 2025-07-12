// src/services/automationService.js
const DEFAULT_MESSAGES = require('../constants/defaultMessages');

// Busca todas as automações e formata num objeto para fácil acesso
exports.getAutomations = (db, clienteId = null) => {
    return new Promise((resolve, reject) => {
        let sql = "SELECT * FROM automacoes";
        const params = [];
        if (clienteId !== null) {
            sql += " WHERE cliente_id = ?";
            params.push(clienteId);
        }
        db.all(sql, params, (err, rows) => {
            if (err) return reject(err);

            const automationsMap = rows.reduce((acc, row) => {
                acc[row.gatilho] = {
                    ativo: Boolean(row.ativo),
                    mensagem: row.mensagem,
                    tipo_midia: row.tipo_midia || 'texto',
                    url_midia: row.url_midia,
                    legenda_midia: row.legenda_midia
                };
                return acc;
            }, {});
            for (const gatilho in DEFAULT_MESSAGES) {
                if (!automationsMap[gatilho]) {
                    automationsMap[gatilho] = {
                        ativo: true,
                        mensagem: DEFAULT_MESSAGES[gatilho]
                    };
                }
            }

            resolve(automationsMap);
        });
    });
};

// Salva todas as configurações de automação recebidas do frontend
exports.saveAutomations = (db, configs, clienteId = null) => {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare("INSERT OR REPLACE INTO automacoes (gatilho, cliente_id, ativo, mensagem, tipo_midia, url_midia, legenda_midia) VALUES (?, ?, ?, ?, ?, ?, ?)");
        
        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            for (const gatilho in configs) {
                const config = configs[gatilho];
                stmt.run(
                    gatilho,
                    clienteId,
                    config.ativo ? 1 : 0,
                    config.mensagem,
                    config.tipo_midia || 'texto',
                    config.url_midia || null,
                    config.legenda_midia || null
                );
            }
            db.run("COMMIT", (err) => {
                if(err) return reject(err);
                resolve({ message: "Configurações salvas com sucesso." });
            });
        });

        stmt.finalize();
    });
};

const { getModels } = require('../database/database');

// Cria registros padrão de automações para um novo usuário
exports.createDefaultAutomations = (db, clienteId, options = {}) => {
    if (options.transaction) {
        const { Automacao } = getModels();
        const records = Object.entries(DEFAULT_MESSAGES).map(([gatilho, mensagem]) => ({
            gatilho,
            cliente_id: clienteId,
            ativo: 1,
            mensagem,
            tipo_midia: 'texto'
        }));
        return Automacao.bulkCreate(records, { transaction: options.transaction, ignoreDuplicates: true });
    }

    return new Promise((resolve, reject) => {
        const stmt = db.prepare(
            'INSERT OR IGNORE INTO automacoes (gatilho, cliente_id, ativo, mensagem, tipo_midia) VALUES (?, ?, 1, ?, ?)' 
        );

        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            for (const gatilho in DEFAULT_MESSAGES) {
                const mensagem = DEFAULT_MESSAGES[gatilho];
                stmt.run(gatilho, clienteId, mensagem, 'texto');
            }
            db.run('COMMIT', err => {
                if (err) return reject(err);
                resolve();
            });
        });

        stmt.finalize();
    });
};
