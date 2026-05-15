const crypto = require('crypto')
const { Client } = require('pg')

const TEST_PASSWORD = 'Copilot!123'
const TARGET_EMAILS = [
  'teste.api.20260407110345@empresa.com',
  'copilot.tipoescola@local.test',
  'smoke.marca.20260409084102@local.test',
]

function buildPasswordHash(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `scrypt:${salt}:${hash}`
}

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'teg_financ',
    user: 'postgres',
    password: '12345',
  })

  await client.connect()

  for (const email of TARGET_EMAILS) {
    const passwordHash = buildPasswordHash(TEST_PASSWORD)
    await client.query(
      'UPDATE login SET password = $1, descricao = $1 WHERE email = $2',
      [passwordHash, email],
    )
  }

  const result = await client.query(
    `SELECT codigo, email, COALESCE(nome, '') AS nome
     FROM login
     WHERE email = ANY($1::text[])
     ORDER BY codigo`,
    [TARGET_EMAILS],
  )

  console.log(JSON.stringify({ password: TEST_PASSWORD, users: result.rows }, null, 2))

  await client.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
