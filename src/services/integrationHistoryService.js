
function getPaginated(db, userId, limit, offset) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM integration_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        db.all(sql, [userId, limit, offset], (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

function countAll(db, userId) {
    return new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as total FROM integration_history WHERE user_id = ?', [userId], (err, row) => {
            if (err) return reject(err);
            resolve(row.total || 0);
        });
    });
}

module.exports = { getPaginated, countAll };
