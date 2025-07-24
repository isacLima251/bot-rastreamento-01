const { getFotoPerfil } = require('../utils/getFotoPerfil');

exports.obterFoto = async (req, res) => {
  const numero = req.params.numero;
  if (!numero) return res.status(400).json({ error: 'Número é obrigatório' });
  try {
    const foto = await getFotoPerfil(numero);
    if (!foto) return res.status(404).json({ error: 'Foto não encontrada' });
    res.json({ foto });
  } catch (err) {
    console.error('Erro ao obter foto:', err);
    res.status(500).json({ error: 'Falha ao obter foto' });
  }
};
