const { getModels, getSequelize } = require('../database/database');

async function listFlows(clienteId) {
  const { Flow, FlowNode, NodeOption } = getModels();
  return Flow.findAll({
    where: { cliente_id: clienteId },
    include: { model: FlowNode, include: NodeOption }
  });
}

async function getFlowById(id, clienteId) {
  const { Flow, FlowNode, NodeOption } = getModels();
  return Flow.findOne({
    where: { id, cliente_id: clienteId },
    include: { model: FlowNode, include: NodeOption }
  });
}

async function saveFlow(clienteId, flowData) {
  const { Flow, FlowNode, NodeOption } = getModels();
  const sequelize = getSequelize();
  const tx = await sequelize.transaction();
  try {
    const flow = await Flow.create({
      cliente_id: clienteId,
      nome: flowData.nome,
      gatilho: flowData.gatilho,
      ativo: flowData.ativo !== undefined ? flowData.ativo : 1
    }, { transaction: tx });

    if (Array.isArray(flowData.nodes)) {
      for (const n of flowData.nodes) {
        const node = await FlowNode.create({
          flow_id: flow.id,
          tipo: n.tipo,
          conteudo: n.conteudo || null,
          next_node_id: n.next_node_id || null
        }, { transaction: tx });

        if (Array.isArray(n.options)) {
          for (const opt of n.options) {
            await NodeOption.create({
              node_id: node.id,
              label: opt.label,
              next_node_id: opt.next_node_id || null
            }, { transaction: tx });
          }
        }
      }
    }

    await tx.commit();
    return flow;
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

async function updateFlow(id, clienteId, flowData) {
  const { Flow, FlowNode, NodeOption } = getModels();
  const sequelize = getSequelize();
  const tx = await sequelize.transaction();
  try {
    await Flow.update({
      nome: flowData.nome,
      gatilho: flowData.gatilho,
      ativo: flowData.ativo
    }, { where: { id, cliente_id: clienteId }, transaction: tx });

    await FlowNode.destroy({ where: { flow_id: id }, transaction: tx });

    if (Array.isArray(flowData.nodes)) {
      for (const n of flowData.nodes) {
        const node = await FlowNode.create({
          flow_id: id,
          tipo: n.tipo,
          conteudo: n.conteudo || null,
          next_node_id: n.next_node_id || null
        }, { transaction: tx });
        if (Array.isArray(n.options)) {
          for (const opt of n.options) {
            await NodeOption.create({
              node_id: node.id,
              label: opt.label,
              next_node_id: opt.next_node_id || null
            }, { transaction: tx });
          }
        }
      }
    }

    await tx.commit();
    return getFlowById(id, clienteId);
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

async function deleteFlow(id, clienteId) {
  const { Flow } = getModels();
  return Flow.destroy({ where: { id, cliente_id: clienteId } });
}

module.exports = { listFlows, saveFlow, updateFlow, deleteFlow, getFlowById };
