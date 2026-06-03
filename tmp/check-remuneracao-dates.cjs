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
  const sql = "select mes_ano, to_char(data_referencia,'YYYY-MM-DD') as data_referencia, count(*)::int as total from apuracao_servicos group by 1,2 order by to_date('01/'||mes_ano,'DD/MM/YYYY') desc, data_referencia desc limit 5";
  const r = await c.query(sql);
  console.log(JSON.stringify(r.rows, null, 2));
  await c.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
