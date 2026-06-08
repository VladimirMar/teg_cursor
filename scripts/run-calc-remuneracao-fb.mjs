import pg from 'pg'
import { readFileSync } from 'node:fs'

const apiBase = process.env.API_BASE_URL || 'http://127.0.0.1:3001'
const body = {
  mesAno: '04/2026',
  dreCodigo: '9',
  tipoPessoa: 'PF',
  revisao: 0,
}

const start = await fetch(`${apiBase}/api/remuneracao-servicos/calcular`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify(body),
})

const startPayload = await start.json().catch(() => ({}))
if (!start.ok) {
  console.error('CALC_START_FAILED', start.status, startPayload)
  process.exit(1)
}

console.log('CALC_STARTED', JSON.stringify(startPayload, null, 2))

for (let attempt = 0; attempt < 120; attempt += 1) {
  await new Promise((resolve) => setTimeout(resolve, 1000))
  const statusResponse = await fetch(`${apiBase}/api/remuneracao-servicos/calcular`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })
  const statusPayload = await statusResponse.json().catch(() => ({}))
  if (!statusResponse.ok) {
    console.error('CALC_STATUS_FAILED', statusResponse.status, statusPayload)
    process.exit(1)
  }
  if (!statusPayload.isRunning) {
    console.log('CALC_FINISHED', JSON.stringify(statusPayload, null, 2))
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

const check = await pool.query(`
  SELECT rs.data_referencia::text, rs.continua_regular, rs.continua_cadeirante, os.os_concat
  FROM remuneracao_servicos rs
  JOIN ordem_servico os ON os.codigo = rs.ordem_servico_codigo
  WHERE rs.mes_ano = '04/2026'
    AND rs.dre_codigo = 9
    AND rs.tipo_pessoa = 'PF'
    AND rs.revisao = 0
    AND os.os_concat ILIKE '%0027713%'
  ORDER BY rs.data_referencia
`)

const total = await pool.query(`
  SELECT SUM(rs.continua_regular) AS continua_regular,
         SUM(rs.continua_cadeirante) AS continua_cadeirante
  FROM remuneracao_servicos rs
  JOIN ordem_servico os ON os.codigo = rs.ordem_servico_codigo
  WHERE rs.mes_ano = '04/2026'
    AND rs.dre_codigo = 9
    AND rs.tipo_pessoa = 'PF'
    AND rs.revisao = 0
    AND os.os_concat ILIKE '%0027713%'
`)

console.log('REMUNERACAO_OS', JSON.stringify(check.rows, null, 2))
console.log('REMUNERACAO_TOTAL', total.rows[0])
await pool.end()
