const pedidoService = require('../services/pedidoService');
const rastreamentoService = require('../services/rastreamentoService');
const logService = require('../services/logService');
const integrationService = require('../services/integrationConfigService');

const MAX_CHECKS = 100;

function shouldCheck(pedido, nowSP) {
    const status = (pedido.statusInterno || '').toLowerCase();
    if (status === 'entregue' || status === 'devolvido') return false;

    const lastChecked = pedido.lastCheckedAt ? new Date(pedido.lastCheckedAt) : null;

    if (pedido.checkCount >= MAX_CHECKS) {
        if (!lastChecked) return true;
        return nowSP - lastChecked >= 24 * 60 * 60 * 1000;
    }

    if (status === 'saiu para entrega') {
        if (!lastChecked) return true;
        return nowSP - lastChecked >= 30 * 60 * 1000;
    }

    if (status === 'postado') {
        const statusChange = pedido.statusChangeAt ? new Date(pedido.statusChangeAt) : null;
        const daysSince = statusChange ? Math.floor((nowSP - statusChange) / (24 * 60 * 60 * 1000)) : 0;
        if (daysSince === 0) {
            return !lastChecked;
        }
        if (!lastChecked) return true;
        return nowSP - lastChecked >= 8 * 60 * 60 * 1000;
    }

    const times = [
        { h: 10, m: 30 },
        { h: 14, m: 30 }
    ];

    for (const t of times) {
        const target = new Date(nowSP);
        target.setHours(t.h, t.m, 0, 0);
        if (nowSP >= target && nowSP - target < 5 * 60 * 1000) {
            if (!lastChecked || lastChecked < target) return true;
        }
    }
    return false;
}

/**
 * Procura por todos os pedidos que podem ser rastreados, consulta o seu status
 * e actualiza o banco de dados se houver alguma novidade.
 * @param {object} db A instância do banco de dados.
 */
async function verificarRastreios(db, client, clienteId, broadcast) {
    try {
        const saoPauloNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
        const hora = saoPauloNow.getHours();
        if (hora >= 22 || hora < 6) return;

        const pedidos = await pedidoService.getAllPedidos(db, clienteId);
        const pedidosParaRastrear = pedidos.filter(p => p.codigoRastreio && p.statusInterno !== 'entregue' && p.statusInterno !== 'devolvido');
        if (!pedidosParaRastrear.length) return;

        for (const pedido of pedidosParaRastrear) {
            if (!shouldCheck(pedido, saoPauloNow)) continue;

            try {
                const config = await integrationService.getConfig(db, pedido.cliente_id || 1);
                const apiKey = config && config.rastreio_api_key;
                const dadosRastreio = await rastreamentoService.rastrearCodigo(pedido.codigoRastreio, apiKey);

                const novoStatus = (dadosRastreio.statusInterno || '').toLowerCase();

                const updateData = {
                    lastCheckedAt: new Date().toISOString(),
                    checkCount: (pedido.checkCount || 0) + 1
                };

                if (novoStatus && novoStatus !== pedido.statusInterno) {
                    Object.assign(updateData, {
                        statusInterno: novoStatus,
                        ultimaLocalizacao: dadosRastreio.ultimaLocalizacao,
                        ultimaAtualizacao: dadosRastreio.ultimaAtualizacao,
                        origemUltimaMovimentacao: dadosRastreio.origemUltimaMovimentacao,
                        destinoUltimaMovimentacao: dadosRastreio.destinoUltimaMovimentacao,
                        descricaoUltimoEvento: dadosRastreio.descricaoUltimoEvento,
                        statusChangeAt: new Date().toISOString()
                    });
                }

                await pedidoService.updateCamposPedido(db, pedido.id, updateData, clienteId);
                if (novoStatus && novoStatus !== pedido.statusInterno && broadcast) {
                    broadcast({ type: 'pedido_atualizado', pedidoId: pedido.id });
                }

                await logService.addLog(db, pedido.cliente_id || 1, 'rastreamento', JSON.stringify({ pedidoId: pedido.id, status: novoStatus }));
            } catch (err) {
                console.error(`❌ Falha ao rastrear o pedido #${pedido.id}. Erro:`, err.message);
                await logService.addLog(db, pedido.cliente_id, 'falha_rastreamento', JSON.stringify({ pedidoId: pedido.id, erro: err.message }));
            }
        }
    } catch (err) {
        console.error('❌ Falha no ciclo de verificação de rastreios:', err);
    }
}

module.exports = { verificarRastreios, shouldCheck };

