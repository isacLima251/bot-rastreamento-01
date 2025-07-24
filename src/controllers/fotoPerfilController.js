const whatsappService = require('../services/whatsappService');

exports.obterFoto = async (req, res) => {
  const numero = req.params.numero;
  if (!numero) return res.status(400).json({ error: 'Número é obrigatório' });

  if (!req.venomClient) {
    return res.status(409).json({ error: 'A sua conta não está conectada ao WhatsApp.' });
  }

  try {
    const foto = await whatsappService.getProfilePicUrl(req.venomClient, numero, true);
    if (!foto) return res.status(404).json({ error: 'Foto não encontrada' });
    res.json({ foto });
  } catch (err) {
    console.error('Erro ao obter foto:', err);
    res.status(500).json({ error: 'Falha ao obter foto' });
  }
};
