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

await pool.query('ALTER TABLE remuneracao_servicos ADD COLUMN IF NOT EXISTS cca_valor numeric(14, 2) DEFAULT 0')
await pool.query('UPDATE remuneracao_servicos SET cca_valor = 0 WHERE cca_valor IS NULL OR cca_valor < 0')
await pool.query('ALTER TABLE remuneracao_servicos ALTER COLUMN cca_valor TYPE numeric(14, 2) USING COALESCE(cca_valor, 0)::numeric(14, 2)')

const result = await pool.query(`
  SELECT column_name
  FROM information_schema.columns
  WHERE table_name = 'remuneracao_servicos'
    AND column_name = 'cca_valor'
`)

console.log(JSON.stringify({ ok: result.rowCount > 0 }, null, 2))
await pool.end()
