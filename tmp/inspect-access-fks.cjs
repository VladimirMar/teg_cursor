const { Client } = require('pg');

(async () => {
  const client = new Client({ host: 'localhost', port: 5432, database: 'teg_financ_homol', user: 'postgres', password: '12345' });
  await client.connect();
  const result = await client.query(`
    SELECT
      tc.table_name AS referencing_table,
      kcu.column_name AS referencing_column,
      ccu.table_name AS referenced_table,
      ccu.column_name AS referenced_column,
      tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
     AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name IN ('login', 'perfil', 'acesso_pagina')
    ORDER BY ccu.table_name, tc.table_name, kcu.column_name
  `);
  console.log(JSON.stringify(result.rows, null, 2));
  await client.end();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
