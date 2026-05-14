import pg from 'pg'

const { Pool } = pg

const pool = new Pool({
  host: process.env.PGHOST ?? 'localhost',
  port: Number(process.env.PGPORT ?? 5432),
  database: process.env.PGDATABASE ?? 'teg_financ',
  user: process.env.PGUSER ?? 'postgres',
  password: process.env.PGPASSWORD ?? '12345',
})

const sql = `
SELECT
  CAST(codigo AS text) AS codigo,
  BTRIM(COALESCE(placas, '')) AS placas,
  BTRIM(COALESCE(os_especial, '')) AS os_especial,
  BTRIM(COALESCE(tipo_de_bancada, '')) AS tipo_de_bancada,
  BTRIM(CAST(cap_teg AS text)) AS cap_teg,
  COALESCE(TO_CHAR(valor_veiculo, 'FM999999999990.00'), '') AS valor_veiculo
FROM veiculo
WHERE UPPER(BTRIM(COALESCE(os_especial, ''))) = 'SIM'
   OR translate(UPPER(BTRIM(COALESCE(tipo_de_bancada, ''))), 'ÁÀÃÂÉÊÍÓÔÕÚÇ', 'AAAAEEIOOOUC') = 'ACESSIVEL'
ORDER BY codigo ASC;
`

const countSql = `
SELECT
  COUNT(*) FILTER (WHERE UPPER(BTRIM(COALESCE(os_especial, ''))) = 'SIM')::int AS total_os_sim,
  COUNT(*) FILTER (WHERE translate(UPPER(BTRIM(COALESCE(tipo_de_bancada, ''))), 'ÁÀÃÂÉÊÍÓÔÕÚÇ', 'AAAAEEIOOOUC') = 'ACESSIVEL')::int AS total_bancada_acessivel,
  COUNT(*) FILTER (
    WHERE UPPER(BTRIM(COALESCE(os_especial, ''))) = 'SIM'
      AND translate(UPPER(BTRIM(COALESCE(tipo_de_bancada, ''))), 'ÁÀÃÂÉÊÍÓÔÕÚÇ', 'AAAAEEIOOOUC') = 'ACESSIVEL'
  )::int AS total_elegivel
FROM veiculo;
`

async function main() {
  const [counts, items] = await Promise.all([
    pool.query(countSql),
    pool.query(sql),
  ])

  console.log(JSON.stringify({ counts: counts.rows[0], sample: items.rows.slice(0, 40) }, null, 2))
  await pool.end()
}

main().catch(async (error) => {
  console.error(error)
  await pool.end()
  process.exitCode = 1
})
