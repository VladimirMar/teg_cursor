import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { access, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const importXmlDirectory = path.join(workspaceRoot, 'importXML')
const defaultBaseUrl = process.env.API_BASE_URL?.trim() || 'http://localhost:3001'
const defaultReportPath = process.env.XML_IMPORT_ALL_REPORT_PATH?.trim()
  || path.join(importXmlDirectory, 'xml_import_all_summary.json')
const requestTimeoutMs = Math.max(Number(process.env.XML_IMPORT_ALL_REQUEST_TIMEOUT_MS ?? 0) || 0, 0)

const importSteps = [
  {
    key: 'marca-modelo',
    label: 'Marca/Modelo',
    endpoint: '/api/marca-modelo/import-xml',
    fileName: 'marca-modelo.xml',
  },
  {
    key: 'credenciada',
    label: 'Credenciada',
    endpoint: '/api/credenciada/import-xml',
    fileName: 'Credenciados.xml',
  },
  {
    key: 'termo',
    label: 'Credenciamento Termo',
    endpoint: '/api/termo/import-xml',
    fileName: 'Credenciamento_Termo.xml',
  },
  {
    key: 'condutor',
    label: 'Condutor',
    endpoint: '/api/condutor/import-xml',
    fileName: 'Condutor.xml',
  },
  {
    key: 'monitor',
    label: 'Monitor',
    endpoint: '/api/monitor/import-xml',
    fileName: 'Monitor.xml',
  },
  {
    key: 'vinculo-condutor',
    label: 'Vinculo Condutor',
    endpoint: '/api/vinculo-condutor/import-xml',
    fileName: 'Vinculos_condutor.xml',
  },
  {
    key: 'vinculo-monitor',
    label: 'Vinculo Monitor',
    endpoint: '/api/vinculo-monitor/import-xml',
    fileName: 'Vinculos_monitor.xml',
  },
  {
    key: 'veiculo',
    label: 'Veiculo',
    endpoint: '/api/veiculo/import-xml',
    fileName: 'Veiculo.xml',
  },
  {
    key: 'ordem-servico',
    label: 'OrdemServico',
    endpoint: '/api/ordem-servico/import-xml',
    fileName: 'OrdemServico.xml',
  },
  {
    key: 'cep',
    label: 'CEP',
    endpoint: '/api/cep/import-xml',
    fileName: 'Ceps.xml',
    optional: true,
  },
]

const rawArgs = process.argv.slice(2)
let requestedBaseUrl = defaultBaseUrl
let requestedReportPath = defaultReportPath
let requestedStepKeys = []
let continueOnError = /^(1|true|yes)$/i.test(process.env.XML_IMPORT_ALL_CONTINUE_ON_ERROR ?? '')
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
  }
}

if (shouldPrintHelp) {
  console.log(`Uso: node scripts/import-all-xml.mjs [opcoes]

Opcoes:
  --base-url <url>         URL base da API. Padrao: ${defaultBaseUrl}
  --report <arquivo>       Caminho do relatorio consolidado JSON.
  --only <etapa>           Executa apenas a etapa informada. Pode repetir.
  --step <etapa>           Alias de --only.
  --continue-on-error      Continua nas etapas seguintes quando uma falhar.
  --help                   Exibe esta ajuda.

Etapas disponiveis:
  ${importSteps.map((step) => `${step.key} (${step.fileName})`).join('\n  ')}`)
  process.exit(0)
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

const results = []
const startedAt = new Date().toISOString()
let shouldAbort = false

for (const step of selectedSteps) {
  const stepStartedAt = new Date().toISOString()
  const xmlPath = path.join(importXmlDirectory, step.fileName)
  const xmlExists = await fileExists(xmlPath)

  if (!xmlExists) {
    const missingMessage = `Arquivo XML nao encontrado em ${xmlPath}.`
    const skippedResult = {
      key: step.key,
      label: step.label,
      fileName: step.fileName,
      endpoint: `${requestedBaseUrl}${step.endpoint}`,
      startedAt: stepStartedAt,
      finishedAt: new Date().toISOString(),
      ok: false,
      skipped: true,
      optional: Boolean(step.optional),
      message: missingMessage,
    }

    results.push(skippedResult)
    console.log(`[xml-import-all] ${step.label}: ${step.optional ? 'ignorado' : 'falhou'} - ${missingMessage}`)

    if (!step.optional) {
      shouldAbort = !continueOnError
    }

    if (shouldAbort) {
      break
    }

    continue
  }

  console.log(`[xml-import-all] ${step.label}: iniciando importacao de ${step.fileName}`)

  try {
    const response = await postJson(`${requestedBaseUrl}${step.endpoint}`, { fileName: step.fileName })
    const payload = await readJsonResponse({ text: async () => response.bodyText })
    const stepResult = {
      key: step.key,
      label: step.label,
      fileName: step.fileName,
      endpoint: `${requestedBaseUrl}${step.endpoint}`,
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
        skipped: payload?.skipped ?? null,
      },
      response: payload,
    }

    results.push(stepResult)

    if (!response.ok) {
      const responseMessage = typeof payload?.message === 'string' ? payload.message : ''
      console.error(`[xml-import-all] ${step.label}: falhou com HTTP ${response.status}${responseMessage ? ` - ${responseMessage}` : ''}`)
      if (!continueOnError) {
        shouldAbort = true
        break
      }
      continue
    }

    console.log(
      `[xml-import-all] ${step.label}: ok - processados=${stepResult.summary.processed ?? 0}, inseridos=${stepResult.summary.inserted ?? 0}, atualizados=${stepResult.summary.updated ?? 0}, recusados=${stepResult.summary.skipped ?? 0}`,
    )
  } catch (error) {
    const errorDetails = serializeError(error)
    results.push({
      key: step.key,
      label: step.label,
      fileName: step.fileName,
      endpoint: `${requestedBaseUrl}${step.endpoint}`,
      startedAt: stepStartedAt,
      finishedAt: new Date().toISOString(),
      ok: false,
      message: errorDetails.message,
      error: errorDetails,
    })
    console.error(`[xml-import-all] ${step.label}: falhou - ${errorDetails.message}`)

    if (errorDetails.cause?.message) {
      console.error(`[xml-import-all] ${step.label}: causa - ${errorDetails.cause.message}`)
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
}, null, 2))

process.exit(summary.ok ? 0 : 1)