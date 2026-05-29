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

  const dreResult = await client.query(`
    SELECT codigo::text AS codigo, sigla, descricao
    FROM dre
    WHERE translate(upper(coalesce(sigla,'')),'ÁÀÃÂÉÊÍÓÔÕÚÇ','AAAAEEIOOOUC') LIKE '%BUTANTA%'
       OR translate(upper(coalesce(descricao,'')),'ÁÀÃÂÉÊÍÓÔÕÚÇ','AAAAEEIOOOUC') LIKE '%BUTANTA%'
    ORDER BY codigo
  `);

  console.log('DRE_BUTANTA:', JSON.stringify(dreResult.rows, null, 2));
  await client.end();
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
