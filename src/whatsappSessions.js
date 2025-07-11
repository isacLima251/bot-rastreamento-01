const venom = require('venom-bot');
const fs = require('fs');
const path = require('path');
const whatsappService = require('./services/whatsappService');
const pedidoService = require('./services/pedidoService');
const settingsService = require('./services/settingsService');

function createWhatsAppManager(app, { broadcastStatus, broadcastToUser }) {
  const activeSessions = new Map();

  function setApp(instance) {
    app = instance;
  }

  function setBroadcast(bStatus, bUser) {
    broadcastStatus = bStatus;
    broadcastToUser = bUser;
  }

  function start(client, userId) {
    whatsappService.iniciarWhatsApp(client);

    client.onMessage(async (message) => {
      if (message.isGroupMsg || message.from === 'status@broadcast') return;
      const telefoneCliente = message.from.replace('@c.us', '');
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
            broadcastToUser(userId, { type: 'novo_contato', pedido });
          } else {
            return;
          }
        } else {
          await pedidoService.incrementarNaoLidas(db, pedido.id, userId);
        }

        let messageContent = message.body;
        let messageType = 'texto';
        let mediaUrl = null;

        if (message.isMedia === true || message.isMms === true) {
          try {
            const buffer = await client.decryptFile(message);
            const fileName = `${message.id}.${message.mimetype.split('/')[1]}`;
            const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
            if (!fs.existsSync(uploadDir)) {
              fs.mkdirSync(uploadDir, { recursive: true });
            }
            const filePath = path.join(uploadDir, fileName);
            fs.writeFileSync(filePath, buffer);
            mediaUrl = `/uploads/${fileName}`;
            messageContent = message.caption || '';
            messageType = message.mimetype.startsWith('image') ? 'imagem' : 'audio';
          } catch (mediaError) {
            console.error('Erro ao processar mídia:', mediaError);
            messageContent = '[Mídia não processada]' + (message.caption || '');
            messageType = 'texto';
          }
        }

        await pedidoService.addMensagemHistorico(db, pedido.id, messageContent, 'recebida', 'cliente', userId, mediaUrl, messageType);
        broadcastToUser(userId, { type: 'nova_mensagem', pedidoId: pedido.id });
      } catch (error) {
        console.error('[onMessage] Erro ao processar mensagem:', error);
      }
    });
  }

  async function connectToWhatsApp(userId) {
    const existing = activeSessions.get(userId);
    if (existing && (existing.status === 'CONNECTING' || existing.status === 'CONNECTED')) {
      return;
    }

    broadcastStatus(userId, 'CONNECTING');
    const sessionState = { client: null, status: 'CONNECTING', qrCode: null, botInfo: null };
    activeSessions.set(userId, sessionState);

    venom
      .create(
        { session: `whatsship-bot-${userId}`, useChrome: false, headless: 'new', browserArgs: ['--no-sandbox', '--disable-setuid-sandbox'] },
        (base64Qr) => broadcastStatus(userId, 'QR_CODE', { qrCode: base64Qr })
      )
      .then(async (client) => {
        sessionState.client = client;
        try {
          const hostDevice = await client.getHostDevice();
          if (hostDevice && hostDevice.id && hostDevice.id._serialized) {
            const numeroBot = hostDevice.id.user;
            const nomeBot = hostDevice.pushname || hostDevice.verifiedName || 'Nome Indisponível';
            let fotoUrl = null;
            try {
              fotoUrl = await client.getProfilePicFromServer(hostDevice.id._serialized);
            } catch (picError) {
              fotoUrl = hostDevice.eurl || null;
            }
            sessionState.botInfo = { numero: numeroBot, nome: nomeBot, fotoUrl };
          }
        } catch (error) {
          console.error('Erro ao obter dados do hostDevice:', error);
        } finally {
          start(client, userId);
          broadcastStatus(userId, 'CONNECTED', { botInfo: sessionState.botInfo });
        }
      })
      .catch((erro) => {
        console.error('Erro ao criar cliente Venom:', erro);
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
      }
    }
  }

  function getSession(userId) {
    return activeSessions.get(userId);
  }

  return {
    connectToWhatsApp,
    disconnectFromWhatsApp,
    activeSessions,
    getSession,
    setApp,
    setBroadcast,
    get broadcastToUser() {
      return broadcastToUser;
    },
    get broadcastStatus() {
      return broadcastStatus;
    },
  };
}

module.exports = { createWhatsAppManager };
