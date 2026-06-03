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
  const sql = `
    select
      aps.mes_ano,
      to_char(aps.data_referencia,'YYYY-MM-DD') as data_referencia,
      upper(trim(af.situacao)) as situacao,
      count(*)::int as total
    from apuracao_servicos aps
    join apuracao_financeira af
      on af.mes_ano = aps.mes_ano
     and af.dre_codigo = aps.dre_codigo
     and af.revisao = aps.revisao
     and trim(af.tipo_pessoa) = trim(aps.tipo_pessoa)
    group by 1,2,3
    order by to_date('01/'||aps.mes_ano,'DD/MM/YYYY') desc, data_referencia desc
    limit 30
  `;
  const r = await c.query(sql);
  console.log(JSON.stringify(r.rows, null, 2));
  await c.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
