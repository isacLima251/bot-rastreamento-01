// src/controllers/reportsController.js

const subscriptionService = require('../services/subscriptionService');
const pedidoService = require('../services/pedidoService');
const DB_CLIENT = process.env.DB_CLIENT || 'sqlite';

// Função auxiliar para executar consultas SQL e retornar uma Promise
const runQuery = (dbInstance, sql, params = []) => {
    return new Promise((resolve, reject) => {
        dbInstance.all(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
};

exports.getReportSummary = async (req, res) => {
    try {
        const db = req.db;
        const clienteId = req.user.id;

        const avgDeliveryQuery = DB_CLIENT === 'postgres'
            ? `SELECT AVG(EXTRACT(EPOCH FROM (COALESCE("ultimaAtualizacao", CURRENT_TIMESTAMP) - COALESCE("dataPostagem", "dataCriacao"))) / 86400) as "avgDays" FROM pedidos WHERE cliente_id = ? AND "statusInterno" = 'entregue' AND "ultimaAtualizacao" IS NOT NULL`
            : "SELECT AVG(julianday(COALESCE(ultimaAtualizacao, CURRENT_TIMESTAMP)) - julianday(COALESCE(dataPostagem, dataCriacao))) as avgDays FROM pedidos WHERE cliente_id = ? AND statusInterno = 'entregue' AND ultimaAtualizacao IS NOT NULL";

        const newContactsQuery = DB_CLIENT === 'postgres'
            ? `SELECT to_char("dataCriacao", 'YYYY-MM-DD') as dia, COUNT(*) as count FROM pedidos WHERE cliente_id = ? AND "dataCriacao" >= CURRENT_DATE - INTERVAL '6 days' GROUP BY dia ORDER BY dia ASC`
            : "SELECT strftime('%Y-%m-%d', dataCriacao) as dia, COUNT(*) as count FROM pedidos WHERE cliente_id = ? AND dataCriacao >= date('now', '-6 days') GROUP BY dia ORDER BY dia ASC";

        const [
            ordersInTransitRows,
            averageDeliveryRows,
            delayedOrdersRows,
            cancelledOrdersRows,
            statusDistributionRows,
            newContactsLast7DaysRows
        ] = await Promise.all([
            runQuery(db, "SELECT COUNT(*) as count FROM pedidos WHERE cliente_id = ? AND codigoRastreio IS NOT NULL AND statusInterno NOT IN ('entregue', 'pedido_cancelado')", [clienteId]),
            runQuery(db, avgDeliveryQuery, [clienteId]),
            runQuery(db, "SELECT COUNT(*) as count FROM pedidos WHERE cliente_id = ? AND statusInterno = 'pedido_atrasado'", [clienteId]),
            runQuery(db, "SELECT COUNT(*) as count FROM pedidos WHERE cliente_id = ? AND statusInterno = 'pedido_cancelado'", [clienteId]),
            runQuery(db, 'SELECT statusInterno, COUNT(*) as count FROM pedidos WHERE cliente_id = ? AND statusInterno IS NOT NULL GROUP BY statusInterno', [clienteId]),
            runQuery(db, newContactsQuery, [clienteId])
        ]);

        const avgDays = parseFloat(averageDeliveryRows[0]?.avgDays || 0);

        const summary = {
            ordersInTransit: ordersInTransitRows[0]?.count || 0,
            averageDeliveryTime: Number(avgDays.toFixed(1)),
            delayedOrders: delayedOrdersRows[0]?.count || 0,
            cancelledOrders: cancelledOrdersRows[0]?.count || 0,
            statusDistribution: statusDistributionRows,
            newContactsLast7Days: newContactsLast7DaysRows
        };

        res.status(200).json(summary);

    } catch (error) {
        console.error("ERRO DETALHADO AO GERAR RELATÓRIO:", error);
        res.status(500).json({ error: "Falha ao gerar o resumo do relatório." });
    }
};

exports.getTrackingReport = async (req, res) => {
    try {
        const db = req.db;
        const clienteId = req.user.id;

        const sql = `SELECT nome, email, telefone, produto, codigoRastreio,
                             COALESCE(dataPostagem, dataCriacao) as dataEnvio,
                             statusInterno
                      FROM pedidos
                      WHERE cliente_id = ?
                        AND codigoRastreio IS NOT NULL
                        AND codigoRastreio != ''
                      ORDER BY dataCriacao DESC`;

        const rows = await runQuery(db, sql, [clienteId]);
        res.json({ data: rows });
    } catch (err) {
        console.error('Erro ao obter relatório de rastreamento:', err);
        res.status(500).json({ error: 'Falha ao gerar relatório.' });
    }
};

exports.getClientesComRastreio = async (req, res) => {
    try {
        const db = req.db;
        const clienteId = req.user.id;

        const sql = `SELECT nome, produto, codigoRastreio,
                            statusInterno AS status,
                            dataCriacao AS createdAt
                     FROM pedidos
                     WHERE cliente_id = ?
                       AND codigoRastreio IS NOT NULL
                       AND codigoRastreio != ''
                     ORDER BY dataCriacao DESC`;

        const rows = await runQuery(db, sql, [clienteId]);
        res.json(rows);
    } catch (err) {
        console.error('Erro ao obter clientes com rastreio:', err);
        res.status(500).json({ error: 'Falha ao gerar relatório.' });
    }
};

