const { Client } = require('pg');

(async () => {
  const client = new Client({ host: 'localhost', port: 5432, database: 'teg_financ', user: 'postgres', password: '12345' });
  await client.connect();
  const tables = ['login', 'perfil', 'acesso_pagina', 'perfil_acesso', 'login_perfil', 'login_dre'];
  for (const table of tables) {
    const columns = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`, [table]);
    console.log(`TABLE ${table}`);
    console.log(JSON.stringify(columns.rows, null, 2));
  }
  await client.end();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
