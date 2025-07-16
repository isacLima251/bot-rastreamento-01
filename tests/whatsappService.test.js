const path = require('path');
const whatsappService = require('../src/services/whatsappService');

describe('whatsappService helper functions', () => {
  test('sendImage formats number and resolves path', async () => {
    const client = { sendImage: jest.fn().mockResolvedValue() };
    const phone = '11987654321';
    const imgUrl = '/uploads/test.png';
    await whatsappService.sendImage(client, phone, imgUrl, 'hello');

    const expectedPath = path.join(__dirname, '..', 'public', 'uploads', 'test.png');
    expect(client.sendImage).toHaveBeenCalledWith('5511987654321@c.us', expectedPath, 'test.png', 'hello');
  });

  test('sendAudio formats number and passes url', async () => {
    const client = { sendVoice: jest.fn().mockResolvedValue() };
    const phone = '11987654321';
    const audioUrl = 'http://example.com/audio.ogg';

    await whatsappService.sendAudio(client, phone, audioUrl);

    expect(client.sendVoice).toHaveBeenCalledWith('5511987654321@c.us', audioUrl);
  });
});
