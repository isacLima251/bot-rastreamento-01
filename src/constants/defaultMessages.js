const DEFAULT_MESSAGES = {
    boas_vindas: "Olá {{primeiro_nome}}! Bem-vindo(a). Agradecemos o seu contato!",
    envio_rastreio: "Olá {{primeiro_nome}}, o seu pedido foi enviado! O seu código de rastreio é: {{codigo_rastreio}}",
    pedido_a_caminho: "Boas notícias, {{primeiro_nome}}! O seu pedido está a caminho. Pode acompanhar com o código: {{codigo_rastreio}}",
    pedido_atrasado: "Olá {{primeiro_nome}}, notamos um possível atraso na entrega do seu pedido. Já estamos a verificar o que aconteceu. Código: {{codigo_rastreio}}",
    pedido_devolvido: "Atenção {{primeiro_nome}}, o seu pedido foi devolvido ao remetente. Por favor, entre em contato connosco para resolvermos a situação. Código: {{codigo_rastreio}}",
    // --- NOVAS MENSAGENS PADRÃO AQUI ---
    pedido_a_espera: 'Olá {{primeiro_nome}}! O seu pedido está a espera. Agradecemos o seu contato!',
    pedido_cancelado: 'Olá {{primeiro_nome}}! seu pedido foi cancelado. Agradecemos o seu contato!'
};

module.exports = DEFAULT_MESSAGES;
