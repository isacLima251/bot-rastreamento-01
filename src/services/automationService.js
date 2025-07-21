const DEFAULT_MESSAGES = require('../constants/defaultMessages');
const whatsappService = require('./whatsappService');
const DB_CLIENT = process.env.DB_CLIENT || 'sqlite';

// Busca todas as automações e seus passos em formato acessível
exports.getAutomations = (db, clienteId = null) => {
    return new Promise((resolve, reject) => {
        let sql = 'SELECT * FROM automacoes';
        const params = [];
        if (clienteId !== null) {
            sql += ' WHERE cliente_id = ?';
            params.push(clienteId);
        }
        db.all(sql, params, (err, rows) => {
            if (err) return reject(err);

            const automationsMap = rows.reduce((acc, row) => {
                acc[row.gatilho] = {
                    ativo: Boolean(row.ativo),
                    mensagem: row.mensagem,
                    steps: []
                };
                return acc;
            }, {});

            const stepSql = clienteId !== null
                ? 'SELECT * FROM automacao_passos WHERE cliente_id = ? ORDER BY gatilho, ordem'
                : 'SELECT * FROM automacao_passos ORDER BY gatilho, ordem';
            const stepParams = clienteId !== null ? [clienteId] : [];
            db.all(stepSql, stepParams, (err2, stepRows) => {
                if (err2) return reject(err2);
                stepRows.forEach(p => {
                    if (automationsMap[p.gatilho]) {
                        automationsMap[p.gatilho].steps.push({
                            ordem: p.ordem,
                            tipo: p.tipo,
                            conteudo: p.conteudo,
                            mediaUrl: p.mediaUrl
                        });
                    }
                });

                for (const gatilho in DEFAULT_MESSAGES) {
                    if (!automationsMap[gatilho]) {
                        automationsMap[gatilho] = {
                            ativo: true,
                            mensagem: DEFAULT_MESSAGES[gatilho],
                            steps: []
                        };
                    }
                }

                resolve(automationsMap);
            });
        });
    });
};

// Salva todas as configurações de automação recebidas do frontend
exports.saveAutomations = (db, configs, clienteId = null) => {
    return new Promise((resolve, reject) => {
        const stmtSql = DB_CLIENT === 'postgres'
            ? 'INSERT INTO automacoes (gatilho, cliente_id, ativo, mensagem) VALUES (?, ?, ?, ?) ON CONFLICT (gatilho, cliente_id) DO UPDATE SET ativo = EXCLUDED.ativo, mensagem = EXCLUDED.mensagem'
            : 'INSERT OR REPLACE INTO automacoes (gatilho, cliente_id, ativo, mensagem) VALUES (?, ?, ?, ?)';
        const stmt = db.prepare(stmtSql);
        const stepStmt = db.prepare('INSERT INTO automacao_passos (gatilho, cliente_id, ordem, tipo, conteudo, mediaUrl, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)');

        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            for (const gatilho in configs) {
                const config = configs[gatilho];
                stmt.run(
                    gatilho,
                    clienteId,
                    config.ativo ? 1 : 0,
                    config.mensagem || null
                );
                db.run('DELETE FROM automacao_passos WHERE gatilho = ? AND cliente_id = ?', [gatilho, clienteId]);
                if (Array.isArray(config.steps)) {
                    config.steps.forEach(step => {
                        stepStmt.run(
                            gatilho,
                            clienteId,
                            step.ordem,
                            step.tipo,
                            step.conteudo || null,
                            step.mediaUrl || null
                        );
                    });
                }
            }
            db.run('COMMIT', (err) => {
                if (err) return reject(err);
                resolve({ message: 'Configurações salvas com sucesso.' });
            });
        });

        stmt.finalize();
        stepStmt.finalize();
    });
};

const { getModels } = require('../database/database');

// Cria registros padrão de automações para um novo usuário
exports.createDefaultAutomations = async (db, clienteId, options = {}) => {
    if (options.transaction) {
        const { Automacao, AutomacaoPasso } = getModels();
        const records = Object.entries(DEFAULT_MESSAGES).map(([gatilho, mensagem]) => ({
            gatilho,
            cliente_id: clienteId,
            ativo: 1,
            mensagem
        }));
        await Automacao.bulkCreate(records, { transaction: options.transaction, ignoreDuplicates: true });
        const steps = Object.entries(DEFAULT_MESSAGES).map(([gatilho, mensagem]) => ({
            gatilho,
            cliente_id: clienteId,
            ordem: 1,
            tipo: 'texto',
            conteudo: mensagem
        }));
        return AutomacaoPasso.bulkCreate(steps, { transaction: options.transaction });
    }

    return new Promise((resolve, reject) => {
        const defaultSql = DB_CLIENT === 'postgres'
            ? 'INSERT INTO automacoes (gatilho, cliente_id, ativo, mensagem) VALUES (?, ?, 1, ?) ON CONFLICT DO NOTHING'
            : 'INSERT OR IGNORE INTO automacoes (gatilho, cliente_id, ativo, mensagem) VALUES (?, ?, 1, ?)';
        const stmt = db.prepare(defaultSql);
        const stepStmt = db.prepare(
            'INSERT INTO automacao_passos (gatilho, cliente_id, ordem, tipo, conteudo, mediaUrl, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
        );

        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            for (const gatilho in DEFAULT_MESSAGES) {
                const mensagem = DEFAULT_MESSAGES[gatilho];
                stmt.run(gatilho, clienteId, mensagem);
                stepStmt.run(gatilho, clienteId, 1, 'texto', mensagem, null);
            }
            db.run('COMMIT', err => {
                if (err) return reject(err);
                resolve();
            });
        });

        stmt.finalize();
        stepStmt.finalize();
    });
};

// Executa os passos de uma automação na ordem definida
exports.executeAutomation = (db, gatilho, clienteId, client, telefone) => {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM automacao_passos WHERE gatilho = ? AND cliente_id = ? ORDER BY ordem';
        db.all(sql, [gatilho, clienteId], async (err, rows) => {
            if (err) return reject(err);
            try {
                for (const passo of rows) {
                    if (passo.tipo === 'texto') {
                        await whatsappService.enviarMensagem(client, telefone, passo.conteudo);
                    } else if (passo.tipo === 'imagem') {
                        await whatsappService.sendImage(client, telefone, passo.mediaUrl, passo.conteudo || '');
                    } else if (passo.tipo === 'audio') {
                        await whatsappService.sendAudio(client, telefone, passo.mediaUrl);
                    } else if (passo.tipo === 'arquivo') {
                        await whatsappService.sendFile(client, telefone, passo.mediaUrl, passo.mediaUrl.split('/').pop(), passo.conteudo || '');
                    } else if (passo.tipo === 'video') {
                        await whatsappService.sendVideo(client, telefone, passo.mediaUrl, passo.conteudo || '');
                    }
                    await new Promise(r => setTimeout(r, 1000));
                }
                resolve();
            } catch (e) {
                reject(e);
            }
        });
    });
};
