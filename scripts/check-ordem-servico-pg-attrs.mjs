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
  SELECT
    COUNT(*) FILTER (WHERE NOT attisdropped)::int AS active_columns,
    COUNT(*) FILTER (WHERE attisdropped)::int AS dropped_columns,
    MAX(attnum)::int AS max_attnum
  FROM pg_attribute a
  INNER JOIN pg_class c ON c.oid = a.attrelid
  INNER JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relname = 'ordem_servico'
    AND n.nspname = 'public'
    AND a.attnum > 0
`)

console.log(JSON.stringify(result.rows[0], null, 2))
await pool.end()
