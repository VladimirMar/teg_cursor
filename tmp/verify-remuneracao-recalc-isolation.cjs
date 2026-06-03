const { Client } = require('pg')
const crypto = require('crypto')

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001'

const createDbClient = () => new Client({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: Number(process.env.POSTGRES_PORT || 5432),
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || '12345',
  database: process.env.POSTGRES_DB || 'teg_financ',
})

const hashRows = (rows) => crypto.createHash('sha256').update(JSON.stringify(rows || [])).digest('hex')

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const buildRowKey = (row) => [
  row.mes_ano,
  row.data_referencia,
  row.dre_codigo,
  row.ordem_servico_codigo,
  row.revisao,
  row.tipo_escola_codigo,
  row.tipo_pessoa,
].join('|')

const pickFilter = async (client) => {
  const preferredResult = await client.query(`
    SELECT
      aps.mes_ano,
      aps.data_referencia::text AS data_referencia,
      aps.dre_codigo::text AS dre_codigo,
      aps.revisao,
      COALESCE(BTRIM(aps.tipo_pessoa), '') AS tipo_pessoa,
      SUM(COALESCE(aps.nc_pres, 0) + COALESCE(aps.cad, 0) + COALESCE(aps.ac_nc, 0) + COALESCE(aps.ac_cad, 0) + COALESCE(aps.cont_nc, 0) + COALESCE(aps.cont_cad, 0))::int AS soma_metricas
    FROM apuracao_servicos aps
    INNER JOIN apuracao_financeira af
      ON af.mes_ano = aps.mes_ano
     AND af.dre_codigo = aps.dre_codigo
     AND af.revisao = aps.revisao
     AND BTRIM(af.tipo_pessoa) = BTRIM(aps.tipo_pessoa)
    WHERE BTRIM(af.situacao) IN ('A processar', 'Processado')
    GROUP BY aps.mes_ano, aps.data_referencia, aps.dre_codigo, aps.revisao, COALESCE(BTRIM(aps.tipo_pessoa), '')
    HAVING SUM(COALESCE(aps.nc_pres, 0) + COALESCE(aps.cad, 0) + COALESCE(aps.ac_nc, 0) + COALESCE(aps.ac_cad, 0) + COALESCE(aps.cont_nc, 0) + COALESCE(aps.cont_cad, 0)) > 0
    ORDER BY aps.mes_ano DESC, aps.data_referencia DESC
    LIMIT 1
  `)

  if (preferredResult.rowCount > 0) {
    return preferredResult.rows[0]
  }

  const fallbackResult = await client.query(`
    SELECT
      aps.mes_ano,
      aps.data_referencia::text AS data_referencia,
      aps.dre_codigo::text AS dre_codigo,
      aps.revisao,
      COALESCE(BTRIM(aps.tipo_pessoa), '') AS tipo_pessoa,
      SUM(COALESCE(aps.nc_pres, 0) + COALESCE(aps.cad, 0) + COALESCE(aps.ac_nc, 0) + COALESCE(aps.ac_cad, 0) + COALESCE(aps.cont_nc, 0) + COALESCE(aps.cont_cad, 0))::int AS soma_metricas
    FROM apuracao_servicos aps
    GROUP BY aps.mes_ano, aps.data_referencia, aps.dre_codigo, aps.revisao, COALESCE(BTRIM(aps.tipo_pessoa), '')
    ORDER BY aps.mes_ano DESC, aps.data_referencia DESC
    LIMIT 1
  `)

  return fallbackResult.rows[0] || null
}

const queryApuracaoSnapshot = async (client, filter) => {
  const result = await client.query(`
    SELECT
      aps.mes_ano,
      aps.data_referencia::text AS data_referencia,
      aps.dre_codigo::text AS dre_codigo,
      aps.ordem_servico_codigo::text AS ordem_servico_codigo,
      aps.revisao,
      aps.tipo_escola_codigo::text AS tipo_escola_codigo,
      COALESCE(BTRIM(aps.tipo_pessoa), '') AS tipo_pessoa,
      COALESCE(aps.nc_pres, 0) AS nc_pres,
      COALESCE(aps.cad, 0) AS cad,
      COALESCE(aps.ac_nc, 0) AS ac_nc,
      COALESCE(aps.ac_cad, 0) AS ac_cad,
      COALESCE(aps.cont_nc, 0) AS cont_nc,
      COALESCE(aps.cont_cad, 0) AS cont_cad,
      COALESCE(aps.km, 0) AS km,
      COALESCE(aps.nc_pres_acm, 0) AS nc_pres_acm,
      COALESCE(aps.cad_acm, 0) AS cad_acm,
      COALESCE(aps.ac_nc_acm, 0) AS ac_nc_acm,
      COALESCE(aps.ac_cad_acm, 0) AS ac_cad_acm,
      COALESCE(aps.cont_nc_acm, 0) AS cont_nc_acm,
      COALESCE(aps.cont_cad_acm, 0) AS cont_cad_acm,
      aps.data_inclusao::text AS data_inclusao,
      aps.data_alteracao::text AS data_alteracao
    FROM apuracao_servicos aps
    WHERE aps.mes_ano = $1
      AND aps.data_referencia = $2::date
      AND aps.dre_codigo = $3::int
      AND aps.revisao = $4::int
      AND COALESCE(BTRIM(aps.tipo_pessoa), '') = $5
    ORDER BY aps.ordem_servico_codigo, aps.tipo_escola_codigo
  `, [filter.mes_ano, filter.data_referencia, filter.dre_codigo, filter.revisao, filter.tipo_pessoa])

  return result.rows
}

const queryRemuneracaoSnapshot = async (client, filter) => {
  const result = await client.query(`
    SELECT
      r.mes_ano,
      r.data_referencia::text AS data_referencia,
      r.dre_codigo::text AS dre_codigo,
      r.ordem_servico_codigo::text AS ordem_servico_codigo,
      r.revisao,
      COALESCE(BTRIM(r.tipo_pessoa), '') AS tipo_pessoa,
      COALESCE(r.teg_regular_fixo, 0) AS teg_regular_fixo,
      COALESCE(r.teg_regular_percapita, 0) AS teg_regular_percapita,
      COALESCE(r.teg_acessivel_fixo, 0) AS teg_acessivel_fixo,
      COALESCE(r.teg_acessivel_percapita, 0) AS teg_acessivel_percapita,
      COALESCE(r.teg_especial_regular_fixo, 0) AS teg_especial_regular_fixo,
      COALESCE(r.teg_especial_regular_percapita, 0) AS teg_especial_regular_percapita,
      COALESCE(r.teg_especial_acessivel_fixo, 0) AS teg_especial_acessivel_fixo,
      COALESCE(r.teg_especial_acessivel_percapita, 0) AS teg_especial_acessivel_percapita,
      COALESCE(r.teg_creche_fixo, 0) AS teg_creche_fixo,
      COALESCE(r.teg_creche_percapita, 0) AS teg_creche_percapita,
      COALESCE(r.km_valor, 0) AS km_valor,
      COALESCE(r.continua_regular, 0) AS continua_regular,
      COALESCE(r.continua_cadeirante, 0) AS continua_cadeirante,
      r.data_inclusao::text AS data_inclusao,
      r.data_alteracao::text AS data_alteracao
    FROM remuneracao_servicos r
    WHERE r.mes_ano = $1
      AND r.data_referencia = $2::date
      AND r.dre_codigo = $3::int
      AND r.revisao = $4::int
      AND COALESCE(BTRIM(r.tipo_pessoa), '') = $5
    ORDER BY r.ordem_servico_codigo
  `, [filter.mes_ano, filter.data_referencia, filter.dre_codigo, filter.revisao, filter.tipo_pessoa])

  return result.rows
}

const countChangedRows = (beforeRows, afterRows, rowKeyBuilder = buildRowKey) => {
  const beforeMap = new Map((beforeRows || []).map((row) => [rowKeyBuilder(row), JSON.stringify(row)]))
  const afterMap = new Map((afterRows || []).map((row) => [rowKeyBuilder(row), JSON.stringify(row)]))

  const keys = new Set([...beforeMap.keys(), ...afterMap.keys()])
  let changed = 0

  for (const key of keys) {
    if (beforeMap.get(key) !== afterMap.get(key)) {
      changed += 1
    }
  }

  return changed
}

const run = async () => {
  const db = createDbClient()
  await db.connect()

  try {
    const filter = await pickFilter(db)

    if (!filter) {
      throw new Error('Nao foi encontrada chave valida em apuracao_servicos para o teste.')
    }

    const requestPayload = {
      mesAno: filter.mes_ano,
      dataReferencia: filter.data_referencia,
      dreCodigo: filter.dre_codigo,
      revisao: Number(filter.revisao),
      tipoPessoa: filter.tipo_pessoa,
    }

    const apuracaoBefore = await queryApuracaoSnapshot(db, filter)
    const remuneracaoBefore = await queryRemuneracaoSnapshot(db, filter)

    const postResponse = await fetch(`${API_BASE_URL}/api/remuneracao-servicos/calcular`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(requestPayload),
    })

    const postPayload = await postResponse.json().catch(() => ({}))

    if (!postResponse.ok) {
      throw new Error(`Falha ao disparar calculo: HTTP ${postResponse.status} - ${postPayload?.message || 'sem detalhe'}`)
    }

    const expectedJobId = String(postPayload.jobId || '').trim()
    const startedAt = Date.now()
    let finalStatusPayload = null

    for (let attempt = 0; attempt < 180; attempt += 1) {
      const statusResponse = await fetch(`${API_BASE_URL}/api/remuneracao-servicos/calcular`)
      const statusPayload = await statusResponse.json().catch(() => ({}))

      if (!statusResponse.ok) {
        throw new Error(`Falha ao consultar status do calculo: HTTP ${statusResponse.status}`)
      }

      const currentJobId = String(statusPayload.jobId || '').trim()
      if (expectedJobId && currentJobId && currentJobId !== expectedJobId) {
        await sleep(1000)
        continue
      }

      if (statusPayload.isRunning) {
        await sleep(1000)
        continue
      }

      finalStatusPayload = statusPayload
      break
    }

    if (!finalStatusPayload) {
      throw new Error('Timeout aguardando finalizacao do calculo de remuneracao.')
    }

    if (finalStatusPayload.status === 'failed' || Number(finalStatusPayload.exitCode) === 1) {
      throw new Error(`Calculo finalizou com falha: ${finalStatusPayload.errorMessage || 'sem detalhe'}`)
    }

    const apuracaoAfter = await queryApuracaoSnapshot(db, filter)
    const remuneracaoAfter = await queryRemuneracaoSnapshot(db, filter)

    const apuracaoBeforeHash = hashRows(apuracaoBefore)
    const apuracaoAfterHash = hashRows(apuracaoAfter)
    const remuneracaoBeforeHash = hashRows(remuneracaoBefore)
    const remuneracaoAfterHash = hashRows(remuneracaoAfter)

    const apuracaoChanged = apuracaoBeforeHash !== apuracaoAfterHash
    const remuneracaoChanged = remuneracaoBeforeHash !== remuneracaoAfterHash

    const result = {
      apiBaseUrl: API_BASE_URL,
      filtro_testado: requestPayload,
      execucao: {
        jobId: expectedJobId,
        status: finalStatusPayload.status,
        exitCode: finalStatusPayload.exitCode,
        totalRegistros: finalStatusPayload.totalRegistros,
        totalCalculados: finalStatusPayload.totalCalculados,
        totalAtualizados: finalStatusPayload.totalAtualizados,
        totalIgnorados: finalStatusPayload.totalIgnorados,
        duracaoMsAproximada: Date.now() - startedAt,
      },
      comparativo: {
        apuracao_servicos: {
          rowCountBefore: apuracaoBefore.length,
          rowCountAfter: apuracaoAfter.length,
          hashBefore: apuracaoBeforeHash,
          hashAfter: apuracaoAfterHash,
          changed: apuracaoChanged,
          changedRows: countChangedRows(apuracaoBefore, apuracaoAfter),
        },
        remuneracao_servicos: {
          rowCountBefore: remuneracaoBefore.length,
          rowCountAfter: remuneracaoAfter.length,
          hashBefore: remuneracaoBeforeHash,
          hashAfter: remuneracaoAfterHash,
          changed: remuneracaoChanged,
          changedRows: countChangedRows(remuneracaoBefore, remuneracaoAfter, (row) => [row.mes_ano, row.data_referencia, row.dre_codigo, row.ordem_servico_codigo, row.revisao, row.tipo_pessoa].join('|')),
        },
      },
      conclusao: {
        apuracaoPermaneceuIgual: !apuracaoChanged,
        apenasRemuneracaoFoiAlterada: !apuracaoChanged && remuneracaoChanged,
      },
    }

    console.log(JSON.stringify(result, null, 2))
  } finally {
    await db.end().catch(() => {})
  }
}

run().catch((error) => {
  console.error(JSON.stringify({ ok: false, message: error.message }, null, 2))
  process.exit(1)
})
