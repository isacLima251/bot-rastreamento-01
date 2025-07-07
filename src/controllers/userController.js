const userService = require('../services/userService');

exports.updatePassword = async (req, res) => {
    const db = req.db;
    const userId = req.user.id;
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Senha obrigatória.' });
    try {
        await userService.updateUser(db, userId, { password, precisa_trocar_senha: 0 });
        res.json({ message: 'Senha atualizada.' });
    } catch (err) {
        console.error('Erro ao atualizar senha:', err);
        res.status(500).json({ error: 'Falha ao atualizar senha.' });
    }
};

exports.deleteMe = async (req, res) => {
    const db = req.db;
    const userId = req.user.id;
    try {
        await userService.deleteUserCascade(db, userId);
        res.json({ message: 'Conta excluída com sucesso.' });
    } catch (err) {
        console.error('Erro ao excluir conta:', err);
        res.status(500).json({ error: 'Falha ao excluir conta.' });
    }
};
