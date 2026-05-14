import pg from 'pg'

const { Pool } = pg

const pool = new Pool({
  host: process.env.PGHOST ?? 'localhost',
  port: Number(process.env.PGPORT ?? 5432),
  database: process.env.PGDATABASE ?? 'teg_financ',
  user: process.env.PGUSER ?? 'postgres',
  password: process.env.PGPASSWORD ?? '12345',
})

async function main() {
  const result = await pool.query(`
    UPDATE parametro_veiculo
    SET condicao = 'Viagem',
        data_modificacao = NOW()
    WHERE BTRIM(condicao) = 'Viagens'
    RETURNING CAST(codigo AS text) AS codigo, CAST(modalidade_tipo_bancada_codigo AS text) AS modalidade_tipo_bancada_codigo, BTRIM(condicao) AS condicao
  `)

  console.log(JSON.stringify(result.rows, null, 2))
  await pool.end()
}

main().catch(async (error) => {
  console.error(error)
  await pool.end()
  process.exitCode = 1
})
