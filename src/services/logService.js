const { getModels } = require('../database/database');
const DB_CLIENT = process.env.DB_CLIENT || 'sqlite';

const addLog = (db, clienteId, acao, detalhe = null, options = {}) => {
    if (options.transaction) {
        const { Log } = getModels();
        return Log.create({ cliente_id: clienteId, acao, detalhe }, { transaction: options.transaction });
    }
    return new Promise((resolve, reject) => {
        const returning = DB_CLIENT === 'postgres' ? ' RETURNING id' : '';
        const sql = `INSERT INTO logs (cliente_id, acao, detalhe) VALUES (?, ?, ?)${returning}`;
        db.run(sql, [clienteId, acao, detalhe], function(err) {
            if (err) return reject(err);
            resolve({ id: this.lastID });
        });
    });
};

const getLogsByCliente = (db, clienteId, limit = 100) => {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM logs WHERE cliente_id = ? ORDER BY data_criacao DESC LIMIT ?`;
        db.all(sql, [clienteId, limit], (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
};

module.exports = { addLog, getLogsByCliente };

