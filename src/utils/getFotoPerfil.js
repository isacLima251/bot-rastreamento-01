const { Client, LocalAuth } = require('whatsapp-web.js');
const path = require('path');
const axios = require('axios');

let _client;

async function getClient() {
  if (_client) return _client;
  _client = new Client({
    authStrategy: new LocalAuth({ dataPath: path.resolve(__dirname, '../../session-wweb') }),
    puppeteer: { headless: true }
  });
  await _client.initialize();
  return _client;
}

async function getFotoPerfil(numeroRaw) {
  const client = await getClient();
  const numero = numeroRaw.replace(/\D/g, '') + '@c.us';
  try {
    const url = await client.getProfilePicUrl(numero);
    if (!url || url.includes('default')) return null;
    const res = await axios.get(url, { responseType: 'arraybuffer' });
    const b64 = Buffer.from(res.data, 'binary').toString('base64');
    return `data:image/jpeg;base64,${b64}`;
  } catch (e) {
    console.warn('Erro ao buscar foto de perfil:', e.message);
    return null;
  }
}

module.exports = { getFotoPerfil };
