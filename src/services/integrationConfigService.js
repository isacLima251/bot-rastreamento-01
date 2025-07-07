function getConfig(db, userId) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM integration_settings WHERE user_id = ?', [userId], (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

function updateConfig(db, userId, fields) {
    const sets = [];
    const params = [];
    if (fields.postback_secret !== undefined) {
        sets.push('postback_secret = ?');
        params.push(fields.postback_secret);
    }
    if (fields.rastreio_api_key !== undefined) {
        sets.push('rastreio_api_key = ?');
        params.push(fields.rastreio_api_key);
    }
    if (fields.webhook_url !== undefined) {
        sets.push('webhook_url = ?');
        params.push(fields.webhook_url);
    }
    if (!sets.length) return Promise.resolve();
    params.push(userId);
    const sql = `UPDATE integration_settings SET ${sets.join(', ')} WHERE user_id = ?`;
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) return reject(err);
            resolve({ changes: this.changes });
        });
    });
}

function createDefault(db, userId) {
    return new Promise((resolve, reject) => {
        db.run('INSERT INTO integration_settings (user_id) VALUES (?)', [userId], function(err) {
            if (err) return reject(err);
            resolve();
        });
    });
}

module.exports = { getConfig, updateConfig, createDefault };

