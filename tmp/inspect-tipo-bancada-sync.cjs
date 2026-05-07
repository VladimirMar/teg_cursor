const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5432, user: 'postgres', password: '12345', database: 'teg_financ' });
(async () => {
  const tipoBancada = await pool.query('SELECT codigo, descricao FROM tipo_bancada ORDER BY codigo ASC');
  const veiculo = await pool.query(`
    SELECT COALESCE(NULLIF(BTRIM(tipo_de_bancada), ''), '<vazio>') AS descricao, COUNT(*)::int AS total
    FROM veiculo
    GROUP BY 1
    ORDER BY 1
  `);
  console.log(JSON.stringify({ tipoBancada: tipoBancada.rows, veiculo: veiculo.rows }, null, 2));
})().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await pool.end(); });
