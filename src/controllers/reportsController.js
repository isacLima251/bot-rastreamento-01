// src/controllers/reportsController.js

const subscriptionService = require('../services/subscriptionService');
const pedidoService = require('../services/pedidoService');

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

        const [
            ordersInTransitRows,
            averageDeliveryRows,
            delayedOrdersRows,
            cancelledOrdersRows,
            statusDistributionRows,
            newContactsLast7DaysRows
        ] = await Promise.all([
            runQuery(db, "SELECT COUNT(*) as count FROM pedidos WHERE cliente_id = ? AND codigoRastreio IS NOT NULL AND statusInterno NOT IN ('entregue', 'pedido_cancelado')", [clienteId]),
            runQuery(db, "SELECT AVG(julianday(COALESCE(ultimaAtualizacao, CURRENT_TIMESTAMP)) - julianday(COALESCE(dataPostagem, dataCriacao))) as avgDays FROM pedidos WHERE cliente_id = ? AND statusInterno = 'entregue' AND ultimaAtualizacao IS NOT NULL", [clienteId]),
            runQuery(db, "SELECT COUNT(*) as count FROM pedidos WHERE cliente_id = ? AND statusInterno = 'pedido_atrasado'", [clienteId]),
            runQuery(db, "SELECT COUNT(*) as count FROM pedidos WHERE cliente_id = ? AND statusInterno = 'pedido_cancelado'", [clienteId]),
            runQuery(db, 'SELECT statusInterno, COUNT(*) as count FROM pedidos WHERE cliente_id = ? AND statusInterno IS NOT NULL GROUP BY statusInterno', [clienteId]),
            runQuery(db, "SELECT strftime('%Y-%m-%d', dataCriacao) as dia, COUNT(*) as count FROM pedidos WHERE cliente_id = ? AND dataCriacao >= date('now', '-7 days') GROUP BY dia ORDER BY dia ASC", [clienteId])
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

exports.getBillingHistory = async (req, res) => {
    try {
        const db = req.db;
        const userId = req.user.id;
        let sub = await subscriptionService.getUserSubscription(db, userId);
        if (!sub) return res.status(404).json({ error: 'Nenhum plano encontrado' });
        await subscriptionService.resetUsageIfNeeded(db, sub.id);
        sub = await subscriptionService.getUserSubscription(db, userId);

        const usage = sub.usage;
        const end = require('moment')(sub.renewal_date);
        const start = end.clone().subtract(1, 'month');
        const pedidos = await pedidoService.getPedidosComCodigoAtivo(
            db,
            userId,
            start.format('YYYY-MM-DD'),
            end.format('YYYY-MM-DD')
        );

        res.json({ usage, pedidos });
    } catch (err) {
        console.error('Erro ao obter histórico de faturamento:', err);
        res.status(500).json({ error: 'Falha ao buscar histórico de faturamento' });
    }
};

