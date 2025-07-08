require('dotenv').config();
const http = require('http');
const { initDb } = require('./src/database/database');
const logger = require('./src/logger');
const rastreamentoController = require('./src/controllers/rastreamentoController');
const envioController = require('./src/controllers/envioController');
const { createWebSocketServer } = require('./src/websocket');
const { createWhatsAppManager } = require('./src/whatsappSessions');
const { createExpressApp } = require('./src/app');

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

async function start() {
  try {
    const db = await initDb();
    const sessionManager = createWhatsAppManager(null, { broadcastStatus: () => {}, broadcastToUser: () => {} });
    const app = createExpressApp(db, sessionManager);
    sessionManager.setApp(app);
    const server = http.createServer(app);
    const { broadcastToUser, broadcastStatus } = createWebSocketServer(server, JWT_SECRET, sessionManager.activeSessions);

    sessionManager.setBroadcast(broadcastStatus, broadcastToUser);

    app.use((req, res, next) => {
      req.broadcast = broadcastToUser;
      next();
    });

    setInterval(() => {
      for (const [uid, session] of sessionManager.activeSessions.entries()) {
        if (session.status === 'CONNECTED') {
          rastreamentoController.verificarRastreios(db, session.client, uid, (data) => broadcastToUser(uid, data));
        }
      }
    }, 300000);

    setInterval(() => {
      if (sessionManager.activeSessions.size > 0) {
        envioController.enviarMensagensComRegras(db, (userId, data) => broadcastToUser(userId, data), sessionManager.activeSessions);
      }
    }, 60000);

    server.listen(PORT, () => logger.info(`🚀 Servidor rodando em http://localhost:${PORT}`));
  } catch (error) {
    logger.error('❌ Falha fatal:', { message: error.message, stack: error.stack });
    process.exit(1);
  }
}

start();
