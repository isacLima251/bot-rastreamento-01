const pedidoService = require('../src/services/pedidoService');
const whatsappService = require('../src/services/whatsappService');
const pedidosController = require('../src/controllers/pedidosController');

afterEach(() => {
  jest.restoreAllMocks();
});

describe('pedido creation and update with profile picture failure', () => {
  test('criarPedido resolves when getProfilePicUrl fails', async () => {
    jest.spyOn(whatsappService, 'getProfilePicUrl').mockRejectedValue(new Error('fail'));

    const db = {
      run: jest.fn((sql, params, cb) => cb.call({ lastID: 1 }, null))
    };

    const result = await pedidoService.criarPedido(db, { nome: 'Teste', telefone: '11987654321' }, {}, 1);
    expect(result.fotoPerfilUrl).toBeNull();
    expect(db.run).toHaveBeenCalled();
  });

  test('atualizarFotoDoPedido responde 200 quando foto falha', async () => {
    jest.spyOn(whatsappService, 'getProfilePicUrl').mockResolvedValue(null);
    jest.spyOn(pedidoService, 'getPedidoById').mockResolvedValue({ id: 2, telefone: '11987654321' });
    const updateSpy = jest.spyOn(pedidoService, 'updateCamposPedido').mockResolvedValue({ changes: 1 });

    const req = { db: {}, user: { id: 1 }, params: { id: 2 }, venomClient: {}, broadcast: jest.fn() };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await pedidosController.atualizarFotoDoPedido(req, res);

    expect(updateSpy).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Nenhuma foto de perfil foi encontrada para este contato.', data: { fotoUrl: null } });
  });
});
