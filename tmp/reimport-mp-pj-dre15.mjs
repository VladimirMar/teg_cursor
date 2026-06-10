import pg from 'pg'
import { readFileSync, copyFileSync, existsSync } from 'node:fs'
import path from 'node:path'

const apiBase = process.env.API_BASE_URL || 'http://127.0.0.1:3001'
const sourceFile = 'pgtos/2026-04 Pgto/old/04 ATESTE MP PJ ABR 26-1.xlsx'
const targetFile = 'pgtos/2026-04 Pgto/04 ATESTE MP PJ ABR 26-1-reimport.xlsx'

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

if (!existsSync(sourceFile)) {
  console.error('SOURCE_MISSING', sourceFile)
  process.exit(1)
}

copyFileSync(sourceFile, targetFile)

const before15 = await pool.query(`
  SELECT situacao FROM apuracao_financeira
  WHERE mes_ano='04/2026' AND dre_codigo=15 AND tipo_pessoa='PJ' AND revisao=0
`)
const prevSituacao = before15.rows[0]?.situacao
console.log('DRE15_STATUS_BEFORE', prevSituacao)

await pool.query(`
  UPDATE apuracao_financeira SET situacao='Em digitacao', data_alteracao=NOW()
  WHERE mes_ano='04/2026' AND dre_codigo=15 AND tipo_pessoa='PJ' AND revisao=0
`)

const importId = `reimport-mp-pj-${Date.now()}`
const response = await fetch(`${apiBase}/api/apontamento-servicos/import-excel`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify({
    importId,
    filePath: targetFile,
  }),
})

const payload = await response.json().catch(() => ({}))
console.log('IMPORT_HTTP', response.status)
console.log(JSON.stringify(payload, null, 2))

const after15 = await pool.query(`
  SELECT COUNT(*)::int AS total,
         SUM(CASE WHEN nc_pres<>0 OR cad<>0 OR ac_nc<>0 OR ac_cad<>0 OR cont_nc<>0 OR cont_cad<>0 OR km<>0 THEN 1 ELSE 0 END)::int AS com_valor,
         SUM(nc_pres)::int AS nc_pres
  FROM apuracao_servicos
  WHERE mes_ano='04/2026' AND dre_codigo=15 AND tipo_pessoa='PJ' AND revisao=0
    AND data_referencia='2026-04-01'
`)
console.log('DRE15_DAY01_AFTER', after15.rows[0])

if (prevSituacao && prevSituacao !== 'Em digitacao') {
  await pool.query(`
    UPDATE apuracao_financeira SET situacao=$1, data_alteracao=NOW()
    WHERE mes_ano='04/2026' AND dre_codigo=15 AND tipo_pessoa='PJ' AND revisao=0
  `, [prevSituacao])
  console.log('DRE15_STATUS_RESTORED', prevSituacao)
}

await pool.end()
