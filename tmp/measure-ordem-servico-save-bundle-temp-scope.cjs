const { Client, Pool } = require('pg');

const api = process.env.API_BASE_URL || 'http://localhost:3003';
const ordemServicoSemRevisaoLabel = '-S/R';
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '12345',
  database: 'teg_financ',
});

const formatDate = (d) => d.toISOString().slice(0, 10);
const addDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return formatDate(d);
};

const scopeCondition = (alias, firstParamIndex = 2, revisaoFallbackPlaceholder = '$1') => `(
  REGEXP_REPLACE(COALESCE(BTRIM(${alias}.termo_adesao), ''), '\\D', '', 'g') = REGEXP_REPLACE($${firstParamIndex}, '\\D', '', 'g')
  AND COALESCE(BTRIM(${alias}.num_os), '') = $${firstParamIndex + 1}
  AND COALESCE(NULLIF(BTRIM(${alias}.revisao), ''), ${revisaoFallbackPlaceholder}) = $${firstParamIndex + 2}
)`;

async function measureBundle(client, label, statements) {
  const startedAt = process.hrtime.bigint();
  const steps = [];

  await client.query('BEGIN');
  try {
    for (const statement of statements) {
      const stepStartedAt = process.hrtime.bigint();
      const result = await client.query(statement.sql, statement.params);
      steps.push({
        name: statement.name,
        elapsedMs: Number((Number(process.hrtime.bigint() - stepStartedAt) / 1e6).toFixed(2)),
        rowCount: result.rowCount ?? null,
      });
    }
  } finally {
    await client.query('ROLLBACK');
  }

  return {
    label,
    totalMs: Number((Number(process.hrtime.bigint() - startedAt) / 1e6).toFixed(2)),
    steps,
  };
}

async function main() {
  const dbClient = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '12345',
    database: 'teg_financ',
  });

  await dbClient.connect();

  let createdCodigo = null;
  let scope = null;

  try {
    const osResp = await fetch(`${api}/api/ordem-servico?page=1&pageSize=200`);
    const osJson = await osResp.json();
    const activeItems = (osJson.items || []).filter((item) => String(item.situacao || '').trim().toUpperCase() === 'ATIVO');
    const base = activeItems.find((item) => item.termo_adesao && item.cnpj_cpf && item.dre_codigo && item.modalidade_descricao);

    if (!base) {
      throw new Error('Base de OrdemServico ativa nao encontrada.');
    }

    const condutorLivreResult = await pool.query(
      `SELECT cpf_condutor
         FROM condutor c
        WHERE COALESCE(BTRIM(c.cpf_condutor), '') <> ''
          AND NOT EXISTS (
            SELECT 1 FROM ordem_servico os
             WHERE UPPER(BTRIM(COALESCE(os.situacao, ''))) = 'ATIVO'
               AND (
                 REGEXP_REPLACE(COALESCE(os.cpf_condutor, ''), '\\D', '', 'g') = REGEXP_REPLACE(COALESCE(c.cpf_condutor, ''), '\\D', '', 'g')
                 OR REGEXP_REPLACE(COALESCE(os.cpf_preposto, ''), '\\D', '', 'g') = REGEXP_REPLACE(COALESCE(c.cpf_condutor, ''), '\\D', '', 'g')
                 OR REGEXP_REPLACE(COALESCE(os.cpf_monitor, ''), '\\D', '', 'g') = REGEXP_REPLACE(COALESCE(c.cpf_condutor, ''), '\\D', '', 'g')
               )
          )
        ORDER BY c.codigo ASC
        LIMIT 1`,
    );
    const monitorLivreResult = await pool.query(
      `SELECT cpf_monitor
         FROM monitor m
        WHERE COALESCE(BTRIM(m.cpf_monitor), '') <> ''
          AND NOT EXISTS (
            SELECT 1 FROM ordem_servico os
             WHERE UPPER(BTRIM(COALESCE(os.situacao, ''))) = 'ATIVO'
               AND (
                 REGEXP_REPLACE(COALESCE(os.cpf_condutor, ''), '\\D', '', 'g') = REGEXP_REPLACE(COALESCE(m.cpf_monitor, ''), '\\D', '', 'g')
                 OR REGEXP_REPLACE(COALESCE(os.cpf_preposto, ''), '\\D', '', 'g') = REGEXP_REPLACE(COALESCE(m.cpf_monitor, ''), '\\D', '', 'g')
                 OR REGEXP_REPLACE(COALESCE(os.cpf_monitor, ''), '\\D', '', 'g') = REGEXP_REPLACE(COALESCE(m.cpf_monitor, ''), '\\D', '', 'g')
               )
          )
        ORDER BY m.codigo ASC
        LIMIT 1`,
    );
    const veiculoLivreResult = await pool.query(
      `SELECT crm, placas
         FROM veiculo v
        WHERE COALESCE(BTRIM(v.crm), '') <> ''
          AND COALESCE(BTRIM(v.placas), '') <> ''
          AND NOT EXISTS (
            SELECT 1 FROM ordem_servico os
             WHERE UPPER(BTRIM(COALESCE(os.situacao, ''))) = 'ATIVO'
               AND UPPER(BTRIM(COALESCE(os.veiculo_placas, ''))) = UPPER(BTRIM(COALESCE(v.placas, '')))
          )
        ORDER BY v.codigo ASC
        LIMIT 1`,
    );

    const condutorLivre = condutorLivreResult.rows[0];
    const monitorLivre = monitorLivreResult.rows[0];
    const veiculoLivre = veiculoLivreResult.rows[0];

    if (!condutorLivre || !monitorLivre || !veiculoLivre) {
      throw new Error('Recursos livres nao encontrados para medicao.');
    }

    const nextNumOsResp = await fetch(`${api}/api/ordem-servico/next-num-os?termoAdesao=${encodeURIComponent(base.termo_adesao)}`);
    const nextNumOsJson = await nextNumOsResp.json();
    if (!nextNumOsResp.ok) {
      throw new Error(`next-num-os: ${JSON.stringify(nextNumOsJson)}`);
    }

    const createPayload = {
      codigoAccess: '',
      termoAdesao: base.termo_adesao,
      numOs: nextNumOsJson.nextNumOs,
      revisao: ordemServicoSemRevisaoLabel,
      vigenciaOs: addDays(1),
      credenciado: base.credenciado,
      cnpjCpf: base.cnpj_cpf,
      dreCodigo: base.dre_codigo,
      modalidadeDescricao: base.modalidade_descricao,
      cpfCondutor: condutorLivre.cpf_condutor,
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
      anotacao: 'MEDICAO BEFORE AFTER SAVE BUNDLE',
      uniaoTermos: '',
    };

    const createResp = await fetch(`${api}/api/ordem-servico`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(createPayload),
    });
    const createJson = await createResp.json();
    if (!createResp.ok) {
      throw new Error(`create: ${JSON.stringify(createJson)}`);
    }

    createdCodigo = Number(createJson.item.codigo);
    scope = {
      termoAdesao: createJson.item.termo_adesao,
      numOs: createJson.item.num_os,
      revisao: createJson.item.revisao,
    };

    const countsResult = await dbClient.query(`
      SELECT
        (SELECT COUNT(*)::int FROM ordem_servico WHERE UPPER(BTRIM(COALESCE(situacao, ''))) = 'ATIVO') AS ordem_servico_ativas,
        (SELECT COUNT(*)::int FROM vinculo_condutor) AS vinculo_condutor_total,
        (SELECT COUNT(*)::int FROM vinculo_monitor) AS vinculo_monitor_total,
        (SELECT COUNT(*)::int FROM vinculo_condutor vc WHERE ${scopeCondition('vc')}) AS vinculo_condutor_escopo,
        (SELECT COUNT(*)::int FROM vinculo_monitor vm WHERE ${scopeCondition('vm')}) AS vinculo_monitor_escopo
    `, [ordemServicoSemRevisaoLabel, scope.termoAdesao, scope.numOs, scope.revisao]);

    const scopeParams = [ordemServicoSemRevisaoLabel, scope.termoAdesao, scope.numOs, scope.revisao];
    const oldStatements = [
      {
        name: 'old.rebalance',
        sql: `UPDATE ordem_servico
              SET revisao = COALESCE(NULLIF(BTRIM(revisao), ''), $1),
                  os_concat = CONCAT(COALESCE(BTRIM(termo_adesao), ''), '-', COALESCE(BTRIM(num_os), ''), COALESCE(NULLIF(BTRIM(revisao), ''), $1))
              WHERE COALESCE(BTRIM(revisao), '') = ''
                 OR COALESCE(BTRIM(os_concat), '') <> CONCAT(COALESCE(BTRIM(termo_adesao), ''), '-', COALESCE(BTRIM(num_os), ''), COALESCE(NULLIF(BTRIM(revisao), ''), $1))`,
        params: [ordemServicoSemRevisaoLabel],
      },
      {
        name: 'old.condutor.delete',
        sql: `DELETE FROM vinculo_condutor WHERE COALESCE(BTRIM(termo_adesao), '') <> '' OR COALESCE(BTRIM(num_os), '') <> '' OR COALESCE(BTRIM(revisao), '') <> ''`,
        params: [],
      },
      {
        name: 'old.condutor.insert',
        sql: `INSERT INTO vinculo_condutor (termo_adesao, num_os, revisao, credenciada_codigo, data_admissao_condutor, condutor_codigo, data_inclusao)
              SELECT DISTINCT NULLIF(BTRIM(os.termo_adesao), ''), NULLIF(BTRIM(os.num_os), ''), COALESCE(NULLIF(BTRIM(os.revisao), ''), $1), t.credenciada_codigo, os.data_admissao_condutor, c.codigo, COALESCE(os.data_inclusao, NOW())
              FROM ordem_servico os
              LEFT JOIN termo t ON t.codigo = os.termo_codigo
              LEFT JOIN condutor c ON BTRIM(COALESCE(c.cpf_condutor, '')) = BTRIM(COALESCE(os.cpf_condutor, ''))
              WHERE COALESCE(BTRIM(os.termo_adesao), '') <> ''
                AND COALESCE(BTRIM(os.num_os), '') <> ''
                AND os.termo_codigo IS NOT NULL
                AND t.credenciada_codigo IS NOT NULL
                AND os.data_admissao_condutor IS NOT NULL
                AND c.codigo IS NOT NULL`,
        params: [ordemServicoSemRevisaoLabel],
      },
      {
        name: 'old.monitor.delete',
        sql: `DELETE FROM vinculo_monitor WHERE COALESCE(BTRIM(termo_adesao), '') <> '' OR COALESCE(BTRIM(num_os), '') <> '' OR COALESCE(BTRIM(revisao), '') <> ''`,
        params: [],
      },
      {
        name: 'old.monitor.insert',
        sql: `INSERT INTO vinculo_monitor (termo_adesao, num_os, revisao, credenciada_codigo, data_admissao_monitor, monitor_codigo, data_inclusao)
              SELECT DISTINCT NULLIF(BTRIM(os.termo_adesao), ''), NULLIF(BTRIM(os.num_os), ''), COALESCE(NULLIF(BTRIM(os.revisao), ''), $1), t.credenciada_codigo, os.data_admissao_monitor, m.codigo, COALESCE(os.data_inclusao, NOW())
              FROM ordem_servico os
              LEFT JOIN termo t ON t.codigo = os.termo_codigo
              LEFT JOIN monitor m ON BTRIM(COALESCE(m.cpf_monitor, '')) = BTRIM(COALESCE(os.cpf_monitor, ''))
              WHERE COALESCE(BTRIM(os.termo_adesao), '') <> ''
                AND COALESCE(BTRIM(os.num_os), '') <> ''
                AND os.termo_codigo IS NOT NULL
                AND t.credenciada_codigo IS NOT NULL
                AND os.data_admissao_monitor IS NOT NULL
                AND m.codigo IS NOT NULL`,
        params: [ordemServicoSemRevisaoLabel],
      },
    ];

    const newStatements = [
      {
        name: 'new.rebalance',
        sql: `UPDATE ordem_servico AS os_target
              SET revisao = COALESCE(NULLIF(BTRIM(revisao), ''), $1),
                  os_concat = CONCAT(COALESCE(BTRIM(termo_adesao), ''), '-', COALESCE(BTRIM(num_os), ''), COALESCE(NULLIF(BTRIM(revisao), ''), $1))
              WHERE (COALESCE(BTRIM(revisao), '') = '' OR COALESCE(BTRIM(os_concat), '') <> CONCAT(COALESCE(BTRIM(termo_adesao), ''), '-', COALESCE(BTRIM(num_os), ''), COALESCE(NULLIF(BTRIM(revisao), ''), $1)))
                AND ${scopeCondition('os_target')}`,
        params: scopeParams,
      },
      {
        name: 'new.condutor.delete',
        sql: `DELETE FROM vinculo_condutor AS vc WHERE ${scopeCondition('vc')}`,
        params: scopeParams,
      },
      {
        name: 'new.condutor.insert',
        sql: `INSERT INTO vinculo_condutor (termo_adesao, num_os, revisao, credenciada_codigo, data_admissao_condutor, condutor_codigo, data_inclusao)
              SELECT DISTINCT NULLIF(BTRIM(os.termo_adesao), ''), NULLIF(BTRIM(os.num_os), ''), COALESCE(NULLIF(BTRIM(os.revisao), ''), $1), t.credenciada_codigo, os.data_admissao_condutor, c.codigo, COALESCE(os.data_inclusao, NOW())
              FROM ordem_servico os
              LEFT JOIN termo t ON t.codigo = os.termo_codigo
              LEFT JOIN condutor c ON BTRIM(COALESCE(c.cpf_condutor, '')) = BTRIM(COALESCE(os.cpf_condutor, ''))
              WHERE COALESCE(BTRIM(os.termo_adesao), '') <> ''
                AND COALESCE(BTRIM(os.num_os), '') <> ''
                AND os.termo_codigo IS NOT NULL
                AND t.credenciada_codigo IS NOT NULL
                AND os.data_admissao_condutor IS NOT NULL
                AND c.codigo IS NOT NULL
                AND ${scopeCondition('os')}`,
        params: scopeParams,
      },
      {
        name: 'new.monitor.delete',
        sql: `DELETE FROM vinculo_monitor AS vm WHERE ${scopeCondition('vm')}`,
        params: scopeParams,
      },
      {
        name: 'new.monitor.insert',
        sql: `INSERT INTO vinculo_monitor (termo_adesao, num_os, revisao, credenciada_codigo, data_admissao_monitor, monitor_codigo, data_inclusao)
              SELECT DISTINCT NULLIF(BTRIM(os.termo_adesao), ''), NULLIF(BTRIM(os.num_os), ''), COALESCE(NULLIF(BTRIM(os.revisao), ''), $1), t.credenciada_codigo, os.data_admissao_monitor, m.codigo, COALESCE(os.data_inclusao, NOW())
              FROM ordem_servico os
              LEFT JOIN termo t ON t.codigo = os.termo_codigo
              LEFT JOIN monitor m ON BTRIM(COALESCE(m.cpf_monitor, '')) = BTRIM(COALESCE(os.cpf_monitor, ''))
              WHERE COALESCE(BTRIM(os.termo_adesao), '') <> ''
                AND COALESCE(BTRIM(os.num_os), '') <> ''
                AND os.termo_codigo IS NOT NULL
                AND t.credenciada_codigo IS NOT NULL
                AND os.data_admissao_monitor IS NOT NULL
                AND m.codigo IS NOT NULL
                AND ${scopeCondition('os')}`,
        params: scopeParams,
      },
    ];

    const runs = [];
    for (let index = 0; index < 3; index += 1) {
      runs.push(await measureBundle(dbClient, `old-run-${index + 1}`, oldStatements));
      runs.push(await measureBundle(dbClient, `new-run-${index + 1}`, newStatements));
    }

    const summarize = (prefix) => {
      const matchingRuns = runs.filter((run) => run.label.startsWith(prefix));
      const totalMs = matchingRuns.reduce((sum, run) => sum + run.totalMs, 0);
      return {
        averageTotalMs: Number((totalMs / matchingRuns.length).toFixed(2)),
        minTotalMs: Number(Math.min(...matchingRuns.map((run) => run.totalMs)).toFixed(2)),
        maxTotalMs: Number(Math.max(...matchingRuns.map((run) => run.totalMs)).toFixed(2)),
      };
    };

    console.log(JSON.stringify({
      createdCodigo,
      scope,
      counts: countsResult.rows[0],
      summary: {
        old: summarize('old-'),
        new: summarize('new-'),
      },
      runs,
    }, null, 2));
  } finally {
    if (createdCodigo) {
      await fetch(`${api}/api/ordem-servico/${createdCodigo}`, { method: 'DELETE', headers: { Accept: 'application/json' } });
    }
    await dbClient.end();
    await pool.end();
  }
}

main().catch(async (error) => {
  console.error(error);
  try { await pool.end(); } catch {}
  process.exit(1);
});
