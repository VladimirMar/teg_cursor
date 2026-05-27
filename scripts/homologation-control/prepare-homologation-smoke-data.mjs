import { spawn } from 'node:child_process'
import { access } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const workspaceRoot = path.resolve(scriptDirectory, '..', '..')

const defaults = {
  baseUrl: String(process.env.API_BASE_URL ?? 'http://127.0.0.1:3002').trim() || 'http://127.0.0.1:3002',
  mesAno: String(process.env.HOMOLOG_SMOKE_MES_ANO ?? '04/2026').trim() || '04/2026',
  dreCodigo: String(process.env.HOMOLOG_SMOKE_DRE_CODIGO ?? '11').trim() || '11',
  tipoPessoa: String(process.env.HOMOLOG_SMOKE_TIPO_PESSOA ?? 'PF').trim().toUpperCase() === 'PJ' ? 'PJ' : 'PF',
  situacao: String(process.env.HOMOLOG_SMOKE_SITUACAO ?? 'Em digitacao').trim() || 'Em digitacao',
  apontamentoWorkbookPath: String(process.env.HOMOLOG_SMOKE_APONTAMENTO_FILE ?? path.join(workspaceRoot, 'planilha pgto old', 'old', '04 ATESTE BT PF ABR 26.xlsx')).trim(),
  veiculoXmlFileName: String(process.env.HOMOLOG_SMOKE_VEICULO_XML ?? 'Veiculo.xml').trim() || 'Veiculo.xml',
  restoreVeiculo: String(process.env.HOMOLOG_SMOKE_REIMPORT_VEICULO ?? '').trim().toLowerCase() === 'true',
}

const rawArgs = process.argv.slice(2)
let baseUrl = defaults.baseUrl
let mesAno = defaults.mesAno
let dreCodigo = defaults.dreCodigo
let tipoPessoa = defaults.tipoPessoa
let situacao = defaults.situacao
let apontamentoWorkbookPath = defaults.apontamentoWorkbookPath
let veiculoXmlFileName = defaults.veiculoXmlFileName
let runSmoke = false
let shouldSkipApontamento = false
let shouldSkipVeiculo = !defaults.restoreVeiculo
let shouldPrintHelp = false

for (let index = 0; index < rawArgs.length; index += 1) {
  const currentArg = String(rawArgs[index] ?? '').trim()

  if (!currentArg) {
    continue
  }

  if (currentArg === '--help' || currentArg === '-h') {
    shouldPrintHelp = true
    continue
  }

  if (currentArg === '--base-url') {
    baseUrl = String(rawArgs[index + 1] ?? baseUrl).trim() || baseUrl
    index += 1
    continue
  }

  if (currentArg.startsWith('--base-url=')) {
    baseUrl = currentArg.slice('--base-url='.length).trim() || baseUrl
    continue
  }

  if (currentArg === '--mes-ano') {
    mesAno = String(rawArgs[index + 1] ?? mesAno).trim() || mesAno
    index += 1
    continue
  }

  if (currentArg.startsWith('--mes-ano=')) {
    mesAno = currentArg.slice('--mes-ano='.length).trim() || mesAno
    continue
  }

  if (currentArg === '--dre') {
    dreCodigo = String(rawArgs[index + 1] ?? dreCodigo).trim() || dreCodigo
    index += 1
    continue
  }

  if (currentArg.startsWith('--dre=')) {
    dreCodigo = currentArg.slice('--dre='.length).trim() || dreCodigo
    continue
  }

  if (currentArg === '--tipo-pessoa') {
    const requestedTipoPessoa = String(rawArgs[index + 1] ?? tipoPessoa).trim().toUpperCase()
    tipoPessoa = requestedTipoPessoa === 'PJ' ? 'PJ' : 'PF'
    index += 1
    continue
  }

  if (currentArg.startsWith('--tipo-pessoa=')) {
    const requestedTipoPessoa = currentArg.slice('--tipo-pessoa='.length).trim().toUpperCase()
    tipoPessoa = requestedTipoPessoa === 'PJ' ? 'PJ' : 'PF'
    continue
  }

  if (currentArg === '--situacao') {
    situacao = String(rawArgs[index + 1] ?? situacao).trim() || situacao
    index += 1
    continue
  }

  if (currentArg.startsWith('--situacao=')) {
    situacao = currentArg.slice('--situacao='.length).trim() || situacao
    continue
  }

  if (currentArg === '--apontamento-file') {
    apontamentoWorkbookPath = String(rawArgs[index + 1] ?? apontamentoWorkbookPath).trim() || apontamentoWorkbookPath
    index += 1
    continue
  }

  if (currentArg.startsWith('--apontamento-file=')) {
    apontamentoWorkbookPath = currentArg.slice('--apontamento-file='.length).trim() || apontamentoWorkbookPath
    continue
  }

  if (currentArg === '--veiculo-xml') {
    veiculoXmlFileName = String(rawArgs[index + 1] ?? veiculoXmlFileName).trim() || veiculoXmlFileName
    index += 1
    continue
  }

  if (currentArg.startsWith('--veiculo-xml=')) {
    veiculoXmlFileName = currentArg.slice('--veiculo-xml='.length).trim() || veiculoXmlFileName
    continue
  }

  if (currentArg === '--run-smoke') {
    runSmoke = true
    continue
  }

  if (currentArg === '--skip-apontamento') {
    shouldSkipApontamento = true
    continue
  }

  if (currentArg === '--skip-veiculo') {
    shouldSkipVeiculo = true
    continue
  }

  if (currentArg === '--restore-veiculo') {
    shouldSkipVeiculo = false
  }
}

if (shouldPrintHelp) {
  console.log(`Uso: node scripts/homologation-control/prepare-homologation-smoke-data.mjs [opcoes]

Opcoes:
  --base-url <url>           URL base da API alvo. Padrao: ${defaults.baseUrl}
  --mes-ano <mm/aaaa>        Mes/ano da apuracao operacional. Padrao: ${defaults.mesAno}
  --dre <codigo>             Codigo da DRE da massa de apontamento. Padrao: ${defaults.dreCodigo}
  --tipo-pessoa <PF|PJ>      Tipo pessoa da apuracao. Padrao: ${defaults.tipoPessoa}
  --situacao <texto>         Situacao para liberar digitacao. Padrao: ${defaults.situacao}
  --apontamento-file <path>  Caminho da planilha Excel oficial de apontamento.
  --veiculo-xml <arquivo>    Nome do XML de veiculo a reimportar. Padrao: ${defaults.veiculoXmlFileName}
  --skip-apontamento         Nao reimporta a planilha operacional de apontamento.
  --skip-veiculo             Nao reimporta o XML de veiculo.
  --restore-veiculo          Reimporta o XML de veiculo durante o preparo.
  --run-smoke                Executa o smoke completo apos o preparo.
  --help                     Exibe esta ajuda.

Variaveis de ambiente:
  HOMOLOG_SMOKE_REIMPORT_VEICULO=true  Reimporta veiculo por padrao.`)
  process.exit(0)
}

const requestJson = async (targetPath, options = {}) => {
  const response = await fetch(`${baseUrl}${targetPath}`, {
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
      : `HTTP ${response.status} em ${targetPath}`

    throw new Error(message)
  }

  return payload
}

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}

const resolveApontamentoWorkbookPath = async () => {
  const requestedPath = path.resolve(apontamentoWorkbookPath)
  const fallbackPaths = [
    requestedPath,
    path.join(workspaceRoot, 'planilha pgto old', 'old', path.basename(requestedPath)),
    path.join(workspaceRoot, 'planilha pgto old', path.basename(requestedPath)),
  ]

  for (const candidatePath of fallbackPaths) {
    try {
      await access(candidatePath)
      return candidatePath
    } catch {
      continue
    }
  }

  throw new Error(`Nao foi possivel localizar a planilha informada: ${requestedPath}.`)
}

const listApuracaoFinanceira = async () => {
  const query = new URLSearchParams({
    mesAno,
    dreCodigo,
    tipoPessoa,
    page: '1',
    pageSize: '200',
  })

  return requestJson(`/api/apuracao-financeira?${query.toString()}`)
}

const verifyEditableStatus = async () => {
  const listPayload = await listApuracaoFinanceira()
  const items = Array.isArray(listPayload.items) ? listPayload.items : []
  assert(items.length > 0, `Nenhuma apuracao financeira encontrada para ${mesAno}, DRE ${dreCodigo}, tipo ${tipoPessoa}.`)

  const mismatchedItems = items.filter((item) => String(item.situacao ?? '').trim() !== situacao)
  assert(mismatchedItems.length === 0, `Persistiram ${mismatchedItems.length} registro(s) de apuracao financeira fora da situacao ${situacao}.`)

  return {
    total: items.length,
    revisoes: [...new Set(items.map((item) => String(item.revisao ?? '').trim()).filter(Boolean))],
  }
}

const updateBatchStatus = async () => {
  const summary = await requestJson('/api/apuracao-financeira/alterar-situacao-lote', {
    method: 'POST',
    body: JSON.stringify({
      mesAno,
      dreCodigos: [dreCodigo],
      tipoPessoa,
      situacao,
    }),
  })

  return summary.summary ?? summary
}

const importApontamentoWorkbook = async () => {
  const normalizedWorkbookPath = await resolveApontamentoWorkbookPath()
  const directoryPath = path.dirname(normalizedWorkbookPath)
  const fileName = path.basename(normalizedWorkbookPath)

  const payload = await requestJson('/api/apontamento-servicos/import-excel', {
    method: 'POST',
    body: JSON.stringify({
      directoryPath,
      fileName,
    }),
  })

  assert(Number(payload.processedFiles ?? 0) >= 1, 'Importacao de apontamento nao processou nenhum arquivo.')
  assert(Number(payload.processedItems ?? 0) >= 1, 'Importacao de apontamento nao processou nenhuma linha.')
  return payload
}

const importVeiculoXml = async () => {
  const payload = await requestJson('/api/veiculo/import-xml', {
    method: 'POST',
    body: JSON.stringify({ fileName: veiculoXmlFileName }),
  })

  assert(Number(payload.total ?? 0) >= Number(payload.processed ?? 0), 'Importacao de veiculo retornou total inconsistente.')
  return payload
}

const verifyVeiculoDataset = async () => {
  const payload = await requestJson('/api/veiculo?page=1&pageSize=5&sortBy=placas&sortDirection=asc')
  assert(Array.isArray(payload.items), 'Listagem de veiculo nao retornou items.')
  assert(Number(payload.total ?? 0) > 1, 'A massa de veiculo ainda nao tem registros suficientes para o smoke.')
  return payload
}

const runNpmScript = async (scriptName, failureLabel) => {
  const command = process.platform === 'win32'
    ? (process.env.ComSpec ?? 'cmd.exe')
    : 'npm'
  const commandArgs = process.platform === 'win32'
    ? ['/d', '/s', '/c', `npm run ${scriptName}`]
    : ['run', scriptName]

  await new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: workspaceRoot,
      env: {
        ...process.env,
        API_BASE_URL: baseUrl,
      },
      stdio: 'inherit',
    })

    child.once('error', reject)
    child.once('exit', (exitCode) => {
      if (exitCode === 0) {
        resolve()
        return
      }

      reject(new Error(`${failureLabel} falhou com codigo ${exitCode ?? 1}.`))
    })
  })
}

const runSmokeSuite = async () => {
  await runNpmScript('smoke:api', 'Smoke principal da homologacao')
  await runNpmScript('smoke:api:documental', 'Smoke documental da homologacao')
}

const main = async () => {
  console.log(`Preparando massa operacional de homologacao em ${baseUrl}...`)

  const batchStatusSummary = await updateBatchStatus()
  const apuracaoStatusSummary = await verifyEditableStatus()
  console.log(`- Apuracao financeira liberada para ${situacao}: ${batchStatusSummary.totalUpdated ?? 0} registro(s) atualizados, ${apuracaoStatusSummary.total} validado(s), revisao(oes) ${apuracaoStatusSummary.revisoes.join(', ') || '-'}.`)

  if (!shouldSkipApontamento) {
    const apontamentoSummary = await importApontamentoWorkbook()
    console.log(`- Apontamento Servicos restaurado: arquivos=${apontamentoSummary.processedFiles ?? 0}, linhas=${apontamentoSummary.processedItems ?? 0}, datas=${apontamentoSummary.processedDates ?? 0}.`)
  } else {
    console.log('- Reimportacao de Apontamento Servicos ignorada por opcao.')
  }

  if (!shouldSkipVeiculo) {
    const veiculoSummary = await importVeiculoXml()
    const veiculoList = await verifyVeiculoDataset()
    console.log(`- Veiculo restaurado: processados=${veiculoSummary.processed ?? 0}, incluidos=${veiculoSummary.inserted ?? 0}, alterados=${veiculoSummary.updated ?? 0}, recusados=${veiculoSummary.skipped ?? 0}, total visivel=${veiculoList.total ?? 0}.`)
  } else {
    console.log('- Reimportacao de Veiculo ignorada por opcao.')
  }

  if (runSmoke) {
    console.log('- Executando smoke principal e smoke documental apos o preparo...')
    await runSmokeSuite()
  }

  console.log('Preparo operacional de homologacao concluido com sucesso.')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})