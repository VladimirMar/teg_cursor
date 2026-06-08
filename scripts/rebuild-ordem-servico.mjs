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

const log = (message, extra = undefined) => {
  if (extra === undefined) {
    console.log(message)
    return
  }
  console.log(message, JSON.stringify(extra, null, 2))
}

const getTableStats = async (client, tableName) => {
  const rows = await client.query(`SELECT COUNT(*)::bigint AS total FROM ${tableName}`)
  const attrs = await client.query(`
    SELECT
      COUNT(*) FILTER (WHERE NOT attisdropped)::int AS active_columns,
      COUNT(*) FILTER (WHERE attisdropped)::int AS dropped_columns,
      MAX(attnum)::int AS max_attnum
    FROM pg_attribute a
    INNER JOIN pg_class c ON c.oid = a.attrelid
    INNER JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = $1 AND n.nspname = 'public' AND a.attnum > 0
  `, [tableName])

  return {
    tableName,
    total: rows.rows[0].total,
    ...attrs.rows[0],
  }
}

const client = await pool.connect()

try {
  const before = await getTableStats(client, 'ordem_servico')
  log('ANTES', before)

  await client.query('BEGIN')

  const incomingFks = await client.query(`
    SELECT
      tc.table_name AS referencing_table,
      tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
     AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'ordem_servico'
    ORDER BY tc.table_name, tc.constraint_name
  `)

  for (const fk of incomingFks.rows) {
    log(`Removendo FK ${fk.constraint_name} de ${fk.referencing_table}`)
    await client.query(`ALTER TABLE ${fk.referencing_table} DROP CONSTRAINT IF EXISTS ${fk.constraint_name}`)
  }

  await client.query('DROP TABLE IF EXISTS ordem_servico__compact')
  await client.query('CREATE TABLE ordem_servico__compact (LIKE ordem_servico INCLUDING DEFAULTS)')
  await client.query('INSERT INTO ordem_servico__compact SELECT * FROM ordem_servico')

  const compactCount = await client.query('SELECT COUNT(*)::bigint AS total FROM ordem_servico__compact')
  if (String(compactCount.rows[0].total) !== String(before.total)) {
    throw new Error(`Contagem divergente apos copia: origem=${before.total} destino=${compactCount.rows[0].total}`)
  }

  await client.query('ALTER TABLE ordem_servico RENAME TO ordem_servico_legacy')
  await client.query('ALTER TABLE ordem_servico__compact RENAME TO ordem_servico')

  const legacyIndexes = await client.query(`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'ordem_servico_legacy'
    ORDER BY indexname
  `)

  for (const row of legacyIndexes.rows) {
    const legacyIndexName = `${row.indexname}_legacy`
    log(`Renomeando indice legado ${row.indexname} -> ${legacyIndexName}`)
    await client.query(`ALTER INDEX IF EXISTS ${row.indexname} RENAME TO ${legacyIndexName}`)
  }

  await client.query('ALTER TABLE ordem_servico ADD CONSTRAINT credenciamento_os_pk PRIMARY KEY (termo_adesao, num_os, revisao)')

  const indexes = [
    'CREATE UNIQUE INDEX IF NOT EXISTS credenciamento_os_codigo_unique_idx ON ordem_servico USING btree (codigo)',
    'CREATE INDEX IF NOT EXISTS credenciamento_os_condutor_idx ON ordem_servico USING btree (cpf_condutor)',
    'CREATE INDEX IF NOT EXISTS credenciamento_os_dre_idx ON ordem_servico USING btree (dre_codigo)',
    'CREATE INDEX IF NOT EXISTS credenciamento_os_monitor_idx ON ordem_servico USING btree (cpf_monitor)',
    'CREATE INDEX IF NOT EXISTS credenciamento_os_veiculo_idx ON ordem_servico USING btree (crm)',
    "CREATE UNIQUE INDEX IF NOT EXISTS ordem_servico_chave_composta_unique_idx ON ordem_servico USING btree (upper(btrim((COALESCE(termo_adesao, ''::character varying))::text)), upper(btrim((COALESCE(num_os, ''::character varying))::text)), upper(btrim((COALESCE(revisao, ''::character varying))::text)))",
    'CREATE UNIQUE INDEX IF NOT EXISTS ordem_servico_codigo_unique_idx ON ordem_servico USING btree (codigo)',
    'CREATE INDEX IF NOT EXISTS ordem_servico_condutor_idx ON ordem_servico USING btree (cpf_condutor)',
    'CREATE INDEX IF NOT EXISTS ordem_servico_dre_idx ON ordem_servico USING btree (dre_codigo)',
    'CREATE INDEX IF NOT EXISTS ordem_servico_modalidade_idx ON ordem_servico USING btree (modalidade_codigo)',
    'CREATE INDEX IF NOT EXISTS ordem_servico_monitor_idx ON ordem_servico USING btree (cpf_monitor)',
    'CREATE INDEX IF NOT EXISTS ordem_servico_veiculo_idx ON ordem_servico USING btree (crm)',
  ]

  for (const ddl of indexes) {
    await client.query(ddl)
  }

  await client.query("ALTER SEQUENCE ordem_servico_codigo_seq OWNED BY ordem_servico.codigo")
  await client.query("ALTER TABLE ordem_servico ALTER COLUMN codigo SET DEFAULT nextval('ordem_servico_codigo_seq'::regclass)")
  await client.query("SELECT setval('ordem_servico_codigo_seq', GREATEST(COALESCE((SELECT MAX(codigo) FROM ordem_servico), 1), 1))")

  await client.query(`
    ALTER TABLE apuracao_servicos
      ADD CONSTRAINT apuracao_servicos_ordem_servico_codigo_fkey
      FOREIGN KEY (ordem_servico_codigo) REFERENCES ordem_servico(codigo) ON DELETE RESTRICT
  `)
  await client.query(`
    ALTER TABLE remuneracao_servicos
      ADD CONSTRAINT remuneracao_servicos_ordem_servico_codigo_fkey
      FOREIGN KEY (ordem_servico_codigo) REFERENCES ordem_servico(codigo) ON DELETE RESTRICT
  `)

  const orphanApuracao = await client.query(`
    SELECT COUNT(*)::int AS total
    FROM apuracao_servicos aps
    LEFT JOIN ordem_servico os ON os.codigo = aps.ordem_servico_codigo
    WHERE os.codigo IS NULL
  `)
  const orphanRemuneracao = await client.query(`
    SELECT COUNT(*)::int AS total
    FROM remuneracao_servicos rs
    LEFT JOIN ordem_servico os ON os.codigo = rs.ordem_servico_codigo
    WHERE os.codigo IS NULL
  `)

  if (orphanApuracao.rows[0].total > 0 || orphanRemuneracao.rows[0].total > 0) {
    throw new Error(`Orfaos detectados: apuracao=${orphanApuracao.rows[0].total}, remuneracao=${orphanRemuneracao.rows[0].total}`)
  }

  await client.query('COMMIT')

  const after = await getTableStats(client, 'ordem_servico')
  log('DEPOIS', after)

  const legacyExists = await client.query(`
    SELECT to_regclass('public.ordem_servico_legacy')::text AS legacy_table
  `)
  log('LEGACY_TABLE', legacyExists.rows[0])

  if (Number(after.max_attnum) >= 1600) {
    throw new Error(`Rebuild nao liberou attnum: max_attnum=${after.max_attnum}`)
  }

  log('REBUILD_OK')
} catch (error) {
  await client.query('ROLLBACK').catch(() => {})
  console.error('REBUILD_FAILED', error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  client.release()
  await pool.end()
}
