const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const integrationConfigService = require('./integrationConfigService');
const automationService = require('./automationService');
const { ensureFreePlan } = require('./planService');

function generateApiKey() {
    return crypto.randomBytes(20).toString('hex');
}

function createUser(db, email, password, isAdmin = 0, isActive = 1, needsPasswordChange = 1) {
    return new Promise((resolve, reject) => {
        const hashed = bcrypt.hashSync(password, 10);
        const apiKey = generateApiKey();
        const stmt = db.prepare('INSERT INTO users (email, password, api_key, is_admin, is_active, precisa_trocar_senha) VALUES (?, ?, ?, ?, ?, ?)');
        stmt.run(email, hashed, apiKey, isAdmin, isActive, needsPasswordChange, function(err) {
            if (err) return reject(err);
            const userId = this.lastID;
            Promise.all([
                integrationConfigService.createDefault(db, userId),
                automationService.createDefaultAutomations(db, userId)
            ])
                .then(() => {
                    resolve({ id: userId, email, api_key: apiKey, is_admin: isAdmin, is_active: isActive, precisa_trocar_senha: needsPasswordChange });
                })
                .catch(reject);
        });
        stmt.finalize();
    });
}

async function createUserWithSubscription(db, email, password) {
    let tx = db;
    try {
        await new Promise((resolve, reject) => {
            tx.run('BEGIN TRANSACTION', [], err => {
                if (err) return reject(err);
                resolve();
            });
        });

        await ensureFreePlan(tx);

        const hashedPass = await bcrypt.hash(password, 10);
        const userResult = await new Promise((resolve, reject) => {
            tx.run(
                'INSERT INTO users (email, password, is_active) VALUES (?, ?, ?)',
                [email, hashedPass, 1],
                function(err) {
                    if (err) return reject(err);
                    resolve({ lastID: this.lastID });
                }
            );
        });

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

        await new Promise((resolve, reject) => {
            tx.run('COMMIT', [], err => {
                if (err) return reject(err);
                resolve();
            });
        });

        return { success: true, userId: userResult.lastID };
    } catch (error) {
        if (tx) {
            try {
                await new Promise((resolve, reject) => {
                    tx.run('ROLLBACK', [], err => {
                        if (err) return reject(err);
                        resolve();
                    });
                });
            } catch (e) {}
        }
        throw new Error('Não foi possível registrar o usuário.');
    }
}

function findUserByEmail(db, email) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

function findUserById(db, id) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

function findUserByApiKey(db, apiKey) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE api_key = ?', [apiKey], (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

function regenerateApiKey(db, userId) {
    return new Promise((resolve, reject) => {
        const newKey = generateApiKey();
        db.run('UPDATE users SET api_key = ? WHERE id = ?', [newKey, userId], function(err) {
            if (err) return reject(err);
            resolve(newKey);
        });
    });
}

function getAllUsers(db) {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM users', [], (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

function updateUser(db, id, fields) {
    const sets = [];
    const params = [];
    if (fields.email) {
        sets.push('email = ?');
        params.push(fields.email);
    }
    if (fields.password) {
        const hashed = bcrypt.hashSync(fields.password, 10);
        sets.push('password = ?');
        params.push(hashed);
    }
    if (fields.is_admin !== undefined) {
        sets.push('is_admin = ?');
        params.push(fields.is_admin);
    }
    if (fields.is_active !== undefined) {
        sets.push('is_active = ?');
        params.push(fields.is_active);
    }
    if (fields.precisa_trocar_senha !== undefined) {
        sets.push('precisa_trocar_senha = ?');
        params.push(fields.precisa_trocar_senha);
    }
    if (!sets.length) return Promise.resolve();
    params.push(id);
    const sql = `UPDATE users SET ${sets.join(', ')} WHERE id = ?`;
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) return reject(err);
            resolve({ changes: this.changes });
        });
    });
}

function setUserActive(db, id, active) {
    return updateUser(db, id, { is_active: active });
}

function deleteUserCascade(db, userId) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            db.run('DELETE FROM historico_mensagens WHERE cliente_id = ?', [userId]);
            db.run('DELETE FROM pedidos WHERE cliente_id = ?', [userId]);
            db.run('DELETE FROM logs WHERE cliente_id = ?', [userId]);
            db.run('DELETE FROM automacoes WHERE cliente_id = ?', [userId]);
            db.run('DELETE FROM subscriptions WHERE user_id = ?', [userId]);
            db.run('DELETE FROM integration_settings WHERE user_id = ?', [userId]);
            db.run('DELETE FROM user_settings WHERE user_id = ?', [userId]);
            db.run('DELETE FROM users WHERE id = ?', [userId], function(err){
                if (err) {
                    db.run('ROLLBACK');
                    return reject(err);
                }
                db.run('COMMIT', err2 => {
                    if (err2) return reject(err2);
                    resolve();
                });
            });
        });
    });
}

module.exports = {
    createUser,
    createUserWithSubscription,
    findUserByEmail,
    findUserById,
    findUserByApiKey,
    regenerateApiKey,
    getAllUsers,
    updateUser,
    setUserActive,
    deleteUserCascade
};

