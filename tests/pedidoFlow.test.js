const pedidoService = require('../src/services/pedidoService');
const whatsappService = require('../src/services/whatsappService');
const pedidosController = require('../src/controllers/pedidosController');

afterEach(() => {
  jest.restoreAllMocks();
});

describe('uso do avatar padrão', () => {
  test('criarPedido define avatar padrão', async () => {
    const db = {
      run: jest.fn((sql, params, cb) => cb.call({ lastID: 1 }, null))
    };

    const result = await pedidoService.criarPedido(db, { nome: 'Teste', telefone: '11987654321' }, {}, 1);
    expect(result.fotoPerfilUrl).toBe(whatsappService.DEFAULT_AVATAR_URL);
    expect(db.run).toHaveBeenCalled();
  });

  test('atualizarFotoDoPedido salva avatar padrão', async () => {
    jest.spyOn(pedidoService, 'getPedidoById').mockResolvedValue({ id: 2, telefone: '11987654321' });
    const updateSpy = jest.spyOn(pedidoService, 'updateCamposPedido').mockResolvedValue({ changes: 1 });

    const req = { db: {}, user: { id: 1 }, params: { id: 2 }, venomClient: {}, broadcast: jest.fn() };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await pedidosController.atualizarFotoDoPedido(req, res);

    expect(updateSpy).toHaveBeenCalledWith({}, 2, { fotoPerfilUrl: whatsappService.DEFAULT_AVATAR_URL }, 1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Foto de perfil atualizada com sucesso!', data: { fotoUrl: whatsappService.DEFAULT_AVATAR_URL } });
  });
});
