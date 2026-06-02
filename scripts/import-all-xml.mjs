import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { access, appendFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const importXmlDirectory = path.join(workspaceRoot, 'importXML')
const defaultBaseUrl = process.env.API_BASE_URL?.trim() || 'http://localhost:3001'
const defaultReportPath = process.env.XML_IMPORT_ALL_REPORT_PATH?.trim()
  || path.join(importXmlDirectory, 'xml_import_all_summary.json')
const defaultLogPath = process.env.XML_IMPORT_ALL_LOG_PATH?.trim()
  || path.join(importXmlDirectory, 'xml_import_all.log')
const requestTimeoutMs = Math.max(Number(process.env.XML_IMPORT_ALL_REQUEST_TIMEOUT_MS ?? 0) || 0, 0)
const defaultGenerateFromAccess = !/^(0|false|no)$/i.test(process.env.XML_IMPORT_ALL_GENERATE_FROM_ACCESS ?? 'true')
const defaultAccessDbPath = process.env.XML_IMPORT_ALL_ACCESS_DB_PATH?.trim()
  || path.join(importXmlDirectory, 'Credenciamento 2022.accdb')
const defaultAccessExporterScriptPath = process.env.XML_IMPORT_ALL_ACCESS_EXPORTER_SCRIPT_PATH?.trim()
  || path.join(workspaceRoot, 'scripts', 'export-access-xmls.ps1')
const defaultSource = /^(access)$/i.test(process.env.XML_IMPORT_ALL_SOURCE ?? '') ? 'access' : 'xml'

const importSteps = [
  {
    key: 'marca-modelo',
    label: 'Marca/Modelo',
    xmlEndpoint: '/api/marca-modelo/import-xml',
    accessEndpoint: '/api/marca-modelo/import-access',
    fileName: 'marca-modelo.xml',
  },
  {
    key: 'seguradora',
    label: 'Seguradora',
    xmlEndpoint: '/api/seguradora/import-xml',
    accessEndpoint: '/api/seguradora/import-access',
    fileName: 'Seguradoras.xml',
  },
  {
    key: 'credenciada',
    label: 'Credenciada',
    xmlEndpoint: '/api/credenciada/import-xml',
    accessEndpoint: '/api/credenciada/import-access',
    fileName: 'Credenciados.xml',
  },
  {
    key: 'termo',
    label: 'Credenciamento Termo',
    xmlEndpoint: '/api/termo/import-xml',
    accessEndpoint: '/api/termo/import-access',
    fileName: 'Credenciamento_Termo.xml',
  },
  {
    key: 'condutor',
    label: 'Condutor',
    xmlEndpoint: '/api/condutor/import-xml',
    accessEndpoint: '/api/condutor/import-access',
    fileName: 'Condutor.xml',
  },
  {
    key: 'monitor',
    label: 'Monitor',
    xmlEndpoint: '/api/monitor/import-xml',
    accessEndpoint: '/api/monitor/import-access',
    fileName: 'Monitor.xml',
  },
  {
    key: 'veiculo',
    label: 'Veiculo',
    xmlEndpoint: '/api/veiculo/import-xml',
    accessEndpoint: '/api/veiculo/import-access',
    fileName: 'Veiculo.xml',
  },
  {
    key: 'ordem-servico',
    label: 'OrdemServico',
    xmlEndpoint: '/api/ordem-servico/import-xml',
    accessEndpoint: '/api/ordem-servico/import-access',
    fileName: 'OrdemServico.xml',
  },
  {
    key: 'vinculo-condutor',
    label: 'Vinculo Condutor',
    xmlEndpoint: '/api/vinculo-condutor/import-xml',
    accessEndpoint: '/api/vinculo-condutor/import-access',
    fileName: 'Vinculos_condutor.xml',
  },
  {
    key: 'vinculo-monitor',
    label: 'Vinculo Monitor',
    xmlEndpoint: '/api/vinculo-monitor/import-xml',
    accessEndpoint: '/api/vinculo-monitor/import-access',
    fileName: 'Vinculos_monitor.xml',
  },
  {
    key: 'cep',
    label: 'CEP',
    xmlEndpoint: '/api/cep/import-xml',
    fileName: 'Ceps.xml',
    optional: true,
  },
]

const rawArgs = process.argv.slice(2)
let requestedBaseUrl = defaultBaseUrl
let requestedReportPath = defaultReportPath
let requestedLogPath = defaultLogPath
let requestedStepKeys = []
let continueOnError = /^(1|true|yes)$/i.test(process.env.XML_IMPORT_ALL_CONTINUE_ON_ERROR ?? '')
let deleteMissing = /^(1|true|yes)$/i.test(process.env.XML_IMPORT_ALL_DELETE_MISSING ?? 'false')
let generateFromAccess = defaultGenerateFromAccess
let requestedAccessDbPath = defaultAccessDbPath
let requestedAccessExporterScriptPath = defaultAccessExporterScriptPath
let requestedSource = defaultSource
let generateFromAccessOverridden = false
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
    requestedBaseUrl = String(rawArgs[index + 1] ?? defaultBaseUrl).trim() || defaultBaseUrl
    index += 1
    continue
  }

  if (currentArg.startsWith('--base-url=')) {
    requestedBaseUrl = currentArg.slice('--base-url='.length).trim() || defaultBaseUrl
    continue
  }

  if (currentArg === '--report') {
    requestedReportPath = String(rawArgs[index + 1] ?? defaultReportPath).trim() || defaultReportPath
    index += 1
    continue
  }

  if (currentArg.startsWith('--report=')) {
    requestedReportPath = currentArg.slice('--report='.length).trim() || defaultReportPath
    continue
  }

  if (currentArg === '--log') {
    requestedLogPath = String(rawArgs[index + 1] ?? defaultLogPath).trim() || defaultLogPath
    index += 1
    continue
  }

  if (currentArg.startsWith('--log=')) {
    requestedLogPath = currentArg.slice('--log='.length).trim() || defaultLogPath
    continue
  }

  if (currentArg === '--only' || currentArg === '--step') {
    requestedStepKeys.push(String(rawArgs[index + 1] ?? '').trim())
    index += 1
    continue
  }

  if (currentArg.startsWith('--only=')) {
    requestedStepKeys.push(currentArg.slice('--only='.length).trim())
    continue
  }

  if (currentArg.startsWith('--step=')) {
    requestedStepKeys.push(currentArg.slice('--step='.length).trim())
    continue
  }

  if (currentArg === '--continue-on-error') {
    continueOnError = true
    continue
  }

  if (currentArg === '--source') {
    requestedSource = String(rawArgs[index + 1] ?? defaultSource).trim().toLowerCase() || defaultSource
    index += 1
    continue
  }

  if (currentArg.startsWith('--source=')) {
    requestedSource = currentArg.slice('--source='.length).trim().toLowerCase() || defaultSource
    continue
  }

  if (currentArg === '--generate-from-access') {
    generateFromAccess = true
    generateFromAccessOverridden = true
    continue
  }

  if (currentArg === '--no-generate-from-access') {
    generateFromAccess = false
    generateFromAccessOverridden = true
    continue
  }

  if (currentArg === '--access-db') {
    requestedAccessDbPath = String(rawArgs[index + 1] ?? defaultAccessDbPath).trim() || defaultAccessDbPath
    index += 1
    continue
  }

  if (currentArg.startsWith('--access-db=')) {
    requestedAccessDbPath = currentArg.slice('--access-db='.length).trim() || defaultAccessDbPath
    continue
  }

  if (currentArg === '--access-exporter-script') {
    requestedAccessExporterScriptPath = String(rawArgs[index + 1] ?? defaultAccessExporterScriptPath).trim() || defaultAccessExporterScriptPath
    index += 1
    continue
  }

  if (currentArg.startsWith('--access-exporter-script=')) {
    requestedAccessExporterScriptPath = currentArg.slice('--access-exporter-script='.length).trim() || defaultAccessExporterScriptPath
    continue
  }

  if (currentArg === '--delete-missing') {
    deleteMissing = true
    continue
  }

  if (currentArg === '--no-delete-missing') {
    deleteMissing = false
  }
}

if (shouldPrintHelp) {
  console.log(`Uso: node scripts/import-all-xml.mjs [opcoes]

Opcoes:
  --base-url <url>         URL base da API. Padrao: ${defaultBaseUrl}
  --report <arquivo>       Caminho do relatorio consolidado JSON.
  --log <arquivo>          Caminho do log detalhado da execucao.
  --only <etapa>           Executa apenas a etapa informada. Pode repetir.
  --step <etapa>           Alias de --only.
  --continue-on-error      Continua nas etapas seguintes quando uma falhar.
  --source <xml|access>    Define a fonte preferencial do lote. Padrao: ${defaultSource}
  --generate-from-access   Gera/atualiza os XMLs a partir do Access antes do lote.
  --no-generate-from-access
                           Nao gera XMLs do Access antes do lote.
  --access-db <arquivo>    Caminho do arquivo Access (.accdb) usado na geracao.
  --access-exporter-script <arquivo>
                           Caminho do script PowerShell de geracao dos XMLs.
  --delete-missing         Exclui registros importados ausentes do XML onde suportado.
  --no-delete-missing      Desabilita a exclusao de ausentes do XML.
  --help                   Exibe esta ajuda.

Etapas disponiveis:
  ${importSteps.map((step) => `${step.key} (${step.fileName})`).join('\n  ')}`)
  process.exit(0)
}

if (!['xml', 'access'].includes(requestedSource)) {
  console.error(`Fonte desconhecida: ${requestedSource}`)
  process.exit(1)
}

if (!generateFromAccessOverridden && requestedSource === 'access') {
  generateFromAccess = false
}

const normalizedRequestedKeys = requestedStepKeys
  .flatMap((value) => value.split(','))
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean)

const unknownStepKeys = normalizedRequestedKeys.filter((key) => !importSteps.some((step) => step.key === key))

if (unknownStepKeys.length) {
  console.error(`Etapa(s) desconhecida(s): ${unknownStepKeys.join(', ')}`)
  process.exit(1)
}

const selectedSteps = normalizedRequestedKeys.length
  ? importSteps.filter((step) => normalizedRequestedKeys.includes(step.key))
  : importSteps
const shouldTruncateBeforeImport = selectedSteps.length === importSteps.length

const selectedStepKeySet = new Set(selectedSteps.map((step) => step.key))
const shouldDeferCredenciadaDeleteMissing = deleteMissing
  && selectedStepKeySet.has('credenciada')
  && selectedStepKeySet.has('termo')

const serializeError = (error) => {
  if (!(error instanceof Error)) {
    return {
      message: String(error ?? 'Falha desconhecida.'),
    }
  }

  const serialized = {
    name: error.name,
    message: error.message,
    stack: error.stack ?? '',
  }

  if (error.cause instanceof Error) {
    serialized.cause = {
      name: error.cause.name,
      message: error.cause.message,
      stack: error.cause.stack ?? '',
    }
  } else if (error.cause != null) {
    serialized.cause = {
      message: String(error.cause),
    }
  }

  return serialized
}

const readJsonResponse = async (response) => {
  const text = await response.text()

  if (!text) {
    return {}
  }

  try {
    return JSON.parse(text)
  } catch {
    return { rawBody: text }
  }
}

const postJson = (targetUrl, payload) => new Promise((resolve, reject) => {
  const url = new URL(targetUrl)
  const requestBody = JSON.stringify(payload)
  const requestImpl = url.protocol === 'https:' ? httpsRequest : httpRequest
  const request = requestImpl(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(requestBody),
    },
  }, (response) => {
    let responseText = ''

    response.setEncoding('utf8')
    response.on('data', (chunk) => {
      responseText += chunk
    })
    response.on('end', () => {
      resolve({
        ok: Number(response.statusCode ?? 500) >= 200 && Number(response.statusCode ?? 500) < 300,
        status: Number(response.statusCode ?? 500),
        statusText: String(response.statusMessage ?? ''),
        bodyText: responseText,
      })
    })
  })

  request.on('error', reject)

  if (requestTimeoutMs > 0) {
    request.setTimeout(requestTimeoutMs, () => {
      request.destroy(new Error(`Request timeout after ${requestTimeoutMs}ms`))
    })
  }

  request.write(requestBody)
  request.end()
})

const fileExists = async (filePath) => {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

const appendExecutionLog = async (message) => {
  const line = `[${new Date().toISOString()}] ${message}`
  console.log(line)
  await appendFile(requestedLogPath, `${line}\n`, 'utf8')
}

const resolveStepExecutionMode = (step) => {
  if (requestedSource === 'access' && step.accessEndpoint) {
    return {
      source: 'access',
      endpoint: step.accessEndpoint,
      requiresXmlFile: false,
    }
  }

  return {
    source: 'xml',
    endpoint: step.xmlEndpoint,
    requiresXmlFile: true,
  }
}

const runAccessXmlGeneration = async () => {
  const windir = process.env.WINDIR?.trim() || 'C:\\Windows'
  const powershell32Path = path.join(windir, 'SysWOW64', 'WindowsPowerShell', 'v1.0', 'powershell.exe')

  const exporterScriptExists = await fileExists(requestedAccessExporterScriptPath)
  if (!exporterScriptExists) {
    throw new Error(`Script de geracao nao encontrado: ${requestedAccessExporterScriptPath}`)
  }

  const accessDbExists = await fileExists(requestedAccessDbPath)
  if (!accessDbExists) {
    throw new Error(`Arquivo Access nao encontrado: ${requestedAccessDbPath}`)
  }

  await appendExecutionLog(`[xml-import-all] Preparacao: gerando XMLs a partir do Access (${requestedAccessDbPath})`)

  await new Promise((resolve, reject) => {
    const child = spawn(
      powershell32Path,
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        requestedAccessExporterScriptPath,
        '-DbPath',
        requestedAccessDbPath,
        '-OutputDir',
        importXmlDirectory,
      ],
      {
        cwd: workspaceRoot,
        windowsHide: true,
      },
    )

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk)
    })

    child.stderr.on('data', (chunk) => {
      stderr += String(chunk)
    })

    child.on('error', reject)

    child.on('close', (exitCode) => {
      if (exitCode === 0) {
        resolve({ stdout, stderr })
        return
      }

      reject(new Error(`Falha ao gerar XMLs via Access (exitCode=${exitCode}). ${stderr || stdout || ''}`.trim()))
    })
  })

  await appendExecutionLog('[xml-import-all] Preparacao: geracao de XMLs via Access concluida')
}

let consumedProgressLogLength = 0

let deferredCredenciadaCleanupResultIndex = -1

const flushProgressLog = async () => {
  try {
    const logContent = await readFile(requestedLogPath, 'utf8')
    const nextChunk = logContent.slice(consumedProgressLogLength)
    consumedProgressLogLength = logContent.length

    if (!nextChunk.trim()) {
      return
    }

    for (const line of nextChunk.split(/\r?\n/).filter(Boolean)) {
      console.log(line)
    }
  } catch {
    // Ignore log flush errors to avoid interrupting the batch import.
  }
}

await mkdir(path.dirname(requestedLogPath), { recursive: true })
await writeFile(requestedLogPath, '', 'utf8')

const results = []
const startedAt = new Date().toISOString()
let shouldAbort = false

if (generateFromAccess) {
  const generationStartedAt = new Date().toISOString()

  try {
    await runAccessXmlGeneration()
    results.push({
      key: 'generate-xml-from-access',
      label: 'Geracao XML Access',
      startedAt: generationStartedAt,
      finishedAt: new Date().toISOString(),
      ok: true,
      accessDbPath: requestedAccessDbPath,
      exporterScriptPath: requestedAccessExporterScriptPath,
      outputDir: importXmlDirectory,
    })
  } catch (error) {
    const errorDetails = serializeError(error)
    results.push({
      key: 'generate-xml-from-access',
      label: 'Geracao XML Access',
      startedAt: generationStartedAt,
      finishedAt: new Date().toISOString(),
      ok: false,
      accessDbPath: requestedAccessDbPath,
      exporterScriptPath: requestedAccessExporterScriptPath,
      outputDir: importXmlDirectory,
      message: errorDetails.message,
      error: errorDetails,
    })
    await appendExecutionLog(`[xml-import-all] Preparacao: falha na geracao de XMLs via Access - ${errorDetails.message}`)
    shouldAbort = true
  }
} else {
  await appendExecutionLog('[xml-import-all] Preparacao: geracao via Access desabilitada para esta execucao')
}

if (shouldTruncateBeforeImport) {
  const resetStartedAt = new Date().toISOString()
  await appendExecutionLog('[xml-import-all] Preparacao: truncando tabelas da importacao XML antes do lote completo')

  try {
    const response = await postJson(`${requestedBaseUrl}/api/xml-import-all/reset`, {})
    const payload = await readJsonResponse({ text: async () => response.bodyText })
    const resetResult = {
      key: 'reset',
      label: 'Preparacao',
      endpoint: `${requestedBaseUrl}/api/xml-import-all/reset`,
      startedAt: resetStartedAt,
      finishedAt: new Date().toISOString(),
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      response: payload,
    }

    results.push(resetResult)

    if (!response.ok) {
      const responseMessage = typeof payload?.message === 'string' ? payload.message : ''
      await appendExecutionLog(`[xml-import-all] Preparacao: falhou com HTTP ${response.status}${responseMessage ? ` - ${responseMessage}` : ''}`)
      shouldAbort = true
    } else {
      await appendExecutionLog(`[xml-import-all] Preparacao: tabelas truncadas (${payload?.tableCount ?? 0} tabela(s))`)
    }
  } catch (error) {
    const errorDetails = serializeError(error)
    results.push({
      key: 'reset',
      label: 'Preparacao',
      endpoint: `${requestedBaseUrl}/api/xml-import-all/reset`,
      startedAt: resetStartedAt,
      finishedAt: new Date().toISOString(),
      ok: false,
      message: errorDetails.message,
      error: errorDetails,
    })
    await appendExecutionLog(`[xml-import-all] Preparacao: falhou - ${errorDetails.message}`)
    shouldAbort = true
  }
} else {
  await appendExecutionLog('[xml-import-all] Preparacao: truncamento completo ignorado porque o lote foi filtrado por etapa')
}

for (const step of selectedSteps) {
  if (shouldAbort) {
    break
  }

  const stepStartedAt = new Date().toISOString()
  const stepExecutionMode = resolveStepExecutionMode(step)
  const xmlPath = path.join(importXmlDirectory, step.fileName)
  const xmlExists = stepExecutionMode.requiresXmlFile ? await fileExists(xmlPath) : true

  if (!xmlExists) {
    const missingMessage = `Arquivo XML nao encontrado em ${xmlPath}.`
    const skippedResult = {
      key: step.key,
      label: step.label,
      fileName: step.fileName,
      endpoint: `${requestedBaseUrl}${stepExecutionMode.endpoint}`,
      source: stepExecutionMode.source,
      startedAt: stepStartedAt,
      finishedAt: new Date().toISOString(),
      ok: false,
      skipped: true,
      optional: Boolean(step.optional),
      message: missingMessage,
    }

    results.push(skippedResult)
    await appendExecutionLog(`[xml-import-all] ${step.label}: ${step.optional ? 'ignorado' : 'falhou'} - ${missingMessage}`)

    if (!step.optional) {
      shouldAbort = !continueOnError
    }

    if (shouldAbort) {
      break
    }

    continue
  }

  await appendExecutionLog(`[xml-import-all] ${step.label}: iniciando importacao via ${stepExecutionMode.source}${stepExecutionMode.requiresXmlFile ? ` de ${step.fileName}` : ` de ${requestedAccessDbPath}`}`)

  const shouldDisableDeleteMissingForCurrentStep = shouldDeferCredenciadaDeleteMissing && step.key === 'credenciada'
  const requestDeleteMissing = shouldDisableDeleteMissingForCurrentStep ? false : deleteMissing
  const requestPayload = stepExecutionMode.source === 'access'
    ? {
      databasePath: requestedAccessDbPath,
      deleteMissing: requestDeleteMissing,
      progressFilePath: requestedLogPath,
    }
    : {
      fileName: step.fileName,
      deleteMissing: requestDeleteMissing,
      progressFilePath: requestedLogPath,
    }

  try {
    const response = await postJson(`${requestedBaseUrl}${stepExecutionMode.endpoint}`, requestPayload)
    const payload = await readJsonResponse({ text: async () => response.bodyText })
    await flushProgressLog()
    const stepResult = {
      key: step.key,
      label: step.label,
      fileName: step.fileName,
      endpoint: `${requestedBaseUrl}${stepExecutionMode.endpoint}`,
      source: stepExecutionMode.source,
      startedAt: stepStartedAt,
      finishedAt: new Date().toISOString(),
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      summary: {
        total: payload?.total ?? null,
        processed: payload?.processed ?? null,
        inserted: payload?.inserted ?? null,
        updated: payload?.updated ?? null,
        deleted: payload?.deleted ?? null,
        skipped: payload?.skipped ?? null,
      },
      logPath: requestedLogPath,
      response: payload,
    }

    results.push(stepResult)

    if (shouldDisableDeleteMissingForCurrentStep && response.ok) {
      deferredCredenciadaCleanupResultIndex = results.length - 1
      await appendExecutionLog('[xml-import-all] Credenciada: exclusao de ausentes adiada ate apos Credenciamento Termo para evitar conflito de chave estrangeira.')
    }

    if (!response.ok) {
      const responseMessage = typeof payload?.message === 'string' ? payload.message : ''
      await appendExecutionLog(`[xml-import-all] ${step.label}: falhou com HTTP ${response.status}${responseMessage ? ` - ${responseMessage}` : ''}`)
      if (!continueOnError) {
        shouldAbort = true
        break
      }
      continue
    }

    await appendExecutionLog(
      `[xml-import-all] ${step.label}: ok - processados=${stepResult.summary.processed ?? 0}, inseridos=${stepResult.summary.inserted ?? 0}, atualizados=${stepResult.summary.updated ?? 0}, excluidos=${stepResult.summary.deleted ?? 0}, recusados=${stepResult.summary.skipped ?? 0}`,
    )

    if (step.key === 'termo' && deferredCredenciadaCleanupResultIndex >= 0) {
      await appendExecutionLog('[xml-import-all] Credenciada: iniciando exclusao final de ausentes apos Credenciamento Termo')

      const credenciadaExecutionMode = resolveStepExecutionMode(importSteps.find((candidate) => candidate.key === 'credenciada'))

      const cleanupResponse = await postJson(`${requestedBaseUrl}${credenciadaExecutionMode.endpoint}`, {
        ...(credenciadaExecutionMode.source === 'access'
          ? { databasePath: requestedAccessDbPath }
          : { fileName: 'Credenciados.xml' }),
        deleteMissing: true,
        progressFilePath: requestedLogPath,
      })
      const cleanupPayload = await readJsonResponse({ text: async () => cleanupResponse.bodyText })
      await flushProgressLog()

      if (!cleanupResponse.ok) {
        const responseMessage = typeof cleanupPayload?.message === 'string' ? cleanupPayload.message : ''
        results[deferredCredenciadaCleanupResultIndex] = {
          ...results[deferredCredenciadaCleanupResultIndex],
          ok: false,
          status: cleanupResponse.status,
          statusText: cleanupResponse.statusText,
          response: cleanupPayload,
          summary: {
            total: cleanupPayload?.total ?? null,
            processed: cleanupPayload?.processed ?? null,
            inserted: cleanupPayload?.inserted ?? null,
            updated: cleanupPayload?.updated ?? null,
            deleted: cleanupPayload?.deleted ?? null,
            skipped: cleanupPayload?.skipped ?? null,
          },
          finishedAt: new Date().toISOString(),
        }
        await appendExecutionLog(`[xml-import-all] Credenciada: falhou na exclusao final com HTTP ${cleanupResponse.status}${responseMessage ? ` - ${responseMessage}` : ''}`)
        if (!continueOnError) {
          shouldAbort = true
          break
        }
      } else {
        results[deferredCredenciadaCleanupResultIndex] = {
          ...results[deferredCredenciadaCleanupResultIndex],
          finishedAt: new Date().toISOString(),
          summary: {
            ...results[deferredCredenciadaCleanupResultIndex].summary,
            deleted: cleanupPayload?.deleted ?? results[deferredCredenciadaCleanupResultIndex].summary?.deleted ?? 0,
          },
          response: {
            ...results[deferredCredenciadaCleanupResultIndex].response,
            deleted: cleanupPayload?.deleted ?? results[deferredCredenciadaCleanupResultIndex].response?.deleted ?? 0,
          },
        }
        await appendExecutionLog(
          `[xml-import-all] Credenciada: exclusao final concluida - excluidos=${cleanupPayload?.deleted ?? 0}`,
        )
      }

      deferredCredenciadaCleanupResultIndex = -1
    }
  } catch (error) {
    const errorDetails = serializeError(error)
    results.push({
      key: step.key,
      label: step.label,
      fileName: step.fileName,
      endpoint: `${requestedBaseUrl}${stepExecutionMode.endpoint}`,
      source: stepExecutionMode.source,
      startedAt: stepStartedAt,
      finishedAt: new Date().toISOString(),
      ok: false,
      message: errorDetails.message,
      error: errorDetails,
    })
    await appendExecutionLog(`[xml-import-all] ${step.label}: falhou - ${errorDetails.message}`)

    if (errorDetails.cause?.message) {
      await appendExecutionLog(`[xml-import-all] ${step.label}: causa - ${errorDetails.cause.message}`)
    }

    if (!continueOnError) {
      shouldAbort = true
      break
    }
  }
}

const finishedAt = new Date().toISOString()
const failedSteps = results.filter((result) => !result.ok && !result.skipped)
const skippedSteps = results.filter((result) => result.skipped)
const summary = {
  startedAt,
  finishedAt,
  baseUrl: requestedBaseUrl,
  logPath: requestedLogPath,
  source: requestedSource,
  generateFromAccess,
  accessDbPath: requestedAccessDbPath,
  accessExporterScriptPath: requestedAccessExporterScriptPath,
  deleteMissing,
  truncateBeforeImport: shouldTruncateBeforeImport,
  continueOnError,
  selectedStepKeys: selectedSteps.map((step) => step.key),
  ok: failedSteps.length === 0,
  failedSteps: failedSteps.map((step) => step.key),
  skippedSteps: skippedSteps.map((step) => step.key),
  results,
}

await mkdir(path.dirname(requestedReportPath), { recursive: true })
await writeFile(requestedReportPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')

console.log(JSON.stringify({
  ok: summary.ok,
  selectedSteps: summary.selectedStepKeys,
  failedSteps: summary.failedSteps,
  skippedSteps: summary.skippedSteps,
  reportPath: requestedReportPath,
  logPath: requestedLogPath,
}, null, 2))

process.exit(summary.ok ? 0 : 1)