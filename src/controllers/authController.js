const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const userService = require('../services/userService');
const subscriptionService = require('../services/subscriptionService');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

exports.register = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
    try {
        const existing = await userService.findUserByEmail(req.db, email);
        if (existing) return res.status(409).json({ error: 'Usuário já existe.' });
        // Indica que o usuário não precisa trocar a senha ao primeiro login
        // (isAdmin=0, isActive=1, needsPasswordChange=0)
        const user = await userService.createUser(req.db, email, password, 0, 1, 0);
        await subscriptionService.createSubscription(req.db, user.id, 1);
        res.status(201).json({ id: user.id, email: user.email, apiKey: user.api_key });
    } catch (err) {
        res.status(500).json({ error: 'Falha ao registrar usuário.' });
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

