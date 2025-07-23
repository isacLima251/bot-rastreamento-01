const { rastrearCodigo } = require('../src/services/rastreamentoService');

(async () => {
  const codigo = process.argv[2];
  if (!codigo) {
    console.error('Uso: node scripts/testRastreamento.js <codigo>');
    process.exit(1);
  }

  try {
    const resultado = await rastrearCodigo(codigo);

    const {
      statusInterno,
      ultimaLocalizacao,
      ultimaAtualizacao,
      origemUltimaMovimentacao,
      destinoUltimaMovimentacao
    } = resultado;

    let mensagem = `Código: ${codigo} - Status: ${statusInterno || 'indisponível'}`;

    if (origemUltimaMovimentacao && destinoUltimaMovimentacao) {
      mensagem += `\nSeu pedido saiu de ${origemUltimaMovimentacao} e está a caminho de ${destinoUltimaMovimentacao}.`;
    } else if (ultimaLocalizacao) {
      mensagem += `\nÚltima localização conhecida: ${ultimaLocalizacao}.`;
    }

    if (ultimaAtualizacao) {
      mensagem += `\nAtualizado em: ${ultimaAtualizacao}`;
    }

    console.log(mensagem);
    console.log('\nDados completos:\n', JSON.stringify(resultado, null, 2));
  } catch (err) {
    console.error('Erro ao rastrear codigo:', err.message);
  }
})();
