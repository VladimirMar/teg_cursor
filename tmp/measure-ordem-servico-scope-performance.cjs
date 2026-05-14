const { Client } = require('pg');

const ordemServicoSemRevisaoLabel = '-S/R';

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
      const elapsedMs = Number(process.hrtime.bigint() - stepStartedAt) / 1e6;
      steps.push({
        name: statement.name,
        elapsedMs: Number(elapsedMs.toFixed(2)),
        rowCount: result.rowCount ?? null,
      });
    }
  } finally {
    await client.query('ROLLBACK');
  }

  const totalMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
  return {
    label,
    totalMs: Number(totalMs.toFixed(2)),
    steps,
  };
}

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '12345',
    database: 'teg_financ',
  });

  await client.connect();

  try {
    const candidateResult = await client.query(`
      SELECT
        codigo,
        termo_adesao,
        num_os,
        COALESCE(NULLIF(BTRIM(revisao), ''), $1) AS revisao
      FROM ordem_servico
      WHERE UPPER(BTRIM(COALESCE(situacao, ''))) = 'ATIVO'
        AND COALESCE(BTRIM(termo_adesao), '') <> ''
        AND COALESCE(BTRIM(num_os), '') <> ''
        AND termo_codigo IS NOT NULL
        AND (
          EXISTS (
            SELECT 1
              FROM vinculo_condutor vc
             WHERE REGEXP_REPLACE(COALESCE(BTRIM(vc.termo_adesao), ''), '\\D', '', 'g') = REGEXP_REPLACE(COALESCE(BTRIM(ordem_servico.termo_adesao), ''), '\\D', '', 'g')
               AND COALESCE(BTRIM(vc.num_os), '') = COALESCE(BTRIM(ordem_servico.num_os), '')
               AND COALESCE(BTRIM(vc.revisao), '') = COALESCE(NULLIF(BTRIM(ordem_servico.revisao), ''), $1)
          )
          OR EXISTS (
            SELECT 1
              FROM vinculo_monitor vm
             WHERE REGEXP_REPLACE(COALESCE(BTRIM(vm.termo_adesao), ''), '\\D', '', 'g') = REGEXP_REPLACE(COALESCE(BTRIM(ordem_servico.termo_adesao), ''), '\\D', '', 'g')
               AND COALESCE(BTRIM(vm.num_os), '') = COALESCE(BTRIM(ordem_servico.num_os), '')
               AND COALESCE(BTRIM(vm.revisao), '') = COALESCE(NULLIF(BTRIM(ordem_servico.revisao), ''), $1)
          )
        )
      ORDER BY codigo DESC
      LIMIT 1
    `, [ordemServicoSemRevisaoLabel]);

    const candidate = candidateResult.rows[0];

    if (!candidate) {
      throw new Error('Nenhuma OrdemServico ativa encontrada para medicao.');
    }

    const countsResult = await client.query(`
      SELECT
        (SELECT COUNT(*)::int FROM ordem_servico WHERE UPPER(BTRIM(COALESCE(situacao, ''))) = 'ATIVO') AS ordem_servico_ativas,
        (SELECT COUNT(*)::int FROM vinculo_condutor) AS vinculo_condutor_total,
        (SELECT COUNT(*)::int FROM vinculo_monitor) AS vinculo_monitor_total,
        (SELECT COUNT(*)::int FROM vinculo_condutor vc WHERE ${scopeCondition('vc')}) AS vinculo_condutor_escopo,
        (SELECT COUNT(*)::int FROM vinculo_monitor vm WHERE ${scopeCondition('vm')}) AS vinculo_monitor_escopo
    `, [ordemServicoSemRevisaoLabel, candidate.termo_adesao, candidate.num_os, candidate.revisao]);

    const countRow = countsResult.rows[0];
    const scopeParams = [ordemServicoSemRevisaoLabel, candidate.termo_adesao, candidate.num_os, candidate.revisao];

    const oldStatements = [
      {
        name: 'old.rebalance',
        sql: `UPDATE ordem_servico
              SET revisao = COALESCE(NULLIF(BTRIM(revisao), ''), $1),
                  os_concat = CONCAT(
                    COALESCE(BTRIM(termo_adesao), ''),
                    '-',
                    COALESCE(BTRIM(num_os), ''),
                    COALESCE(NULLIF(BTRIM(revisao), ''), $1)
                  )
              WHERE COALESCE(BTRIM(revisao), '') = ''
                 OR COALESCE(BTRIM(os_concat), '') <> CONCAT(
                      COALESCE(BTRIM(termo_adesao), ''),
                      '-',
                      COALESCE(BTRIM(num_os), ''),
                      COALESCE(NULLIF(BTRIM(revisao), ''), $1)
                    )`,
        params: [ordemServicoSemRevisaoLabel],
      },
      {
        name: 'old.condutor.delete',
        sql: `DELETE FROM vinculo_condutor
              WHERE COALESCE(BTRIM(termo_adesao), '') <> ''
                 OR COALESCE(BTRIM(num_os), '') <> ''
                 OR COALESCE(BTRIM(revisao), '') <> ''`,
        params: [],
      },
      {
        name: 'old.condutor.insert',
        sql: `INSERT INTO vinculo_condutor (
                termo_adesao,
                num_os,
                revisao,
                credenciada_codigo,
                data_admissao_condutor,
                condutor_codigo,
                data_inclusao
              )
              SELECT DISTINCT
                NULLIF(BTRIM(os.termo_adesao), ''),
                NULLIF(BTRIM(os.num_os), ''),
                COALESCE(NULLIF(BTRIM(os.revisao), ''), $1),
                t.credenciada_codigo,
                os.data_admissao_condutor,
                c.codigo,
                COALESCE(os.data_inclusao, NOW())
              FROM ordem_servico os
              LEFT JOIN termo t ON t.codigo = os.termo_codigo
              LEFT JOIN condutor c
                ON BTRIM(COALESCE(c.cpf_condutor, '')) = BTRIM(COALESCE(os.cpf_condutor, ''))
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
        sql: `DELETE FROM vinculo_monitor
              WHERE COALESCE(BTRIM(termo_adesao), '') <> ''
                 OR COALESCE(BTRIM(num_os), '') <> ''
                 OR COALESCE(BTRIM(revisao), '') <> ''`,
        params: [],
      },
      {
        name: 'old.monitor.insert',
        sql: `INSERT INTO vinculo_monitor (
                termo_adesao,
                num_os,
                revisao,
                credenciada_codigo,
                data_admissao_monitor,
                monitor_codigo,
                data_inclusao
              )
              SELECT DISTINCT
                NULLIF(BTRIM(os.termo_adesao), ''),
                NULLIF(BTRIM(os.num_os), ''),
                COALESCE(NULLIF(BTRIM(os.revisao), ''), $1),
                t.credenciada_codigo,
                os.data_admissao_monitor,
                m.codigo,
                COALESCE(os.data_inclusao, NOW())
              FROM ordem_servico os
              LEFT JOIN termo t ON t.codigo = os.termo_codigo
              LEFT JOIN monitor m
                ON BTRIM(COALESCE(m.cpf_monitor, '')) = BTRIM(COALESCE(os.cpf_monitor, ''))
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
                  os_concat = CONCAT(
                    COALESCE(BTRIM(termo_adesao), ''),
                    '-',
                    COALESCE(BTRIM(num_os), ''),
                    COALESCE(NULLIF(BTRIM(revisao), ''), $1)
                  )
              WHERE (
                     COALESCE(BTRIM(revisao), '') = ''
                  OR COALESCE(BTRIM(os_concat), '') <> CONCAT(
                       COALESCE(BTRIM(termo_adesao), ''),
                       '-',
                       COALESCE(BTRIM(num_os), ''),
                       COALESCE(NULLIF(BTRIM(revisao), ''), $1)
                     )
                    )
                AND ${scopeCondition('os_target')}`,
        params: scopeParams,
      },
      {
        name: 'new.condutor.delete',
        sql: `DELETE FROM vinculo_condutor AS vc
              WHERE ${scopeCondition('vc')}`,
        params: scopeParams,
      },
      {
        name: 'new.condutor.insert',
        sql: `INSERT INTO vinculo_condutor (
                termo_adesao,
                num_os,
                revisao,
                credenciada_codigo,
                data_admissao_condutor,
                condutor_codigo,
                data_inclusao
              )
              SELECT DISTINCT
                NULLIF(BTRIM(os.termo_adesao), ''),
                NULLIF(BTRIM(os.num_os), ''),
                COALESCE(NULLIF(BTRIM(os.revisao), ''), $1),
                t.credenciada_codigo,
                os.data_admissao_condutor,
                c.codigo,
                COALESCE(os.data_inclusao, NOW())
              FROM ordem_servico os
              LEFT JOIN termo t ON t.codigo = os.termo_codigo
              LEFT JOIN condutor c
                ON BTRIM(COALESCE(c.cpf_condutor, '')) = BTRIM(COALESCE(os.cpf_condutor, ''))
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
        sql: `DELETE FROM vinculo_monitor AS vm
              WHERE ${scopeCondition('vm')}`,
        params: scopeParams,
      },
      {
        name: 'new.monitor.insert',
        sql: `INSERT INTO vinculo_monitor (
                termo_adesao,
                num_os,
                revisao,
                credenciada_codigo,
                data_admissao_monitor,
                monitor_codigo,
                data_inclusao
              )
              SELECT DISTINCT
                NULLIF(BTRIM(os.termo_adesao), ''),
                NULLIF(BTRIM(os.num_os), ''),
                COALESCE(NULLIF(BTRIM(os.revisao), ''), $1),
                t.credenciada_codigo,
                os.data_admissao_monitor,
                m.codigo,
                COALESCE(os.data_inclusao, NOW())
              FROM ordem_servico os
              LEFT JOIN termo t ON t.codigo = os.termo_codigo
              LEFT JOIN monitor m
                ON BTRIM(COALESCE(m.cpf_monitor, '')) = BTRIM(COALESCE(os.cpf_monitor, ''))
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
      runs.push(await measureBundle(client, `old-run-${index + 1}`, oldStatements));
      runs.push(await measureBundle(client, `new-run-${index + 1}`, newStatements));
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
      candidate,
      counts: countRow,
      summary: {
        old: summarize('old-'),
        new: summarize('new-'),
      },
      runs,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
