const pedidoService = require('../services/pedidoService');
const whatsappService = require('../services/whatsappService');
const automationService = require('../services/automationService');
const logService = require('../services/logService');
const DEFAULT_MESSAGES = require('../constants/defaultMessages');
const path = require('path');

async function enviarPassos(db, client, telefone, steps, pedido) {
    for (const passo of steps.sort((a,b) => a.ordem - b.ordem)) {
        const texto = personalizarMensagem(passo.conteudo, pedido);
        switch (passo.tipo) {
            case 'imagem':
                await whatsappService.sendImage(client, telefone, passo.mediaUrl, texto || '');
                break;
            case 'audio':
                await whatsappService.sendAudio(client, telefone, passo.mediaUrl);
                break;
            case 'arquivo':
                await whatsappService.sendFile(client, telefone, passo.mediaUrl, path.basename(passo.mediaUrl), texto || '');
                break;
            case 'video':
                await whatsappService.sendVideo(client, telefone, passo.mediaUrl, texto || '');
                break;
            case 'texto':
            default:
                if (texto) await whatsappService.enviarMensagem(client, telefone, texto);
                break;
        }
        await pedidoService.addMensagemHistorico(db, pedido.id, texto, 'automacao', 'bot', pedido.cliente_id, passo.mediaUrl || null, passo.tipo);
        await new Promise(r => setTimeout(r, 1000));
    }
}


function personalizarMensagem(mensagem, pedido) {
    if (!mensagem) return null;

    const nomeCompleto = pedido.nome || '';
    const primeiroNome = nomeCompleto.split(' ')[0];

    let dataFormatada = '';
    if (pedido.ultimaAtualizacao) {
        try {
            const data = new Date(pedido.ultimaAtualizacao);
            dataFormatada = data.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        } catch(e) {
            dataFormatada = pedido.ultimaAtualizacao;
        }
    }

    const linkRastreio = pedido.codigoRastreio 
        ? `https://rastreamento.correios.com.br/app/index.php?objetos=${pedido.codigoRastreio}`
        : '';

    return mensagem
        .replace(/{{nome_cliente}}/g, nomeCompleto)
        .replace(/{{primeiro_nome}}/g, primeiroNome)
        .replace(/{{produto_nome}}/g, pedido.produto || '')
        .replace(/{{codigo_rastreio}}/g, pedido.codigoRastreio || '')
        .replace(/{{status_atual}}/g, pedido.statusInterno || 'Status não disponível')
        .replace(/{{data_atualizacao}}/g, dataFormatada || 'Data não disponível')
        .replace(/{{cidade_etapa_origem}}/g, pedido.origemUltimaMovimentacao || '')
        .replace(/{{cidade_etapa_destino}}/g, pedido.destinoUltimaMovimentacao || '')
        .replace(/{{link_rastreio}}/g, linkRastreio);
}

async function enviarMensagensComRegras(db, broadcast, sessions) {
    try {
        for (const [userId, sess] of sessions.entries()) {
            if (sess.status !== 'CONNECTED') continue;

            const automacoes = await automationService.getAutomations(db, userId);
            const pedidos = await pedidoService.getAllPedidos(db, userId);

            for (const pedido of pedidos) {
                let mensagemParaEnviar = null;
                let novoStatusDaMensagem = null;
            
            const { id, nome, telefone, codigoRastreio, statusInterno, mensagemUltimoStatus } = pedido;

            if (!codigoRastreio && !mensagemUltimoStatus) {
                const config = automacoes.boas_vindas;
                if (config && config.ativo) {
                    novoStatusDaMensagem = 'boas_vindas';
                    const mensagemBase = config.mensagem || DEFAULT_MESSAGES.boas_vindas;
                    mensagemParaEnviar = personalizarMensagem(mensagemBase, pedido);
                }
            }
            else if (codigoRastreio && !['envio_rastreio', 'pedido_a_caminho', 'pedido_atrasado', 'pedido_devolvido', 'pedido_a_espera', 'pedido_cancelado'].includes(mensagemUltimoStatus)) {
                const config = automacoes.envio_rastreio;
                 if (config && config.ativo) {
                    novoStatusDaMensagem = 'envio_rastreio';
                    const mensagemBase = config.mensagem || DEFAULT_MESSAGES.envio_rastreio;
                    mensagemParaEnviar = personalizarMensagem(mensagemBase, pedido);
                }
            }
            else if (statusInterno && statusInterno.toLowerCase() !== mensagemUltimoStatus) {
                const gatilhoStatus = statusInterno.toLowerCase().replace(/\s/g, '_');
                const config = automacoes[gatilhoStatus];

                if (config && config.ativo) {
                    novoStatusDaMensagem = statusInterno.toLowerCase();
                    const mensagemBase = config.mensagem || DEFAULT_MESSAGES[gatilhoStatus];
                    if (mensagemBase) {
                        mensagemParaEnviar = personalizarMensagem(mensagemBase, pedido);
                    }
                }
            }

            if (mensagemParaEnviar && novoStatusDaMensagem) {
                const client = sess.client;
                if (!client) continue;

                const config = automacoes[novoStatusDaMensagem] || {};
                if (Array.isArray(config.steps) && config.steps.length > 0) {
                    await enviarPassos(db, client, telefone, config.steps, pedido);
                } else {
                    await whatsappService.enviarMensagem(client, telefone, mensagemParaEnviar);
                    await pedidoService.addMensagemHistorico(db, id, mensagemParaEnviar, novoStatusDaMensagem, 'bot', pedido.cliente_id, null, 'texto');
                }
                await pedidoService.updateCamposPedido(db, id, { mensagemUltimoStatus: novoStatusDaMensagem }, userId);

                await logService.addLog(db, pedido.cliente_id || 1, 'mensagem_automatica', JSON.stringify({ pedidoId: id, tipo: novoStatusDaMensagem }));
                if (broadcast) broadcast(userId, { type: 'nova_mensagem', pedidoId: id });
            }
        }
    }
    }
    catch (err) {
        console.error("❌ Falha no ciclo de envio de mensagens:", err);
    }
}

async function enviarMensagemBoasVindas(db, pedido, broadcast, client) {
    const automacoes = await automationService.getAutomations(db, pedido.cliente_id);
    const config = automacoes.boas_vindas;
    if (config && config.ativo) {
        const mensagemBase = config.mensagem || DEFAULT_MESSAGES.boas_vindas;
        const msg = personalizarMensagem(mensagemBase, pedido);
        if (client) {
            if (Array.isArray(config.steps) && config.steps.length > 0) {
                await enviarPassos(db, client, pedido.telefone, config.steps, pedido);
            } else {
                await whatsappService.enviarMensagem(client, pedido.telefone, msg);
                await pedidoService.addMensagemHistorico(db, pedido.id, msg, 'boas_vindas', 'bot', pedido.cliente_id, null, 'texto');
            }
        }
        await pedidoService.updateCamposPedido(db, pedido.id, { mensagemUltimoStatus: 'boas_vindas' }, pedido.cliente_id);
        await logService.addLog(db, pedido.cliente_id || 1, 'mensagem_automatica', JSON.stringify({ pedidoId: pedido.id, tipo: 'boas_vindas' }));
        if (broadcast) broadcast(pedido.cliente_id, { type: 'nova_mensagem', pedidoId: pedido.id });
    }
}

module.exports = { enviarMensagensComRegras, enviarMensagemBoasVindas };

