const { Pool } = require('pg');
(async () => {
  const pool = new Pool({
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '12345',
    database: process.env.PGDATABASE || 'teg_financ',
  });
  try {
    const sql = "select codigo::text, codigo_access, termo_adesao, num_os, revisao, os_concat, situacao, dre_codigo, dre_descricao from ordem_servico where codigo_access='1058' order by codigo desc limit 3";
    const r = await pool.query(sql);
    console.log(JSON.stringify(r.rows, null, 2));
  } catch (e) {
    console.error(e.message);
  } finally {
    await pool.end();
  }
})();
