const logService = require('../services/logService');

exports.listarLogs = async (req, res) => {
    try {
        const db = req.db;
        const clienteId = req.user.id;
        const logs = await logService.getLogsByCliente(db, clienteId);
        res.json({ data: logs });
    } catch (error) {
        console.error('Erro ao buscar logs:', error);
        res.status(500).json({ error: 'Falha ao buscar logs.' });
    }
};

