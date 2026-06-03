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
      mes_ano,
      to_char(data_referencia,'YYYY-MM-DD') as data_referencia,
      count(*)::int as total,
      count(*) filter (where coalesce(continua_regular,0)>0) as continua_regular_maior_zero,
      count(*) filter (where coalesce(continua_cadeirante,0)>0) as continua_cadeirante_maior_zero,
      count(*) filter (where coalesce(km_valor,0)>0) as km_valor_maior_zero
    FROM remuneracao_servicos
    GROUP BY 1,2
    ORDER BY to_date('01/'||mes_ano,'DD/MM/YYYY') desc, data_referencia desc
    LIMIT 20
  `);
  console.log(JSON.stringify(r.rows, null, 2));
  await c.end();
})().catch((e)=>{ console.error(e.message); process.exit(1); });
