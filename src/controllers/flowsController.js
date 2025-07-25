const flowService = require('../services/flowService');

exports.listarFlows = async (req, res) => {
  try {
    const flows = await flowService.listFlows(req.user.id);
    res.json(flows);
  } catch (err) {
    res.status(500).json({ error: 'Falha ao listar fluxos' });
  }
};

exports.criarFlow = async (req, res) => {
  try {
    const flow = await flowService.saveFlow(req.user.id, req.body);
    res.status(201).json(flow);
  } catch (err) {
    res.status(500).json({ error: 'Falha ao criar fluxo' });
  }
};

exports.getFlow = async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const flow = await flowService.getFlowById(id, req.user.id);
    if (!flow) return res.status(404).json({ error: 'Fluxo não encontrado' });
    res.json(flow);
  } catch (err) {
    res.status(500).json({ error: 'Falha ao obter fluxo' });
  }
};

exports.atualizarFlow = async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const flow = await flowService.updateFlow(id, req.user.id, req.body);
    res.json(flow);
  } catch (err) {
    res.status(500).json({ error: 'Falha ao atualizar fluxo' });
  }
};

exports.deletarFlow = async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await flowService.deleteFlow(id, req.user.id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Falha ao deletar fluxo' });
  }
};
