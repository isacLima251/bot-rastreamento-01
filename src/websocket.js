const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');

function createWebSocketServer(server, jwtSecret, activeSessions) {
  const wss = new WebSocketServer({ server });
  const wsClients = new Map();

  function addClient(userId, ws) {
    if (!wsClients.has(userId)) wsClients.set(userId, new Set());
    wsClients.get(userId).add(ws);
  }

  function removeClient(userId, ws) {
    const set = wsClients.get(userId);
    if (set) {
      set.delete(ws);
      if (set.size === 0) wsClients.delete(userId);
    }
  }

  function broadcastToUser(userId, data) {
    const userSockets = wsClients.get(userId);
    if (!userSockets) return;
    const jsonData = JSON.stringify(data);
    for (const ws of userSockets) {
      if (ws.readyState === ws.OPEN) ws.send(jsonData);
    }
  }

  function broadcastStatus(userId, status, data = {}) {
    const session = activeSessions.get(userId) || {};
    session.status = status;
    if (Object.prototype.hasOwnProperty.call(data, 'qrCode')) {
      session.qrCode = data.qrCode;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'botInfo')) {
      session.botInfo = data.botInfo;
    }
    activeSessions.set(userId, session);
    broadcastToUser(userId, { type: 'status_update', userId, status, ...data });
  }

  wss.on('connection', (ws, req) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get('token');
      const decoded = jwt.verify(token, jwtSecret);
      const userId = decoded.id;
      ws.userId = userId;
      addClient(userId, ws);
      const session = activeSessions.get(userId) || {};
      ws.send(
        JSON.stringify({
          type: 'status_update',
          userId,
          status: session.status || 'DISCONNECTED',
          qrCode: session.qrCode || null,
          botInfo: session.botInfo || null,
        })
      );
      ws.on('close', () => removeClient(userId, ws));
    } catch (err) {
      ws.close();
    }
  });

  return { broadcastToUser, broadcastStatus };
}

module.exports = { createWebSocketServer };
