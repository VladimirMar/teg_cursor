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
  dataReferencia: '2026-04-01',
  dreCodigo: '11',
  placa: 'STF3C60',
  tipoPessoa: 'PF',
  ordemServico: '2023/0012621-001A',
  revisao: 0,
  rows: [
    {
      tipoEscolaSigla: 'EMEI',
      metrics: {
        naoCadeirantePresencial: -11,
        cadeirante: -12,
        atendimentoComplementarNaoCadeirante: -13,
        atendimentoComplementarCadeirante: -14,
        continuaNaoCadeirante: -15,
        continuaCadeirante: -16,
      },
    },
    {
      tipoEscolaSigla: 'EMEF',
      metrics: {
        naoCadeirantePresencial: -21,
        cadeirante: -22,
        atendimentoComplementarNaoCadeirante: -23,
        atendimentoComplementarCadeirante: -24,
        continuaNaoCadeirante: -25,
        continuaCadeirante: -26,
      },
    },
    {
      tipoEscolaSigla: 'EMEE',
      metrics: {
        naoCadeirantePresencial: -31,
        cadeirante: -32,
        atendimentoComplementarNaoCadeirante: -33,
        atendimentoComplementarCadeirante: -34,
        continuaNaoCadeirante: -35,
        continuaCadeirante: -36,
      },
    },
    {
      tipoEscolaSigla: 'CEI',
      metrics: {
        naoCadeirantePresencial: -41,
        cadeirante: -42,
        atendimentoComplementarNaoCadeirante: -43,
        atendimentoComplementarCadeirante: -44,
        continuaNaoCadeirante: -45,
        continuaCadeirante: -46,
      },
    },
    {
      tipoEscolaSigla: 'CCA',
      metrics: {
        naoCadeirantePresencial: -51,
        cadeirante: -52,
        atendimentoComplementarNaoCadeirante: -53,
        atendimentoComplementarCadeirante: -54,
        continuaNaoCadeirante: -55,
        continuaCadeirante: -56,
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
    mainSheet[`Q${rowNumber}`] = { t: 'n', v: row.metrics.naoCadeirantePresencial }
    mainSheet[`R${rowNumber}`] = { t: 'n', v: row.metrics.cadeirante }
    mainSheet[`S${rowNumber}`] = { t: 'n', v: row.metrics.atendimentoComplementarNaoCadeirante }
    mainSheet[`T${rowNumber}`] = { t: 'n', v: row.metrics.atendimentoComplementarCadeirante }

    continuaSheet[`B${rowNumber}`] = { t: 's', v: scenario.ordemServico }
    continuaSheet[`L${rowNumber}`] = { t: 'n', v: row.metrics.continuaNaoCadeirante }
    continuaSheet[`M${rowNumber}`] = { t: 'n', v: row.metrics.continuaCadeirante }
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

  const baselinePayload = await requestJson(buildQueryUrl({
    mesAno: scenario.mesAno,
    dataReferencia: scenario.dataReferencia,
    dreCodigo: scenario.dreCodigo,
    placa: scenario.placa,
  }))
  const baselineItems = Array.isArray(baselinePayload.items) ? baselinePayload.items : []
  const restoreItems = baselineItems
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

  assert(restoreItems.length === scenario.rows.length, 'Nao foi possivel capturar todos os tipos de atendimento da base para restauracao.')

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

    const afterImportPayload = await requestJson(buildQueryUrl({
      mesAno: scenario.mesAno,
      dataReferencia: scenario.dataReferencia,
      dreCodigo: scenario.dreCodigo,
      placa: scenario.placa,
    }))

    const orderedRows = (afterImportPayload.items ?? []).filter((item) => String(item.ordemServicoCodigo ?? '') === '3348')
    const returnedSequence = orderedRows.map((item) => item.tipoEscolaSigla)

    assert(
      JSON.stringify(returnedSequence) === JSON.stringify(expectedTypeSequence),
      `Sequencia de tipos divergente: ${returnedSequence.join(', ') || '-'}.`,
    )

    for (const row of scenario.rows) {
      const importedItem = orderedRows.find((item) => item.tipoEscolaSigla === row.tipoEscolaSigla)
      assert(importedItem, `Item ${row.tipoEscolaSigla} nao encontrado apos importar negativos.`)
      assert(importedItem.naoCadeirantePresencial === row.metrics.naoCadeirantePresencial, `${row.tipoEscolaSigla}: Nao cadeirante presencial divergente: ${importedItem.naoCadeirantePresencial}`)
      assert(importedItem.cadeirante === row.metrics.cadeirante, `${row.tipoEscolaSigla}: Cadeirante divergente: ${importedItem.cadeirante}`)
      assert(importedItem.atendimentoComplementarNaoCadeirante === row.metrics.atendimentoComplementarNaoCadeirante, `${row.tipoEscolaSigla}: Atendimento complementar N CAD divergente: ${importedItem.atendimentoComplementarNaoCadeirante}`)
      assert(importedItem.atendimentoComplementarCadeirante === row.metrics.atendimentoComplementarCadeirante, `${row.tipoEscolaSigla}: Atendimento complementar CAD divergente: ${importedItem.atendimentoComplementarCadeirante}`)
      assert(importedItem.continuaNaoCadeirante === row.metrics.continuaNaoCadeirante, `${row.tipoEscolaSigla}: Continua N CAD divergente: ${importedItem.continuaNaoCadeirante}`)
      assert(importedItem.continuaCadeirante === row.metrics.continuaCadeirante, `${row.tipoEscolaSigla}: Continua CAD divergente: ${importedItem.continuaCadeirante}`)
    }

    console.log(`- Sequencia validada: ${expectedTypeSequence.join(', ')}`)
    console.log('- Valores negativos importados corretamente para todos os tipos de atendimento.')
  } finally {
    console.log('Restaurando valores originais...')
    await requestJson(`${baseUrl}/api/apontamento-servicos`, {
      method: 'POST',
      body: JSON.stringify({
        mesAno: scenario.mesAno,
        dataReferencia: scenario.dataReferencia,
        items: restoreItems,
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