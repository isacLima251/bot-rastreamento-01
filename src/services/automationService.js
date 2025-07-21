const DEFAULT_MESSAGES = require('../constants/defaultMessages');
const whatsappService = require('./whatsappService');
const DB_CLIENT = process.env.DB_CLIENT || 'sqlite';
const { getSequelize, getModels } = require('../database/database');

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
exports.saveAutomations = async (db, configs, clienteId = null) => {
    const sequelize = getSequelize();
    const { Automacao, AutomacaoPasso } = getModels();
    const t = await sequelize.transaction();
    try {
        for (const gatilho in configs) {
            const config = configs[gatilho];
            await Automacao.upsert({
                gatilho,
                cliente_id: clienteId,
                ativo: config.ativo ? 1 : 0,
                mensagem: config.mensagem || null
            }, { transaction: t });
            await AutomacaoPasso.destroy({ where: { gatilho, cliente_id: clienteId }, transaction: t });
            if (Array.isArray(config.steps)) {
                for (const step of config.steps) {
                    await AutomacaoPasso.create({
                        gatilho,
                        cliente_id: clienteId,
                        ordem: step.ordem,
                        tipo: step.tipo,
                        conteudo: step.conteudo || null,
                        mediaUrl: step.mediaUrl || null
                    }, { transaction: t });
                }
            }
        }
        await t.commit();
        return { message: 'Configurações salvas com sucesso.' };
    } catch (err) {
        await t.rollback();
        throw err;
    }
};

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

    const sequelize = getSequelize();
    const { Automacao, AutomacaoPasso } = getModels();
    const records = Object.entries(DEFAULT_MESSAGES).map(([gatilho, mensagem]) => ({
        gatilho,
        cliente_id: clienteId,
        ativo: 1,
        mensagem
    }));
    const steps = Object.entries(DEFAULT_MESSAGES).map(([gatilho, mensagem]) => ({
        gatilho,
        cliente_id: clienteId,
        ordem: 1,
        tipo: 'texto',
        conteudo: mensagem
    }));
    const t = await sequelize.transaction();
    try {
        await Automacao.bulkCreate(records, { transaction: t, ignoreDuplicates: true });
        await AutomacaoPasso.bulkCreate(steps, { transaction: t });
        await t.commit();
    } catch (err) {
        await t.rollback();
        throw err;
    }
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
