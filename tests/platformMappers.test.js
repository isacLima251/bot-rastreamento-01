const mappers = require('../src/services/platformMappers');

describe('mapHotmart', () => {
  test('should map payload to generic format', () => {
    const payload = {
      event: 'purchase.approved',
      buyer: {
        name: 'Alice',
        email: 'alice@example.com',
        phone: { ddd: '11', number: '999999999' }
      },
      product: { name: 'Curso X' },
      tracking_code: 'AB123'
    };

    const result = mappers.hotmart(payload);
    expect(result).toEqual({
      eventType: 'VENDA_APROVADA',
      clientName: 'Alice',
      clientEmail: 'alice@example.com',
      clientPhone: '11999999999',
      productName: 'Curso X',
      trackingCode: 'AB123'
    });
  });
});
