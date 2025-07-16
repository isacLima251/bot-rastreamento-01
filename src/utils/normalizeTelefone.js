/**
 * NORMALIZADOR DE TELEFONE DEFINITIVO (trata o 9\u00ba d\u00edgito)
 * Converte qualquer n\u00famero de celular brasileiro para o formato padr\u00e3o 55DDD9XXXXXXX.
 * @param {string} telefoneRaw O n\u00famero em qualquer formato.
 * @returns {string|null} O n\u00famero 100% normalizado ou nulo se for inv\u00e1lido.
 */
function normalizeTelefone(telefoneRaw) {
    if (!telefoneRaw) return null;
    // Remove tudo que n\u00e3o for d\u00edgito
    let digitos = String(telefoneRaw).replace(/\D/g, '');

    // Se tiver '55' no in\u00edcio, remove para analisar o n\u00famero local
    if (digitos.startsWith('55')) {
        digitos = digitos.substring(2);
    }

    // Um n\u00famero local v\u00e1lido no Brasil tem 10 (DDD+8) ou 11 (DDD+9) d\u00edgitos
    if (digitos.length < 10 || digitos.length > 11) {
        return null; // Formato inv\u00e1lido
    }

    const ddd = digitos.substring(0, 2);
    let numeroBase = digitos.substring(2);

    // Se o n\u00famero base tem 8 d\u00edgitos e \u00e9 um celular, adiciona o '9'
    if (numeroBase.length === 8 && ['6','7','8','9'].includes(numeroBase[0])) {
        numeroBase = '9' + numeroBase;
    }

    // Se o n\u00famero final n\u00e3o tem 9 d\u00edgitos, n\u00e3o \u00e9 um celular v\u00e1lido
    if (numeroBase.length !== 9) {
        return null;
    }

    // Retorna o n\u00famero no formato can\u00f4nico e garantido
    return `55${ddd}${numeroBase}`;
}

module.exports = { normalizeTelefone };
