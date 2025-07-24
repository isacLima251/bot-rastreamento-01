const express = require('express');
const helmet = require('helmet');
const path = require('path');

const reportsController = require('./controllers/reportsController');
const pedidosController = require('./controllers/pedidosController');
const envioController = require('./controllers/envioController');
const rastreamentoController = require('./controllers/rastreamentoController');
const automationsController = require('./controllers/automationsController');
const integrationsController = require('./controllers/integrationsController');
const logsController = require('./controllers/logsController');
const paymentController = require('./controllers/paymentController');
const webhookRastreioController = require('./controllers/webhookRastreioController');
const authController = require('./controllers/authController');
const adminController = require('./controllers/adminController');
const uploadController = require('./controllers/uploadController');
const settingsController = require('./controllers/settingsController');
const subscriptionService = require('./services/subscriptionService');
const userService = require('./services/userService');
const planService = require('./services/planService');
const fotoPerfilController = require('./controllers/fotoPerfilController');
const userController = require('./controllers/userController');
const authMiddleware = require('./middleware/auth');
const planCheck = require('./middleware/planCheck');
const adminCheck = require('./middleware/adminCheck');

function createExpressApp(db, sessionManager) {
  const app = express();

  app.set('db', db);

  app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          "script-src": ["'self'", 'https://cdn.jsdelivr.net'],
          "img-src": ["'self'", 'data:', 'blob:', 'https://i.imgur.com', 'https://static.whatsapp.net', 'https://pps.whatsapp.net', 'https://user-images.githubusercontent.com'],
          "media-src": ["'self'", 'data:', 'blob:'],
          "connect-src": ["'self'", 'wss:', 'ws:'],
        },
      },
    })
  );
  app.use(express.json());

  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'landing.html'));
  });
  app.use(express.static('public', { extensions: ['html'] }));

  app.use((req, res, next) => {
    req.db = db;
    next();
  });

  app.post('/api/register', authController.register);
  if (process.env.NODE_ENV === 'test') {
    app.post('/api/register-test-rollback', async (req, res) => {
      const { email, password } = req.body;
      try {
        const existing = await userService.findUserByEmail(db, email);
        if (existing) return res.status(409).json({ error: 'Usuário já existe.' });

        await planService.ensureFreePlan(db);
        const user = await userService.createUser(db, email, password, 0, 1, 0);

        try {
          await subscriptionService.createSubscription(db, user.id, 999);
        } catch (err) {
          await userService.deleteUserCascade(db, user.id);
          return res.status(500).json({ error: 'Erro simulado na assinatura' });
        }

        res.status(201).json({ id: user.id });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
  }
  app.post('/api/login', authController.login);

  app.post('/api/postback/:unique_path', integrationsController.receberPostback);

  app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
  });

  app.get('/painel', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });

  app.get('/api/teste-conexao', (req, res) => {
    res.status(200).json({ message: 'Se voce esta vendo isso, a conexao com o servidor Node.js esta funcionando.' });
  });

  app.use(authMiddleware);
  app.use((req, res, next) => {
    const session = sessionManager.getSession(req.user.id);
    req.venomClient = session ? session.client : null;
    req.broadcast = (uid, data) => sessionManager.broadcastToUser(uid, data);
    next();
  });

  app.get('/api/admin/clients', adminCheck, adminController.listClients);
  app.post('/api/admin/clients', adminCheck, adminController.createClient);
  app.put('/api/admin/clients/:id', adminCheck, adminController.updateClient);
  app.put('/api/admin/clients/:id/active', adminCheck, adminController.toggleActive);
  app.delete('/api/admin/clients/:id', adminCheck, adminController.deleteClient);
  app.get('/api/admin/stats', adminCheck, adminController.getStats);

  app.get('/api/subscription', async (req, res) => {
    try {
      let sub = await subscriptionService.getUserSubscription(req.db, req.user.id);
      if (!sub) return res.status(404).json({ error: 'Nenhum plano encontrado' });
      await subscriptionService.resetUsageIfNeeded(req.db, sub.id);
      sub = await subscriptionService.getUserSubscription(req.db, req.user.id);
      res.json({ subscription: sub });
    } catch (err) {
      res.status(500).json({ error: 'Falha ao consultar assinatura' });
    }
  });

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

  app.get('/api/pedidos', planCheck, pedidosController.listarPedidos);
  app.post('/api/pedidos', planCheck, pedidosController.criarPedido);
  app.post('/api/pedidos/importar', planCheck, pedidosController.importarPedidos);
  app.put('/api/pedidos/:id', planCheck, pedidosController.atualizarPedido);
  app.delete('/api/pedidos/:id', planCheck, pedidosController.deletarPedido);
  app.get('/api/pedidos/:id/historico', planCheck, pedidosController.getHistoricoDoPedido);
  app.post('/api/pedidos/:id/enviar-mensagem', planCheck, pedidosController.enviarMensagemManual);
  app.post('/api/pedidos/:id/enviar-midia', planCheck, pedidosController.upload.single('file'), pedidosController.enviarMidia);
  app.post('/api/pedidos/:id/atualizar-foto', planCheck, pedidosController.atualizarFotoDoPedido);
  app.put('/api/pedidos/:id/marcar-como-lido', planCheck, pedidosController.marcarComoLido);
  app.get('/api/pedidos/:id/verificar-rastreio', planCheck, pedidosController.verificarRastreioManual);

  app.get('/api/foto-perfil/:numero', planCheck, fotoPerfilController.obterFoto);

  app.post('/api/upload', planCheck, uploadController.upload.single('file'), uploadController.uploadFile);

  app.post('/api/webhook-site-rastreio', webhookRastreioController.receberWebhook);
  app.get('/api/automations', planCheck, automationsController.listarAutomacoes);
  app.post('/api/automations', planCheck, automationsController.salvarAutomacoes);
  app.post('/api/automations/test', planCheck, automationsController.testarAutomacao);

  app.get('/api/reports/summary', planCheck, reportsController.getReportSummary);
  app.get('/api/reports/tracking', planCheck, reportsController.getTrackingReport);
  app.get('/api/reports/clientes-com-rastreio', planCheck, reportsController.getClientesComRastreio);
  app.get('/api/reports/city-performance', planCheck, reportsController.getCityPerformance);

  app.get('/api/logs', planCheck, logsController.listarLogs);

  app.get('/api/integrations', integrationsController.listarIntegracoes);
  app.get('/api/integrations/info', planCheck, integrationsController.getIntegrationInfo);
  app.post('/api/integrations', planCheck, integrationsController.criarIntegracao);
  app.put('/api/integrations/:id', planCheck, integrationsController.atualizarIntegracao);
  app.delete('/api/integrations/:id', integrationsController.deletarIntegracao);
  app.post('/api/integrations/regenerate', planCheck, integrationsController.regenerateApiKey);
  app.put('/api/integrations/settings', planCheck, integrationsController.updateIntegrationSettings);
  app.get('/api/integrations/history', planCheck, integrationsController.listarHistorico);

  app.get('/api/settings/contact-creation', planCheck, settingsController.getContactCreationSetting);
  app.put('/api/settings/contact-creation', planCheck, settingsController.updateContactCreationSetting);

  app.delete('/api/users/me', userController.deleteMe);
  app.put('/api/users/me/password', userController.updatePassword);

  app.get('/api/whatsapp/status', (req, res) => {
    const session = sessionManager.getSession(req.user.id);
    if (!session) return res.json({ status: 'DISCONNECTED' });
    res.json({
      status: session.status || 'DISCONNECTED',
      qrCode: session.qrCode || null,
      botInfo: session.botInfo || null,
    });
  });
  app.post('/api/whatsapp/connect', planCheck, (req, res) => {
    sessionManager.connectToWhatsApp(req.user.id);
    res.status(202).json({ message: 'Processo de conexão iniciado.' });
  });
  app.post('/api/whatsapp/disconnect', planCheck, async (req, res) => {
    await sessionManager.disconnectFromWhatsApp(req.user.id);
    res.status(200).json({ message: 'Desconectado com sucesso.' });
  });

  return app;
}

module.exports = { createExpressApp };
