const { Pool } = require('pg');
async function inspect(database) {
  const pool = new Pool({ host: 'localhost', port: 5432, user: 'postgres', password: '12345', database });
  try {
    const tipo = await pool.query('SELECT codigo, descricao FROM tipo_bancada ORDER BY codigo ASC');
    return { database, tipo: tipo.rows };
  } finally {
    await pool.end();
  }
}
(async () => {
  console.log(JSON.stringify([await inspect('teg_financ'), await inspect('teg_financ_homol')], null, 2));
})().catch((error) => { console.error(error); process.exitCode = 1; });
