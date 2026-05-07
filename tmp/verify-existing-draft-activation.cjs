const pg = require('pg');
const api = 'http://localhost:3001';
const { Pool } = pg;
const pool = new Pool({ host: 'localhost', port: 5432, user: 'postgres', password: '12345', database: 'teg_financ' });

(async () => {
  const draftCodigo = 11111153;
  let createdCodigo = null;
  let originalState = null;

  try {
    const originalResp = await fetch(`${api}/api/ordem-servico/${draftCodigo}`);
    const originalItem = await originalResp.json();
    if (!originalResp.ok) {
      throw new Error(`fetch-original: ${JSON.stringify(originalItem)}`);
    }
    originalState = { situacao: originalItem.situacao, dataEncerramento: originalItem.data_encerramento || null };

    const revisaoResp = await fetch(`${api}/api/ordem-servico/next-revisao?termoAdesao=${encodeURIComponent(originalItem.termo_adesao)}&numOs=${encodeURIComponent(originalItem.num_os)}`);
    const revisaoJson = await revisaoResp.json();
    if (!revisaoResp.ok) {
      throw new Error(`next-revisao: ${JSON.stringify(revisaoJson)}`);
    }

    const createPayload = {
      codigoAccess: originalItem.codigo_access || '',
      termoAdesao: originalItem.termo_adesao,
      numOs: originalItem.num_os,
      revisao: revisaoJson.nextRevisao,
      vigenciaOs: originalItem.vigencia_os,
      credenciado: originalItem.credenciado,
      cnpjCpf: originalItem.cnpj_cpf,
      dreCodigo: originalItem.dre_codigo,
      modalidadeDescricao: originalItem.modalidade_descricao,
      cpfCondutor: originalItem.cpf_condutor,
      condutor: originalItem.condutor,
      dataAdmissaoCondutor: originalItem.data_admissao_condutor,
      cpfPreposto: originalItem.cpf_preposto,
      prepostoCondutor: originalItem.preposto_condutor,
      prepostoInicio: originalItem.preposto_inicio,
      prepostoDias: originalItem.preposto_dias,
      crm: originalItem.crm,
      veiculoPlacas: originalItem.veiculo_placas,
      cpfMonitor: originalItem.cpf_monitor,
      monitor: originalItem.monitor,
      dataAdmissaoMonitor: originalItem.data_admissao_monitor,
      situacao: 'Ativo',
      tipoTroca: originalItem.tipo_troca_descricao,
      conexao: originalItem.conexao,
      dataEncerramento: '',
      anotacao: `${originalItem.anotacao || ''} TESTE STATUS`.trim(),
      uniaoTermos: originalItem.uniao_termos,
      activationSourceCodigo: draftCodigo,
    };

    const createResp = await fetch(`${api}/api/ordem-servico`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(createPayload),
    });
    const createJson = await createResp.json();
    if (!createResp.ok) {
      throw new Error(`create-active: ${JSON.stringify(createJson)}`);
    }
    createdCodigo = Number(createJson.item.codigo);

    const sourceAfterResp = await fetch(`${api}/api/ordem-servico/${draftCodigo}`);
    const sourceAfterJson = await sourceAfterResp.json();
    if (!sourceAfterResp.ok) {
      throw new Error(`fetch-source-after: ${JSON.stringify(sourceAfterJson)}`);
    }

    console.log(JSON.stringify({
      draftCodigo,
      createdCodigo,
      previousSituacao: originalState.situacao,
      newRevision: createJson.item.revisao,
      sourceStatusAfterCreation: sourceAfterJson.situacao,
      sourceDataEncerramentoAfterCreation: sourceAfterJson.data_encerramento,
    }, null, 2));
  } finally {
    if (createdCodigo) {
      await fetch(`${api}/api/ordem-servico/${createdCodigo}`, { method: 'DELETE', headers: { Accept: 'application/json' } });
    }
    if (originalState) {
      await pool.query(
        `UPDATE ordem_servico
            SET situacao = $2,
                data_encerramento = NULLIF($3, '')::date,
                data_modificacao = NOW()
          WHERE codigo = $1`,
        [draftCodigo, originalState.situacao, originalState.dataEncerramento || ''],
      );
    }
    await pool.end();
  }
})().catch(async (error) => {
  console.error(error.message || error);
  try { await pool.end(); } catch {}
  process.exit(1);
});
