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

const rows = await pool.query(`
  SELECT codigo, sigla, codigo_operacional, descricao
  FROM dre
  WHERE UPPER(descricao) NOT LIKE '%TEG%'
  ORDER BY sigla, codigo
`)

const bySigla = {}
for (const row of rows.rows) {
  const key = String(row.sigla || '').trim().toUpperCase()
  if (!bySigla[key]) bySigla[key] = []
  bySigla[key].push(row)
}

console.log(JSON.stringify({ MP: bySigla.MP, FB: bySigla.FB, SM: bySigla.SM }, null, 2))
await pool.end()
