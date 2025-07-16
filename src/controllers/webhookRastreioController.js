const pedidoService = require('../services/pedidoService');

exports.receberWebhook = async (req, res) => {
    const db = req.db;
    const evento = req.body;


    const codigoRastreio = evento.code;
    const statusAtual = evento.status;
    const clienteId = evento.cliente_id;
    const cidade = evento.location;
    const dataEvento = evento.datetime;

    if (!codigoRastreio || !statusAtual || !clienteId) {
        return res.status(400).json({ error: 'Evento inválido. Código de rastreio, cliente ou status faltando.' });
    }

    try {
        const pedido = await pedidoService.findPedidoByCodigo(db, codigoRastreio, clienteId);

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

