const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, user: 'postgres', password: '12345', database: 'teg_financ' });
(async () => {
  const start = Date.now();
  const res = await pool.query("UPDATE monitor SET data_modificacao = data_modificacao WHERE codigo IN (SELECT codigo FROM monitor LIMIT 12035)");
  console.log(JSON.stringify({ rowCount: res.rowCount, seconds: (Date.now()-start)/1000 }, null, 2));
  await pool.end();
})().catch(async (error) => { console.error(error); await pool.end(); process.exit(1); });
