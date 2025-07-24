// --- FUNÇÕES DE AJUDA ---
const path = require('path');

const { normalizeTelefone } = require("../utils/normalizeTelefone");
function resolveMediaPath(url) {
    if (!url) return url;
    if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
        return path.join(__dirname, '..', '..', 'public', url.replace(/^\//, ''));
    }
    return url;
}
// Avatar padrão usado para todos os contatos
const DEFAULT_AVATAR_URL = 'https://i.imgur.com/z28n3Nz.png';


// --- FUNÇÕES PRINCIPAIS DO SERVIÇO ---

function iniciarWhatsApp() {
    // Mantido para compatibilidade futura
}

async function enviarMensagem(client, telefone, mensagem) {
    if (!client) throw new Error('Cliente WhatsApp não iniciado.');
    const numeroNormalizado = normalizeTelefone(telefone);
    const numeroFormatado = `${numeroNormalizado}@c.us`;
    await client.sendText(numeroFormatado, mensagem);
}

async function sendImage(client, telefone, imageUrl, caption = '') {
    if (!client) throw new Error('Cliente WhatsApp não iniciado.');
    const numeroNormalizado = normalizeTelefone(telefone);
    const numeroFormatado = `${numeroNormalizado}@c.us`;
    const filePath = resolveMediaPath(imageUrl);
    await client.sendImage(numeroFormatado, filePath, path.basename(filePath), caption);
}

async function sendAudio(client, telefone, audioUrl) {
    if (!client) throw new Error('Cliente WhatsApp não iniciado.');
    const numeroNormalizado = normalizeTelefone(telefone);
    const numeroFormatado = `${numeroNormalizado}@c.us`;
    const filePath = resolveMediaPath(audioUrl);
    await client.sendVoice(numeroFormatado, filePath);
}

async function sendFile(client, telefone, fileUrl, fileName, caption = '') {
    if (!client) throw new Error('Cliente WhatsApp não iniciado.');
    const numeroNormalizado = normalizeTelefone(telefone);
    const numeroFormatado = `${numeroNormalizado}@c.us`;
    const filePath = resolveMediaPath(fileUrl);
    await client.sendFile(numeroFormatado, filePath, fileName, caption);
}

async function sendVideo(client, telefone, videoUrl, caption = '') {
    if (!client) throw new Error('Cliente WhatsApp não iniciado.');
    const numeroNormalizado = normalizeTelefone(telefone);
    const numeroFormatado = `${numeroNormalizado}@c.us`;
    const filePath = resolveMediaPath(videoUrl);
    const fileName = path.basename(filePath);
    // Venom-bot não possui um método dedicado para envio de vídeo.
    // Utilizamos sendFile, que trata o MIME e envia o arquivo como vídeo.
    await client.sendFile(numeroFormatado, filePath, fileName, caption);
}

/**
 * Obtém a foto de perfil real do contato, retornando uma
 * imagem padrão caso não seja possível buscar no WhatsApp.
 *
 * @param {object} client Instância do venom-bot já autenticada
 * @param {string} telefone Número do contato em qualquer formato
 * @returns {string} URL da foto do perfil ou do avatar padrão
 */
async function getProfilePicUrl(client, telefone) {
    if (!client || !telefone) return DEFAULT_AVATAR_URL;

    try {
        const numero = normalizeTelefone(telefone);
        if (!numero) return DEFAULT_AVATAR_URL;
        const wid = `${numero}@c.us`;
        const url = await client.getProfilePicFromServer(wid);
        return url || DEFAULT_AVATAR_URL;
    } catch (err) {
        return DEFAULT_AVATAR_URL;
    }
}

module.exports = {
    iniciarWhatsApp,
    enviarMensagem,
    sendImage,
    sendAudio,
    sendFile,
    sendVideo,
    getProfilePicUrl,
    DEFAULT_AVATAR_URL
};
