const moment = require('moment');
const DB_CLIENT = process.env.DB_CLIENT || 'sqlite';

function getUserSubscription(db, userId) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT s.*, p.monthly_limit, p.name AS plan_name, p.price
                     FROM subscriptions s
                     JOIN plans p ON p.id = s.plan_id
                     WHERE s.user_id = ?`;
        db.get(sql, [userId], (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

function incrementUsage(db, subscriptionId) {
    return new Promise((resolve, reject) => {
        db.run('UPDATE subscriptions SET usage = usage + 1 WHERE id = ?', [subscriptionId], function(err) {
            if (err) return reject(err);
            resolve({ changes: this.changes });
        });
    });
}

const pedidoService = require('./pedidoService');
const { getModels, getSequelize } = require('../database/database');

async function resetUsageIfNeeded(db, subscriptionId) {
    const sub = await new Promise((resolve, reject) => {
        db.get('SELECT usage, renewal_date, user_id FROM subscriptions WHERE id = ?', [subscriptionId], (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });

    if (!sub) return;

    const now = moment();
    if (sub.renewal_date && !moment(sub.renewal_date).isBefore(now)) {
        return;
    }

    const next = now.clone().add(1, 'month').startOf('day');

    if (DB_CLIENT === 'postgres') {
        const sequelize = getSequelize();
        const { Subscription, Pedido } = getModels();
        const t = await sequelize.transaction();
        try {
            await Subscription.update({ usage: 0, renewal_date: next.format('YYYY-MM-DD') }, { where: { id: subscriptionId }, transaction: t });
            await Pedido.update({ checkCount: 0 }, { where: { cliente_id: sub.user_id }, transaction: t });
            await t.commit();
        } catch (err) {
            await t.rollback();
            throw err;
        }
    } else {
        await new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');
                db.run('UPDATE subscriptions SET usage = 0, renewal_date = ? WHERE id = ?', [next.format('YYYY-MM-DD'), subscriptionId]);
                db.run('UPDATE pedidos SET checkCount = 0 WHERE cliente_id = ?', [sub.user_id]);
                db.run('COMMIT', (e) => {
                    if (e) return reject(e);
                    resolve();
                });
            });
        });
    }
}


function createSubscription(db, userId, planId, options = {}) {
    if (options.transaction) {
        const { Subscription } = getModels();
        return Subscription.create({ user_id: userId, plan_id: planId, status: 'active', usage: 0 }, { transaction: options.transaction });
    }
    return new Promise((resolve, reject) => {
        const returning = DB_CLIENT === 'postgres' ? ' RETURNING id' : '';
        const sql = `INSERT INTO subscriptions (user_id, plan_id, status, usage) VALUES (?, ?, "active", 0)${returning}`;
        db.run(sql, [userId, planId], function(err) {
            if (err) return reject(err);
            resolve({ id: this.lastID });
        });
    });
}

function updateUserPlan(db, userId, planId) {
    return new Promise((resolve, reject) => {
        const returning = DB_CLIENT === 'postgres' ? ' RETURNING id' : '';
        const sql = `INSERT INTO subscriptions (user_id, plan_id, status, usage)
                     VALUES (?, ?, 'active', 0)
                     ON CONFLICT(user_id) DO UPDATE SET plan_id = excluded.plan_id, status='active', usage=0, renewal_date=NULL${returning}`;
        db.run(sql, [userId, planId], function(err) {
            if (err) return reject(err);
            resolve({ id: this.lastID, changes: this.changes });
        });
    });
}

function updateSubscriptionStatus(db, userId, status) {
    return new Promise((resolve, reject) => {
        db.run('UPDATE subscriptions SET status = ? WHERE user_id = ?', [status, userId], function(err) {
            if (err) return reject(err);
            resolve({ changes: this.changes });
        });
    });
}


// Adiciona a função para devolver 1 uso ao limite do plano em caso de reembolso
function decrementUsage(db, subscriptionId) {
    return new Promise((resolve, reject) => {
        // Garante que o uso nunca fique abaixo de zero
        db.run('UPDATE subscriptions SET usage = MAX(0, usage - 1) WHERE id = ?', [subscriptionId], function(err) {
            if (err) return reject(err);
            resolve({ changes: this.changes });
        });
    });
}

module.exports = {
    getUserSubscription,
    incrementUsage,
    resetUsageIfNeeded,
    createSubscription,
    updateUserPlan,
    updateSubscriptionStatus,
    decrementUsage,
};

