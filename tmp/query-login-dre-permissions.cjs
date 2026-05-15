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
    SELECT
      l.codigo,
      l.email,
      COALESCE(l.nome, '') AS nome,
      ap.sigla,
      pa.permissao
    FROM login l
    JOIN login_perfil lp ON lp.login_codigo = l.codigo
    JOIN perfil_acesso pa ON pa.perfil_codigo = lp.perfil_codigo
    JOIN acesso_pagina ap ON ap.codigo = pa.acesso_pagina_codigo
    WHERE ap.sigla IN ('LOGDRE025', 'CADACE024', 'CONDUT026', 'MONITR027', 'VINCON034', 'VINMON035')
    ORDER BY ap.sigla, l.codigo, pa.permissao
  `)

  console.log(JSON.stringify(result.rows, null, 2))
  await client.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
