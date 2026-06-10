import pg from 'pg'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(readFileSync('.env', 'utf8').split(/\r?\n/).filter(Boolean).map((line) => {
  const idx = line.indexOf('=')
  return [line.slice(0, idx), line.slice(idx + 1)]
}))

const normalize = (value) => String(value || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s*([/\\-])\s*/g, '$1').replace(/\s+/g, ' ').toUpperCase()

const pool = new pg.Pool({
  host: env.PGHOST,
  port: Number(env.PGPORT),
  user: env.PGUSER,
  password: env.PGPASSWORD,
  database: env.PGDATABASE,
})

const label = 'São Miguel'
const n = normalize(label)
const rows = (await pool.query(`SELECT codigo, sigla, descricao FROM dre WHERE UPPER(descricao) NOT LIKE '%TEG%' ORDER BY codigo`)).rows
const prefix = rows.filter((row) => {
  const d = normalize(row.descricao)
  return d === n || d.startsWith(`${n} `) || d.startsWith(n) || n.startsWith(`${d} `) || n.startsWith(d)
})
console.log('PREFIX_MATCHES', prefix)

await pool.end()
