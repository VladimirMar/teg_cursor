import pg from 'pg'
import { readFileSync } from 'node:fs'

const apiBase = process.env.API_BASE_URL || 'http://127.0.0.1:3001'
const fileName = process.argv[2] || '04 ATESTE FB PF ABR 26.xlsx'
const directoryPath = process.argv[3] || 'pgtos/2026-04 Pgto'

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

const statusBefore = await pool.query(`
  SELECT mes_ano, dre_codigo, revisao, tipo_pessoa, situacao
  FROM apuracao_financeira
  WHERE mes_ano = '04/2026'
    AND dre_codigo = 9
    AND tipo_pessoa = 'PF'
    AND revisao = 0
  LIMIT 1
`)

const previousSituacao = statusBefore.rows[0]?.situacao ?? null
console.log('STATUS_BEFORE', previousSituacao)

if (previousSituacao && previousSituacao !== 'Em digitacao') {
  await pool.query(`
    UPDATE apuracao_financeira
    SET situacao = 'Em digitacao', data_alteracao = NOW()
    WHERE mes_ano = '04/2026'
      AND dre_codigo = 9
      AND tipo_pessoa = 'PF'
      AND revisao = 0
  `)
  console.log('STATUS_TEMPORARILY_SET_TO', 'Em digitacao')
}

const response = await fetch(`${apiBase}/api/apontamento-servicos/import-excel`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  body: JSON.stringify({ fileName, directoryPath }),
})

const payload = await response.json().catch(() => ({}))

if (!response.ok) {
  console.error('IMPORT_FAILED', response.status, payload)
  if (previousSituacao && previousSituacao !== 'Em digitacao') {
    await pool.query(`
      UPDATE apuracao_financeira
      SET situacao = $1, data_alteracao = NOW()
      WHERE mes_ano = '04/2026'
        AND dre_codigo = 9
        AND tipo_pessoa = 'PF'
        AND revisao = 0
    `, [previousSituacao])
  }
  await pool.end()
  process.exit(1)
}

console.log('IMPORT_OK')
console.log(JSON.stringify(payload, null, 2))

if (previousSituacao && previousSituacao !== 'Em digitacao') {
  await pool.query(`
    UPDATE apuracao_financeira
    SET situacao = $1, data_alteracao = NOW()
    WHERE mes_ano = '04/2026'
      AND dre_codigo = 9
      AND tipo_pessoa = 'PF'
      AND revisao = 0
  `, [previousSituacao])
  console.log('STATUS_RESTORED_TO', previousSituacao)
}

const check = await pool.query(`
  SELECT aps.data_referencia::text, te.sigla, aps.cont_nc, aps.cont_cad
  FROM apuracao_servicos aps
  JOIN ordem_servico os ON os.codigo = aps.ordem_servico_codigo
  JOIN tipo_escola te ON te.codigo = aps.tipo_escola_codigo
  WHERE aps.mes_ano = '04/2026'
    AND aps.tipo_pessoa = 'PF'
    AND aps.revisao = 0
    AND os.os_concat ILIKE '%0027713%'
    AND te.sigla = 'EMEE'
  ORDER BY aps.data_referencia
`)

console.log('\nEMEE_AFTER_IMPORT')
console.log(JSON.stringify(check.rows, null, 2))
await pool.end()
