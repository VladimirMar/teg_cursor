const api = 'http://localhost:3001';
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
  const base = (listJson.items || []).find((item) => item.cpf_condutor && item.cpf_monitor && item.crm && item.cnpj_cpf && item.dre_codigo && item.modalidade_descricao);

  if (!base) {
    throw new Error('Base de teste para ordem-servico nao encontrada.');
  }

  const termo = `2026/${String(Date.now()).slice(-7)}`;
  const basePayload = {
    codigoAccess: '',
    termoAdesao: termo,
    numOs: '001',
    vigenciaOs: addDays(1),
    credenciado: base.credenciado,
    cnpjCpf: base.cnpj_cpf,
    dreCodigo: base.dre_codigo,
    modalidadeDescricao: base.modalidade_descricao,
    cpfCondutor: base.cpf_condutor,
    condutor: base.condutor,
    dataAdmissaoCondutor: addDays(-5),
    cpfPreposto: '',
    prepostoCondutor: '',
    prepostoInicio: '',
    prepostoDias: '',
    crm: base.crm,
    veiculoPlacas: base.veiculo_placas || '',
    cpfMonitor: base.cpf_monitor,
    monitor: base.monitor,
    dataAdmissaoMonitor: addDays(-5),
    tipoTroca: '',
    conexao: '',
    dataEncerramento: '',
    anotacao: 'TESTE STATUS SUBSTITUIDO RASCUNHO',
    uniaoTermos: '',
  };

  let draftCodigo = null;
  let activeCodigo = null;

  try {
    const createDraftResp = await fetch(`${api}/api/ordem-servico`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ ...basePayload, revisao: 'A', situacao: 'Rascunho' }),
    });
    const createDraftJson = await createDraftResp.json();
    if (!createDraftResp.ok) {
      throw new Error(`create-draft: ${JSON.stringify(createDraftJson)}`);
    }
    draftCodigo = Number(createDraftJson.item.codigo);

    const createActiveResp = await fetch(`${api}/api/ordem-servico`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ ...basePayload, revisao: 'B', situacao: 'Ativo', activationSourceCodigo: draftCodigo }),
    });
    const createActiveJson = await createActiveResp.json();
    if (!createActiveResp.ok) {
      throw new Error(`create-active: ${JSON.stringify(createActiveJson)}`);
    }
    activeCodigo = Number(createActiveJson.item.codigo);

    const draftAfterResp = await fetch(`${api}/api/ordem-servico/${draftCodigo}`);
    const draftAfterJson = await draftAfterResp.json();
    if (!draftAfterResp.ok) {
      throw new Error(`fetch-draft-after: ${JSON.stringify(draftAfterJson)}`);
    }

    console.log(JSON.stringify({
      draftCodigo,
      activeCodigo,
      sourceStatusAfterActivation: draftAfterJson.situacao,
      sourceRevision: draftAfterJson.revisao,
      newActiveRevision: createActiveJson.item.revisao,
    }, null, 2));
  } finally {
    if (activeCodigo) {
      await fetch(`${api}/api/ordem-servico/${activeCodigo}`, { method: 'DELETE', headers: { Accept: 'application/json' } });
    }
    if (draftCodigo) {
      await fetch(`${api}/api/ordem-servico/${draftCodigo}`, { method: 'DELETE', headers: { Accept: 'application/json' } });
    }
  }
})().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
