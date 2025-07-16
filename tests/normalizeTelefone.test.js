const { normalizeTelefone } = require('../src/utils/normalizeTelefone');
const pedidoService = require('../src/services/pedidoService');

describe('normalizeTelefone', () => {
  test('normalizes various formats', () => {
    expect(normalizeTelefone('11 98765-4321')).toBe('5511987654321');
    expect(normalizeTelefone('(11)98765-4321')).toBe('5511987654321');
    expect(normalizeTelefone('11987654321')).toBe('5511987654321');
    expect(normalizeTelefone('5511987654321')).toBe('5511987654321');
  });

  test('returns null for invalid numbers', () => {
    expect(normalizeTelefone('12345')).toBeNull();
  });

  test('pedidoService exports the shared implementation', () => {
    expect(pedidoService.normalizeTelefone).toBe(normalizeTelefone);
  });
});
