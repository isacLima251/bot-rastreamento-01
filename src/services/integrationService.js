const crypto = require('crypto');

function createIntegration(db, userId, platform, name) {
    return new Promise((resolve, reject) => {
        const unique_path = crypto.randomBytes(16).toString('hex');
        const sql = 'INSERT INTO integrations (user_id, platform, name, unique_path) VALUES (?, ?, ?, ?)';

        db.run(sql, [userId, platform, name, unique_path], function(err) {
            if (err) return reject(err);
            const newId = this.lastID;
            const baseUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
            const webhook_url = `${baseUrl}/api/postback/${unique_path}`;

            resolve({
                id: newId,
                platform: platform,
                name: name,
                webhook_url: webhook_url
            });
        });
    });
}

function updateIntegration(db, id, fields, userId = null) {
    const sets = [];
    const params = [];
    if (fields.name !== undefined) {
        sets.push('name = ?');
        params.push(fields.name);
    }
    if (fields.secret_key !== undefined) {
        sets.push('secret_key = ?');
        params.push(fields.secret_key);
    }
    if (!sets.length) return Promise.resolve();
    params.push(id);
    let sql = `UPDATE integrations SET ${sets.join(', ')} WHERE id = ?`;
    if (userId !== null) {
        sql += ' AND user_id = ?';
        params.push(userId);
    }
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) return reject(err);
            resolve({ changes: this.changes });
        });
    });
}

function findIntegrationByPath(db, uniquePath) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM integrations WHERE unique_path = ?', [uniquePath], (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

function getIntegrationById(db, id, userId = null) {
    return new Promise((resolve, reject) => {
        let sql = 'SELECT * FROM integrations WHERE id = ?';
        const params = [id];
        if (userId !== null) {
            sql += ' AND user_id = ?';
            params.push(userId);
        }
        db.get(sql, params, (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

function deleteIntegration(db, id, userId = null) {
    return new Promise((resolve, reject) => {
        let sql = 'DELETE FROM integrations WHERE id = ?';
        const params = [id];
        if (userId !== null) {
            sql += ' AND user_id = ?';
            params.push(userId);
        }
        db.run(sql, params, function(err) {
            if (err) return reject(err);
            resolve({ changes: this.changes });
        });
    });
}

module.exports = {
    createIntegration,
    findIntegrationByPath,
    updateIntegration,
    getIntegrationById,
    deleteIntegration,
};
