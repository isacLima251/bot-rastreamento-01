const axios = require('axios');
const { rastrearCodigo } = require('../src/services/rastreamentoService');
const { shouldCheck, verificarRastreios } = require('../src/controllers/rastreamentoController');
const pedidoService = require('../src/services/pedidoService');
const rastreamentoService = require('../src/services/rastreamentoService');

afterEach(() => {
  jest.restoreAllMocks();
});

describe('rastrearCodigo', () => {
  test('maps API response', async () => {
    const evento = { status: 'Em trânsito', location: 'Centro', date: '2024-01-01', time: '10:00' };
    jest.spyOn(axios, 'post').mockResolvedValue({ data: { events: [evento] } });

    const result = await rastrearCodigo('AB123', 'KEY');

    expect(axios.post).toHaveBeenCalledWith(
      'https://api-labs.wonca.com.br/wonca.labs.v1.LabsService/Track',
      { code: 'AB123' },
      { headers: { Authorization: 'Apikey KEY', 'Content-Type': 'application/json' } }
    );
    expect(result.statusInterno).toBe(evento.status);
    expect(result.ultimaLocalizacao).toBe(evento.location);
    expect(result.ultimaAtualizacao).toBe(`${evento.date} ${evento.time}`);
  });

  test('maps origem e destino da descricao', async () => {
    const evento = {
      status: 'Em trânsito',
      location: 'Centro',
      date: '2024-01-01',
      time: '10:00',
      description: 'Objeto em trânsito de São Paulo/SP para Rio de Janeiro/RJ'
    };
    jest.spyOn(axios, 'post').mockResolvedValue({ data: { events: [evento] } });

    const result = await rastrearCodigo('AB123', 'KEY');

    expect(result.origemUltimaMovimentacao).toBe('São Paulo/SP');
    expect(result.destinoUltimaMovimentacao).toBe('Rio de Janeiro/RJ');
  });

  test('returns erro_api on failure', async () => {
    jest.spyOn(axios, 'post').mockRejectedValue(new Error('fail'));

    const result = await rastrearCodigo('AB123', 'KEY');

    expect(result).toEqual({ statusInterno: 'erro_api', ultimaLocalizacao: '-', ultimaAtualizacao: '-', eventos: [] });
  });
});

describe('shouldCheck logic', () => {
  test('ignores first day recheck after postado', () => {
    const now = new Date('2024-05-01T12:00:00Z');
    const pedido = {
      statusInterno: 'postado',
      statusChangeAt: '2024-05-01T08:00:00Z',
      lastCheckedAt: '2024-05-01T09:00:00Z',
      checkCount: 1
    };
    expect(shouldCheck(pedido, now)).toBe(false);
  });

  test('checks postado first day when never checked', () => {
    const now = new Date('2024-05-01T12:00:00Z');
    const pedido = {
      statusInterno: 'postado',
      statusChangeAt: '2024-05-01T08:00:00Z',
      lastCheckedAt: null,
      checkCount: 0
    };
    expect(shouldCheck(pedido, now)).toBe(true);
  });

  test('checks postado again after 8 hours', () => {
    const now = new Date('2024-05-02T18:00:00Z');
    const pedido = {
      statusInterno: 'postado',
      statusChangeAt: '2024-05-01T08:00:00Z',
      lastCheckedAt: '2024-05-02T09:00:00Z'
    };
    expect(shouldCheck(pedido, now)).toBe(true);
  });

  test('waits 8 hours between checks for postado', () => {
    const now = new Date('2024-05-02T14:00:00Z');
    const pedido = {
      statusInterno: 'postado',
      statusChangeAt: '2024-05-01T08:00:00Z',
      lastCheckedAt: '2024-05-02T10:00:00Z'
    };
    expect(shouldCheck(pedido, now)).toBe(false);
  });

  test('checks saiu para entrega after 30 minutes', () => {
    const now = new Date('2024-05-01T12:00:00Z');
    const pedido = { statusInterno: 'saiu para entrega', lastCheckedAt: '2024-05-01T11:20:00Z' };
    expect(shouldCheck(pedido, now)).toBe(true);
  });

  test('waits 30 minutes for saiu para entrega', () => {
    const now = new Date('2024-05-01T12:00:00Z');
    const pedido = { statusInterno: 'saiu para entrega', lastCheckedAt: '2024-05-01T11:45:00Z' };
    expect(shouldCheck(pedido, now)).toBe(false);
  });

  test('reduces checks to once per day after limit', () => {
    const now = new Date('2024-05-02T12:00:00Z');
    const pedido = { checkCount: 100, lastCheckedAt: '2024-05-02T01:00:00Z' };
    expect(shouldCheck(pedido, now)).toBe(false);
  });

  test('ignores pedidos concluídos', () => {
    const now = new Date();
    const pedido = { statusInterno: 'entregue' };
    expect(shouldCheck(pedido, now)).toBe(false);
  });

  test('triggers scheduled check window if not checked', () => {
    const now = new Date('2024-05-03T10:32:00Z');
    const pedido = { lastCheckedAt: '2024-05-03T09:00:00Z' };
    expect(shouldCheck(pedido, now)).toBe(true);
  });

  test('does not trigger window check twice', () => {
    const now = new Date('2024-05-03T10:32:00Z');
    const pedido = { lastCheckedAt: '2024-05-03T10:31:00Z' };
    expect(shouldCheck(pedido, now)).toBe(false);
  });

  test('ignores scheduled window after it passes', () => {
    const now = new Date('2024-05-03T10:40:00Z');
    const pedido = { lastCheckedAt: '2024-05-03T09:00:00Z' };
    expect(shouldCheck(pedido, now)).toBe(false);
  });
});

describe('verificarRastreios horario', () => {
  test('nao verifica durante a madrugada', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2024-05-01T03:00:00Z'));
    const getAll = jest.spyOn(pedidoService, 'getAllPedidos').mockResolvedValue([]);

    await verificarRastreios({}, null, 1);

    expect(getAll).not.toHaveBeenCalled();
    jest.useRealTimers();
  });
});
