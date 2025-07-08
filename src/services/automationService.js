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
                    mensagem: row.mensagem
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
        const stmt = db.prepare("INSERT OR REPLACE INTO automacoes (gatilho, cliente_id, ativo, mensagem) VALUES (?, ?, ?, ?)");
        
        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            for (const gatilho in configs) {
                const config = configs[gatilho];
                stmt.run(gatilho, clienteId, config.ativo ? 1 : 0, config.mensagem);
            }
            db.run("COMMIT", (err) => {
                if(err) return reject(err);
                resolve({ message: "Configurações salvas com sucesso." });
            });
        });

        stmt.finalize();
    });
};

// Cria registros padrão de automações para um novo usuário
exports.createDefaultAutomations = (db, clienteId) => {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare(
            'INSERT OR IGNORE INTO automacoes (gatilho, cliente_id, ativo, mensagem) VALUES (?, ?, 1, ?)'
        );

        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            for (const gatilho in DEFAULT_MESSAGES) {
                const mensagem = DEFAULT_MESSAGES[gatilho];
                stmt.run(gatilho, clienteId, mensagem);
            }
            db.run('COMMIT', err => {
                if (err) return reject(err);
                resolve();
            });
        });

        stmt.finalize();
    });
};
