const subscriptionService = require('../services/subscriptionService');

module.exports = async (req, res, next) => {
    if (req.user && req.user.is_admin) {
        return next();
    }
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Usuário não autenticado' });
    try {
        let sub = await subscriptionService.getUserSubscription(req.db, userId);
        if (!sub) return res.status(403).json({ error: 'Nenhum plano ativo' });
        await subscriptionService.resetUsageIfNeeded(req.db, sub.id);
        sub = await subscriptionService.getUserSubscription(req.db, userId);
        if (sub.status !== 'active') return res.status(403).json({ error: 'Plano inativo' });

        const addingCode =
            ((req.method === 'POST' && req.path === '/api/pedidos' && req.body.codigoRastreio) ||
            (req.method === 'POST' && req.path.startsWith('/api/postback') && req.body.codigoRastreio) ||
            (req.method === 'PUT' && /^\/api\/pedidos\/\d+$/.test(req.path) && req.body.codigoRastreio));

        const usage = sub.usage;

        if (addingCode && sub.monthly_limit !== -1 && usage >= sub.monthly_limit) {
            return res.status(403).json({ error: 'Limite do plano excedido' });
        }

        req.subscription = sub;
        next();
    } catch (e) {
        console.error('Erro no middleware de plano', e);
        res.status(500).json({ error: 'Falha na verificação do plano' });
    }
};

