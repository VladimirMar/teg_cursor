const { Client } = require('pg');

(async () => {
  const client = new Client({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: Number(process.env.POSTGRES_PORT || 5432),
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || '12345',
    database: process.env.POSTGRES_DB || 'teg_financ',
  });

  await client.connect();

  const dreResult = await client.query(`
    SELECT codigo::text AS codigo, sigla, descricao
    FROM dre
    WHERE UPPER(COALESCE(descricao, '')) LIKE '%FREGUESIA%'
       OR UPPER(COALESCE(sigla, '')) LIKE '%FREGUESIA%'
    ORDER BY codigo
  `);

  const dres = dreResult.rows;
  console.log('DRES_FREGUESIA=', JSON.stringify(dres, null, 2));

  for (const dre of dres) {
    const resumo = await client.query(`
      SELECT
        COUNT(*)::int AS total_linhas,
        SUM(CASE WHEN COALESCE(nc_pres, 0) + COALESCE(cad, 0) + COALESCE(ac_nc, 0) + COALESCE(ac_cad, 0) + COALESCE(cont_nc, 0) + COALESCE(cont_cad, 0) + COALESCE(km, 0) = 0 THEN 1 ELSE 0 END)::int AS linhas_todas_zeradas,
        SUM(CASE WHEN COALESCE(nc_pres, 0) + COALESCE(cad, 0) + COALESCE(ac_nc, 0) + COALESCE(ac_cad, 0) + COALESCE(cont_nc, 0) + COALESCE(cont_cad, 0) + COALESCE(km, 0) > 0 THEN 1 ELSE 0 END)::int AS linhas_com_valor
      FROM apuracao_servicos
      WHERE mes_ano = '04/2026'
        AND COALESCE(BTRIM(tipo_pessoa), '') = 'PF'
        AND dre_codigo = $1::int
    `, [dre.codigo]);

    const ultimaAlteracao = await client.query(`
      SELECT MAX(data_alteracao) AS max_data_alteracao
      FROM apuracao_servicos
      WHERE mes_ano = '04/2026'
        AND COALESCE(BTRIM(tipo_pessoa), '') = 'PF'
        AND dre_codigo = $1::int
    `, [dre.codigo]);

    console.log('RESUMO_DRE=', JSON.stringify({
      dre,
      ...resumo.rows[0],
      max_data_alteracao: ultimaAlteracao.rows[0]?.max_data_alteracao || null,
    }, null, 2));

    const apuracaoFinanceira = await client.query(`
      SELECT
        mes_ano,
        dre_codigo::text AS dre_codigo,
        revisao,
        tipo_pessoa,
        situacao,
        data_inclusao,
        data_alteracao
      FROM apuracao_financeira
      WHERE mes_ano = '04/2026'
        AND COALESCE(BTRIM(tipo_pessoa), '') = 'PF'
        AND dre_codigo = $1::int
      ORDER BY revisao DESC
      LIMIT 5
    `, [dre.codigo]);

    console.log('APURACAO_FINANCEIRA_DRE=', JSON.stringify({
      dreCodigo: dre.codigo,
      rows: apuracaoFinanceira.rows,
    }, null, 2));

    const auditoriaApontamento = await client.query(`
      SELECT
        MIN(data_inclusao) AS min_data_inclusao,
        MAX(data_inclusao) AS max_data_inclusao,
        MIN(data_alteracao) AS min_data_alteracao,
        MAX(data_alteracao) AS max_data_alteracao
      FROM apuracao_servicos
      WHERE mes_ano = '04/2026'
        AND COALESCE(BTRIM(tipo_pessoa), '') = 'PF'
        AND dre_codigo = $1::int
    `, [dre.codigo]);

    console.log('AUDITORIA_APONTAMENTO_DRE=', JSON.stringify({
      dreCodigo: dre.codigo,
      ...auditoriaApontamento.rows[0],
    }, null, 2));
  }

  await client.end();
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
