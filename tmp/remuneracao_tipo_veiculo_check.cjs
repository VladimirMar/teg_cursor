const { Pool } = require('pg');

(async () => {
  const pool = new Pool({
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '12345',
    database: process.env.PGDATABASE || 'teg_financ',
  });

  const query = `
    SELECT COALESCE(BTRIM(tipo_veiculo), '') AS tipo_veiculo, COUNT(*)::int AS total
    FROM apuracao_servicos
    WHERE mes_ano = $1
      AND data_referencia = $2::date
      AND CAST(dre_codigo AS text) = $3
      AND revisao = $4
      AND COALESCE(BTRIM(tipo_pessoa), '') = $5
    GROUP BY COALESCE(BTRIM(tipo_veiculo), '')
    ORDER BY total DESC
  `;

  const result = await pool.query(query, ['04/2026', '2026-04-01', '11', 0, 'PJ']);
  console.log(JSON.stringify(result.rows, null, 2));
  await pool.end();
})();
