const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, user: 'postgres', password: '12345', database: 'teg_financ' });
(async () => {
  const res = await pool.query(`
    SELECT COALESCE(NULLIF(BTRIM(tipo_de_bancada), ''), '<vazio>') AS tipo_de_bancada, COUNT(*)::int AS total
    FROM veiculo
    GROUP BY 1
    ORDER BY CASE WHEN COALESCE(NULLIF(BTRIM(tipo_de_bancada), ''), '<vazio>') = '<vazio>' THEN 1 ELSE 0 END, 1
  `);
  console.log(JSON.stringify(res.rows, null, 2));
  await pool.end();
})().catch(async (error) => { console.error(error); try { await pool.end(); } catch {} process.exit(1); });
