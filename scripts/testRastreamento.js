const { rastrearCodigo } = require('../src/services/rastreamentoService');

(async () => {
  const codigo = process.argv[2];
  if (!codigo) {
    console.error('Uso: node scripts/testRastreamento.js <codigo>');
    process.exit(1);
  }

  try {
    const resultado = await rastrearCodigo(codigo);
    console.log(JSON.stringify(resultado, null, 2));
  } catch (err) {
    console.error('Erro ao rastrear codigo:', err.message);
  }
})();
