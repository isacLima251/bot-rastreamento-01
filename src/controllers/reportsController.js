const subscriptionService = require('../services/subscriptionService');
const pedidoService = require('../services/pedidoService');
const DB_CLIENT = process.env.DB_CLIENT || 'sqlite';
const q = c => DB_CLIENT === 'postgres' ? `"${c}"` : c;

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
            ? `SELECT AVG(EXTRACT(EPOCH FROM (COALESCE(CAST("ultimaAtualizacao" AS TIMESTAMP), CURRENT_TIMESTAMP) - COALESCE(CAST("dataPostagem" AS TIMESTAMP), "dataCriacao"))) / 86400) as "avgDays" FROM pedidos WHERE cliente_id = ? AND "statusInterno" = 'entregue' AND "ultimaAtualizacao" IS NOT NULL`
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
            runQuery(
                db,
                `SELECT COUNT(*) as count FROM pedidos WHERE cliente_id = ? AND ${q('codigoRastreio')} IS NOT NULL AND ${q('statusInterno')} NOT IN (?, ?)`,
                [clienteId, 'entregue', 'pedido_cancelado']
            ),
            runQuery(db, avgDeliveryQuery, [clienteId]),
            runQuery(
                db,
                `SELECT COUNT(*) as count FROM pedidos WHERE cliente_id = ? AND ${q('statusInterno')} = ?`,
                [clienteId, 'pedido_atrasado']
            ),
            runQuery(
                db,
                `SELECT COUNT(*) as count FROM pedidos WHERE cliente_id = ? AND ${q('statusInterno')} = ?`,
                [clienteId, 'pedido_cancelado']
            ),
            runQuery(
                db,
                `SELECT ${q('statusInterno')} as statusInterno, COUNT(*) as count FROM pedidos WHERE cliente_id = ? AND ${q('statusInterno')} IS NOT NULL GROUP BY ${q('statusInterno')}`,
                [clienteId]
            ),
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

        const sql = `SELECT nome, email, telefone, produto, ${q('codigoRastreio')},
                             COALESCE(${q('dataPostagem')}, ${q('dataCriacao')}) as dataEnvio,
                             ${q('statusInterno')}
                      FROM pedidos
                      WHERE cliente_id = ?
                        AND ${q('codigoRastreio')} IS NOT NULL
                        AND ${q('codigoRastreio')} != ''
                      ORDER BY ${q('dataCriacao')} DESC`;

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

        const createdAtAlias = DB_CLIENT === 'postgres' ? '"createdAt"' : 'createdAt';

        const sql = `SELECT id, nome, produto, ${q('codigoRastreio')},
                            ${q('statusInterno')} AS status,
                            ${q('dataCriacao')} AS ${createdAtAlias}
                     FROM pedidos
                     WHERE cliente_id = ?
                       AND ${q('codigoRastreio')} IS NOT NULL
                       AND ${q('codigoRastreio')} != ''
                     ORDER BY ${q('dataCriacao')} DESC`;

        const rows = await runQuery(db, sql, [clienteId]);
        res.json(rows);
    } catch (err) {
        console.error('Erro ao obter clientes com rastreio:', err);
        res.status(500).json({ error: 'Falha ao gerar relatório.' });
    }
};

exports.getCityPerformance = async (req, res) => {
    try {
        const db = req.db;
        const clienteId = req.user.id;
        const limit = parseInt(req.query.limit, 10) || 5;

        const vendasQuery = `SELECT COALESCE(NULLIF(${q('cidade')}, ''), 'N/D') as cidade, COUNT(*) as count FROM pedidos WHERE cliente_id = ? AND ${q('statusInterno')} != 'pedido_cancelado' GROUP BY cidade ORDER BY count DESC LIMIT ?`;

        const cancelamentosQuery = `SELECT COALESCE(NULLIF(${q('cidade')}, ''), 'N/D') as cidade, COUNT(*) as count FROM pedidos WHERE cliente_id = ? AND ${q('statusInterno')} = 'pedido_cancelado' GROUP BY cidade ORDER BY count DESC LIMIT ?`;

        const [vendas, cancelamentos] = await Promise.all([
            runQuery(db, vendasQuery, [clienteId, limit]),
            runQuery(db, cancelamentosQuery, [clienteId, limit])
        ]);

        res.json({ topSales: vendas, topCancelled: cancelamentos });
    } catch (err) {
        console.error('Erro ao obter dados por cidade:', err);
        res.status(500).json({ error: 'Falha ao gerar relatório por cidade.' });
    }
};

