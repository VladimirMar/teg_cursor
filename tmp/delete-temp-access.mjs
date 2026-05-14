import pg from 'pg'

const { Pool } = pg

const pool = new Pool({
  host: process.env.PGHOST ?? 'localhost',
  port: Number(process.env.PGPORT ?? 5432),
  database: process.env.PGDATABASE ?? 'teg_financ',
  user: process.env.PGUSER ?? 'postgres',
  password: process.env.PGPASSWORD ?? '12345',
})

const email = 'copilot.parametro.veiculo@local.test'

async function main() {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    await client.query(
      `DELETE FROM login_dre
       WHERE login_codigo IN (
         SELECT codigo
         FROM login
         WHERE LOWER(BTRIM(email)) = LOWER($1)
       )`,
      [email],
    )

    const result = await client.query(
      `DELETE FROM login
       WHERE LOWER(BTRIM(email)) = LOWER($1)
       RETURNING CAST(codigo AS text) AS codigo, BTRIM(email) AS email`,
      [email],
    )

    await client.query('COMMIT')
    console.log(JSON.stringify(result.rows, null, 2))
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
