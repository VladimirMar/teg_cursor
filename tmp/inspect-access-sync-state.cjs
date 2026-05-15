const { Client } = require('pg');

async function getTableCount(client, table) {
  const result = await client.query(`SELECT COUNT(*)::int AS total FROM ${table}`);
  return result.rows[0].total;
}

(async () => {
  const source = new Client({ host: 'localhost', port: 5432, database: 'teg_financ', user: 'postgres', password: '12345' });
  const target = new Client({ host: 'localhost', port: 5432, database: 'teg_financ_homol', user: 'postgres', password: '12345' });
  await source.connect();
  await target.connect();
  const tables = ['login', 'perfil', 'acesso_pagina', 'perfil_acesso', 'login_perfil', 'login_dre'];
  for (const table of tables) {
    const sourceCount = await getTableCount(source, table);
    const targetCount = await getTableCount(target, table);
    console.log(JSON.stringify({ table, sourceCount, targetCount }));
  }
  const sequences = await source.query(`
    SELECT c.relname AS table_name, s.relname AS sequence_name
    FROM pg_class s
    JOIN pg_depend d ON d.objid = s.oid
    JOIN pg_class c ON d.refobjid = c.oid
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = d.refobjsubid
    WHERE s.relkind = 'S'
      AND c.relname IN ('login', 'perfil', 'acesso_pagina', 'perfil_acesso')
    ORDER BY c.relname
  `);
  console.log('SEQUENCES');
  console.log(JSON.stringify(sequences.rows, null, 2));
  await source.end();
  await target.end();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
