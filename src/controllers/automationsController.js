const automationService = require('../services/automationService');

exports.listarAutomacoes = async (req, res) => {
    try {
        const automacoes = await automationService.getAutomations(req.db, req.user.id);
        res.status(200).json(automacoes);
    } catch (error) {
        console.error("ERRO DETALHADO AO BUSCAR AUTOMAÇÕES:", error);
        res.status(500).json({ error: "Falha ao buscar configurações de automação." });
    }
};

exports.salvarAutomacoes = async (req, res) => {
    const configs = req.body;
    try {
        const result = await automationService.saveAutomations(req.db, configs, req.user.id);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: "Falha ao salvar configurações de automação." });
    }
};
