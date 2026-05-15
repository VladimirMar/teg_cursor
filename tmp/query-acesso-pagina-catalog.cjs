const { Client } = require('pg')

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'teg_financ',
    user: 'postgres',
    password: '12345',
  })

  await client.connect()

  const result = await client.query(`
    SELECT codigo, sigla, descricao, funcao
    FROM acesso_pagina
    WHERE LOWER(COALESCE(sigla, '')) LIKE '%cred%'
       OR LOWER(COALESCE(sigla, '')) LIKE '%perf%'
       OR LOWER(COALESCE(descricao, '')) LIKE '%cred%'
       OR LOWER(COALESCE(descricao, '')) LIKE '%perfil%'
    ORDER BY codigo
  `)

  console.log(JSON.stringify(result.rows, null, 2))
  await client.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
