const fs = require('fs');
const path = require('path');
const { processIncomingMessage } = require('../src/utils/messageUtils');

describe('processIncomingMessage', () => {
  const uploadDir = path.join(__dirname, '..', 'public', 'uploads');

  beforeEach(() => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    jest.spyOn(Date, 'now').mockReturnValue(1000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('handles media message', async () => {
    const client = { decryptFile: jest.fn().mockResolvedValue(Buffer.from('hi')) };
    const message = { isMedia: true, type: 'image', mimetype: 'image/png', body: '', caption: 'cap' };

    const result = await processIncomingMessage(client, message);

    const expectedPath = path.join(uploadDir, 'media_1000.png');
    expect(fs.writeFileSync).toHaveBeenCalledWith(expectedPath, Buffer.from('hi'));
    expect(result).toEqual({ messageContent: 'cap', messageType: 'image', mediaUrl: '/uploads/media_1000.png' });
  });

  test('handles audio ptt without caption', async () => {
    const client = { decryptFile: jest.fn().mockResolvedValue(Buffer.from('audio')) };
    const message = { isMedia: true, type: 'ptt', mimetype: 'audio/ogg', body: '' };

    const result = await processIncomingMessage(client, message);

    const expectedPath = path.join(uploadDir, 'audio_1000.ogg');
    expect(fs.writeFileSync).toHaveBeenCalledWith(expectedPath, Buffer.from('audio'));
    expect(result).toEqual({ messageContent: '[ÁUDIO]', messageType: 'audio', mediaUrl: '/uploads/audio_1000.ogg' });
  });

  test('handles decrypt errors gracefully', async () => {
    const client = { decryptFile: jest.fn().mockRejectedValue(new Error('fail')) };
    const message = { isMedia: true, type: 'image', mimetype: 'image/png', body: 'hello' };

    const result = await processIncomingMessage(client, message);

    expect(result).toEqual({ messageContent: '[MÍDIA NÃO BAIXADA] hello', messageType: 'texto', mediaUrl: null });
  });
});
