import pg from 'pg'
import { readFileSync } from 'node:fs'

const apiBase = process.env.API_BASE_URL || 'http://127.0.0.1:3001'
const body = {
  mesAno: process.argv[2] || '04/2026',
  dreCodigo: process.argv[3] || '',
  tipoPessoa: process.argv[4] || '',
  revisao: process.argv[5] ? Number(process.argv[5]) : undefined,
}

const payloadBody = Object.fromEntries(Object.entries(body).filter(([, value]) => value !== '' && value !== undefined))

const start = await fetch(`${apiBase}/api/remuneracao-servicos/calcular`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify(payloadBody),
})

const startPayload = await start.json().catch(() => ({}))
if (!start.ok) {
  console.error('CALC_START_FAILED', start.status, startPayload)
  process.exit(1)
}

for (let attempt = 0; attempt < 180; attempt += 1) {
  await new Promise((resolve) => setTimeout(resolve, 1000))
  const statusResponse = await fetch(`${apiBase}/api/remuneracao-servicos/calcular`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })
  const statusPayload = await statusResponse.json().catch(() => ({}))
  if (!statusPayload.isRunning) {
    console.log('CALC_FINISHED', JSON.stringify(statusPayload.summary ?? statusPayload, null, 2))
    break
  }
}

const env = Object.fromEntries(readFileSync('.env', 'utf8').split(/\r?\n/).filter(Boolean).map((line) => {
  const idx = line.indexOf('=')
  return [line.slice(0, idx), line.slice(idx + 1)]
}))

const pool = new pg.Pool({
  host: env.PGHOST,
  port: Number(env.PGPORT),
  user: env.PGUSER,
  password: env.PGPASSWORD,
  database: env.PGDATABASE,
})

const issues = await pool.query(`
  WITH grouped AS (
    SELECT
      aps.mes_ano,
      TO_CHAR(aps.data_referencia, 'YYYY-MM-DD') AS data_referencia,
      aps.dre_codigo::text AS dre_codigo,
      aps.ordem_servico_codigo::text AS ordem_servico_codigo,
      aps.revisao,
      COALESCE(BTRIM(aps.tipo_pessoa), '') AS tipo_pessoa,
      COALESCE(SUM(aps.cont_nc), 0)::numeric AS cont_nc_total,
      COALESCE(SUM(aps.cont_cad), 0)::numeric AS cont_cad_total
    FROM apuracao_servicos aps
    WHERE aps.mes_ano = $1
    GROUP BY 1,2,3,4,5,6
  )
  SELECT COUNT(*)::int AS continua_regular_issues
  FROM grouped g
  LEFT JOIN remuneracao_servicos r
    ON r.mes_ano = g.mes_ano
   AND TO_CHAR(r.data_referencia, 'YYYY-MM-DD') = g.data_referencia
   AND r.dre_codigo::text = g.dre_codigo
   AND r.ordem_servico_codigo::text = g.ordem_servico_codigo
   AND r.revisao = g.revisao
   AND COALESCE(BTRIM(r.tipo_pessoa), '') = g.tipo_pessoa
  WHERE g.cont_nc_total > 0 AND COALESCE(r.continua_regular, 0) = 0
`, [payloadBody.mesAno])

console.log('POST_CALC_CONTINUA_REG_ZERO_WITH_CONT_NC', issues.rows[0])
await pool.end()
