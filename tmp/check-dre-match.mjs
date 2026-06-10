import pg from 'pg'
import { readFileSync } from 'node:fs'

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

const normalize = (value) => String(value || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s*([/\\-])\s*/g, '$1').replace(/\s+/g, ' ').toUpperCase()
const buildSigla = (value) => {
  const n = normalize(value)
  return n.split(/[^A-Z0-9]+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('')
}

const label = 'São Miguel'
const sigla = buildSigla(label)
console.log('LABEL', label, 'NORMALIZED', normalize(label), 'SIGLA', sigla)

const all = await pool.query(`SELECT codigo, sigla, descricao FROM dre WHERE UPPER(descricao) NOT LIKE '%TEG%' ORDER BY codigo`)
const match = all.rows.find((row) => normalize(row.descricao) === normalize(label) || normalize(String(row.codigo)) === normalize(label))
console.log('EXACT_MATCH', match)

const siglaMatch = await pool.query(`
  SELECT codigo, sigla, descricao FROM dre
  WHERE (UPPER(BTRIM(COALESCE(sigla,''))) = $1 OR UPPER(BTRIM(COALESCE(codigo_operacional,''))) = $1)
    AND UPPER(descricao) NOT LIKE '%TEG%'
  ORDER BY codigo LIMIT 1
`, [sigla])
console.log('SIGLA_MATCH', siglaMatch.rows[0])

await pool.end()
