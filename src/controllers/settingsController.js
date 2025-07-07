const settingsService = require('../services/settingsService');

exports.getContactCreationSetting = async (req, res) => {
    try {
        const value = await settingsService.getSetting(req.db, req.user.id);
        res.json({ create_contact_on_message: Boolean(value) });
    } catch (err) {
        console.error('Erro ao buscar configuração', err);
        res.status(500).json({ error: 'Falha ao obter configuração' });
    }
};

exports.updateContactCreationSetting = async (req, res) => {
    const enabled = req.body.enabled ? 1 : 0;
    try {
        await settingsService.updateSetting(req.db, req.user.id, enabled);
        res.json({ message: 'Configuração atualizada', create_contact_on_message: Boolean(enabled) });
    } catch (err) {
        console.error('Erro ao atualizar configuração', err);
        res.status(500).json({ error: 'Falha ao atualizar configuração' });
    }
};
