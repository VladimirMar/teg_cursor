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

const buildQueryUrl = (params) => {
  const query = new URLSearchParams(params)
  return `${baseUrl}/api/apontamento-servicos?${query.toString()}`
}

const getRowsForScenario = (payload) => {
  return (payload.items ?? []).filter(
    (item) => String(item.ordemServicoOsConcat ?? '').trim() === scenario.ordemServico,
  )
}

const toRestoreItems = (payload) => {
  const rows = getRowsForScenario(payload)

  return rows
    .filter((item) => scenario.rows.some((row) => row.tipoEscolaSigla === item.tipoEscolaSigla))
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

const sumMetrics = (left, right) => ({
  naoCadeirantePresencial: left.naoCadeirantePresencial + right.naoCadeirantePresencial,
  cadeirante: left.cadeirante + right.cadeirante,
  atendimentoComplementarNaoCadeirante: left.atendimentoComplementarNaoCadeirante + right.atendimentoComplementarNaoCadeirante,
  atendimentoComplementarCadeirante: left.atendimentoComplementarCadeirante + right.atendimentoComplementarCadeirante,
  continuaNaoCadeirante: left.continuaNaoCadeirante + right.continuaNaoCadeirante,
  continuaCadeirante: left.continuaCadeirante + right.continuaCadeirante,
})

const assertItemMetrics = (item, metrics, label) => {
  assert(item.naoCadeirantePresencial === metrics.naoCadeirantePresencial, `${label}: Nao cadeirante presencial divergente: ${item.naoCadeirantePresencial}`)
  assert(item.cadeirante === metrics.cadeirante, `${label}: Cadeirante divergente: ${item.cadeirante}`)
  assert(item.atendimentoComplementarNaoCadeirante === metrics.atendimentoComplementarNaoCadeirante, `${label}: Atendimento complementar N CAD divergente: ${item.atendimentoComplementarNaoCadeirante}`)
  assert(item.atendimentoComplementarCadeirante === metrics.atendimentoComplementarCadeirante, `${label}: Atendimento complementar CAD divergente: ${item.atendimentoComplementarCadeirante}`)
  assert(item.continuaNaoCadeirante === metrics.continuaNaoCadeirante, `${label}: Continua N CAD divergente: ${item.continuaNaoCadeirante}`)
  assert(item.continuaCadeirante === metrics.continuaCadeirante, `${label}: Continua CAD divergente: ${item.continuaCadeirante}`)
}

const assertItemAccumulatedMetrics = (item, metrics, label) => {
  assert(item.naoCadeirantePresencialAcm === metrics.naoCadeirantePresencial, `${label}: Acumulado Nao cadeirante presencial divergente: ${item.naoCadeirantePresencialAcm}`)
  assert(item.cadeiranteAcm === metrics.cadeirante, `${label}: Acumulado Cadeirante divergente: ${item.cadeiranteAcm}`)
  assert(item.atendimentoComplementarNaoCadeiranteAcm === metrics.atendimentoComplementarNaoCadeirante, `${label}: Acumulado Atendimento complementar N CAD divergente: ${item.atendimentoComplementarNaoCadeiranteAcm}`)
  assert(item.atendimentoComplementarCadeiranteAcm === metrics.atendimentoComplementarCadeirante, `${label}: Acumulado Atendimento complementar CAD divergente: ${item.atendimentoComplementarCadeiranteAcm}`)
  assert(item.continuaNaoCadeiranteAcm === metrics.continuaNaoCadeirante, `${label}: Acumulado Continua N CAD divergente: ${item.continuaNaoCadeiranteAcm}`)
  assert(item.continuaCadeiranteAcm === metrics.continuaCadeirante, `${label}: Acumulado Continua CAD divergente: ${item.continuaCadeiranteAcm}`)
}

const buildImportWorkbook = async () => {
  await mkdir(outputDirectory, { recursive: true })

  const workbook = XLSX.utils.book_new()
  const mainSheet = {}
  const continuaSheet = {}

  mainSheet.A1 = { t: 's', v: 'BUTANTA' }
  mainSheet.F5 = { t: 's', v: '01/04/2026' }

  scenario.rows.forEach((row, index) => {
    const rowNumber = index + 6
    mainSheet[`B${rowNumber}`] = { t: 's', v: scenario.ordemServico }
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

    continuaSheet[`B${rowNumber}`] = { t: 's', v: scenario.ordemServico }
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
  const targetWorkbookPath = await buildImportWorkbook()

  const baselineFirstDayPayload = await requestJson(buildQueryUrl({
    mesAno: scenario.mesAno,
    dataReferencia: scenario.firstDataReferencia,
    dreCodigo: scenario.dreCodigo,
    placa: scenario.placa,
  }))
  const baselineSecondDayPayload = await requestJson(buildQueryUrl({
    mesAno: scenario.mesAno,
    dataReferencia: scenario.secondDataReferencia,
    dreCodigo: scenario.dreCodigo,
    placa: scenario.placa,
  }))
  const restoreFirstDayItems = toRestoreItems(baselineFirstDayPayload)
  const restoreSecondDayItems = toRestoreItems(baselineSecondDayPayload)

  assert(restoreFirstDayItems.length === scenario.rows.length, 'Nao foi possivel capturar todos os tipos de atendimento da base para restauracao do dia 1.')
  assert(restoreSecondDayItems.length === scenario.rows.length, 'Nao foi possivel capturar todos os tipos de atendimento da base para restauracao do dia 2.')

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

    const firstDayPayload = await requestJson(buildQueryUrl({
      mesAno: scenario.mesAno,
      dataReferencia: scenario.firstDataReferencia,
      dreCodigo: scenario.dreCodigo,
      placa: scenario.placa,
    }))
    const secondDayPayload = await requestJson(buildQueryUrl({
      mesAno: scenario.mesAno,
      dataReferencia: scenario.secondDataReferencia,
      dreCodigo: scenario.dreCodigo,
      placa: scenario.placa,
    }))
    const lastDayPayload = await requestJson(buildQueryUrl({
      mesAno: scenario.mesAno,
      dataReferencia: scenario.lastDataReferencia,
      dreCodigo: scenario.dreCodigo,
      placa: scenario.placa,
    }))

    const firstDayRows = getRowsForScenario(firstDayPayload)
    const secondDayRows = getRowsForScenario(secondDayPayload)
    const lastDayRows = getRowsForScenario(lastDayPayload)
    const returnedSequence = firstDayRows.map((item) => item.tipoEscolaSigla)

    assert(
      JSON.stringify(returnedSequence) === JSON.stringify(expectedTypeSequence),
      `Sequencia de tipos divergente: ${returnedSequence.join(', ') || '-'}.`,
    )

    for (const row of scenario.rows) {
      const firstDayItem = firstDayRows.find((item) => item.tipoEscolaSigla === row.tipoEscolaSigla)
      const secondDayItem = secondDayRows.find((item) => item.tipoEscolaSigla === row.tipoEscolaSigla)
      const lastDayItem = lastDayRows.find((item) => item.tipoEscolaSigla === row.tipoEscolaSigla)
      const secondDayAccumulatedMetrics = sumMetrics(row.firstDayMetrics, row.secondDayMetrics)

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
    await requestJson(`${baseUrl}/api/apontamento-servicos`, {
      method: 'POST',
      body: JSON.stringify({
        mesAno: scenario.mesAno,
        dataReferencia: scenario.firstDataReferencia,
        items: restoreFirstDayItems,
      }),
    })
    await requestJson(`${baseUrl}/api/apontamento-servicos`, {
      method: 'POST',
      body: JSON.stringify({
        mesAno: scenario.mesAno,
        dataReferencia: scenario.secondDataReferencia,
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