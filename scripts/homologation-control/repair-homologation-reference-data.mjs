import process from 'node:process'
import { Client } from 'pg'

const sourceDatabase = String(process.env.HOMOLOG_SOURCE_PGDATABASE ?? 'teg_financ').trim() || 'teg_financ'
const targetDatabase = String(process.env.HOMOLOG_TARGET_PGDATABASE ?? 'teg_financ_homol').trim() || 'teg_financ_homol'

if (sourceDatabase === targetDatabase) {
  throw new Error('Os bancos de origem e destino da reparacao de homologacao devem ser diferentes.')
}

const baseConnection = {
  host: String(process.env.PGHOST ?? 'localhost').trim() || 'localhost',
  port: Number.parseInt(String(process.env.PGPORT ?? '5432').trim() || '5432', 10),
  user: String(process.env.PGUSER ?? 'postgres').trim() || 'postgres',
  password: String(process.env.PGPASSWORD ?? '12345'),
}

const sequenceByTable = {
  condicao: 'condicao_codigo_seq',
  tipo_bancada: 'tipo_bancada_codigo_seq',
  tipo_pgto: 'tipo_pgto_codigo_seq',
  tipo_escola: 'tipo_escola_codigo_seq',
  modalidade_tipo_bancada: 'modalidade_tipo_bancada_codigo_seq',
  parametro_veiculo: 'parametro_veiculo_codigo_seq',
  modal_bancada_condicao_tipo_pgto: 'modal_bancada_condicao_tipo_pgto_codigo_seq',
  modal_bancada_condicao_tipo_pgto_valor: 'modal_bancada_condicao_tipo_pgto_valor_codigo_seq',
  login: 'login_codigo_seq',
  acesso_pagina: 'acesso_pagina_codigo_seq',
  perfil: 'perfil_codigo_seq',
  perfil_acesso: 'perfil_acesso_codigo_seq',
}

const fetchRows = async (client, table) => {
  const result = await client.query(`SELECT * FROM ${table} ORDER BY codigo`)
  return result.rows
}

const insertByCodigo = async (client, table, rows) => {
  if (!rows.length) {
    return
  }

  const columns = Object.keys(rows[0])
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ')
  const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`

  for (const row of rows) {
    await client.query(sql, columns.map((column) => row[column]))
  }
}

const upsertByCodigo = async (client, table, rows) => {
  if (!rows.length) {
    return
  }

  const columns = Object.keys(rows[0])
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ')
  const updates = columns
    .filter((column) => column !== 'codigo')
    .map((column) => `${column} = EXCLUDED.${column}`)
    .join(', ')
  const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT (codigo) DO UPDATE SET ${updates}`

  for (const row of rows) {
    await client.query(sql, columns.map((column) => row[column]))
  }
}

const reassignConflictingDescriptions = async (client, table, rows) => {
  for (const row of rows) {
    await client.query(
      `UPDATE ${table}
       SET descricao = CONCAT('__SYNC_', CAST($1 AS text), '_', codigo, '__')
       WHERE codigo <> $2
         AND UPPER(BTRIM(CAST(descricao AS text))) = UPPER(BTRIM(CAST($3 AS text)))`,
      [table.toUpperCase(), row.codigo, row.descricao],
    )
  }
}

const reassignConflictingColumnValues = async (client, table, column, rows) => {
  for (const row of rows) {
    const value = row[column]

    if (value === null || value === undefined || String(value).trim() === '') {
      continue
    }

    await client.query(
      `UPDATE ${table}
       SET ${column} = CONCAT('__SYNC_', CAST($1 AS text), '_', codigo, '__')
       WHERE codigo <> $2
         AND UPPER(BTRIM(CAST(${column} AS text))) = UPPER(BTRIM(CAST($3 AS text)))`,
      [`${table.toUpperCase()}_${column.toUpperCase()}`, row.codigo, value],
    )
  }
}

const deleteUnreferencedExtraTipoBancadaRows = async (client, validCodes) => {
  await client.query(
    `DELETE FROM tipo_bancada tb
     WHERE tb.codigo <> ALL($1::int[])
       AND NOT EXISTS (
         SELECT 1
         FROM modalidade_tipo_bancada mtb
         WHERE mtb.tipo_bancada_codigo = tb.codigo
       )`,
    [validCodes],
  )
}

const deleteExtraRowsByCodigo = async (client, table, validCodes) => {
  await client.query(
    `DELETE FROM ${table}
     WHERE codigo <> ALL($1::int[])`,
    [validCodes],
  )
}

const resetSequence = async (client, table, sequence) => {
  await client.query(
    `SELECT setval($1::regclass, GREATEST(COALESCE((SELECT MAX(codigo) FROM ${table}), 0), 1), true)`,
    [sequence],
  )
}

const filterLoginPerfilRowsByExistingLogins = async (client, rows) => {
  if (!rows.length) {
    return { rows: [], skippedCount: 0 }
  }

  const existingLoginCodes = await client.query('SELECT codigo::int AS codigo FROM login')
  const validLoginCodes = new Set(existingLoginCodes.rows.map((row) => row.codigo))
  const filteredRows = rows.filter((row) => validLoginCodes.has(row.login_codigo))

  return {
    rows: filteredRows,
    skippedCount: rows.length - filteredRows.length,
  }
}

const filterPerfilAcessoRowsByExistingParents = async (client, rows) => {
  if (!rows.length) {
    return { rows: [], skippedCount: 0 }
  }

  const [existingPerfis, existingAcessos] = await Promise.all([
    client.query('SELECT codigo::int AS codigo FROM perfil'),
    client.query('SELECT codigo::int AS codigo FROM acesso_pagina'),
  ])
  const validPerfilCodes = new Set(existingPerfis.rows.map((row) => row.codigo))
  const validAcessoCodes = new Set(existingAcessos.rows.map((row) => row.codigo))
  const filteredRows = rows.filter((row) => validPerfilCodes.has(row.perfil_codigo) && validAcessoCodes.has(row.acesso_pagina_codigo))

  return {
    rows: filteredRows,
    skippedCount: rows.length - filteredRows.length,
  }
}

const filterLoginDreRowsByExistingParents = async (client, rows) => {
  if (!rows.length) {
    return { rows: [], skippedCount: 0 }
  }

  const [existingLogins, existingDres] = await Promise.all([
    client.query('SELECT codigo::int AS codigo FROM login'),
    client.query('SELECT codigo::int AS codigo FROM dre'),
  ])
  const validLoginCodes = new Set(existingLogins.rows.map((row) => row.codigo))
  const validDreCodes = new Set(existingDres.rows.map((row) => row.codigo))
  const filteredRows = rows.filter((row) => validLoginCodes.has(row.login_codigo) && validDreCodes.has(row.dre_codigo))

  return {
    rows: filteredRows,
    skippedCount: rows.length - filteredRows.length,
  }
}

const buildSummary = (payload, metadata = {}) => ({
  sourceDatabase,
  targetDatabase,
  ...metadata,
  synchronized: Object.fromEntries(
    Object.entries(payload).map(([table, rows]) => [table, rows.length]),
  ),
})

const main = async () => {
  const source = new Client({ ...baseConnection, database: sourceDatabase })
  const target = new Client({ ...baseConnection, database: targetDatabase })

  await source.connect()
  await target.connect()

  try {
    const payload = {
      condicao: await fetchRows(source, 'condicao'),
      tipo_bancada: await fetchRows(source, 'tipo_bancada'),
      tipo_pgto: await fetchRows(source, 'tipo_pgto'),
      tipo_escola: await fetchRows(source, 'tipo_escola'),
      modalidade_tipo_bancada: await fetchRows(source, 'modalidade_tipo_bancada'),
      parametro_veiculo: await fetchRows(source, 'parametro_veiculo'),
      modal_bancada_condicao_tipo_pgto: await fetchRows(source, 'modal_bancada_condicao_tipo_pgto'),
      modal_bancada_condicao_tipo_pgto_valor: await fetchRows(source, 'modal_bancada_condicao_tipo_pgto_valor'),
      login: await fetchRows(source, 'login'),
      acesso_pagina: await fetchRows(source, 'acesso_pagina'),
      perfil: await fetchRows(source, 'perfil'),
      perfil_acesso: await fetchRows(source, 'perfil_acesso'),
      login_perfil: await source.query('SELECT login_codigo, perfil_codigo FROM login_perfil ORDER BY login_codigo, perfil_codigo').then((result) => result.rows),
      login_dre: await source.query('SELECT login_codigo, dre_codigo FROM login_dre ORDER BY login_codigo, dre_codigo').then((result) => result.rows),
    }

    await target.query('BEGIN')

    await target.query('TRUNCATE TABLE login_dre RESTART IDENTITY CASCADE')
    await target.query('TRUNCATE TABLE login_perfil RESTART IDENTITY CASCADE')
    await target.query('TRUNCATE TABLE perfil_acesso RESTART IDENTITY CASCADE')
    
    await deleteUnreferencedExtraTipoBancadaRows(target, payload.tipo_bancada.map((row) => row.codigo))
    await deleteExtraRowsByCodigo(target, 'login', payload.login.map((row) => row.codigo))
    await deleteExtraRowsByCodigo(target, 'acesso_pagina', payload.acesso_pagina.map((row) => row.codigo))
    await deleteExtraRowsByCodigo(target, 'perfil', payload.perfil.map((row) => row.codigo))
    await reassignConflictingDescriptions(target, 'tipo_bancada', payload.tipo_bancada)
    await reassignConflictingDescriptions(target, 'tipo_pgto', payload.tipo_pgto)
    await reassignConflictingDescriptions(target, 'tipo_escola', payload.tipo_escola)
    await reassignConflictingColumnValues(target, 'tipo_escola', 'sigla', payload.tipo_escola)
    await reassignConflictingColumnValues(target, 'login', 'email', payload.login)
    await reassignConflictingColumnValues(target, 'acesso_pagina', 'sigla', payload.acesso_pagina)
    await reassignConflictingColumnValues(target, 'acesso_pagina', 'chave_sistema', payload.acesso_pagina)

    await upsertByCodigo(target, 'condicao', payload.condicao)
    await upsertByCodigo(target, 'tipo_bancada', payload.tipo_bancada)
    await upsertByCodigo(target, 'tipo_pgto', payload.tipo_pgto)
    await upsertByCodigo(target, 'tipo_escola', payload.tipo_escola)
    await upsertByCodigo(target, 'login', payload.login)
    await upsertByCodigo(target, 'acesso_pagina', payload.acesso_pagina)
    await upsertByCodigo(target, 'perfil', payload.perfil)

    const perfilAcessoFilter = await filterPerfilAcessoRowsByExistingParents(target, payload.perfil_acesso)
    const loginPerfilFilter = await filterLoginPerfilRowsByExistingLogins(target, payload.login_perfil)
    const loginDreFilter = await filterLoginDreRowsByExistingParents(target, payload.login_dre)

    await target.query('TRUNCATE TABLE modal_bancada_condicao_tipo_pgto_valor RESTART IDENTITY CASCADE')
    await target.query('TRUNCATE TABLE modal_bancada_condicao_tipo_pgto RESTART IDENTITY CASCADE')
    await target.query('TRUNCATE TABLE parametro_veiculo RESTART IDENTITY CASCADE')
    await target.query('TRUNCATE TABLE modalidade_tipo_bancada RESTART IDENTITY CASCADE')

    await insertByCodigo(target, 'perfil_acesso', perfilAcessoFilter.rows)

    if (loginPerfilFilter.rows.length) {
      await target.query(
        'INSERT INTO login_perfil (login_codigo, perfil_codigo) SELECT source.login_codigo, source.perfil_codigo FROM UNNEST($1::int[], $2::int[]) AS source(login_codigo, perfil_codigo)',
        [
          loginPerfilFilter.rows.map((row) => row.login_codigo),
          loginPerfilFilter.rows.map((row) => row.perfil_codigo),
        ],
      )
    }

    if (loginDreFilter.rows.length) {
      await target.query(
        'INSERT INTO login_dre (login_codigo, dre_codigo) SELECT source.login_codigo, source.dre_codigo FROM UNNEST($1::int[], $2::int[]) AS source(login_codigo, dre_codigo)',
        [
          loginDreFilter.rows.map((row) => row.login_codigo),
          loginDreFilter.rows.map((row) => row.dre_codigo),
        ],
      )
    }

    await insertByCodigo(target, 'modalidade_tipo_bancada', payload.modalidade_tipo_bancada)
    await insertByCodigo(target, 'parametro_veiculo', payload.parametro_veiculo)
    await insertByCodigo(target, 'modal_bancada_condicao_tipo_pgto', payload.modal_bancada_condicao_tipo_pgto)
    await insertByCodigo(target, 'modal_bancada_condicao_tipo_pgto_valor', payload.modal_bancada_condicao_tipo_pgto_valor)

    for (const [table, sequence] of Object.entries(sequenceByTable)) {
      await resetSequence(target, table, sequence)
    }

    await target.query('COMMIT')
    console.log(JSON.stringify(buildSummary(payload, {
      skippedPerfilAcessoRows: perfilAcessoFilter.skippedCount,
      synchronizedPerfilAcessoRows: perfilAcessoFilter.rows.length,
      skippedLoginPerfilRows: loginPerfilFilter.skippedCount,
      synchronizedLoginPerfilRows: loginPerfilFilter.rows.length,
      skippedLoginDreRows: loginDreFilter.skippedCount,
      synchronizedLoginDreRows: loginDreFilter.rows.length,
    }), null, 2))
  } catch (error) {
    await target.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    await source.end()
    await target.end()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
