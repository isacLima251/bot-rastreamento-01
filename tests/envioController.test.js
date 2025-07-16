const envioController = require('../src/controllers/envioController');
const automationService = require('../src/services/automationService');
const pedidoService = require('../src/services/pedidoService');
const whatsappService = require('../src/services/whatsappService');
const logService = require('../src/services/logService');

afterEach(() => {
  jest.restoreAllMocks();
});

describe('enviarMensagensComRegras', () => {
  test('envia mensagem quando status muda', async () => {
    const automacoes = {
      pedido_a_caminho: {
        ativo: true,
        mensagem: 'Olá {{primeiro_nome}}, seu status é {{status_atual}}',
        steps: []
      }
    };
    jest.spyOn(automationService, 'getAutomations').mockResolvedValue(automacoes);

    const pedido = {
      id: 1,
      nome: 'João Teste',
      telefone: '11988887777',
      codigoRastreio: 'AB123',
      statusInterno: 'Pedido a caminho',
      mensagemUltimoStatus: 'envio_rastreio',
      cliente_id: 5
    };
    jest.spyOn(pedidoService, 'getAllPedidos').mockResolvedValue([pedido]);
    const updateSpy = jest
      .spyOn(pedidoService, 'updateCamposPedido')
      .mockResolvedValue({ changes: 1 });
    jest
      .spyOn(pedidoService, 'addMensagemHistorico')
      .mockResolvedValue({ id: 1 });
    const sendSpy = jest
      .spyOn(whatsappService, 'enviarMensagem')
      .mockResolvedValue();
    jest.spyOn(logService, 'addLog').mockResolvedValue({});

    const sessions = new Map([[5, { status: 'CONNECTED', client: {} }]]);
    const broadcast = jest.fn();
    const db = {};

    await envioController.enviarMensagensComRegras(db, broadcast, sessions);

    expect(sendSpy).toHaveBeenCalledWith(
      sessions.get(5).client,
      pedido.telefone,
      'Olá João, seu status é Pedido a caminho'
    );
    expect(updateSpy).toHaveBeenCalledWith(db, 1, { mensagemUltimoStatus: 'pedido a caminho' }, 5);
    expect(broadcast).toHaveBeenCalledWith(5, { type: 'nova_mensagem', pedidoId: 1 });
  });

  test('nao envia mensagem se status não mudou', async () => {
    const automacoes = {
      pedido_a_caminho: {
        ativo: true,
        mensagem: 'Olá {{primeiro_nome}}, seu status é {{status_atual}}',
        steps: []
      }
    };
    jest.spyOn(automationService, 'getAutomations').mockResolvedValue(automacoes);

    const pedido = {
      id: 2,
      nome: 'Maria',
      telefone: '11999999999',
      codigoRastreio: 'CD456',
      statusInterno: 'Pedido a caminho',
      mensagemUltimoStatus: 'pedido a caminho',
      cliente_id: 5
    };
    jest.spyOn(pedidoService, 'getAllPedidos').mockResolvedValue([pedido]);
    const updateSpy = jest
      .spyOn(pedidoService, 'updateCamposPedido')
      .mockResolvedValue({});
    const sendSpy = jest
      .spyOn(whatsappService, 'enviarMensagem')
      .mockResolvedValue();
    jest
      .spyOn(pedidoService, 'addMensagemHistorico')
      .mockResolvedValue({});
    jest.spyOn(logService, 'addLog').mockResolvedValue({});

    const sessions = new Map([[5, { status: 'CONNECTED', client: {} }]]);
    const broadcast = jest.fn();
    const db = {};

    await envioController.enviarMensagensComRegras(db, broadcast, sessions);

    expect(sendSpy).not.toHaveBeenCalled();
    expect(updateSpy).not.toHaveBeenCalled();
    expect(broadcast).not.toHaveBeenCalled();
  });
});

