import { readFileSync } from 'node:fs'

const apiBase = process.env.API_BASE_URL || 'http://127.0.0.1:3001'

// Temporarily set status to Em digitacao for import test
import pg from 'pg'
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

const before = await pool.query(`
  SELECT situacao FROM apuracao_financeira
  WHERE mes_ano='04/2026' AND dre_codigo=15 AND tipo_pessoa='PJ' AND revisao=0
`)
const prev = before.rows[0]?.situacao
console.log('STATUS_BEFORE', prev)

await pool.query(`
  UPDATE apuracao_financeira SET situacao='Em digitacao', data_alteracao=NOW()
  WHERE mes_ano='04/2026' AND dre_codigo=15 AND tipo_pessoa='PJ' AND revisao=0
`)

const importId = `test-${Date.now()}`
const response = await fetch(`${apiBase}/api/apontamento-servicos/import-excel`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify({
    importId,
    fileName: '04 ATESTE MP PJ ABR 26-1.xlsx',
    directoryPath: 'pgtos/2026-04 Pgto',
  }),
})

const payload = await response.json().catch(() => ({}))
console.log('IMPORT_HTTP', response.status)
console.log(JSON.stringify(payload, null, 2))

if (prev && prev !== 'Em digitacao') {
  await pool.query(`
    UPDATE apuracao_financeira SET situacao=$1, data_alteracao=NOW()
    WHERE mes_ano='04/2026' AND dre_codigo=15 AND tipo_pessoa='PJ' AND revisao=0
  `, [prev])
}

const after = await pool.query(`
  SELECT COUNT(*)::int AS total,
         SUM(CASE WHEN nc_pres<>0 OR cad<>0 OR ac_nc<>0 OR ac_cad<>0 OR cont_nc<>0 OR cont_cad<>0 OR km<>0 THEN 1 ELSE 0 END)::int AS com_valor,
         SUM(nc_pres)::int AS nc_pres
  FROM apuracao_servicos
  WHERE mes_ano='04/2026' AND dre_codigo=15 AND tipo_pessoa='PJ' AND revisao=0
    AND data_referencia='2026-04-01'
`)
console.log('DB_AFTER_DAY01', after.rows[0])

await pool.end()
