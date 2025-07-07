// src/controllers/webhookRastreioController.js
const pedidoService = require('../services/pedidoService');

exports.receberWebhook = async (req, res) => {
    const db = req.db;
    const evento = req.body;


    const codigoRastreio = evento.code;
    const statusAtual = evento.status;
    const cidade = evento.location;
    const dataEvento = evento.datetime;

    if (!codigoRastreio || !statusAtual) {
        return res.status(400).json({ error: 'Evento inválido. Código de rastreio ou status faltando.' });
    }

    try {
        const pedidos = await pedidoService.getAllPedidos(db);
        const pedido = pedidos.find(p => p.codigoRastreio === codigoRastreio);

        if (pedido) {
            await pedidoService.updateCamposPedido(db, pedido.id, {
                statusInterno: statusAtual,
                ultimaLocalizacao: cidade,
                ultimaAtualizacao: dataEvento,
            });


            // Opcional: você pode disparar uma mensagem WhatsApp aqui se quiser
        }

        res.status(200).json({ message: 'Evento processado com sucesso.' });
    } catch (error) {
        console.error('❌ Erro ao processar Webhook:', error);
        res.status(500).json({ error: 'Erro interno ao processar evento.' });
    }
};

