const addLog = (db, clienteId, acao, detalhe = null) => {
    return new Promise((resolve, reject) => {
        const sql = `INSERT INTO logs (cliente_id, acao, detalhe) VALUES (?, ?, ?)`;
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

