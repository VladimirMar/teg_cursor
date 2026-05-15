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

  const users = await client.query(`
    SELECT l.codigo, l.email, COALESCE(l.nome, '') AS nome
    FROM login l
    ORDER BY l.codigo
    LIMIT 20
  `)

  const columns = await client.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'login'
    ORDER BY ordinal_position
  `)

  const perms = await client.query(`
    WITH alvo AS (
      SELECT
        lp.login_codigo,
        CASE WHEN pa.permissao IN ('exclusao', 'todos') THEN 1 ELSE 0 END AS has_delete,
        CASE WHEN pa.permissao = 'todos' THEN 1 ELSE 0 END AS has_all
      FROM login_perfil lp
      JOIN perfil_acesso pa ON pa.perfil_codigo = lp.perfil_codigo
      JOIN acesso_pagina ap ON ap.codigo = pa.acesso_pagina_codigo
      WHERE ap.funcao = 'formulario'
    )
    SELECT
      l.codigo,
      l.email,
      COALESCE(l.nome, '') AS nome,
      COALESCE(SUM(alvo.has_delete), 0) AS delete_forms,
      COALESCE(SUM(alvo.has_all), 0) AS all_forms
    FROM login l
    LEFT JOIN alvo ON alvo.login_codigo = l.codigo
    GROUP BY l.codigo, l.email, l.nome
    ORDER BY all_forms DESC, delete_forms DESC, l.codigo
    LIMIT 50
  `)

  console.log('---USERS---')
  console.log(JSON.stringify(users.rows, null, 2))
  console.log('---LOGIN_COLUMNS---')
  console.log(JSON.stringify(columns.rows, null, 2))
  console.log('---PERMS---')
  console.log(JSON.stringify(perms.rows, null, 2))

  const credentialCandidates = await client.query(`
    SELECT *
    FROM login
    WHERE email IN (
      'smoke.marca.20260409084102@local.test',
      'teste.api.20260407110345@empresa.com'
    )
    ORDER BY codigo
  `)

  console.log('---CREDENTIAL_CANDIDATES---')
  console.log(JSON.stringify(credentialCandidates.rows, null, 2))

  await client.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
