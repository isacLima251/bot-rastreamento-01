const fs = require('fs');
const path = require('path');

/**
 * Process an incoming WhatsApp message, downloading media when necessary.
 * @param {Object} client Venom client instance used to decrypt files
 * @param {Object} message Message object from venom
 * @returns {Promise<{messageContent:string, messageType:string, mediaUrl:string|null}>}
 */
async function processIncomingMessage(client, message) {
  let messageContent = message.body;
  let messageType = 'texto';
  let mediaUrl = null;

  const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const isMedia = message.isMedia || message.isMMS || ['image', 'video', 'audio', 'document', 'ptt'].includes(message.type);
  if (isMedia) {
    try {
      const buffer = await client.decryptFile(message);
      const ext = message.type === 'ptt' ? 'ogg' : (message.mimetype ? message.mimetype.split('/')[1] : 'bin');
      const prefix = message.type === 'ptt' ? 'audio' : 'media';
      const fileName = `${prefix}_${Date.now()}.${ext}`;
      const filePath = path.join(uploadDir, fileName);
      await fs.promises.writeFile(filePath, buffer);
      mediaUrl = `/uploads/${fileName}`;
      messageContent = message.caption || (message.type === 'ptt' ? '[ÁUDIO]' : '');
      messageType = message.type === 'ptt' ? 'audio' : message.type;
    } catch (err) {
      console.error('Erro ao baixar mídia:', err);
      messageContent = `[MÍDIA NÃO BAIXADA] ${message.body}`;
      messageType = 'texto';
      mediaUrl = null;
    }
  }

  return { messageContent, messageType, mediaUrl };
}

module.exports = { processIncomingMessage };
