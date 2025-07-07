const DEFAULT_SETTING = 1;

function getSetting(db, userId) {
    return new Promise((resolve, reject) => {
        db.get('SELECT create_contact_on_message FROM user_settings WHERE user_id = ?', [userId], (err, row) => {
            if (err) return reject(err);
            resolve(row ? row.create_contact_on_message : DEFAULT_SETTING);
        });
    });
}

function updateSetting(db, userId, value) {
    const val = value ? 1 : 0;
    return new Promise((resolve, reject) => {
        db.run('UPDATE user_settings SET create_contact_on_message = ? WHERE user_id = ?', [val, userId], function(err){
            if (err) return reject(err);
            if (this.changes === 0) {
                db.run('INSERT INTO user_settings (user_id, create_contact_on_message) VALUES (?, ?)', [userId, val], function(err2){
                    if (err2) return reject(err2);
                    resolve();
                });
            } else {
                resolve();
            }
        });
    });
}

module.exports = { getSetting, updateSetting };
