const axios = require('axios');
const { rastrearCodigo } = require('../src/services/rastreamentoService');

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

  test('returns erro_api on failure', async () => {
    jest.spyOn(axios, 'post').mockRejectedValue(new Error('fail'));

    const result = await rastrearCodigo('AB123', 'KEY');

    expect(result).toEqual({ statusInterno: 'erro_api', ultimaLocalizacao: '-', ultimaAtualizacao: '-', eventos: [] });
  });
});
