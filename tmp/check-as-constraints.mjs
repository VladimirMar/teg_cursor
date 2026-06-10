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

const constraints = await pool.query(`
  SELECT conname, pg_get_constraintdef(oid) AS def
  FROM pg_constraint
  WHERE conrelid = 'apuracao_servicos'::regclass
`)

const indexes = await pool.query(`
  SELECT indexname, indexdef
  FROM pg_indexes
  WHERE tablename = 'apuracao_servicos'
`)

console.log('CONSTRAINTS', JSON.stringify(constraints.rows, null, 2))
console.log('INDEXES', JSON.stringify(indexes.rows, null, 2))

await pool.end()
