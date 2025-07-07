const userService = require('../services/userService');

module.exports = async (req, res, next) => {
    const key = req.query.key || req.headers['x-api-key'];
    if (!key) return res.status(401).json({ error: 'API key ausente' });
    try {
        const user = await userService.findUserByApiKey(req.db, key);
        if (!user) return res.status(401).json({ error: 'API key inválida' });
        req.user = { id: user.id, email: user.email }; // minimal info
        next();
    } catch (err) {
        console.error('Erro na autenticação por API key', err);
        res.status(500).json({ error: 'Falha na autenticação' });
    }
};

