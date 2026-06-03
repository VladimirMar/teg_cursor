const { Client } = require('pg');
(async () => {
  const c = new Client({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: Number(process.env.POSTGRES_PORT || 5432),
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || '12345',
    database: process.env.POSTGRES_DB || 'teg_financ',
  });
  await c.connect();
  const r = await c.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE COALESCE(continua_regular,0) > 0)::int AS continua_regular_maior_zero,
      COUNT(*) FILTER (WHERE COALESCE(continua_cadeirante,0) > 0)::int AS continua_cadeirante_maior_zero,
      COUNT(*) FILTER (WHERE COALESCE(km_valor,0) > 0)::int AS km_valor_maior_zero
    FROM remuneracao_servicos
    WHERE mes_ano = '04/2026'
      AND data_referencia = '2026-04-30'::date
  `);
  const amostra = await c.query(`
    SELECT
      mes_ano,
      to_char(data_referencia,'YYYY-MM-DD') as data_referencia,
      dre_codigo::text as dre_codigo,
      ordem_servico_codigo::text as ordem_servico_codigo,
      revisao,
      tipo_pessoa,
      continua_regular,
      continua_cadeirante,
      km_valor
    FROM remuneracao_servicos
    WHERE mes_ano = '04/2026'
      AND data_referencia = '2026-04-30'::date
      AND (COALESCE(continua_regular,0) > 0 OR COALESCE(continua_cadeirante,0) > 0 OR COALESCE(km_valor,0) > 0)
    ORDER BY km_valor DESC, continua_cadeirante DESC, continua_regular DESC
    LIMIT 5
  `);
  console.log(JSON.stringify({resumo:r.rows[0], amostra:amostra.rows}, null, 2));
  await c.end();
})().catch((e)=>{ console.error(e.message); process.exit(1); });
