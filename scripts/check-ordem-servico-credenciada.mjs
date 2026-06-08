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

const cols = await pool.query(`
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'ordem_servico'
  ORDER BY ordinal_position
`)

console.log('columns', cols.rows.map((r) => r.column_name).join(', '))
console.log('has_credenciada_codigo', cols.rows.some((r) => r.column_name === 'credenciada_codigo'))
await pool.end()
