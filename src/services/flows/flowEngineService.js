const { getModels } = require('../../database/database');
const whatsappService = require('../whatsappService');

async function sendNode(client, phone, node) {
  if (!node) return;
  const { NodeOption } = getModels();
  let message = node.message_text || '';
  if (node.node_type === 'question') {
    const options = await NodeOption.findAll({ where: { source_node_id: node.id } });
    if (options.length) {
      const optsText = options.map(o => `- ${o.option_text}`).join('\n');
      message = message ? `${message}\n${optsText}` : optsText;
    }
  }
  await whatsappService.enviarMensagem(client, phone, message);
}

async function processMessage(userId, pedido, text, client) {
  const { Flow, FlowNode, NodeOption, UserFlowState } = getModels();
  let state = await UserFlowState.findOne({ where: { pedido_id: pedido.id } });

  if (state) {
    const current = await FlowNode.findByPk(state.current_node_id);
    if (!current) { await state.destroy(); return false; }

    if (current.node_type === 'question') {
      const option = await NodeOption.findOne({ where: { source_node_id: current.id, option_text: text } });
      if (!option) return false;
      const nextId = option.next_node_id;
      if (nextId) {
        const next = await FlowNode.findByPk(nextId);
        await sendNode(client, pedido.telefone, next);
        await state.update({ current_node_id: nextId });
      } else {
        await state.destroy();
      }
    } else {
      const opt = await NodeOption.findOne({ where: { source_node_id: current.id } });
      if (opt && opt.next_node_id) {
        const next = await FlowNode.findByPk(opt.next_node_id);
        await sendNode(client, pedido.telefone, next);
        await state.update({ current_node_id: opt.next_node_id });
      } else {
        await state.destroy();
      }
    }
    return true;
  }

  const flow = await Flow.findOne({ where: { user_id: userId, trigger_keyword: text, is_active: true } });
  if (!flow) return false;
  const first = await FlowNode.findOne({ where: { flow_id: flow.id, is_start_node: true } });
  if (!first) return false;
  await sendNode(client, pedido.telefone, first);
  await UserFlowState.create({ pedido_id: pedido.id, current_flow_id: flow.id, current_node_id: first.id });
  return true;
}

module.exports = { processMessage };
