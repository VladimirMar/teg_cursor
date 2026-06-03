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
    const result = await pool.query("select codigo::text, codigo_operacional, sigla, descricao from dre where upper(btrim(coalesce(codigo_operacional, ''))) = 'FBE' order by codigo");
    console.log(JSON.stringify(result.rows, null, 2));
  } catch (error) {
    console.error(error.message);
  } finally {
    await pool.end();
  }
})();
