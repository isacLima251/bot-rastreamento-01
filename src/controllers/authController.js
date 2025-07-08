const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const userService = require('../services/userService');
const planService = require('../services/planService');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

exports.register = async (req, res) => {
    const { email, password } = req.body;
    console.log('Executando a V2 da rota de registro com rollback.');
    console.log('Iniciando transação para o usuário:', email);
    if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
    try {
        const existing = await userService.findUserByEmail(req.db, email);
        if (existing) return res.status(409).json({ error: 'Usuário já existe.' });

        await req.db.run('BEGIN TRANSACTION');
        const tx = req.db;

        // 1. O Helper (que já está funcionando)
        await planService.ensureFreePlan(tx);
        console.log('Helper ensureFreePlan executado.');

        // 2. Criar o usuário USANDO A TRANSAÇÃO 'tx'
        console.log('Tentando criar o registro do usuário na transação...');
        const hashedPass = await bcrypt.hash(password, 10);
        const userResult = await new Promise((resolve, reject) => {
            tx.run(
                'INSERT INTO users (email, password, status) VALUES (?, ?, ?)',
                [email, hashedPass, 'active'],
                function(err) {
                    if (err) return reject(err);
                    resolve({ lastID: this.lastID });
                }
            );
        });
        console.log('Usuário inserido com sucesso na transação com status active.');

        // 3. Criar a assinatura USANDO A TRANSAÇÃO 'tx'
        console.log('Tentando criar a assinatura na transação...');
        await new Promise((resolve, reject) => {
            tx.run(
                'INSERT INTO subscriptions (user_id, plan_id, status) VALUES (?, ?, ?)',
                [userResult.lastID, 1, 'active'],
                err => {
                    if (err) return reject(err);
                    resolve();
                }
            );
        });
        console.log('Assinatura criada com sucesso na transação.');

        // 4. Se tudo deu certo, confirmar a transação
        await tx.run('COMMIT');
        console.log('Transação finalizada com sucesso (commit).');

        res.status(201).json({ id: userResult.lastID, email });
    } catch (err) {
        console.error('ERRO na transação, executando ROLLBACK:', err);
        await req.db.run('ROLLBACK').catch(() => {});
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

