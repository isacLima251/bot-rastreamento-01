const { getModels, getSequelize } = require('../database/database');

async function createFlow(userId, flowData) {
  const { Flow, FlowNode, NodeOption } = getModels();
  const sequelize = getSequelize();
  const tx = await sequelize.transaction();
  try {
    const flow = await Flow.create({
      user_id: userId,
      name: flowData.name,
      trigger_keyword: flowData.trigger_keyword,
      is_active: flowData.is_active !== undefined ? flowData.is_active : true
    }, { transaction: tx });

    if (Array.isArray(flowData.nodes)) {
      const created = [];
      for (const n of flowData.nodes) {
        const node = await FlowNode.create({
          flow_id: flow.id,
          node_type: n.node_type,
          message_text: n.message_text || null,
          is_start_node: n.is_start_node || false
        }, { transaction: tx });
        created.push({ tempId: n.client_id, id: node.id, options: n.options || [] });
      }

      const idMap = Object.fromEntries(created.map((c, idx) => [c.tempId || idx, c.id]));
      for (const c of created) {
        for (const opt of c.options) {
          const target = idMap[opt.next_node_id];
          await NodeOption.create({
            source_node_id: c.id,
            option_text: opt.option_text,
            next_node_id: target || null
          }, { transaction: tx });
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

async function getFlowsByUser(userId) {
  const { Flow, FlowNode, NodeOption } = getModels();
  return Flow.findAll({
    where: { user_id: userId },
    include: { model: FlowNode, include: NodeOption }
  });
}

async function getFlowById(flowId, userId) {
  const { Flow, FlowNode, NodeOption } = getModels();
  return Flow.findOne({
    where: { id: flowId, user_id: userId },
    include: { model: FlowNode, include: NodeOption }
  });
}

async function updateFlow(flowId, flowData) {
  const { Flow, FlowNode, NodeOption } = getModels();
  const sequelize = getSequelize();
  const tx = await sequelize.transaction();
  try {
    await Flow.update({
      name: flowData.name,
      trigger_keyword: flowData.trigger_keyword,
      is_active: flowData.is_active
    }, { where: { id: flowId }, transaction: tx });

    await FlowNode.destroy({ where: { flow_id: flowId }, transaction: tx });

    if (Array.isArray(flowData.nodes)) {
      const created = [];
      for (const n of flowData.nodes) {
        const node = await FlowNode.create({
          flow_id: flowId,
          node_type: n.node_type,
          message_text: n.message_text || null,
          is_start_node: n.is_start_node || false
        }, { transaction: tx });
        created.push({ tempId: n.client_id, id: node.id, options: n.options || [] });
      }

      const idMap = Object.fromEntries(created.map((c, idx) => [c.tempId || idx, c.id]));
      for (const c of created) {
        for (const opt of c.options) {
          const target = idMap[opt.next_node_id];
          await NodeOption.create({
            source_node_id: c.id,
            option_text: opt.option_text,
            next_node_id: target || null
          }, { transaction: tx });
        }
      }
    }

    await tx.commit();
    return Flow.findByPk(flowId, { include: { model: FlowNode, include: NodeOption } });
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

async function deleteFlow(flowId) {
  const { Flow } = getModels();
  return Flow.destroy({ where: { id: flowId } });
}

module.exports = { createFlow, getFlowsByUser, getFlowById, updateFlow, deleteFlow };
