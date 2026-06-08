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

const result = await pool.query(`
  SELECT COUNT(*)::int AS total
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'ordem_servico'
`)

console.log(JSON.stringify(result.rows[0], null, 2))
await pool.end()
