// src/controllers/pedidosController.js
const pedidoService = require('../services/pedidoService');
const whatsappService = require('../services/whatsappService');
const logService = require('../services/logService');
const subscriptionService = require('../services/subscriptionService');
const envioController = require('./envioController');
const { body, validationResult } = require('express-validator');

// LÊ todos os pedidos
exports.listarPedidos = (req, res) => {
    const db = req.db;
    const clienteId = req.user.id;
    const { busca, filtroStatus } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;

    let params = [clienteId];
    let conditions = ["cliente_id = ?"];

    if (busca) {
        conditions.push("(nome LIKE ? OR telefone LIKE ?)");
        params.push(`%${busca}%`, `%${busca}%`);
    }

    if (filtroStatus) {
        if (filtroStatus === 'caminho') {
            conditions.push("statusInterno IS NOT NULL AND statusInterno != 'entregue'");
        } else if (filtroStatus === 'entregue') {
            conditions.push("statusInterno = ?");
            params.push('entregue');
        }
    }

    let sql = "SELECT * FROM pedidos";
    if (conditions.length > 0) {
        sql += " WHERE " + conditions.join(" AND ");
    }
    const whereClause = conditions.length > 0 ? " WHERE " + conditions.join(" AND ") : "";
    const sqlPaginated = `${sql} ORDER BY dataUltimaMensagem DESC, id DESC LIMIT ? OFFSET ?`;
    const sqlCount = `SELECT COUNT(*) as total FROM pedidos${whereClause}`;

    db.all(sqlPaginated, [...params, limit, offset], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        db.get(sqlCount, params, (err2, row) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ data: rows, total: row.total });
        });
    });
};

// Normalizador de telefone
function normalizeTelefone(telefoneRaw) {
    if (!telefoneRaw) return null;
    let digitos = String(telefoneRaw).replace(/\D/g, '');
    if (digitos.startsWith('55')) {
        digitos = digitos.substring(2);
    }
    if (digitos.length < 10 || digitos.length > 11) {
        return null;
    }
    const ddd = digitos.substring(0, 2);
    let numero = digitos.substring(2);
    if (numero.length === 8 && ['6', '7', '8', '9'].includes(numero[0])) {
        numero = '9' + numero;
    }
    if (numero.length !== 9) {
        return null;
    }
    return `55${ddd}${numero}`;
}

// CRIA um novo pedido
exports.criarPedido = [
    body('nome').trim().notEmpty().withMessage('O nome é obrigatório.'),
    body('telefone').isMobilePhone('pt-BR').withMessage('Número de telefone inválido.'),
    body('codigoRastreio').trim().notEmpty().withMessage('O código de rastreio é obrigatório.'),

    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const db = req.db;
        const client = req.venomClient;
        const clienteId = req.user.id;
        const { nome, telefone, produto, codigoRastreio } = req.body;

        try {
            const sub = await subscriptionService.getUserSubscription(req.db, clienteId);
            if (sub.monthly_limit !== -1 && sub.usage >= sub.monthly_limit) {
                return res.status(403).json({ error: 'Limite do plano excedido. Faça um upgrade para adicionar mais pedidos.' });
            }

            const telefoneNormalizado = normalizeTelefone(telefone);
            if (!telefoneNormalizado) {
                return res.status(400).json({ error: "O número de celular fornecido é inválido." });
            }

            const pedidoExistente = await pedidoService.findPedidoByTelefone(db, telefoneNormalizado, clienteId);
            if (pedidoExistente) {
                return res.status(409).json({ error: `Este número (${telefoneNormalizado}) já está cadastrado.` });
            }

            const pedidoCriado = await pedidoService.criarPedido(db, { ...req.body, telefone: telefoneNormalizado }, client, clienteId);
            pedidoCriado.cliente_id = clienteId;

            await subscriptionService.incrementUsage(db, sub.id);

            await envioController.enviarMensagemBoasVindas(db, pedidoCriado, req.broadcast, client);
            req.broadcast({ type: 'novo_contato', pedido: pedidoCriado });
            await logService.addLog(db, clienteId, 'pedido_criado', JSON.stringify({ pedidoId: pedidoCriado.id }));

            res.status(201).json({
                message: "Pedido criado com sucesso!",
                data: pedidoCriado
            });

        } catch (error) {
            console.error("Erro ao criar pedido:", error.message);
            res.status(500).json({ error: "Erro interno no servidor ao criar pedido." });
        }
    }
];

// ATUALIZA um pedido
exports.atualizarPedido = async (req, res) => {
    const db = req.db;
    const clienteId = req.user.id;
    const { id } = req.params;
    const dados = req.body;

    if (dados.telefone) {
        dados.telefone = normalizeTelefone(dados.telefone);
        if (!dados.telefone) {
            return res.status(400).json({ error: "O número de telefone para atualização é inválido." });
        }
    }

    try {
        const pedidoAnterior = await pedidoService.getPedidoById(db, id, clienteId);
        if (!pedidoAnterior) return res.status(404).json({ error: `Pedido com ID ${id} não encontrado.` });
        const result = await pedidoService.updateCamposPedido(db, id, dados, clienteId);
        if (result.changes === 0) return res.status(404).json({ error: `Pedido com ID ${id} não encontrado.` });

        if ((!pedidoAnterior.codigoRastreio || pedidoAnterior.codigoRastreio === '') && dados.codigoRastreio) {
            await subscriptionService.incrementUsage(db, req.subscription.id);
        }
        
        // Notifica o frontend
        req.broadcast({ type: 'pedido_atualizado', pedidoId: id });

        res.json({ message: `Pedido com ID ${id} atualizado com sucesso.` });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
};

// APAGA um pedido e seu histórico
exports.deletarPedido = (req, res) => {
    const db = req.db;
    const clienteId = req.user.id;
    const { id } = req.params;
    db.serialize(() => {
        db.run('DELETE FROM historico_mensagens WHERE pedido_id = ? AND cliente_id = ?', [id, clienteId]);
        db.run('DELETE FROM pedidos WHERE id = ? AND cliente_id = ?', [id, clienteId], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: `Pedido com ID ${id} não encontrado.` });

            // Notifica o frontend
            req.broadcast({ type: 'pedido_deletado', pedidoId: id });

            res.json({ message: `Pedido com ID ${id} deletado com sucesso.` });
        });
    });
};

// BUSCA O HISTÓRICO de mensagens
exports.getHistoricoDoPedido = async (req, res) => {
    const db = req.db;
    const clienteId = req.user.id;
    const { id } = req.params;
    try {
        const historico = await pedidoService.getHistoricoPorPedidoId(db, id, clienteId);
        res.json({ data: historico });
    } catch (error) {
        res.status(500).json({ error: "Falha ao buscar o histórico do pedido." });
    }
};

// ENVIA uma mensagem manualmente
exports.enviarMensagemManual = async (req, res) => {
    const db = req.db;
    const clienteId = req.user.id;
    const { id } = req.params;
    const { mensagem } = req.body;
    const broadcast = req.broadcast; // Pega a função de broadcast

    if (!mensagem) {
        return res.status(400).json({ error: "O campo 'mensagem' é obrigatório." });
    }

    try {
        const pedido = await pedidoService.getPedidoById(db, id, clienteId);
        if (!pedido) return res.status(404).json({ error: "Pedido não encontrado." });

        if (!req.venomClient) {
            return res.status(409).json({ error: 'A sua conta não está conectada ao WhatsApp.' });
        }

        await whatsappService.enviarMensagem(req.venomClient, pedido.telefone, mensagem);
        await pedidoService.addMensagemHistorico(db, id, mensagem, 'manual', 'bot', clienteId);

        await logService.addLog(db, clienteId, 'mensagem_manual', JSON.stringify({ pedidoId: id }));
        
        // MUDANÇA: Notifica todos os painéis abertos sobre a nova mensagem
        broadcast({ type: 'nova_mensagem', pedidoId: parseInt(id) });

        res.status(200).json({ message: "Mensagem enviada com sucesso!" });
    } catch (error) {
        console.error("Erro no envio manual:", error);
        res.status(500).json({ error: "Falha ao enviar a mensagem." });
    }
};


// ATUALIZA a foto de perfil
exports.atualizarFotoDoPedido = async (req, res) => {
    const db = req.db;
    const clienteId = req.user.id;
    const { id } = req.params;
    const client = req.venomClient;

    if (!client) {
        return res.status(500).json({ error: "Cliente WhatsApp não está conectado." });
    }

    try {
        const pedido = await pedidoService.getPedidoById(db, id, clienteId);
        if (!pedido) {
            return res.status(404).json({ error: "Pedido não encontrado." });
        }

        const fotoUrl = await whatsappService.getProfilePicUrl(client, pedido.telefone);
        
        if (fotoUrl) {
            await pedidoService.updateCamposPedido(db, id, { fotoPerfilUrl: fotoUrl }, clienteId);
            req.broadcast({ type: 'pedido_atualizado', pedidoId: id });
            res.status(200).json({ message: "Foto de perfil atualizada com sucesso!", data: { fotoUrl } });
        } else {
             res.status(200).json({ message: "Nenhuma foto de perfil foi encontrada para este contato.", data: { fotoUrl: null } });
        }

    } catch (error) {
        console.error("Erro ao tentar atualizar a foto do pedido:", error);
        res.status(500).json({ error: "Falha ao buscar ou atualizar a foto de perfil." });
    }
};

// MARCA mensagens como lidas
exports.marcarComoLido = async (req, res) => {
    const db = req.db;
    const clienteId = req.user.id;
    const { id } = req.params;
    try {
        await pedidoService.marcarComoLido(db, id, clienteId);
        req.broadcast({ type: 'pedido_atualizado', pedidoId: id });
        res.status(200).json({ message: "Mensagens marcadas como lidas." });
    } catch (error) {
        res.status(500).json({ error: "Falha ao marcar como lido." });
    }
};

// Importação em massa de pedidos
exports.importarPedidos = async (req, res) => {
    const db = req.db;
    const client = req.venomClient;
    const clienteId = req.user.id;
    const pedidosParaImportar = req.body.pedidos;

    if (!pedidosParaImportar || !Array.isArray(pedidosParaImportar) || pedidosParaImportar.length === 0) {
        return res.status(400).json({ error: 'Nenhum dado válido para importar.' });
    }

    try {
        const sub = await subscriptionService.getUserSubscription(req.db, clienteId);
        const novosRastreios = pedidosParaImportar.length;

        if (sub.monthly_limit !== -1 && (sub.usage + novosRastreios) > sub.monthly_limit) {
            return res.status(403).json({
                error: `Limite do plano excedido. Você tem ${sub.usage}/${sub.monthly_limit} usos. A importação de ${novosRastreios} novos pedidos ultrapassaria o seu limite.`
            });
        }

        let sucessos = 0;
        let falhas = 0;
        const erros = [];

        for (const pedidoData of pedidosParaImportar) {
            const telefoneNormalizado = normalizeTelefone(pedidoData.telefone);

            if (!telefoneNormalizado || !pedidoData.nome || !pedidoData.codigoRastreio) {
                falhas++;
                erros.push(`Linha com nome '${pedidoData.nome || 'N/A'}' ignorada: Nome, telefone e código de rastreio são obrigatórios.`);
                continue;
            }

            const pedidoExistente = await pedidoService.findPedidoByTelefone(db, telefoneNormalizado, clienteId);
            if (pedidoExistente) {
                falhas++;
                erros.push(`Contato com telefone ${telefoneNormalizado} já existe.`);
                continue;
            }

            const pedidoCriado = await pedidoService.criarPedido(db, { ...pedidoData, telefone: telefoneNormalizado }, client, clienteId);
            await subscriptionService.incrementUsage(db, sub.id);
            sucessos++;
        }

        res.status(200).json({
            message: 'Importação concluída.',
            sucessos,
            falhas,
            erros
        });

    } catch (error) {
        console.error("Erro na importação em massa:", error);
        res.status(500).json({ error: "Erro interno no servidor durante a importação." });
    }
};

