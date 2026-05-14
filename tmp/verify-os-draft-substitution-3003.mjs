const api = process.env.API_BASE_URL || 'http://localhost:3003';
const today = new Date();
const formatDate = (d) => d.toISOString().slice(0, 10);
const addDays = (n) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return formatDate(d);
};

(async () => {
  const listResp = await fetch(`${api}/api/ordem-servico?page=1&pageSize=200&sortBy=codigo&sortDirection=desc`);
  const listJson = await listResp.json();
  const draftItem = (listJson.items || []).find((item) => String(item.situacao || '').trim().toUpperCase() === 'RASCUNHO');

  if (!draftItem) {
    throw new Error('OrdemServico em rascunho nao encontrada para o teste.');
  }

  let activeCodigo = null;
  const originalState = {
    situacao: draftItem.situacao,
    dataEncerramento: draftItem.data_encerramento || null,
  };

  try {
    const revisaoResp = await fetch(`${api}/api/ordem-servico/next-revisao?termoAdesao=${encodeURIComponent(draftItem.termo_adesao)}&numOs=${encodeURIComponent(draftItem.num_os)}`);
    const revisaoJson = await revisaoResp.json();
    if (!revisaoResp.ok) {
      throw new Error(`next-revisao: ${JSON.stringify(revisaoJson)}`);
    }

    const createActiveResp = await fetch(`${api}/api/ordem-servico`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        codigoAccess: draftItem.codigo_access || '',
        termoAdesao: draftItem.termo_adesao,
        numOs: draftItem.num_os,
        revisao: revisaoJson.nextRevisao,
        vigenciaOs: draftItem.vigencia_os,
        credenciado: draftItem.credenciado,
        cnpjCpf: draftItem.cnpj_cpf,
        dreCodigo: draftItem.dre_codigo,
        modalidadeDescricao: draftItem.modalidade_descricao,
        cpfCondutor: draftItem.cpf_condutor,
        condutor: draftItem.condutor,
        dataAdmissaoCondutor: draftItem.data_admissao_condutor,
        cpfPreposto: draftItem.cpf_preposto,
        prepostoCondutor: draftItem.preposto_condutor,
        prepostoInicio: draftItem.preposto_inicio,
        prepostoDias: draftItem.preposto_dias,
        crm: draftItem.crm,
        veiculoPlacas: draftItem.veiculo_placas,
        cpfMonitor: draftItem.cpf_monitor,
        monitor: draftItem.monitor,
        dataAdmissaoMonitor: draftItem.data_admissao_monitor,
        situacao: 'Ativo',
        tipoTroca: draftItem.tipo_troca_descricao,
        conexao: draftItem.conexao,
        dataEncerramento: '',
        anotacao: `${draftItem.anotacao || ''} TESTE STATUS`.trim(),
        uniaoTermos: draftItem.uniao_termos,
        activationSourceCodigo: draftItem.codigo,
      }),
    });
    const createActiveJson = await createActiveResp.json();
    if (!createActiveResp.ok) {
      throw new Error(`create-active: ${JSON.stringify(createActiveJson)}`);
    }
    activeCodigo = Number(createActiveJson.item.codigo);

    const draftAfterResp = await fetch(`${api}/api/ordem-servico/${draftItem.codigo}`);
    const draftAfterJson = await draftAfterResp.json();
    if (!draftAfterResp.ok) {
      throw new Error(`fetch-draft-after: ${JSON.stringify(draftAfterJson)}`);
    }

    console.log(JSON.stringify({
      draftCodigo: Number(draftItem.codigo),
      activeCodigo,
      sourceStatusAfterActivation: draftAfterJson.situacao,
      sourceRevision: draftAfterJson.revisao,
      newActiveRevision: createActiveJson.item.revisao,
    }, null, 2));
  } finally {
    if (activeCodigo) {
      await fetch(`${api}/api/ordem-servico/${activeCodigo}`, { method: 'DELETE', headers: { Accept: 'application/json' } });
    }
    const { Client } = await import('pg');
    const client = new Client({ host: 'localhost', port: 5432, user: 'postgres', password: '12345', database: 'teg_financ' });
    await client.connect();
    try {
      await client.query(
        `UPDATE ordem_servico
            SET situacao = $2,
                data_encerramento = NULLIF($3, '')::date,
                data_modificacao = NOW()
          WHERE codigo = $1`,
        [Number(draftItem.codigo), originalState.situacao, originalState.dataEncerramento || ''],
      );
    } finally {
      await client.end();
    }
  }
})().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
