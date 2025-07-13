const DEFAULT_MESSAGES = {
    boas_vindas: "Olá {{primeiro_nome}}! 👋 Seja bem-vindo(a). Estamos à disposição!",
    envio_rastreio: "📦 Olá {{primeiro_nome}}, o seu pedido foi enviado! Código de rastreio: {{codigo_rastreio}}",
    pedido_a_caminho: "🚚 Boas notícias, {{primeiro_nome}}! O seu pedido está a caminho. Acompanhe com o código: {{codigo_rastreio}}",
    pedido_atrasado: "⏳ Olá {{primeiro_nome}}, notamos um possível atraso na entrega do seu pedido. Já estamos verificando. Código: {{codigo_rastreio}}",
    pedido_devolvido: "⚠️ Atenção {{primeiro_nome}}, o seu pedido foi devolvido ao remetente. Por favor, entre em contato conosco para resolvermos. Código: {{codigo_rastreio}}",
    // --- NOVAS MENSAGENS PADRÃO AQUI ---
    pedido_a_espera: "⌛ Olá {{primeiro_nome}}! O seu pedido está à espera. Agradecemos o seu contato!",
    pedido_cancelado: "❌ Olá {{primeiro_nome}}! O seu pedido foi cancelado. Agradecemos o seu contato!"
};

module.exports = DEFAULT_MESSAGES;
