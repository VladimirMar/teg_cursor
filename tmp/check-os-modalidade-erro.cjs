const { Client } = require('pg');

(async () => {
  const client = new Client({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: Number(process.env.POSTGRES_PORT || 5432),
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || '12345',
    database: process.env.POSTGRES_DB || 'teg_financ',
  });

  await client.connect();

  const result = await client.query(`
    SELECT
      os.codigo::text AS os_codigo,
      COALESCE(BTRIM(os.modalidade_descricao), '') AS modalidade_descricao,
      COALESCE(BTRIM(os.dre_descricao), '') AS dre_descricao,
      COALESCE(BTRIM(os.crm), '') AS crm,
      COALESCE(BTRIM(os.situacao), '') AS situacao
    FROM ordem_servico os
    WHERE os.codigo IN (2235,2242,2244,3637,3731,6502)
    ORDER BY os.codigo
  `);

  console.log(JSON.stringify(result.rows, null, 2));
  await client.end();
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
