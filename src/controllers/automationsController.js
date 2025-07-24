const automationService = require('../services/automationService');
const pedidoService = require('../services/pedidoService');
const rastreamentoService = require('../services/rastreamentoService');
const integrationService = require('../services/integrationConfigService');
const DEFAULT_MESSAGES = require('../constants/defaultMessages');
const { personalizarMensagem, enviarPassos } = require('./envioController');

exports.listarAutomacoes = async (req, res) => {
    try {
        const automacoes = await automationService.getAutomations(req.db, req.user.id);
        res.status(200).json(automacoes);
    } catch (error) {
        console.error("ERRO DETALHADO AO BUSCAR AUTOMAÇÕES:", error);
        res.status(500).json({ error: "Falha ao buscar configurações de automação." });
    }
};

exports.salvarAutomacoes = async (req, res) => {
    const configs = req.body;
    try {
        const result = await automationService.saveAutomations(req.db, configs, req.user.id);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: "Falha ao salvar configurações de automação." });
    }
};

exports.testarAutomacao = async (req, res) => {
    const { gatilho, codigoRastreio } = req.body;
    const db = req.db;
    const clienteId = req.user.id;
    const client = req.venomClient;

    if (!client) {
        return res.status(400).json({ error: 'Conecte o WhatsApp para realizar o teste.' });
    }
    if (!gatilho || !codigoRastreio) {
        return res.status(400).json({ error: 'Parâmetros inválidos.' });
    }

    try {
        const pedido = await pedidoService.findPedidoByCodigo(db, codigoRastreio, clienteId);
        if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado.' });

        const config = await integrationService.getConfig(db, clienteId);
        const apiKey = config && config.rastreio_api_key;
        const dados = await rastreamentoService.rastrearCodigo(codigoRastreio, apiKey);

        const updateData = {
            lastCheckedAt: new Date().toISOString(),
            checkCount: (pedido.checkCount || 0) + 1
        };
        if (dados.statusInterno && dados.statusInterno !== pedido.statusInterno) {
            Object.assign(updateData, {
                statusInterno: dados.statusInterno,
                ultimaLocalizacao: dados.ultimaLocalizacao,
                ultimaAtualizacao: dados.ultimaAtualizacao,
                origemUltimaMovimentacao: dados.origemUltimaMovimentacao,
                destinoUltimaMovimentacao: dados.destinoUltimaMovimentacao,
                descricaoUltimoEvento: dados.descricaoUltimoEvento,
                statusChangeAt: new Date().toISOString()
            });
        }

        await pedidoService.updateCamposPedido(db, pedido.id, updateData, clienteId);
        Object.assign(pedido, updateData);

        const automacoes = await automationService.getAutomations(db, clienteId);
        const automacao = automacoes[gatilho];
        if (!automacao) return res.status(404).json({ error: 'Automação não encontrada.' });

        const host = await client.getHostDevice();
        const telefoneAdmin = host && host.id && host.id.user;
        if (!telefoneAdmin) return res.status(500).json({ error: 'Número do administrador não encontrado.' });

        const steps = Array.isArray(automacao.steps) && automacao.steps.length > 0
            ? automacao.steps
            : [{ ordem: 1, tipo: 'texto', conteudo: automacao.mensagem || DEFAULT_MESSAGES[gatilho], mediaUrl: null }];

        await enviarPassos(db, client, telefoneAdmin, steps, pedido);

        res.json({ message: 'Mensagem de teste enviada.' });
    } catch (error) {
        console.error('Erro ao testar automação:', error);
        res.status(500).json({ error: 'Falha ao testar automação.' });
    }
};
