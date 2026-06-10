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

const dupes = await pool.query(`
  SELECT mes_ano, data_referencia, dre_codigo, ordem_servico_codigo, revisao, tipo_escola_codigo, tipo_pessoa, COUNT(*)::int AS total
  FROM apuracao_servicos
  GROUP BY 1,2,3,4,5,6,7
  HAVING COUNT(*) > 1
  ORDER BY total DESC
  LIMIT 10
`)

console.log('DUPLICATES', dupes.rowCount, dupes.rows)

if (dupes.rowCount > 0) {
  console.error('Abortando: existem duplicatas que impedem criar a chave unica.')
  await pool.end()
  process.exit(1)
}

await pool.query(`
  CREATE UNIQUE INDEX IF NOT EXISTS apuracao_servicos_chave_uk
  ON apuracao_servicos (mes_ano, data_referencia, dre_codigo, ordem_servico_codigo, revisao, tipo_escola_codigo, tipo_pessoa)
`)

const pkExists = await pool.query(`
  SELECT 1
  FROM pg_constraint
  WHERE conrelid = 'apuracao_servicos'::regclass
    AND contype = 'p'
  LIMIT 1
`)

if (pkExists.rowCount === 0) {
  await pool.query(`
    ALTER TABLE apuracao_servicos
    ADD CONSTRAINT apuracao_servicos_pk
    PRIMARY KEY (mes_ano, data_referencia, dre_codigo, ordem_servico_codigo, revisao, tipo_escola_codigo, tipo_pessoa)
  `)
  console.log('PK criada.')
} else {
  console.log('PK ja existia.')
}

const constraints = await pool.query(`
  SELECT conname, pg_get_constraintdef(oid) AS def
  FROM pg_constraint
  WHERE conrelid = 'apuracao_servicos'::regclass AND contype IN ('p','u')
`)

console.log('RESULT', constraints.rows)
await pool.end()
