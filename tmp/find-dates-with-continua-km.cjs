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
      aps.mes_ano,
      to_char(aps.data_referencia,'YYYY-MM-DD') as data_referencia,
      count(*)::int as linhas,
      sum(coalesce(aps.cont_nc,0))::numeric as soma_cont_nc,
      sum(coalesce(aps.cont_cad,0))::numeric as soma_cont_cad,
      sum(coalesce(aps.km,0))::numeric(14,4) as soma_km
    FROM apuracao_servicos aps
    GROUP BY 1,2
    HAVING sum(coalesce(aps.cont_nc,0)) > 0
       OR sum(coalesce(aps.cont_cad,0)) > 0
       OR sum(coalesce(aps.km,0)) > 0
    ORDER BY to_date('01/'||aps.mes_ano,'DD/MM/YYYY') desc, data_referencia desc
    LIMIT 50
  `);
  console.log(JSON.stringify(r.rows, null, 2));
  await c.end();
})().catch((e)=>{ console.error(e.message); process.exit(1); });
