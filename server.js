// server.js (VERSÃO FINAL E OTIMIZADA)
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const venom = require('venom-bot');
const http = require('http');
const { WebSocketServer } = require('ws');
const { initDb } = require('./src/database/database.js');
const logger = require('./src/logger');

// --- Importações dos controllers e serviços ---
const reportsController = require('./src/controllers/reportsController');
const pedidosController = require('./src/controllers/pedidosController');
const envioController = require('./src/controllers/envioController');
const rastreamentoController = require('./src/controllers/rastreamentoController');
const automationsController = require('./src/controllers/automationsController');
const integrationsController = require('./src/controllers/integrationsController'); // Apenas um import para integrações
const logsController = require('./src/controllers/logsController');
const whatsappService = require('./src/services/whatsappService');
const pedidoService = require('./src/services/pedidoService');
const settingsService = require('./src/services/settingsService');
const paymentController = require('./src/controllers/paymentController');
const webhookRastreioController = require('./src/controllers/webhookRastreioController');
const authController = require('./src/controllers/authController');
const adminController = require('./src/controllers/adminController');
const settingsController = require('./src/controllers/settingsController');
const subscriptionService = require('./src/services/subscriptionService');
const userController = require('./src/controllers/userController');
const authMiddleware = require('./src/middleware/auth');
const apiKeyMiddleware = require('./src/middleware/apiKey');
const planCheck = require('./src/middleware/planCheck');
const adminCheck = require('./src/middleware/adminCheck');
const path = require('path');


// --- GERENCIAMENTO DE ESTADO ---
// Mapa que guarda as sessões ativas por usuário
// Estrutura: userId -> { client, status, qrCode, botInfo }
const activeSessions = new Map();

const app = express();
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const clients = new Set();

// --- Funções de Broadcast e WebSocket ---
function broadcast(data) {
    const jsonData = JSON.stringify(data);
    console.log(`[WebSocket] A transmitir: ${jsonData}`);
    for (const client of clients) {
        if (client.readyState === client.OPEN) {
            client.send(jsonData);
        }
    }
}

function broadcastStatus(userId, newStatus, data = {}) {
    const session = activeSessions.get(userId) || {};
    session.status = newStatus;
    if (Object.prototype.hasOwnProperty.call(data, 'qrCode')) {
        session.qrCode = data.qrCode;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'botInfo')) {
        session.botInfo = data.botInfo;
    }
    activeSessions.set(userId, session);
    console.log(`Status do WhatsApp do usuário ${userId} alterado para: ${newStatus}`);
    broadcast({ type: 'status_update', userId, status: newStatus, ...data });
}

wss.on('connection', (ws) => {
    console.log('🔗 Novo painel conectado via WebSocket.');
    clients.add(ws);
    for (const [uid, session] of activeSessions.entries()) {
        ws.send(JSON.stringify({
            type: 'status_update',
            userId: uid,
            status: session.status || 'DISCONNECTED',
            qrCode: session.qrCode || null,
            botInfo: session.botInfo || null
        }));
    }
    ws.on('close', () => clients.delete(ws));
});

// --- Lógica de Conexão e Desconexão do WhatsApp ---
async function connectToWhatsApp(userId) {
    const existing = activeSessions.get(userId);
    if (existing && (existing.status === 'CONNECTING' || existing.status === 'CONNECTED')) {
        console.warn(`⚠️ Tentativa de conectar com sessão já ativa para o usuário ${userId}.`);
        return;
    }
    console.log(`Iniciando conexão com o WhatsApp para usuário ${userId}...`);
    broadcastStatus(userId, 'CONNECTING');

    const sessionState = { client: null, status: 'CONNECTING', qrCode: null, botInfo: null };
    activeSessions.set(userId, sessionState);

    venom.create({
        session: `whatsship-bot-${userId}`,
        useChrome: false,
        headless: 'new',
        browserArgs: ['--no-sandbox', '--disable-setuid-sandbox']
    },
    (base64Qr) => broadcastStatus(userId, 'QR_CODE', { qrCode: base64Qr }),
    (statusSession) => console.log('[Status da Sessão]', statusSession)
    )
    .then(async (client) => {
        console.log('✅ Cliente Venom criado com SUCESSO.');
        sessionState.client = client;
        
        try {
            const hostDevice = await client.getHostDevice();
            if (hostDevice && hostDevice.id && hostDevice.id._serialized) {
                const numeroBot = hostDevice.id.user;
                const nomeBot = hostDevice.pushname || hostDevice.verifiedName || 'Nome Indisponível';
                
                // Tentativa mais robusta de obter a foto de perfil
                let fotoUrl = null;
                try {
                    fotoUrl = await client.getProfilePicFromServer(hostDevice.id._serialized);
                    console.log("✔️ Foto obtida com getProfilePicFromServer.");
                } catch (picError) {
                    console.warn("⚠️ Falha ao buscar foto com getProfilePicFromServer, tentando com eurl.", picError.message);
                    fotoUrl = hostDevice.eurl || null; // Fallback para a propriedade 'eurl'
                }

                sessionState.botInfo = { numero: numeroBot, nome: nomeBot, fotoUrl: fotoUrl };
                console.log('Informações do Bot Coletadas:', sessionState.botInfo);
            }
        } catch (error) {
            console.error('❌ Erro ao obter dados do hostDevice:', error);
        } finally {
            start(client, userId);
            broadcastStatus(userId, 'CONNECTED', { botInfo: sessionState.botInfo });
        }
    })
    .catch((erro) => {
        console.error('❌ Erro DETALHADO ao criar cliente Venom:', erro);
        broadcastStatus(userId, 'DISCONNECTED');
        activeSessions.delete(userId);
    });
}

async function disconnectFromWhatsApp(userId) {
    const session = activeSessions.get(userId);
    const client = session ? session.client : null;
    if (client) {
        try {
            await client.logout();
            await client.close();
        } catch (error) {
            console.error('Erro ao desconectar o cliente:', error);
        } finally {
            activeSessions.delete(userId);
            broadcastStatus(userId, 'DISCONNECTED');
            console.log('🔌 Cliente WhatsApp desconectado.');
        }
    }
}

// --- Função 'start' que configura as rotinas do bot ---
function start(client, userId) {
    whatsappService.iniciarWhatsApp(client);
    
    client.onMessage(async (message) => {
        if (message.isGroupMsg || !message.body || message.from === 'status@broadcast') return;
        const telefoneCliente = message.from.replace('@c.us', '');
        console.log(`[onMessage] Mensagem de ${telefoneCliente}: "${message.body}"`);

        try {
            const db = app.get('db');
            let pedido = await pedidoService.findPedidoByTelefone(db, telefoneCliente, userId);

            if (!pedido) {
                const setting = await settingsService.getSetting(db, userId);
                if (setting) {
                    const nomeContato = message.notifyName || message.pushName || telefoneCliente;
                    const novoPedidoData = { nome: nomeContato, telefone: telefoneCliente };
                    pedido = await pedidoService.criarPedido(db, novoPedidoData, client, userId);
                    await pedidoService.updateCamposPedido(db, pedido.id, { mensagemUltimoStatus: 'boas_vindas' }, userId);
                    broadcast({ type: 'novo_contato', pedido });
                } else {
                    console.log('Criação automática de contato desativada - ignorando mensagem.');
                    return;
                }
            } else {
                await pedidoService.incrementarNaoLidas(db, pedido.id, userId);
            }
            await pedidoService.addMensagemHistorico(db, pedido.id, message.body, 'recebida', 'cliente', userId);
            broadcast({ type: 'nova_mensagem', pedidoId: pedido.id });
        } catch (error) {
            console.error("[onMessage] Erro CRÍTICO ao processar mensagem:", error);
        }
    });
    
    console.log('✅ Cliente WhatsApp iniciado e pronto para receber mensagens.');
}

// --- Função Principal da Aplicação ---
const startApp = async () => {
    try {
        const db = await initDb();
        app.set('db', db);
        logger.info('Banco de dados pronto.');

        // Webhook precisa do corpo raw para validação
        app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

        app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    ...helmet.contentSecurityPolicy.getDefaultDirectives(),
                    "script-src": ["'self'", "https://cdn.jsdelivr.net"],
                    // LINHA ATUALIZADA ABAIXO
                    "img-src": ["'self'", "data:", "blob:", "https://i.imgur.com", "https://static.whatsapp.net", "https://pps.whatsapp.net"],
                    "connect-src": ["'self'", "wss:", "ws:"]
                },
            },
        }));
        app.use(express.json());
        // Landing page como rota principal
        app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'landing.html'));
        });
        app.use(express.static('public'));

        app.use((req, res, next) => {
            req.db = db;
            req.broadcast = broadcast;
            next();
        });

        // Rotas públicas de autenticação
        app.post('/api/register', authController.register);
        app.post('/api/login', authController.login);

        // Postback dinâmico por caminho único
        app.post('/api/postback/:unique_path', integrationsController.receberPostback);

        // Rota da página de administração (verificação feita no frontend)
        app.get('/admin', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'admin.html'));
        });

        // ROTA DE TESTE PÚBLICA PARA DIAGNÓSTICO
        app.get('/api/teste-conexao', (req, res) => {
            console.log('✅ SUCESSO! A rota de teste foi acessada!');
            res.status(200).json({ message: 'Se voce esta vendo isso, a conexao com o servidor Node.js esta funcionando.' });
        });

        // Middleware de autenticação para rotas abaixo
        app.use(authMiddleware);
        app.use((req, res, next) => {
            const session = activeSessions.get(req.user.id);
            req.venomClient = session ? session.client : null;
            next();
        });

        // Rotas administrativas protegidas
        app.get('/api/admin/clients', adminCheck, adminController.listClients);
        app.post('/api/admin/clients', adminCheck, adminController.createClient);
        app.put('/api/admin/clients/:id', adminCheck, adminController.updateClient);
        app.put('/api/admin/clients/:id/active', adminCheck, adminController.toggleActive);
        app.get('/api/admin/stats', adminCheck, adminController.getStats);

        // Detalhes da assinatura do usuário logado
        app.get('/api/subscription', async (req, res) => {
            try {
                let sub = await subscriptionService.getUserSubscription(req.db, req.user.id);
                if (!sub) return res.status(404).json({ error: 'Nenhum plano encontrado' });
                await subscriptionService.resetUsageIfNeeded(req.db, sub.id);
                sub = await subscriptionService.getUserSubscription(req.db, req.user.id);
                res.json({ subscription: sub });
            } catch (err) {
                console.error('Erro ao obter assinatura:', err);
                res.status(500).json({ error: 'Falha ao consultar assinatura' });
            }
        });

        // Rotas de planos (seleção e gestão)
        app.get('/api/plans', (req, res) => {
            req.db.all('SELECT * FROM plans ORDER BY price', [], (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ data: rows });
            });
        });
        app.post('/api/subscribe/:planId', async (req, res) => {
            const userId = req.user.id;
            const planId = parseInt(req.params.planId);
            try {
                await subscriptionService.updateUserPlan(req.db, userId, planId);
                res.json({ message: 'Plano contratado com sucesso' });
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        });



        console.log("✔️ Registrando rotas da API...");
        
        // Rotas de Pedidos
        app.get('/api/pedidos', planCheck, pedidosController.listarPedidos);
        app.post('/api/pedidos', planCheck, pedidosController.criarPedido);
        app.post('/api/pedidos/importar', planCheck, pedidosController.importarPedidos);
        app.put('/api/pedidos/:id', planCheck, pedidosController.atualizarPedido);
        app.delete('/api/pedidos/:id', planCheck, pedidosController.deletarPedido);
        app.get('/api/pedidos/:id/historico', planCheck, pedidosController.getHistoricoDoPedido);
        app.post('/api/pedidos/:id/enviar-mensagem', planCheck, pedidosController.enviarMensagemManual);
        app.post('/api/pedidos/:id/atualizar-foto', planCheck, pedidosController.atualizarFotoDoPedido);
        app.put('/api/pedidos/:id/marcar-como-lido', planCheck, pedidosController.marcarComoLido);
        
        // Rotas de SITE RASTREIO
        app.post('/api/webhook-site-rastreio', webhookRastreioController.receberWebhook);
        // Rotas de Automações
        app.get('/api/automations', planCheck, automationsController.listarAutomacoes);
        app.post('/api/automations', planCheck, automationsController.salvarAutomacoes);

        // Rotas de Relatórios
        app.get('/api/reports/summary', planCheck, reportsController.getReportSummary);
        app.get('/api/billing/history', planCheck, reportsController.getBillingHistory);

        // Rotas de Logs
        app.get('/api/logs', planCheck, logsController.listarLogs);

        // Rotas de Integrações (UNIFICADAS)
        app.get('/api/integrations', integrationsController.listarIntegracoes);
        app.get('/api/integrations/info', planCheck, integrationsController.getIntegrationInfo);
        app.post('/api/integrations', planCheck, integrationsController.criarIntegracao);
        app.put('/api/integrations/:id', planCheck, integrationsController.atualizarIntegracao);
        app.delete('/api/integrations/:id', integrationsController.deletarIntegracao);
        app.post('/api/integrations/regenerate', planCheck, integrationsController.regenerateApiKey);
        app.put('/api/integrations/settings', planCheck, integrationsController.updateIntegrationSettings);
        app.get('/api/integrations/history', planCheck, integrationsController.listarHistorico);

        // Rotas de Configurações de Usuário
        app.get('/api/settings/contact-creation', planCheck, settingsController.getContactCreationSetting);
        app.put('/api/settings/contact-creation', planCheck, settingsController.updateContactCreationSetting);

        // Conta do usuário
        app.delete('/api/users/me', userController.deleteMe);
        app.put('/api/users/me/password', userController.updatePassword);

        // Rotas do WhatsApp
        app.get('/api/whatsapp/status', (req, res) => {
            const session = activeSessions.get(req.user.id);
            if (!session) return res.json({ status: 'DISCONNECTED' });
            res.json({
                status: session.status || 'DISCONNECTED',
                qrCode: session.qrCode || null,
                botInfo: session.botInfo || null
            });
        });
        app.post('/api/whatsapp/connect', planCheck, (req, res) => {
            connectToWhatsApp(req.user.id);
            res.status(202).json({ message: "Processo de conexão iniciado." });
        });
        app.post('/api/whatsapp/disconnect', planCheck, async (req, res) => {
            await disconnectFromWhatsApp(req.user.id);
            res.status(200).json({ message: "Desconectado com sucesso." });
        });

        // Tarefas em Background
        setInterval(() => {
            console.log(`Verificando rastreios para ${activeSessions.size} sessões ativas...`);
            for (const [uid, session] of activeSessions.entries()) {
                if (session.status === 'CONNECTED') {
                    rastreamentoController.verificarRastreios(db, session.client, uid, broadcast);
                }
            }
        }, 300000);
        setInterval(() => {
            if (activeSessions.size > 0) envioController.enviarMensagensComRegras(db, broadcast, activeSessions);
        }, 60000);
        
        server.listen(PORT, () => logger.info(`🚀 Servidor rodando em http://localhost:${PORT}`));

    } catch (error) {
        logger.error('❌ Falha fatal:', { message: error.message, stack: error.stack });
        process.exit(1);
    }
};

startApp();

