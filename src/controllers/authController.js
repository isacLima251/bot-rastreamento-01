const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const userService = require('../services/userService');
const planService = require('../services/planService');
const subscriptionService = require('../services/subscriptionService');
const logService = require('../services/logService');
const { getSequelize } = require('../database/database');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

exports.register = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    }

    const sequelize = getSequelize();
    const t = await sequelize.transaction();

    try {
        const existing = await userService.findUserByEmail(req.db, email, { transaction: t });
        if (existing) {
            await t.rollback();
            return res.status(409).json({ message: 'Usuário já existe.' });
        }

        const user = await userService.createUser(req.db, email, password, 0, 1, 0, { transaction: t });

        const plan = await planService.findPlanByName(req.db, 'Grátis', { transaction: t });
        if (!plan) {
            await t.rollback();
            return res.status(500).json({ message: 'Plano padrão não configurado.' });
        }

        await subscriptionService.createSubscription(req.db, user.id, plan.id, { transaction: t });

        await logService.addLog(req.db, user.id, 'user_register', 'Usuário registrado com sucesso', { transaction: t });

        await t.commit();

        return res.status(201).json({ message: 'Usuário registrado com sucesso. Faça o login.' });
    } catch (err) {
        await t.rollback();
        console.error('Falha ao registrar usuário:', err);
        return res.status(500).json({ error: 'Falha ao registrar usuário.' });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Credenciais inválidas.' });
    try {
        const user = await userService.findUserByEmail(req.db, email);
        if (!user) return res.status(401).json({ error: 'Credenciais inválidas.' });
        if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Credenciais inválidas.' });
        if (!user.is_active) return res.status(403).json({ error: 'Usuário desativado.' });
        const token = jwt.sign({ id: user.id, email: user.email, is_admin: user.is_admin, precisa_trocar_senha: user.precisa_trocar_senha }, JWT_SECRET, { expiresIn: '12h' });
        res.json({ token });
    } catch (err) {
        res.status(500).json({ error: 'Falha ao realizar login.' });
    }
};

