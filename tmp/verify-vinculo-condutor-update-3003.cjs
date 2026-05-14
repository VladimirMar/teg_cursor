const pg = require('pg');

const api = process.env.API_BASE_URL || 'http://localhost:3003';
const { Pool } = pg;
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '12345',
  database: 'teg_financ',
});

const today = new Date();
const formatDate = (d) => d.toISOString().slice(0, 10);
const digitsOnly = (value) => String(value || '').replace(/\D/g, '');
const addDays = (n) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return formatDate(d);
};

(async () => {
  const osResp = await fetch(`${api}/api/ordem-servico?page=1&pageSize=200`);
  const osJson = await osResp.json();
  const ordemServicoItems = osJson.items || [];
  const activeItems = ordemServicoItems.filter((item) => String(item.situacao || '').trim().toUpperCase() === 'ATIVO');
  const base = activeItems.find((item) => item.cnpj_cpf && item.dre_codigo && item.modalidade_descricao);
  const condutorLivreResult = await pool.query(
    `SELECT cpf_condutor
       FROM condutor c
      WHERE COALESCE(BTRIM(c.cpf_condutor), '') <> ''
        AND NOT EXISTS (
          SELECT 1
            FROM ordem_servico os
           WHERE UPPER(BTRIM(COALESCE(os.situacao, ''))) = 'ATIVO'
             AND REGEXP_REPLACE(COALESCE(os.cpf_condutor, ''), '\\D', '', 'g') = REGEXP_REPLACE(COALESCE(c.cpf_condutor, ''), '\\D', '', 'g')
        )
        AND NOT EXISTS (
          SELECT 1
            FROM ordem_servico os
           WHERE UPPER(BTRIM(COALESCE(os.situacao, ''))) = 'ATIVO'
             AND REGEXP_REPLACE(COALESCE(os.cpf_preposto, ''), '\\D', '', 'g') = REGEXP_REPLACE(COALESCE(c.cpf_condutor, ''), '\\D', '', 'g')
        )
        AND NOT EXISTS (
          SELECT 1
            FROM ordem_servico os
           WHERE UPPER(BTRIM(COALESCE(os.situacao, ''))) = 'ATIVO'
             AND REGEXP_REPLACE(COALESCE(os.cpf_monitor, ''), '\\D', '', 'g') = REGEXP_REPLACE(COALESCE(c.cpf_condutor, ''), '\\D', '', 'g')
        )
      ORDER BY c.codigo ASC
      LIMIT 2`,
  );
  const condutorInicial = condutorLivreResult.rows[0] || null;
  const novoCondutor = condutorLivreResult.rows[1] || null;

  const monitorLivreResult = await pool.query(
    `SELECT cpf_monitor
       FROM monitor m
      WHERE COALESCE(BTRIM(m.cpf_monitor), '') <> ''
        AND NOT EXISTS (
          SELECT 1
            FROM ordem_servico os
           WHERE UPPER(BTRIM(COALESCE(os.situacao, ''))) = 'ATIVO'
             AND REGEXP_REPLACE(COALESCE(os.cpf_condutor, ''), '\\D', '', 'g') = REGEXP_REPLACE(COALESCE(m.cpf_monitor, ''), '\\D', '', 'g')
        )
        AND NOT EXISTS (
          SELECT 1
            FROM ordem_servico os
           WHERE UPPER(BTRIM(COALESCE(os.situacao, ''))) = 'ATIVO'
             AND REGEXP_REPLACE(COALESCE(os.cpf_preposto, ''), '\\D', '', 'g') = REGEXP_REPLACE(COALESCE(m.cpf_monitor, ''), '\\D', '', 'g')
        )
        AND NOT EXISTS (
          SELECT 1
            FROM ordem_servico os
           WHERE UPPER(BTRIM(COALESCE(os.situacao, ''))) = 'ATIVO'
             AND REGEXP_REPLACE(COALESCE(os.cpf_monitor, ''), '\\D', '', 'g') = REGEXP_REPLACE(COALESCE(m.cpf_monitor, ''), '\\D', '', 'g')
        )
      ORDER BY m.codigo ASC
      LIMIT 1`,
  );
  const monitorLivre = monitorLivreResult.rows[0] || null;

  const veiculoLivreResult = await pool.query(
    `SELECT crm, placas
       FROM veiculo v
      WHERE COALESCE(BTRIM(v.crm), '') <> ''
        AND COALESCE(BTRIM(v.placas), '') <> ''
        AND NOT EXISTS (
          SELECT 1
            FROM ordem_servico os
           WHERE UPPER(BTRIM(COALESCE(os.situacao, ''))) = 'ATIVO'
             AND UPPER(BTRIM(COALESCE(os.veiculo_placas, ''))) = UPPER(BTRIM(COALESCE(v.placas, '')))
        )
      ORDER BY v.codigo ASC
      LIMIT 1`,
  );
  const veiculoLivre = veiculoLivreResult.rows[0] || null;

  if (!base || !condutorInicial || !novoCondutor || !monitorLivre || !veiculoLivre) {
    throw new Error('Base de teste nao encontrada.');
  }

  const nextNumOsResp = await fetch(`${api}/api/ordem-servico/next-num-os?termoAdesao=${encodeURIComponent(base.termo_adesao)}`);
  const nextNumOsJson = await nextNumOsResp.json();

  if (!nextNumOsResp.ok) {
    throw new Error(`next-num-os: ${JSON.stringify(nextNumOsJson)}`);
  }

  const termo = base.termo_adesao;
  const numOs = nextNumOsJson.nextNumOs;
  const revisao = '-S/R';
  const payloadBase = {
    codigoAccess: '',
    termoAdesao: termo,
    numOs,
    revisao,
    vigenciaOs: addDays(1),
    credenciado: base.credenciado,
    cnpjCpf: base.cnpj_cpf,
    dreCodigo: base.dre_codigo,
    modalidadeDescricao: base.modalidade_descricao,
    cpfCondutor: condutorInicial.cpf_condutor,
    dataAdmissaoCondutor: addDays(-5),
    cpfPreposto: '',
    prepostoInicio: '',
    prepostoDias: '',
    crm: veiculoLivre.crm,
    cpfMonitor: monitorLivre.cpf_monitor,
    dataAdmissaoMonitor: addDays(-5),
    situacao: 'Ativo',
    tipoTroca: '',
    dataEncerramento: '',
    anotacao: 'TESTE VINCULO CONDUTOR',
    uniaoTermos: '',
  };

  let createdCodigo = null;

  try {
    const createResp = await fetch(`${api}/api/ordem-servico`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payloadBase),
    });
    const createJson = await createResp.json();
    if (!createResp.ok) {
      throw new Error(`create: ${JSON.stringify(createJson)}`);
    }
    createdCodigo = createJson.item.codigo;

    const q1 = await pool.query(
      "select termo_adesao, num_os, revisao, credenciada_codigo, to_char(data_admissao_condutor,'YYYY-MM-DD') as data_admissao_condutor, condutor_codigo from vinculo_condutor where termo_adesao = $1 and num_os = $2 and revisao = $3",
      [termo, numOs, revisao],
    );

    const updateCondutorPayload = {
      ...payloadBase,
      codigo: createdCodigo,
      cpfCondutor: novoCondutor.cpf_condutor,
      dataAdmissaoCondutor: addDays(-4),
    };

    const updateCondutorResp = await fetch(`${api}/api/ordem-servico/${createdCodigo}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(updateCondutorPayload),
    });
    const updateCondutorJson = await updateCondutorResp.json();
    if (!updateCondutorResp.ok) {
      throw new Error(`update-condutor: ${JSON.stringify(updateCondutorJson)}`);
    }

    const q2 = await pool.query(
      "select termo_adesao, num_os, revisao, credenciada_codigo, to_char(data_admissao_condutor,'YYYY-MM-DD') as data_admissao_condutor, condutor_codigo from vinculo_condutor where termo_adesao = $1 and num_os = $2 and revisao = $3",
      [termo, numOs, revisao],
    );

    const updateDataPayload = {
      ...updateCondutorPayload,
      dataAdmissaoCondutor: addDays(-2),
    };

    const updateDataResp = await fetch(`${api}/api/ordem-servico/${createdCodigo}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(updateDataPayload),
    });
    const updateDataJson = await updateDataResp.json();
    if (!updateDataResp.ok) {
      throw new Error(`update-data: ${JSON.stringify(updateDataJson)}`);
    }

    const q3 = await pool.query(
      "select termo_adesao, num_os, revisao, credenciada_codigo, to_char(data_admissao_condutor,'YYYY-MM-DD') as data_admissao_condutor, condutor_codigo from vinculo_condutor where termo_adesao = $1 and num_os = $2 and revisao = $3",
      [termo, numOs, revisao],
    );

    console.log(JSON.stringify({
      aposCriar: q1.rows,
      aposAlterarCondutor: q2.rows,
      aposAlterarSomenteData: q3.rows,
      condutorOriginalCpf: condutorInicial.cpf_condutor,
      novoCondutorCpf: novoCondutor.cpf_condutor,
      monitorCpf: monitorLivre.cpf_monitor,
      crm: veiculoLivre.crm,
      dataEsperadaFinal: addDays(-2),
    }, null, 2));
  } finally {
    if (createdCodigo) {
      await fetch(`${api}/api/ordem-servico/${createdCodigo}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      });
    }
    await pool.end();
  }
})().catch(async (error) => {
  console.error(error.message);
  try { await pool.end(); } catch {}
  process.exit(1);
});
