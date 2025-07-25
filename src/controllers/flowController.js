const flowService = require('../services/flowService');

exports.create = async (req, res) => {
  try {
    const flow = await flowService.createFlow(req.user.id, req.body);
    res.status(201).json(flow);
  } catch (err) {
    res.status(500).json({ error: 'Falha ao criar fluxo' });
  }
};

exports.getAll = async (req, res) => {
  try {
    const flows = await flowService.getFlowsByUser(req.user.id);
    res.json(flows);
  } catch (err) {
    res.status(500).json({ error: 'Falha ao listar fluxos' });
  }
};

exports.update = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const flow = await flowService.updateFlow(id, req.body);
    res.json(flow);
  } catch (err) {
    res.status(500).json({ error: 'Falha ao atualizar fluxo' });
  }
};

exports.destroy = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    await flowService.deleteFlow(id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Falha ao deletar fluxo' });
  }
};
