const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '12345',
    database: 'teg_financ',
  });

  await client.connect();

  try {
    const result = await client.query(`
      SELECT
        t.termo_adesao,
        COALESCE(c.cnpj_cpf, '') AS cnpj_cpf,
        t.credenciada_codigo
      FROM termo t
      LEFT JOIN credenciada c
        ON c.codigo = t.credenciada_codigo
      WHERE COALESCE(BTRIM(c.cnpj_cpf), '') <> ''
      ORDER BY CAST(t.codigo AS integer) DESC
      LIMIT 1
    `);

    console.log(JSON.stringify(result.rows[0] || null, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
