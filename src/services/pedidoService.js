// --- CORREÇÃO: Importando o whatsappService ---
const whatsappService = require('./whatsappService');
const logger = require('../logger');
const { normalizeTelefone } = require("../utils/normalizeTelefone");
const DB_CLIENT = process.env.DB_CLIENT || 'sqlite';
const q = c => DB_CLIENT === 'postgres' ? `"${c}"` : c;
/**
 * Busca todos os pedidos do banco de dados.
 */
const getAllPedidos = (db, clienteId = null) => {
    return new Promise((resolve, reject) => {
        let sql = "SELECT * FROM pedidos";
        const params = [];
        if (clienteId !== null && clienteId !== undefined) {
            sql += " WHERE cliente_id = ?";
            params.push(clienteId);
        }
        sql += " ORDER BY id DESC";
        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error("Erro ao buscar todos os pedidos", err);
                return reject(err);
            }
            resolve(rows);
        });
    });
};

/**
 * Busca um único pedido pelo seu ID.
 */
const getPedidoById = (db, id, clienteId = null) => {
    return new Promise((resolve, reject) => {
        let sql = "SELECT * FROM pedidos WHERE id = ?";
        const params = [id];
        if (clienteId !== null && clienteId !== undefined) {
            sql += " AND cliente_id = ?";
            params.push(clienteId);
        }
        db.get(sql, params, (err, row) => {
            if (err) {
                console.error(`Erro ao buscar pedido por ID ${id}`, err);
                return reject(err);
            }
            resolve(row);
        });
    });
};

/**
 * Busca um pedido pelo número de telefone.
 */
const findPedidoByTelefone = (db, telefone, clienteId = null) => {
    return new Promise((resolve, reject) => {
        // A partir de agora, a busca é simples, pois o número sempre será normalizado da mesma forma
        const telefoneNormalizado = normalizeTelefone(telefone);
        
        if (!telefoneNormalizado) {
            // Se o número de telefone de entrada for inválido, não há como encontrar.
            return resolve(null);
        }
        
        let sql = "SELECT * FROM pedidos WHERE telefone = ?";
        const params = [telefoneNormalizado];
        if (clienteId !== null && clienteId !== undefined) {
            sql += " AND cliente_id = ?";
            params.push(clienteId);
        }

        db.get(sql, params, (err, row) => {
            if (err) {
                console.error(`Erro ao buscar pedido por telefone (normalizado) ${telefoneNormalizado}`, err);
                return reject(err);
            }
            resolve(row);
        });
    });
};

/**
 * Busca um pedido pelo e-mail do cliente.
 */
const findPedidoByEmail = (db, email, clienteId = null) => {
    return new Promise((resolve, reject) => {
        const sql = "SELECT * FROM pedidos WHERE email = ? AND cliente_id = ? ORDER BY id DESC LIMIT 1";
        db.get(sql, [email, clienteId], (err, row) => {
            if (err) {
                console.error(`Erro ao buscar pedido por email ${email}`, err);
                return reject(err);
            }
            resolve(row);
        });
    });
};

/**
 * Busca um pedido pelo código de rastreio.
 */
const findPedidoByCodigo = (db, codigo, clienteId) => {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM pedidos WHERE ${q('codigoRastreio')} = ? AND cliente_id = ?`;
        db.get(sql, [codigo, clienteId], (err, row) => {
            if (err) {
                console.error(`Erro ao buscar pedido por código ${codigo}`, err);
                return reject(err);
            }
            resolve(row);
        });
    });
};
/**
 * Atualiza um ou mais campos de um pedido específico.
 */
const updateCamposPedido = async (db, pedidoId, campos, clienteId = null) => {
    try {
        // Filtra os campos para remover qualquer chave cujo valor seja undefined
        const camposValidos = Object.keys(campos || {}).filter(key => campos[key] !== undefined);

        // Se não houver campos válidos, não há o que atualizar
        if (camposValidos.length === 0) {
            logger.info(`Nenhum campo válido para atualizar no pedido ${pedidoId}.`);
            return { changes: 0 };
        }

        // Monta dinamicamente a cláusula SET apenas com os campos permitidos
        const setClause = camposValidos.map(key => `${q(key)} = ?`).join(', ');
        let query = `UPDATE pedidos SET ${setClause} WHERE id = ?`;

        // Os valores devem seguir exatamente a ordem da cláusula SET
        const replacements = [...camposValidos.map(key => campos[key]), pedidoId];

        if (clienteId !== null && clienteId !== undefined) {
            query += ' AND cliente_id = ?';
            replacements.push(clienteId);
        }

        logger.info(`Executando query segura: ${query} com valores: ${JSON.stringify(replacements)}`);

        return await new Promise((resolve, reject) => {
            db.run(query, replacements, function(err) {
                if (err) {
                    console.error(`Erro ao executar update dinâmico para o pedido ${pedidoId} com campos ${JSON.stringify(campos)}:`, err);
                    return reject(err);
                }
                resolve({ changes: this.changes });
            });
        });
    } catch (error) {
        console.error(`Erro ao executar update dinâmico para o pedido ${pedidoId} com campos ${JSON.stringify(campos)}:`, error);
        throw error;
    }
};

/**
 * Adiciona uma nova entrada ao histórico de mensagens.
 */
const addMensagemHistorico = (db, pedidoId, mensagem, tipoMensagem, origem, clienteId = null, mediaUrl = null, messageType = 'texto') => {
    return new Promise((resolve, reject) => {
        const sqlInsert = `INSERT INTO historico_mensagens (pedido_id, cliente_id, mensagem, tipo_mensagem, origem, media_url, message_type) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const sanitizedMessage = (mensagem === undefined || mensagem === null) ? '' : mensagem;
        const params = [pedidoId, clienteId ?? null, sanitizedMessage, tipoMensagem, origem, mediaUrl, messageType];

        db.run(sqlInsert, params, function(err) {
            if (err) {
                console.error(`Erro ao adicionar ao histórico do pedido ${pedidoId}`, err);
                return reject(err);
            }

            // --- NOVO: Atualiza a tabela de pedidos com a última mensagem ---
            const dataAgora = new Date().toISOString();
            let sqlUpdate = `UPDATE pedidos SET ${q('ultimaMensagem')} = ?, ${q('dataUltimaMensagem')} = ? WHERE id = ?`;
            const valuesUpdate = [mensagem, dataAgora, pedidoId];
            if (clienteId !== null && clienteId !== undefined) {
                sqlUpdate += ' AND cliente_id = ?';
                valuesUpdate.push(clienteId);
            }

            db.run(sqlUpdate, valuesUpdate, (updateErr) => {
                if (updateErr) {
                    // Mesmo se esta atualização falhar, não quebra a operação principal
                    console.error(`Erro ao atualizar ultimaMensagem para o pedido ${pedidoId}`, updateErr);
                }
                resolve({ id: this.lastID });
            });
        });
    });
};
/**
 * Busca o histórico de mensagens de um pedido específico.
 */
const getHistoricoPorPedidoId = (db, pedidoId, clienteId) => {
    const sql = `SELECT * FROM historico_mensagens
                 WHERE pedido_id = ? AND (cliente_id = ? OR cliente_id IS NULL)
                 ORDER BY data_envio ASC`;
    return new Promise((resolve, reject) => {
        db.all(sql, [pedidoId, clienteId], (err, rows) => {
            if (err) {
                console.error(`Erro ao buscar histórico do pedido ${pedidoId}`, err);
                return reject(err);
            }
            resolve(rows);
        });
    });
};

const getPedidosComCodigoAtivo = (db, clienteId, inicioCiclo, fimCiclo) => {
    const sql = `SELECT id, nome, produto, ${q('codigoRastreio')}, ${q('dataCriacao')}, ${q('statusInterno')}
                 FROM pedidos
                 WHERE cliente_id = ?
                   AND ${q('codigoRastreio')} IS NOT NULL
                   AND ${q('codigoRastreio')} != ''
                   AND (${q('statusInterno')} IS NULL OR ${q('statusInterno')} != 'entregue')
                   AND ${q('dataCriacao')} >= ? AND ${q('dataCriacao')} < ?`;
    return new Promise((resolve, reject) => {
        db.all(sql, [clienteId, inicioCiclo, fimCiclo], (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
};

/**
 * Incrementa o contador de mensagens não lidas para um pedido.
 */
const incrementarNaoLidas = (db, pedidoId, clienteId = null) => {
    return new Promise((resolve, reject) => {
        let sql = `UPDATE pedidos SET ${q('mensagensNaoLidas')} = ${q('mensagensNaoLidas')} + 1 WHERE id = ?`;
        const params = [pedidoId];
        if (clienteId !== null && clienteId !== undefined) {
            sql += ' AND cliente_id = ?';
            params.push(clienteId);
        }
        db.run(sql, params, function (err) {
            if (err) {
                console.error("Erro ao incrementar mensagens não lidas:", err.message);
                return reject(err);
            }
            resolve({ changes: this.changes });
        });
    });
};

/**
 * Zera o contador de mensagens não lidas para um pedido.
 */
const marcarComoLido = (db, pedidoId, clienteId = null) => {
    return new Promise((resolve, reject) => {
        let sql = `UPDATE pedidos SET ${q('mensagensNaoLidas')} = 0 WHERE id = ?`;
        const params = [pedidoId];
        if (clienteId !== null && clienteId !== undefined) {
            sql += ' AND cliente_id = ?';
            params.push(clienteId);
        }
        db.run(sql, params, function (err) {
            if (err) {
                console.error("Erro ao marcar mensagens como lidas:", err.message);
                return reject(err);
            }
            resolve({ changes: this.changes });
        });
    });
};

/**
 * Cria um novo pedido no banco de dados.
 */
const criarPedido = (db, dadosPedido, client, clienteId = null) => {
    return new Promise(async (resolve, reject) => {
        const { nome, telefone, email, produto, codigoRastreio, notas } = dadosPedido;
        const telefoneValidado = normalizeTelefone(telefone);

        if (!telefoneValidado || !nome) {
            return reject(new Error("Nome e um número de celular válido são obrigatórios."));
        }

        const fotoUrl = await whatsappService.getProfilePicUrl();

        const sql = `INSERT INTO pedidos (cliente_id, nome, email, telefone, produto, ${q('codigoRastreio')}, notas, ${q('fotoPerfilUrl')}, ${q('dataCriacao')}, ${q('lastCheckedAt')}, ${q('statusChangeAt')}, ${q('checkCount')}, ${q('alertSent')}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const params = [clienteId, nome, email || null, telefoneValidado, produto || null, codigoRastreio || null, notas || null, fotoUrl, new Date().toISOString(), null, null, 0, 0];

        db.run(sql, params, function (err) {
            if (err) return reject(err);
            resolve({
                id: this.lastID, nome, telefone: telefoneValidado, email, produto, codigoRastreio, notas, fotoPerfilUrl: fotoUrl
            });
        });
    });
};


module.exports = {
    getAllPedidos,
    getPedidoById,
    findPedidoByTelefone,
    findPedidoByEmail,
    findPedidoByCodigo,
    updateCamposPedido,
    addMensagemHistorico,
    getHistoricoPorPedidoId,
    incrementarNaoLidas,
    marcarComoLido,
    criarPedido,
    getPedidosComCodigoAtivo,
    normalizeTelefone,
};
