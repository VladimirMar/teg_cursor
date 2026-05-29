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

  const result = await client.query(`
    WITH base AS (
      SELECT
        aps.data_referencia,
        aps.ordem_servico_codigo::text AS ordem_servico_codigo,
        aps.revisao,
        coalesce(trim(aps.tipo_pessoa),'') AS tipo_pessoa,
        max(coalesce(trim(aps.crmc_condutor),'')) AS crmc_condutor,
        SUM(
          CASE
            WHEN (
              te.codigo::text = '6'
              OR translate(upper(coalesce(te.sigla,'')),'ÁÀÃÂÉÊÍÓÔÕÚÇ','AAAAEEIOOOUC') IN ('CEI','EMEI','EMEF','EMEE')
              OR translate(upper(coalesce(te.descricao,'')),'ÁÀÃÂÉÊÍÓÔÕÚÇ','AAAAEEIOOOUC') LIKE '%CENTRO DE EDUCACAO INFANTIL%'
              OR translate(upper(coalesce(te.descricao,'')),'ÁÀÃÂÉÊÍÓÔÕÚÇ','AAAAEEIOOOUC') LIKE '%ESCOLA MUNICIPAL DE EDUCACAO INFANTIL%'
              OR translate(upper(coalesce(te.descricao,'')),'ÁÀÃÂÉÊÍÓÔÕÚÇ','AAAAEEIOOOUC') LIKE '%ESCOLA MUNICIPAL DE ENSINO FUNDAMENTAL%'
              OR translate(upper(coalesce(te.descricao,'')),'ÁÀÃÂÉÊÍÓÔÕÚÇ','AAAAEEIOOOUC') LIKE '%ESCOLA MUNICIPAL DE EDUCACAO ESPECIAL%'
            )
            AND te.codigo::text <> '7'
            AND translate(upper(coalesce(te.sigla,'')),'ÁÀÃÂÉÊÍÓÔÕÚÇ','AAAAEEIOOOUC') <> 'CCA'
            AND translate(upper(coalesce(te.descricao,'')),'ÁÀÃÂÉÊÍÓÔÕÚÇ','AAAAEEIOOOUC') NOT LIKE '%CENTRO PARA CRIANCAS E ADOLESCENTES%'
            THEN coalesce(aps.cad_acm,0) + coalesce(aps.ac_cad_acm,0)
            ELSE 0
          END
        )::int AS qtd_acessivel_acm
      FROM apuracao_servicos aps
      INNER JOIN tipo_escola te ON te.codigo = aps.tipo_escola_codigo
      WHERE aps.mes_ano = '04/2026'
        AND aps.dre_codigo = 11
        AND aps.data_referencia BETWEEN '2026-04-01'::date AND '2026-04-30'::date
      GROUP BY aps.data_referencia, aps.ordem_servico_codigo, aps.revisao, coalesce(trim(aps.tipo_pessoa),'')
    )
    SELECT DISTINCT ordem_servico_codigo, revisao, tipo_pessoa, crmc_condutor
    FROM base
    WHERE qtd_acessivel_acm = 2
    ORDER BY ordem_servico_codigo, revisao, tipo_pessoa, crmc_condutor
  `);

  console.log(JSON.stringify(result.rows, null, 2));
  await client.end();
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
