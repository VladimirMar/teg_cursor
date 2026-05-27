const pg = require('pg');
const pool = new pg.Pool({ host: 'localhost', port: 5432, user: 'postgres', password: '12345', database: 'teg_financ_homol' });
(async () => {
  const res = await pool.query("select email, senha from login where codigo=1");
  console.log(JSON.stringify(res.rows, null, 2));
  await pool.end();
})().catch(async (error) => { console.error(String(error)); try { await pool.end(); } catch {} process.exit(1); });
