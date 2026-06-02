import path from 'node:path'
import { mkdir } from 'node:fs/promises'
import XLSX from 'xlsx'

const baseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:3001'
const workspaceRoot = process.cwd()
const outputDirectory = path.join(workspaceRoot, 'tmp')
const workbookPath = path.join(outputDirectory, '04 ATESTE BT PF NEG TEST.xlsx')
const expectedTypeSequence = ['EMEI', 'EMEF', 'EMEE', 'CEI', 'CCA']

const scenario = {
  mesAno: '04/2026',
  firstDataReferencia: '2026-04-01',
  secondDataReferencia: '2026-04-02',
  lastDataReferencia: '2026-04-30',
  dreCodigo: '11',
  placa: 'STF3C60',
  tipoPessoa: 'PF',
  ordemServico: '2023/0012621-001A',
  revisao: 0,
  rows: [
    {
      tipoEscolaSigla: 'EMEI',
      firstDayMetrics: {
        naoCadeirantePresencial: -11,
        cadeirante: -12,
        atendimentoComplementarNaoCadeirante: -13,
        atendimentoComplementarCadeirante: -14,
        continuaNaoCadeirante: -15,
        continuaCadeirante: -16,
      },
      secondDayMetrics: {
        naoCadeirantePresencial: 4,
        cadeirante: -3,
        atendimentoComplementarNaoCadeirante: 2,
        atendimentoComplementarCadeirante: -1,
        continuaNaoCadeirante: 6,
        continuaCadeirante: -5,
      },
    },
    {
      tipoEscolaSigla: 'EMEF',
      firstDayMetrics: {
        naoCadeirantePresencial: -21,
        cadeirante: -22,
        atendimentoComplementarNaoCadeirante: -23,
        atendimentoComplementarCadeirante: -24,
        continuaNaoCadeirante: -25,
        continuaCadeirante: -26,
      },
      secondDayMetrics: {
        naoCadeirantePresencial: 8,
        cadeirante: -7,
        atendimentoComplementarNaoCadeirante: 6,
        atendimentoComplementarCadeirante: -5,
        continuaNaoCadeirante: 10,
        continuaCadeirante: -9,
      },
    },
    {
      tipoEscolaSigla: 'EMEE',
      firstDayMetrics: {
        naoCadeirantePresencial: -31,
        cadeirante: -32,
        atendimentoComplementarNaoCadeirante: -33,
        atendimentoComplementarCadeirante: -34,
        continuaNaoCadeirante: -35,
        continuaCadeirante: -36,
      },
      secondDayMetrics: {
        naoCadeirantePresencial: 12,
        cadeirante: -11,
        atendimentoComplementarNaoCadeirante: 10,
        atendimentoComplementarCadeirante: -9,
        continuaNaoCadeirante: 14,
        continuaCadeirante: -13,
      },
    },
    {
      tipoEscolaSigla: 'CEI',
      firstDayMetrics: {
        naoCadeirantePresencial: -41,
        cadeirante: -42,
        atendimentoComplementarNaoCadeirante: -43,
        atendimentoComplementarCadeirante: -44,
        continuaNaoCadeirante: -45,
        continuaCadeirante: -46,
      },
      secondDayMetrics: {
        naoCadeirantePresencial: 16,
        cadeirante: -15,
        atendimentoComplementarNaoCadeirante: 14,
        atendimentoComplementarCadeirante: -13,
        continuaNaoCadeirante: 18,
        continuaCadeirante: -17,
      },
    },
    {
      tipoEscolaSigla: 'CCA',
      firstDayMetrics: {
        naoCadeirantePresencial: -51,
        cadeirante: -52,
        atendimentoComplementarNaoCadeirante: -53,
        atendimentoComplementarCadeirante: -54,
        continuaNaoCadeirante: -55,
        continuaCadeirante: -56,
      },
      secondDayMetrics: {
        naoCadeirantePresencial: 20,
        cadeirante: -19,
        atendimentoComplementarNaoCadeirante: 18,
        atendimentoComplementarCadeirante: -17,
        continuaNaoCadeirante: 22,
        continuaCadeirante: -21,
      },
    },
  ],
}

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}

const requestJson = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers ?? {}),
    },
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message = payload && typeof payload.message === 'string'
      ? payload.message
      : `HTTP ${response.status} em ${url}`

    throw new Error(message)
  }

  return payload
}

const wait = (milliseconds) => new Promise((resolve) => {
  setTimeout(resolve, milliseconds)
})

const isDeadlockError = (error) => {
  const message = error instanceof Error ? error.message : String(error)
  return /impasse detectado|deadlock detected/i.test(message)
}

const requestJsonWithRetry = async (url, options = {}, { attempts = 4, delayMs = 300 } = {}) => {
  let lastError = null

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await requestJson(url, options)
    } catch (error) {
      lastError = error

      if (!isDeadlockError(error) || attempt === attempts) {
        throw error
      }

      await wait(delayMs * attempt)
    }
  }

  throw lastError
}

const buildQueryUrl = (params) => {
  const query = new URLSearchParams(params)
  return `${baseUrl}/api/apontamento-servicos?${query.toString()}`
}

const fetchAllApontamentoPages = async (params) => {
  const aggregatedItems = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const payload = await requestJson(buildQueryUrl({
      ...params,
      page: String(page),
      pageSize: '50',
    }))

    const pageItems = Array.isArray(payload?.items) ? payload.items : []
    aggregatedItems.push(...pageItems)

    const parsedTotalPages = Number(payload?.totalPages)
    totalPages = Number.isFinite(parsedTotalPages) && parsedTotalPages > 0
      ? parsedTotalPages
      : 1
    page += 1
  }

  return {
    items: aggregatedItems,
    total: aggregatedItems.length,
    page: 1,
    pageSize: aggregatedItems.length,
    totalPages: 1,
  }
}

const getRowsForScenario = (payload, currentScenario) => {
  return (payload.items ?? []).filter(
    (item) => (
      String(item.ordemServicoOsConcat ?? '').trim() === currentScenario.ordemServico
      && String(item.dreCodigo ?? '').trim() === String(currentScenario.dreCodigo ?? '').trim()
      && String(item.placa ?? '').trim() === String(currentScenario.placa ?? '').trim()
      && String(item.tipoPessoa ?? '').trim() === String(currentScenario.tipoPessoa ?? '').trim()
      && Number(item.revisao ?? 0) === Number(currentScenario.revisao ?? 0)
    ),
  )
}

const toRestoreItems = (payload, currentScenario) => {
  const rows = getRowsForScenario(payload, currentScenario)

  return rows
    .filter((item) => currentScenario.rows.some((row) => row.tipoEscolaSigla === item.tipoEscolaSigla))
    .map((item) => ({
      dreCodigo: item.dreCodigo,
      ordemServicoCodigo: item.ordemServicoCodigo,
      revisao: item.revisao,
      tipoEscolaCodigo: item.tipoEscolaCodigo,
      tipoPessoa: item.tipoPessoa,
      naoCadeirantePresencial: item.naoCadeirantePresencial,
      cadeirante: item.cadeirante,
      atendimentoComplementarNaoCadeirante: item.atendimentoComplementarNaoCadeirante,
      atendimentoComplementarCadeirante: item.atendimentoComplementarCadeirante,
      continuaNaoCadeirante: item.continuaNaoCadeirante,
      continuaCadeirante: item.continuaCadeirante,
      kilometragem: item.kilometragem,
    }))
}

const buildScenarioKey = (item) => [
  String(item.ordemServicoOsConcat ?? '').trim(),
  String(item.dreCodigo ?? '').trim(),
  String(item.placa ?? '').trim(),
  String(item.tipoPessoa ?? '').trim(),
  String(Number(item.revisao ?? 0)),
].join('|')

const buildScenarioGroupsByDate = (items) => {
  const groups = new Map()

  for (const item of items) {
    const key = buildScenarioKey(item)

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        ordemServico: String(item.ordemServicoOsConcat ?? '').trim(),
        dreCodigo: String(item.dreCodigo ?? '').trim(),
        placa: String(item.placa ?? '').trim(),
        tipoPessoa: String(item.tipoPessoa ?? '').trim() || 'PF',
        revisao: Number(item.revisao ?? 0),
        tipos: new Set(),
      })
    }

    groups.get(key).tipos.add(String(item.tipoEscolaSigla ?? '').trim())
  }

  return groups
}

const hasExpectedTypes = (tiposSet) => expectedTypeSequence.every((type) => tiposSet.has(type))

const resolveScenarioFromAvailableData = (firstDayItems, secondDayItems, lastDayItems) => {
  const firstDayGroups = buildScenarioGroupsByDate(firstDayItems)
  const secondDayGroups = buildScenarioGroupsByDate(secondDayItems)
  const lastDayGroups = buildScenarioGroupsByDate(lastDayItems)

  const candidates = []

  for (const [key, firstDayGroup] of firstDayGroups.entries()) {
    const secondDayGroup = secondDayGroups.get(key)
    const lastDayGroup = lastDayGroups.get(key)

    if (!secondDayGroup || !lastDayGroup) {
      continue
    }

    if (!hasExpectedTypes(firstDayGroup.tipos) || !hasExpectedTypes(secondDayGroup.tipos) || !hasExpectedTypes(lastDayGroup.tipos)) {
      continue
    }

    candidates.push(firstDayGroup)
  }

  if (!candidates.length) {
    throw new Error('Nao foi encontrado cenario com EMEI/EMEF/EMEE/CEI/CCA disponivel nos dias 1, 2 e 30 para executar o teste negativo.')
  }

  const preferredOs = String(scenario.ordemServico ?? '').trim()
  const preferredDre = String(scenario.dreCodigo ?? '').trim()
  const preferredPlaca = String(scenario.placa ?? '').trim()

  const candidatesWithinPreferredDre = preferredDre
    ? candidates.filter((candidate) => candidate.dreCodigo === preferredDre)
    : candidates

  if (preferredDre && !candidatesWithinPreferredDre.length) {
    throw new Error(`Nao foi encontrado cenario elegivel na DRE ${preferredDre} para o teste negativo.`)
  }

  const eligibleCandidates = candidatesWithinPreferredDre

  const strictPreferred = eligibleCandidates.find((candidate) => (
    candidate.ordemServico === preferredOs
    && candidate.dreCodigo === preferredDre
    && candidate.placa === preferredPlaca
  ))

  if (strictPreferred) {
    return strictPreferred
  }

  const osPreferred = eligibleCandidates.find((candidate) => candidate.ordemServico === preferredOs)

  if (osPreferred) {
    return osPreferred
  }

  return [...eligibleCandidates].sort((left, right) => left.ordemServico.localeCompare(right.ordemServico))[0]
}

const sumMetrics = (left, right) => ({
  naoCadeirantePresencial: left.naoCadeirantePresencial + right.naoCadeirantePresencial,
  cadeirante: left.cadeirante + right.cadeirante,
  atendimentoComplementarNaoCadeirante: left.atendimentoComplementarNaoCadeirante + right.atendimentoComplementarNaoCadeirante,
  atendimentoComplementarCadeirante: left.atendimentoComplementarCadeirante + right.atendimentoComplementarCadeirante,
  continuaNaoCadeirante: left.continuaNaoCadeirante + right.continuaNaoCadeirante,
  continuaCadeirante: left.continuaCadeirante + right.continuaCadeirante,
})

const assertItemMetrics = (item, metrics, label) => {
  assert(item.naoCadeirantePresencial === metrics.naoCadeirantePresencial, `${label}: Nao cadeirante presencial divergente: atual=${item.naoCadeirantePresencial}, esperado=${metrics.naoCadeirantePresencial}`)
  assert(item.cadeirante === metrics.cadeirante, `${label}: Cadeirante divergente: atual=${item.cadeirante}, esperado=${metrics.cadeirante}`)
  assert(item.atendimentoComplementarNaoCadeirante === metrics.atendimentoComplementarNaoCadeirante, `${label}: Atendimento complementar N CAD divergente: atual=${item.atendimentoComplementarNaoCadeirante}, esperado=${metrics.atendimentoComplementarNaoCadeirante}`)
  assert(item.atendimentoComplementarCadeirante === metrics.atendimentoComplementarCadeirante, `${label}: Atendimento complementar CAD divergente: atual=${item.atendimentoComplementarCadeirante}, esperado=${metrics.atendimentoComplementarCadeirante}`)
  assert(item.continuaNaoCadeirante === metrics.continuaNaoCadeirante, `${label}: Continua N CAD divergente: atual=${item.continuaNaoCadeirante}, esperado=${metrics.continuaNaoCadeirante}`)
  assert(item.continuaCadeirante === metrics.continuaCadeirante, `${label}: Continua CAD divergente: atual=${item.continuaCadeirante}, esperado=${metrics.continuaCadeirante}`)
}

const assertItemAccumulatedMetrics = (item, metrics, label) => {
  assert(item.naoCadeirantePresencialAcm === metrics.naoCadeirantePresencial, `${label}: Acumulado Nao cadeirante presencial divergente: atual=${item.naoCadeirantePresencialAcm}, esperado=${metrics.naoCadeirantePresencial}`)
  assert(item.cadeiranteAcm === metrics.cadeirante, `${label}: Acumulado Cadeirante divergente: atual=${item.cadeiranteAcm}, esperado=${metrics.cadeirante}`)
  assert(item.atendimentoComplementarNaoCadeiranteAcm === metrics.atendimentoComplementarNaoCadeirante, `${label}: Acumulado Atendimento complementar N CAD divergente: atual=${item.atendimentoComplementarNaoCadeiranteAcm}, esperado=${metrics.atendimentoComplementarNaoCadeirante}`)
  assert(item.atendimentoComplementarCadeiranteAcm === metrics.atendimentoComplementarCadeirante, `${label}: Acumulado Atendimento complementar CAD divergente: atual=${item.atendimentoComplementarCadeiranteAcm}, esperado=${metrics.atendimentoComplementarCadeirante}`)
  assert(item.continuaNaoCadeiranteAcm === metrics.continuaNaoCadeirante, `${label}: Acumulado Continua N CAD divergente: atual=${item.continuaNaoCadeiranteAcm}, esperado=${metrics.continuaNaoCadeirante}`)
  assert(item.continuaCadeiranteAcm === metrics.continuaCadeirante, `${label}: Acumulado Continua CAD divergente: atual=${item.continuaCadeiranteAcm}, esperado=${metrics.continuaCadeirante}`)
}

const buildImportWorkbook = async (currentScenario) => {
  await mkdir(outputDirectory, { recursive: true })

  const workbook = XLSX.utils.book_new()
  const mainSheet = {}
  const continuaSheet = {}

  mainSheet.A1 = { t: 's', v: 'BUTANTA' }
  mainSheet.F5 = { t: 's', v: '01/04/2026' }

  currentScenario.rows.forEach((row, index) => {
    const rowNumber = index + 6
    mainSheet[`B${rowNumber}`] = { t: 's', v: currentScenario.ordemServico }
    mainSheet[`F${rowNumber}`] = { t: 's', v: '01/04/2026' }
    mainSheet[`G${rowNumber}`] = { t: 's', v: '30/04/2026' }
    mainSheet[`K${rowNumber}`] = { t: 's', v: row.tipoEscolaSigla }
    mainSheet[`Q${rowNumber}`] = { t: 'n', v: row.firstDayMetrics.naoCadeirantePresencial }
    mainSheet[`R${rowNumber}`] = { t: 'n', v: row.firstDayMetrics.cadeirante }
    mainSheet[`S${rowNumber}`] = { t: 'n', v: row.firstDayMetrics.atendimentoComplementarNaoCadeirante }
    mainSheet[`T${rowNumber}`] = { t: 'n', v: row.firstDayMetrics.atendimentoComplementarCadeirante }
    mainSheet[`U${rowNumber}`] = { t: 'n', v: row.secondDayMetrics.naoCadeirantePresencial }
    mainSheet[`V${rowNumber}`] = { t: 'n', v: row.secondDayMetrics.cadeirante }
    mainSheet[`W${rowNumber}`] = { t: 'n', v: row.secondDayMetrics.atendimentoComplementarNaoCadeirante }
    mainSheet[`X${rowNumber}`] = { t: 'n', v: row.secondDayMetrics.atendimentoComplementarCadeirante }

    continuaSheet[`B${rowNumber}`] = { t: 's', v: currentScenario.ordemServico }
    continuaSheet[`L${rowNumber}`] = { t: 'n', v: row.firstDayMetrics.continuaNaoCadeirante }
    continuaSheet[`M${rowNumber}`] = { t: 'n', v: row.firstDayMetrics.continuaCadeirante }
    continuaSheet[`N${rowNumber}`] = { t: 'n', v: row.secondDayMetrics.continuaNaoCadeirante }
    continuaSheet[`O${rowNumber}`] = { t: 'n', v: row.secondDayMetrics.continuaCadeirante }
  })

  mainSheet['!ref'] = 'A1:EF10'
  continuaSheet['!ref'] = 'A1:BS10'

  XLSX.utils.book_append_sheet(workbook, mainSheet, 'APONTAMENTO CREDENCIAMENTO')
  XLSX.utils.book_append_sheet(workbook, continuaSheet, 'CONTINUA')
  XLSX.writeFile(workbook, workbookPath)

  return workbookPath
}

const main = async () => {
  console.log('Preparando planilha temporaria com valores negativos...')
  const fullFirstDayPayload = await fetchAllApontamentoPages({
    mesAno: scenario.mesAno,
    dataReferencia: scenario.firstDataReferencia,
  })
  const fullSecondDayPayload = await fetchAllApontamentoPages({
    mesAno: scenario.mesAno,
    dataReferencia: scenario.secondDataReferencia,
  })
  const fullLastDayPayload = await fetchAllApontamentoPages({
    mesAno: scenario.mesAno,
    dataReferencia: scenario.lastDataReferencia,
  })

  const resolvedScenario = {
    ...scenario,
    ...resolveScenarioFromAvailableData(
      fullFirstDayPayload.items ?? [],
      fullSecondDayPayload.items ?? [],
      fullLastDayPayload.items ?? [],
    ),
  }

  console.log(`- Cenario selecionado: ${resolvedScenario.ordemServico} (DRE ${resolvedScenario.dreCodigo}, placa ${resolvedScenario.placa}, revisao ${resolvedScenario.revisao})`)

  const targetWorkbookPath = await buildImportWorkbook(resolvedScenario)

  const baselineFirstDayPayload = await fetchAllApontamentoPages({
    mesAno: resolvedScenario.mesAno,
    dataReferencia: resolvedScenario.firstDataReferencia,
    dreCodigo: resolvedScenario.dreCodigo,
    placa: resolvedScenario.placa,
    tipoPessoa: resolvedScenario.tipoPessoa,
    revisao: String(resolvedScenario.revisao),
  })
  const baselineSecondDayPayload = await fetchAllApontamentoPages({
    mesAno: resolvedScenario.mesAno,
    dataReferencia: resolvedScenario.secondDataReferencia,
    dreCodigo: resolvedScenario.dreCodigo,
    placa: resolvedScenario.placa,
    tipoPessoa: resolvedScenario.tipoPessoa,
    revisao: String(resolvedScenario.revisao),
  })
  const baselineLastDayPayload = await fetchAllApontamentoPages({
    mesAno: resolvedScenario.mesAno,
    dataReferencia: resolvedScenario.lastDataReferencia,
    dreCodigo: resolvedScenario.dreCodigo,
    placa: resolvedScenario.placa,
    tipoPessoa: resolvedScenario.tipoPessoa,
    revisao: String(resolvedScenario.revisao),
  })
  const restoreFirstDayItems = toRestoreItems(baselineFirstDayPayload, resolvedScenario)
  const restoreSecondDayItems = toRestoreItems(baselineSecondDayPayload, resolvedScenario)
  const baselineLastDayRows = getRowsForScenario(baselineLastDayPayload, resolvedScenario)

  assert(restoreFirstDayItems.length === resolvedScenario.rows.length, 'Nao foi possivel capturar todos os tipos de atendimento da base para restauracao do dia 1.')
  assert(restoreSecondDayItems.length === resolvedScenario.rows.length, 'Nao foi possivel capturar todos os tipos de atendimento da base para restauracao do dia 2.')
  assert(baselineLastDayRows.length === resolvedScenario.rows.length, 'Nao foi possivel capturar todos os tipos de atendimento da base para restauracao do dia 30.')

  try {
    console.log('Importando planilha com negativos...')
    const importResult = await requestJson(`${baseUrl}/api/apontamento-servicos/import-excel`, {
      method: 'POST',
      body: JSON.stringify({
        directoryPath: path.dirname(targetWorkbookPath),
        fileName: path.basename(targetWorkbookPath),
      }),
    })

    console.log(`- Importacao concluida: arquivos=${importResult.processedFiles} linhas=${importResult.processedItems}`)

    const firstDayPayload = await fetchAllApontamentoPages({
      mesAno: resolvedScenario.mesAno,
      dataReferencia: resolvedScenario.firstDataReferencia,
      dreCodigo: resolvedScenario.dreCodigo,
      placa: resolvedScenario.placa,
      tipoPessoa: resolvedScenario.tipoPessoa,
      revisao: String(resolvedScenario.revisao),
    })
    const secondDayPayload = await fetchAllApontamentoPages({
      mesAno: resolvedScenario.mesAno,
      dataReferencia: resolvedScenario.secondDataReferencia,
      dreCodigo: resolvedScenario.dreCodigo,
      placa: resolvedScenario.placa,
      tipoPessoa: resolvedScenario.tipoPessoa,
      revisao: String(resolvedScenario.revisao),
    })
    const lastDayPayload = await fetchAllApontamentoPages({
      mesAno: resolvedScenario.mesAno,
      dataReferencia: resolvedScenario.lastDataReferencia,
      dreCodigo: resolvedScenario.dreCodigo,
      placa: resolvedScenario.placa,
      tipoPessoa: resolvedScenario.tipoPessoa,
      revisao: String(resolvedScenario.revisao),
    })

    const firstDayRows = getRowsForScenario(firstDayPayload, resolvedScenario)
    const secondDayRows = getRowsForScenario(secondDayPayload, resolvedScenario)
    const lastDayRows = getRowsForScenario(lastDayPayload, resolvedScenario)
    const returnedSequence = firstDayRows.map((item) => item.tipoEscolaSigla)

    assert(
      JSON.stringify(returnedSequence) === JSON.stringify(expectedTypeSequence),
      `Sequencia de tipos divergente: ${returnedSequence.join(', ') || '-'}.`,
    )

    for (const row of resolvedScenario.rows) {
      const firstDayItem = firstDayRows.find((item) => item.tipoEscolaSigla === row.tipoEscolaSigla)
      const secondDayItem = secondDayRows.find((item) => item.tipoEscolaSigla === row.tipoEscolaSigla)
      const lastDayItem = lastDayRows.find((item) => item.tipoEscolaSigla === row.tipoEscolaSigla)
      const baselineLastDayItem = baselineLastDayRows.find((item) => item.tipoEscolaSigla === row.tipoEscolaSigla)
      const secondDayAccumulatedMetrics = sumMetrics(row.firstDayMetrics, row.secondDayMetrics)

      assert(baselineLastDayItem, `Baseline ${row.tipoEscolaSigla} nao encontrado no dia 30.`)
      assert(firstDayItem, `Item ${row.tipoEscolaSigla} nao encontrado apos importar negativos no dia 1.`)
      assert(secondDayItem, `Item ${row.tipoEscolaSigla} nao encontrado apos importar negativos no dia 2.`)
      assert(lastDayItem, `Item ${row.tipoEscolaSigla} nao encontrado apos importar negativos no dia 30.`)

      assertItemMetrics(firstDayItem, row.firstDayMetrics, `${row.tipoEscolaSigla} dia 1`)
      assertItemAccumulatedMetrics(firstDayItem, row.firstDayMetrics, `${row.tipoEscolaSigla} acumulado dia 1`)
      assertItemMetrics(secondDayItem, row.secondDayMetrics, `${row.tipoEscolaSigla} dia 2`)
      assertItemAccumulatedMetrics(secondDayItem, secondDayAccumulatedMetrics, `${row.tipoEscolaSigla} acumulado dia 2`)
      assertItemMetrics(lastDayItem, {
        naoCadeirantePresencial: 0,
        cadeirante: 0,
        atendimentoComplementarNaoCadeirante: 0,
        atendimentoComplementarCadeirante: 0,
        continuaNaoCadeirante: 0,
        continuaCadeirante: 0,
      }, `${row.tipoEscolaSigla} dia 30`)
      assertItemAccumulatedMetrics(lastDayItem, secondDayAccumulatedMetrics, `${row.tipoEscolaSigla} acumulado dia 30`)
    }

    console.log(`- Sequencia validada: ${expectedTypeSequence.join(', ')}`)
    console.log('- Acumulado validado do dia 1 ao dia 30, somando ou subtraindo conforme o sinal digitado.')
  } finally {
    console.log('Restaurando valores originais...')
    await requestJsonWithRetry(`${baseUrl}/api/apontamento-servicos`, {
      method: 'POST',
      body: JSON.stringify({
        mesAno: resolvedScenario.mesAno,
        dataReferencia: resolvedScenario.firstDataReferencia,
        items: restoreFirstDayItems,
      }),
    })
    await requestJsonWithRetry(`${baseUrl}/api/apontamento-servicos`, {
      method: 'POST',
      body: JSON.stringify({
        mesAno: resolvedScenario.mesAno,
        dataReferencia: resolvedScenario.secondDataReferencia,
        items: restoreSecondDayItems,
      }),
    })
    console.log('- Restauracao concluida.')
  }
}

try {
  await main()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`Falha no teste de importacao negativa: ${message}`)
  process.exit(1)
}