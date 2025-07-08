const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const userService = require('../services/userService');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

exports.register = async (req, res) => {
    const { email, password } = req.body;
    console.log('Executando a V2 da rota de registro com rollback.');
    console.log('Iniciando transação para o usuário:', email);
    if (!email || !password) {
        return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    }
    try {
        const existing = await userService.findUserByEmail(req.db, email);
        if (existing) {
            return res.status(409).json({ message: 'Usuário já existe.' });
        }

        const result = await userService.createUserWithSubscription(req.db, email, password);

        return res.status(201).json({
            message: 'Usuário registrado com sucesso!',
            userId: result.userId
        });
    } catch (err) {
        console.error(`Erro no controller de registro para ${email}:`, err.message);
        return res.status(500).json({ message: 'Ocorreu um erro no servidor ao tentar registrar.' });
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

