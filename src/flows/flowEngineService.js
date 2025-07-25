const { getModels } = require('../database/database');
// Corrige caminho do serviço de WhatsApp
const whatsappService = require('../services/whatsappService');

async function sendNode(client, telefone, node) {
  if (!node) return;
  if (node.tipo === 'mensagem' || node.tipo === 'message') {
    await whatsappService.enviarMensagem(client, telefone, node.conteudo || '');
  } else if (node.tipo === 'pergunta' || node.tipo === 'question') {
    const { NodeOption } = getModels();
    const opts = await NodeOption.findAll({ where: { node_id: node.id } });
    const texto = [node.conteudo || '', ...opts.map(o => `- ${o.label}`)].join('\n');
    await whatsappService.enviarMensagem(client, telefone, texto);
  }
}

async function processMessage(clienteId, telefone, text, client) {
  const { Flow, FlowNode, NodeOption, UserFlowState } = getModels();
  let state = await UserFlowState.findOne({ where: { cliente_id: clienteId, telefone } });

  if (state) {
    const current = await FlowNode.findByPk(state.node_id);
    if (!current) { await state.destroy(); return; }

    if (current.tipo === 'pergunta' || current.tipo === 'question') {
      const option = await NodeOption.findOne({ where: { node_id: current.id, label: text } });
      if (!option) return; // opção inválida
      const nextId = option.next_node_id;
      if (nextId) {
        const next = await FlowNode.findByPk(nextId);
        await sendNode(client, telefone, next);
        await state.update({ node_id: nextId });
      } else {
        await state.destroy();
      }
    } else {
      if (current.next_node_id) {
        const next = await FlowNode.findByPk(current.next_node_id);
        await sendNode(client, telefone, next);
        await state.update({ node_id: current.next_node_id });
      } else {
        await state.destroy();
      }
    }
    return;
  }

  const flow = await Flow.findOne({ where: { cliente_id: clienteId, gatilho: text, ativo: 1 } });
  if (!flow) return;
  const first = await FlowNode.findOne({ where: { flow_id: flow.id }, order: [['id', 'ASC']] });
  if (!first) return;
  await sendNode(client, telefone, first);
  await UserFlowState.create({ cliente_id: clienteId, telefone, flow_id: flow.id, node_id: first.id });
}

module.exports = { processMessage };
