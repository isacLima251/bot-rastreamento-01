function mapHotmart(payload) {
    let evento = (payload.event || '').toLowerCase();
    if (evento === 'purchase.approved') evento = 'VENDA_APROVADA';
    else if (evento === 'purchase.tracking.code.changed') evento = 'RASTREIO_ADICIONADO';
    else if (evento === 'purchase.canceled') evento = 'VENDA_CANCELADA';
    else evento = evento.toUpperCase();

    const buyer = payload.buyer || payload.customer || {};
    const telefone = (buyer.phone?.ddd || '') + (buyer.phone?.number || buyer.phone?.local_number || buyer.phone || '');

    return {
        eventType: evento,
        clientName: buyer.name,
        clientEmail: buyer.email,
        clientPhone: telefone,
        productName: payload.product?.name || payload.product_name,
        trackingCode: payload.tracking_code || payload.purchase?.tracking_code || payload.data?.tracking?.code
    };
}

function mapKiwify(payload) {
    let evento = (payload.event || payload.type || '').toLowerCase();
    if (evento === 'sale_approved' || evento === 'order.approved') evento = 'VENDA_APROVADA';
    else if (evento === 'tracking_code_added' || evento === 'order.tracking_code') evento = 'RASTREIO_ADICIONADO';
    else if (evento === 'sale_refunded' || evento === 'order.refunded' || evento === 'sale_canceled') evento = 'VENDA_CANCELADA';
    else evento = evento.toUpperCase();

    const cliente = payload.customer || payload.cliente || {};
    const telefone = (cliente.phone?.ddd || '') + (cliente.phone?.number || cliente.phone || payload.phone || '');

    return {
        eventType: evento,
        clientName: cliente.name,
        clientEmail: cliente.email || payload.email,
        clientPhone: telefone,
        productName: payload.product?.name || payload.product_name || payload.produto,
        trackingCode: payload.tracking_code || payload.codigo_rastreio
    };
}

function mapBraip(payload) {
    let eventType = 'UNKNOWN';
    if (payload.type === 'TRACKING_CODE_ADDED') {
        eventType = 'RASTREIO_ADICIONADO';
    } else if (payload.trans_status === 'Pagamento Aprovado' || payload.trans_status === 'Agendado') {
        eventType = 'VENDA_APROVADA';
    } else if (['Cancelada', 'Chargeback', 'Devolvida'].includes(payload.trans_status)) {
        eventType = 'VENDA_CANCELADA';
    }

    return {
        eventType,
        clientEmail: payload.client_email,
        clientName: payload.client_name,
        clientPhone: payload.client_cel,
        productName: payload.product_name,
        trackingCode: payload.tracking_code
    };
}

function mapGeneric(payload) {
    let evento = (payload.event || payload.status || '').toLowerCase();
    if (evento === 'purchase_approved') evento = 'VENDA_APROVADA';
    else if (evento === 'tracking_code_added') evento = 'RASTREIO_ADICIONADO';
    else if (evento === 'purchase_canceled') evento = 'VENDA_CANCELADA';
    else evento = evento.toUpperCase();

    const customer = payload.customer || payload.buyer || {};
    const telefone = (customer.phone?.ddd || '') + (customer.phone?.number || customer.phone || '');

    return {
        eventType: evento,
        clientName: customer.name,
        clientEmail: customer.email,
        clientPhone: telefone,
        productName: payload.product?.name || payload.product_name,
        trackingCode: payload.tracking_code || payload.codigoRastreio || payload.codigo_rastreio
    };
}

module.exports = {
    hotmart: mapHotmart,
    kiwify: mapKiwify,
    braip: mapBraip,
    generico: mapGeneric
};
