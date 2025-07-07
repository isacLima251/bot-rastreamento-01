// src/controllers/rastreamentoController.js
const pedidoService = require('../services/pedidoService');
const rastreamentoService = require('../services/rastreamentoService');
const logService = require('../services/logService');
const integrationService = require('../services/integrationConfigService');

/**
 * Procura por todos os pedidos que podem ser rastreados, consulta o seu status
 * e actualiza o banco de dados se houver alguma novidade.
 * @param {object} db A instância do banco de dados.
 */
async function verificarRastreios(db, client, clienteId, broadcast) {
    try {
        const pedidos = await pedidoService.getAllPedidos(db, clienteId);
        
        // Filtra apenas os pedidos que têm código e ainda não foram marcados como "entregue"
        const pedidosParaRastrear = pedidos.filter(p => p.codigoRastreio && p.statusInterno !== 'entregue');

        if (pedidosParaRastrear.length === 0) {
            return;
        }


        for (const pedido of pedidosParaRastrear) {
            try {
                const config = await integrationService.getConfig(db, pedido.cliente_id || 1);
                const apiKey = config && config.rastreio_api_key;
                const dadosRastreio = await rastreamentoService.rastrearCodigo(pedido.codigoRastreio, apiKey);

                const novoStatus = (dadosRastreio.statusInterno || '').toLowerCase();

                // Actualiza o DB apenas se o status da API for novo e diferente do que já temos
                if (novoStatus && novoStatus !== pedido.statusInterno) {

                    const dadosParaAtualizar = {
                        statusInterno: novoStatus,
                        ultimaLocalizacao: dadosRastreio.ultimaLocalizacao,
                        ultimaAtualizacao: dadosRastreio.ultimaAtualizacao,
                        origemUltimaMovimentacao: dadosRastreio.origemUltimaMovimentacao,
                        destinoUltimaMovimentacao: dadosRastreio.destinoUltimaMovimentacao,
                        descricaoUltimoEvento: dadosRastreio.descricaoUltimoEvento,
                    };

                    await pedidoService.updateCamposPedido(db, pedido.id, dadosParaAtualizar, clienteId);
                    if (broadcast) broadcast({ type: 'pedido_atualizado', pedidoId: pedido.id });

                    await logService.addLog(db, pedido.cliente_id || 1, 'rastreamento', JSON.stringify({ pedidoId: pedido.id, status: novoStatus }));
                }
            } catch (err) {
                console.error(`❌ Falha ao rastrear o pedido #${pedido.id}. Erro:`, err.message);
                await logService.addLog(db, pedido.cliente_id, 'falha_rastreamento', JSON.stringify({ pedidoId: pedido.id, erro: err.message }));
            }
        }
    } catch (err) {
        console.error('❌ Falha no ciclo de verificação de rastreios:', err);
    }
}

module.exports = { verificarRastreios };

