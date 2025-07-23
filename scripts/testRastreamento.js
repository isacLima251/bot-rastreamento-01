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
    destinoUltimaMovimentacao,
    descricaoUltimoEvento,
    eventos
  } = resultado;

  const linhas = [];
  linhas.push(`Código: ${codigo}`);
  linhas.push(`Status: ${statusInterno || 'indisponível'}`);

  if (origemUltimaMovimentacao && destinoUltimaMovimentacao) {
    linhas.push(`Seu pedido saiu de ${origemUltimaMovimentacao} e está a caminho de ${destinoUltimaMovimentacao}.`);
  } else if (ultimaLocalizacao) {
    linhas.push(`Última localização conhecida: ${ultimaLocalizacao}.`);
  }

  if (ultimaAtualizacao) {
    const data = new Date(ultimaAtualizacao);
    const formatada = !isNaN(data)
      ? data.toLocaleString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          hour: '2-digit',
          minute: '2-digit'
        })
      : ultimaAtualizacao;
    linhas.push(`Atualizado em: ${formatada}`);
  }

  if (descricaoUltimoEvento) {
    linhas.push(`Descrição do último evento: ${descricaoUltimoEvento}`);
  }

  console.log(linhas.join('\n'));
  if (eventos) {
    console.log('\nEventos:', JSON.stringify(eventos, null, 2));
  }
  console.log('\nDados completos:\n', JSON.stringify(resultado, null, 2));
  } catch (err) {
    console.error('Erro ao rastrear codigo:', err.message);
  }
})();
