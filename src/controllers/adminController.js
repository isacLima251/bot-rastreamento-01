const userService = require('../services/userService');
const subscriptionService = require('../services/subscriptionService');

exports.listClients = async (req, res) => {
    try {
        const users = await userService.getAllUsers(req.db);
        const clients = [];
        for (const u of users) {
            if (u.is_admin) continue;
            const sub = await subscriptionService.getUserSubscription(req.db, u.id);
            clients.push({
                id: u.id,
                email: u.email,
                is_active: !!u.is_active,
                requests: sub ? sub.usage : 0,
                plan_id: sub ? sub.plan_id : null
            });
        }
        res.json({ count: clients.length, clients });
    } catch (err) {
        console.error('Erro ao listar clientes:', err);
        res.status(500).json({ error: 'Falha ao listar clientes' });
    }
};

exports.createClient = async (req, res) => {
    const { email, password, plan_id } = req.body;
    if (!email || !password || !plan_id) {
        return res.status(400).json({ error: 'Dados obrigatórios ausentes' });
    }
    try {
        const user = await userService.createUser(req.db, email, password, 0, 1, 0);
        await subscriptionService.createSubscription(req.db, user.id, plan_id);
        res.status(201).json({ id: user.id, email: user.email });
    } catch (err) {
        console.error('Erro ao criar cliente:', err);
        res.status(500).json({ error: 'Falha ao criar cliente' });
    }
};

exports.updateClient = async (req, res) => {
    const id = parseInt(req.params.id);
    const { email, password, plan_id } = req.body;
    try {
        await userService.updateUser(req.db, id, { email, password });
        if (plan_id) await subscriptionService.updateUserPlan(req.db, id, plan_id);
        res.json({ message: 'Cliente atualizado' });
    } catch (err) {
        console.error('Erro ao atualizar cliente:', err);
        res.status(500).json({ error: 'Falha ao atualizar cliente' });
    }
};

exports.toggleActive = async (req, res) => {
    const id = parseInt(req.params.id);
    const { active } = req.body;
    try {
        await userService.setUserActive(req.db, id, active ? 1 : 0);
        res.json({ message: 'Status atualizado' });
    } catch (err) {
        console.error('Erro ao atualizar status:', err);
        res.status(500).json({ error: 'Falha ao atualizar status' });
    }
};

// Estatísticas agregadas para o painel de admin
exports.getStats = async (req, res) => {
    const db = req.db;
    const runQuery = (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });
    };
    try {
        const [totalUsersRow, activeByPlanRows, mrrRow] = await Promise.all([
            runQuery('SELECT COUNT(id) as count FROM users WHERE is_admin = 0'),
            runQuery(`SELECT p.name, COUNT(s.id) as count FROM subscriptions s JOIN plans p ON p.id = s.plan_id WHERE s.status = 'active' GROUP BY s.plan_id`),
            runQuery(`SELECT SUM(p.price) as mrr FROM subscriptions s JOIN plans p ON p.id = s.plan_id WHERE s.status = 'active'`)
        ]);

        res.json({
            totalUsers: totalUsersRow[0]?.count || 0,
            activeByPlan: activeByPlanRows,
            mrr: mrrRow[0]?.mrr || 0
        });
    } catch (err) {
        console.error('Erro ao coletar métricas:', err);
        res.status(500).json({ error: 'Falha ao coletar métricas' });
    }
};

