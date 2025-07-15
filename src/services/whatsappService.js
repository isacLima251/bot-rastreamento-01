// --- FUNÇÕES DE AJUDA ---
const path = require('path');

function resolveMediaPath(url) {
    if (!url) return url;
    if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
        return path.join(__dirname, '..', '..', 'public', url.replace(/^\//, ''));
    }
    return url;
}

/**
 * Normaliza um número de telefone para o formato internacional brasileiro (55 + DDD + Número).
 */
function normalizeTelefone(telefoneRaw) {
    if (!telefoneRaw) return '';
    const digitos = String(telefoneRaw).replace(/\D/g, '');
    if (digitos.startsWith('55') && (digitos.length === 12 || digitos.length === 13)) {
        return digitos;
    }
    if (digitos.length === 10 || digitos.length === 11) {
        return `55${digitos}`;
    }
    return digitos;
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
    await client.sendVideo(numeroFormatado, filePath, caption);
}

/**
 * Retorna a URL do avatar padrão.
 * A busca pela foto real do contato foi removida.
 */
async function getProfilePicUrl() {
    return DEFAULT_AVATAR_URL;
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
