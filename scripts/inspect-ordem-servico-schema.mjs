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

const columns = await pool.query(`
  SELECT column_name, data_type, udt_name, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'ordem_servico'
  ORDER BY ordinal_position
`)

const attrs = await pool.query(`
  SELECT
    COUNT(*) FILTER (WHERE NOT attisdropped)::int AS active_columns,
    COUNT(*) FILTER (WHERE attisdropped)::int AS dropped_columns,
    MAX(attnum)::int AS max_attnum
  FROM pg_attribute a
  INNER JOIN pg_class c ON c.oid = a.attrelid
  INNER JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relname = 'ordem_servico' AND n.nspname = 'public' AND a.attnum > 0
`)

const pk = await pool.query(`
  SELECT tc.constraint_name, kcu.column_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
   AND tc.table_schema = kcu.table_schema
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'ordem_servico'
    AND tc.constraint_type = 'PRIMARY KEY'
  ORDER BY kcu.ordinal_position
`)

const indexes = await pool.query(`
  SELECT indexname, indexdef
  FROM pg_indexes
  WHERE schemaname = 'public' AND tablename = 'ordem_servico'
  ORDER BY indexname
`)

const incomingFks = await pool.query(`
  SELECT
    tc.table_name AS referencing_table,
    tc.constraint_name,
    kcu.column_name AS referencing_column,
    ccu.column_name AS referenced_column
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
   AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
   AND ccu.table_schema = tc.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'ordem_servico'
  ORDER BY tc.table_name, tc.constraint_name
`)

const outgoingFks = await pool.query(`
  SELECT
    tc.constraint_name,
    kcu.column_name AS referencing_column,
    ccu.table_name AS referenced_table,
    ccu.column_name AS referenced_column
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
   AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
   AND ccu.table_schema = tc.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'ordem_servico'
  ORDER BY tc.constraint_name
`)

const rowCount = await pool.query('SELECT COUNT(*)::bigint AS total FROM ordem_servico')

console.log(JSON.stringify({
  attrs: attrs.rows[0],
  rowCount: rowCount.rows[0].total,
  columns: columns.rows,
  primaryKey: pk.rows,
  indexes: indexes.rows,
  incomingFks: incomingFks.rows,
  outgoingFks: outgoingFks.rows,
}, null, 2))

await pool.end()
