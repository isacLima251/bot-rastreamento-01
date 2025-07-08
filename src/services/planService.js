function ensureFreePlan(db) {
  return new Promise((resolve, reject) => {
    const sql = "INSERT OR IGNORE INTO plans (id, name, price, monthly_limit, checkout_url) VALUES (1, 'Gr\u00e1tis', 0, 10, NULL)";
    db.run(sql, [], function(err) {
      if (err) return reject(err);
      resolve();
    });
  });
}

module.exports = { ensureFreePlan };
