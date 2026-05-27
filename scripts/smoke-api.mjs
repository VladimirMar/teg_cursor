import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const baseUrl = process.env.API_BASE_URL ?? 'http://localhost:3001'
const reportPath = process.env.SMOKE_REPORT_PATH ?? ''
const availableSuites = new Set(['all', 'condutor', 'monitor', 'credenciada', 'ordem-servico', 'veiculo', 'marca-modelo', 'apontamento-servicos', 'documental'])
const suite = (process.argv[2] ?? process.env.SMOKE_SUITE ?? 'all').trim().toLowerCase()
const shouldRunVeiculoInAll = String(process.env.SMOKE_API_INCLUDE_VEICULO ?? '').trim().toLowerCase() === 'true'

const report = {
  requestedSuite: suite,
  status: 'running',
  startedAt: new Date().toISOString(),
  finishedAt: null,
  executedSuites: [],
  failureMessage: '',
}

const requestJson = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
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
      : `HTTP ${response.status} em ${path}`

    throw new Error(message)
  }

  return payload
}

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}

const compareStrings = (left, right) => left.localeCompare(right, 'pt-BR', { sensitivity: 'base' })

const compareNumericStrings = (left, right) => {
  const normalizedLeft = String(left ?? '').trim()
  const normalizedRight = String(right ?? '').trim()
  const leftIsNumeric = /^\d+$/.test(normalizedLeft)
  const rightIsNumeric = /^\d+$/.test(normalizedRight)

  if (leftIsNumeric && rightIsNumeric) {
    return Number(normalizedLeft) - Number(normalizedRight)
  }

  if (leftIsNumeric && !rightIsNumeric) {
    return -1
  }

  if (!leftIsNumeric && rightIsNumeric) {
    return 1
  }

  return compareStrings(normalizedLeft, normalizedRight)
}

const expectSortedBy = (items, fieldName, direction) => {
  for (let index = 1; index < items.length; index += 1) {
    const previousValue = String(items[index - 1]?.[fieldName] ?? '').trim()
    const currentValue = String(items[index]?.[fieldName] ?? '').trim()
    const comparison = compareStrings(previousValue, currentValue)

    if (direction === 'asc') {
      assert(comparison <= 0, `${fieldName} fora de ordem crescente na posicao ${index + 1}.`)
      continue
    }

    assert(comparison >= 0, `${fieldName} fora de ordem decrescente na posicao ${index + 1}.`)
  }
}

const expectSortedByNumericString = (items, fieldName, direction) => {
  for (let index = 1; index < items.length; index += 1) {
    const previousValue = String(items[index - 1]?.[fieldName] ?? '').trim()
    const currentValue = String(items[index]?.[fieldName] ?? '').trim()
    const comparison = compareNumericStrings(previousValue, currentValue)

    if (direction === 'asc') {
      assert(comparison <= 0, `${fieldName} fora de ordem numerica crescente na posicao ${index + 1}.`)
      continue
    }

    assert(comparison >= 0, `${fieldName} fora de ordem numerica decrescente na posicao ${index + 1}.`)
  }
}

const isStrictlyFutureDate = (value) => {
  const normalizedValue = String(value ?? '').trim()

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
    return false
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const candidateDate = new Date(`${normalizedValue}T00:00:00`)

  if (Number.isNaN(candidateDate.getTime())) {
    return false
  }

  return candidateDate > today
}

const shiftDateInputValueYears = (value, yearOffset) => {
  const normalizedValue = String(value ?? '').trim()

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
    return ''
  }

  const [year, month, day] = normalizedValue.split('-').map(Number)
  const shiftedDate = new Date(year, month - 1, day)

  if (Number.isNaN(shiftedDate.getTime())) {
    return ''
  }

  shiftedDate.setFullYear(shiftedDate.getFullYear() + yearOffset)

  if (Number.isNaN(shiftedDate.getTime())) {
    return ''
  }

  const shiftedYear = shiftedDate.getFullYear()
  const shiftedMonth = String(shiftedDate.getMonth() + 1).padStart(2, '0')
  const shiftedDay = String(shiftedDate.getDate()).padStart(2, '0')
  return `${shiftedYear}-${shiftedMonth}-${shiftedDay}`
}

const findPaginatedFixture = async ({ resourcePath, sortBy = 'codigo', sortDirection = 'asc', pageSize = 100, maxPages = 20, predicate, description }) => {
  for (let page = 1; page <= maxPages; page += 1) {
    const response = await requestJson(`${resourcePath}?page=${page}&pageSize=${pageSize}&sortBy=${sortBy}&sortDirection=${sortDirection}`)
    const items = Array.isArray(response.items) ? response.items : []
    const matchedItem = items.find(predicate)

    if (matchedItem) {
      return matchedItem
    }

    if (page >= (response.totalPages ?? 1)) {
      break
    }
  }

  throw new Error(`Nenhum fixture estavel foi encontrado para ${description}.`)
}

const findExactItemByCode = async (resourcePath, codigo) => {
  const normalizedCode = String(codigo ?? '').trim()
  const response = await requestJson(`${resourcePath}?page=1&pageSize=50&search=${encodeURIComponent(normalizedCode)}`)
  return (response.items ?? []).find((item) => String(item.codigo ?? '').trim() === normalizedCode) ?? null
}

const requestJsonWithStatus = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers ?? {}),
    },
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok && response.status !== 404) {
    const message = payload && typeof payload.message === 'string'
      ? payload.message
      : `HTTP ${response.status} em ${path}`

    throw new Error(message)
  }

  return {
    ok: response.ok,
    status: response.status,
    payload,
  }
}

const fetchLookupItem = async (path) => {
  const { status, payload } = await requestJsonWithStatus(path)

  if (status === 404) {
    return null
  }

  return payload?.item ?? null
}

const getDocumentDigits = (value) => String(value ?? '').replace(/\D/g, '')

const formatDateInputValue = (value) => {
  const date = value instanceof Date ? new Date(value) : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const addDaysToDateInputValue = (days, referenceDate = new Date()) => {
  const date = new Date(referenceDate)
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return formatDateInputValue(date)
}

const buildUniqueDigits = (length) => {
  const seed = `${Date.now()}${Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0')}`
  return seed.slice(-length).padStart(length, '0')
}

const buildUniqueEmail = () => `smoke.${buildUniqueDigits(8)}@example.com`

const buildUniquePlate = () => {
  const digits = buildUniqueDigits(4)
  const middleLetter = String.fromCharCode(65 + (Number(digits[1]) % 26))
  return `SMK${digits[0]}${middleLetter}${digits.slice(2)}`
}

const buildUniqueCrm = () => `SMOKE-${buildUniqueDigits(6)}`

const parseDecimalText = (value) => {
  const normalizedValue = String(value ?? '').trim()

  if (!normalizedValue) {
    return Number.NaN
  }

  const sanitizedValue = normalizedValue
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '')

  return Number.parseFloat(sanitizedValue)
}

const buildVeiculoLookupUrl = ({ crm, modalidadeCodigo }) => {
  const params = new URLSearchParams({ crm: String(crm ?? '').trim() })

  if (String(modalidadeCodigo ?? '').trim()) {
    params.set('modalidadeCodigo', String(modalidadeCodigo).trim())
  }

  return `/api/veiculo/lookup?${params.toString()}`
}

const buildContratoRequestPayload = (termoItem) => ({
  preview: true,
  requestedDate: String(termoItem?.inicio_vigencia || termoItem?.data_publicacao || '').trim(),
  codigoXml: String(termoItem?.codigo_xml || '').trim(),
  termoAdesao: String(termoItem?.termo_adesao || termoItem?.termoAdesao || '').trim(),
  sei: String(termoItem?.sei || '').trim(),
  credenciado: String(termoItem?.credenciado || termoItem?.empresa || '').trim(),
  cnpjCpf: String(termoItem?.cnpj_cpf || termoItem?.cnpjCpf || '').trim(),
  tipoTermo: String(termoItem?.tipo_termo || termoItem?.tipoTermo || '').trim(),
  representante: String(termoItem?.representante || '').trim(),
  cpfRepresentante: String(termoItem?.cpf_representante || '').trim(),
  cep: String(termoItem?.credenciada_cep || termoItem?.cep || '').trim(),
  logradouro: String(termoItem?.logradouro || '').trim(),
  bairro: String(termoItem?.bairro || '').trim(),
  municipio: String(termoItem?.municipio || '').trim(),
  inicioVigencia: String(termoItem?.inicio_vigencia || '').trim(),
  terminoVigencia: String(termoItem?.termino_vigencia || '').trim(),
  compDataAditivo: String(termoItem?.comp_data_aditivo || '').trim(),
  dataPublicacao: String(termoItem?.data_publicacao || '').trim(),
  vencimentoGeral: String(termoItem?.vencimento_geral || '').trim(),
  mesRenovacao: String(termoItem?.mes_renovacao || '').trim(),
  tpOptante: String(termoItem?.tp_optante || '').trim(),
  valorContrato: String(termoItem?.valor_contrato || '').trim(),
  valorContratoAtualizado: String(termoItem?.valor_contrato_atualizado || '').trim(),
})

const runDocumentalEmissionChecks = async () => {
  const termoFixture = await findPaginatedFixture({
    resourcePath: '/api/termo',
    sortBy: 'codigo',
    sortDirection: 'desc',
    predicate: (item) => {
      return Boolean(String(item.termo_adesao ?? '').trim())
        && Boolean(String(item.credenciado ?? '').trim())
        && Boolean(String(item.cnpj_cpf ?? '').trim())
        && Boolean(String(item.tipo_termo ?? '').trim())
        && Boolean(String(item.inicio_vigencia ?? '').trim())
        && Boolean(String(item.data_publicacao ?? '').trim())
        && Number.isFinite(parseDecimalText(item.valor_contrato))
        && parseDecimalText(item.valor_contrato) > 0
    },
    description: 'termo com dados completos para emissao',
  })

  const latestTermoItem = await fetchLookupItem(`/api/termo/lookup?termoAdesao=${encodeURIComponent(String(termoFixture.termo_adesao))}`)
  assert(Boolean(latestTermoItem), `Lookup do termo ${termoFixture.termo_adesao} nao retornou item.`)

  const termoRequestedDate = String(latestTermoItem.data_publicacao || latestTermoItem.inicio_vigencia || '').trim()
  assert(termoRequestedDate, 'Termo de emissao nao retornou data de referencia para despacho/aditivo.')

  const termoParametroResponse = await requestJson(`/api/emissao-documento-parametro/resolve?dataReferencia=${encodeURIComponent(termoRequestedDate)}`)
  const termoParametroItem = termoParametroResponse.item
  assert(Boolean(termoParametroItem), 'Parametro de emissao do termo nao foi encontrado.')
  assert(Boolean(String(termoParametroItem.titulo_aditivo ?? '').trim()), 'Parametro de emissao do termo nao retornou titulo do aditivo.')
  assert(Boolean(String(termoParametroItem.corpo_aditivo ?? '').trim()), 'Parametro de emissao do termo nao retornou corpo do aditivo.')
  assert(Boolean(String(termoParametroItem.texto_despacho ?? '').trim()), 'Parametro de emissao do termo nao retornou texto do despacho.')
  logStep(`fontes de termo aditivo e despacho validadas para ${latestTermoItem.termo_adesao}`)

  const contratoPreview = await requestJson('/api/termo/emitir-contrato', {
    method: 'POST',
    body: JSON.stringify(buildContratoRequestPayload(latestTermoItem)),
  })

  assert(Boolean(String(contratoPreview.fileName ?? '').trim()), 'Emissao do contrato nao retornou nome de arquivo.')
  assert(String(contratoPreview.fileName).toLowerCase().includes('contrato'), 'Emissao do contrato retornou nome de arquivo inesperado.')
  assert(Boolean(String(contratoPreview.previewMarkup ?? '').trim()), 'Emissao do contrato nao retornou previewMarkup.')
  assert(String(contratoPreview.previewMarkup).includes(String(latestTermoItem.termo_adesao)), 'Preview do contrato nao contem o termo de adesao esperado.')
  assert(
    String(contratoPreview.previewMarkup).toUpperCase().includes(String(latestTermoItem.credenciado ?? '').trim().toUpperCase()),
    'Preview do contrato nao contem o credenciado esperado.',
  )
  logStep(`emissao do contrato validada para o termo ${latestTermoItem.termo_adesao}`)

  const emissaoOsItem = await findPaginatedFixture({
    resourcePath: '/api/ordem-servico',
    sortBy: 'codigo',
    sortDirection: 'desc',
    predicate: (item) => {
      return String(item.situacao ?? '').trim().toUpperCase() !== 'RASCUNHO'
        && Boolean(String(item.termo_adesao ?? '').trim())
        && Boolean(String(item.num_os ?? '').trim())
        && Boolean(String(item.modalidade_codigo ?? '').trim())
        && (
          Boolean(getDocumentDigits(item.cpf_condutor))
          || Boolean(getDocumentDigits(item.cpf_monitor))
          || Boolean(String(item.crm ?? '').trim())
        )
    },
    description: 'ordem de servico com referencias para emissao',
  })

  const ordemServicoTermoItem = await fetchLookupItem(`/api/termo/lookup?termoAdesao=${encodeURIComponent(String(emissaoOsItem.termo_adesao))}`)
  assert(Boolean(ordemServicoTermoItem), 'Lookup do termo da OrdemServico nao retornou item.')

  const ordemServicoCondutorItem = getDocumentDigits(emissaoOsItem.cpf_condutor)
    ? await fetchLookupItem(`/api/condutor/lookup?cpf=${encodeURIComponent(String(emissaoOsItem.cpf_condutor))}`)
    : null
  const ordemServicoMonitorItem = getDocumentDigits(emissaoOsItem.cpf_monitor)
    ? await fetchLookupItem(`/api/monitor/lookup?cpf=${encodeURIComponent(String(emissaoOsItem.cpf_monitor))}`)
    : null
  const ordemServicoVeiculoItem = String(emissaoOsItem.crm ?? '').trim()
    ? await fetchLookupItem(buildVeiculoLookupUrl({ crm: emissaoOsItem.crm, modalidadeCodigo: emissaoOsItem.modalidade_codigo }))
    : null

  if (getDocumentDigits(emissaoOsItem.cpf_condutor)) {
    assert(Boolean(ordemServicoCondutorItem), 'Lookup do condutor da OrdemServico nao retornou item.')
  }

  if (getDocumentDigits(emissaoOsItem.cpf_monitor)) {
    assert(Boolean(ordemServicoMonitorItem), 'Lookup do monitor da OrdemServico nao retornou item.')
  }

  if (String(emissaoOsItem.crm ?? '').trim()) {
    assert(Boolean(ordemServicoVeiculoItem), 'Lookup do veiculo da OrdemServico nao retornou item.')
  }

  assert(
    Boolean(ordemServicoCondutorItem || ordemServicoMonitorItem || ordemServicoVeiculoItem),
    'Nenhuma referencia secundaria da OrdemServico foi resolvida para dados OS.',
  )
  logStep(`consulta de dados OS validada para ${emissaoOsItem.termo_adesao}/${emissaoOsItem.num_os}${emissaoOsItem.revisao || ''}`)

  const ordemServicoRequestedDate = String(emissaoOsItem.data_emissao || formatDateInputValue(new Date())).trim()
  const ordemServicoParametroResponse = await requestJson(`/api/emissao-documento-parametro/resolve?dataReferencia=${encodeURIComponent(ordemServicoRequestedDate)}`)
  const ordemServicoParametroItem = ordemServicoParametroResponse.item
  assert(Boolean(ordemServicoParametroItem), 'Parametro da emissao de documento da OrdemServico nao foi encontrado.')
  assert(Boolean(String(ordemServicoParametroItem.obs_01_emissao ?? '').trim()), 'Parametro da emissao de documento da OrdemServico nao retornou observacao 1.')
  assert(Boolean(String(ordemServicoParametroItem.obs_02_emissao ?? '').trim()), 'Parametro da emissao de documento da OrdemServico nao retornou observacao 2.')
  assert(Boolean(String(ordemServicoParametroItem.rodape_emissao ?? '').trim()), 'Parametro da emissao de documento da OrdemServico nao retornou rodape.')
  logStep(`fontes da emissao de documento da OS validadas para ${emissaoOsItem.termo_adesao}/${emissaoOsItem.num_os}${emissaoOsItem.revisao || ''}`)
}

const logStep = (message) => {
  console.log(`- ${message}`)
}

const recordSuite = (suiteName) => {
  const suiteReport = {
    name: suiteName,
    status: 'running',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    imports: [],
  }

  report.executedSuites.push(suiteReport)
  return suiteReport
}

const recordImport = (suiteReport, label, payload) => {
  suiteReport.imports.push({
    label,
    fileName: payload.fileName,
    total: payload.total,
    processed: payload.processed,
    inserted: payload.inserted,
    updated: payload.updated,
    skipped: payload.skipped,
    skippedRecords: Array.isArray(payload.skippedRecords)
      ? payload.skippedRecords.map((item) => ({
          index: item.index,
          codigoXml: item.codigoXml,
          message: item.message,
        }))
      : [],
  })
}

const runNodeScript = (scriptUrl, args = []) => {
  return new Promise((resolve, reject) => {
    const childProcess = spawn(process.execPath, [fileURLToPath(scriptUrl), ...args], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        API_BASE_URL: process.env.API_BASE_URL ?? baseUrl,
      },
      stdio: 'inherit',
    })

    childProcess.once('error', reject)
    childProcess.once('exit', (code) => {
      if (code === 0) {
        resolve(undefined)
        return
      }

      reject(new Error(`Script ${fileURLToPath(scriptUrl)} falhou com codigo ${code ?? 'desconhecido'}.`))
    })
  })
}

const finalizeSuite = (suiteReport, status) => {
  suiteReport.status = status
  suiteReport.finishedAt = new Date().toISOString()
}

const writeReportIfNeeded = async () => {
  if (!reportPath) {
    return
  }

  await mkdir(dirname(reportPath), { recursive: true })
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
}

if (!availableSuites.has(suite)) {
  console.error(`Suite invalida: ${suite}. Use uma destas: ${Array.from(availableSuites).join(', ')}.`)
  process.exit(1)
}

const runCondutorSmoke = async () => {
  console.log('Smoke test da API Condutor')
  const suiteReport = recordSuite('condutor')

  try {
    const listResponse = await requestJson('/api/condutor?page=1&pageSize=5')
    assert(Array.isArray(listResponse.items), 'Listagem de condutor nao retornou items.')
    assert(listResponse.total > 0, 'Listagem de condutor retornou total zerado.')
    logStep(`listagem inicial ok com ${listResponse.total} registro(s)`)

    const ascResponse = await requestJson('/api/condutor?page=1&pageSize=5&sortBy=condutor&sortDirection=asc')
    const descResponse = await requestJson('/api/condutor?page=1&pageSize=5&sortBy=condutor&sortDirection=desc')
    expectSortedBy(ascResponse.items, 'condutor', 'asc')
    expectSortedBy(descResponse.items, 'condutor', 'desc')
    assert(
      String(ascResponse.items[0]?.condutor ?? '') !== String(descResponse.items[0]?.condutor ?? ''),
      'Ordenacao asc/desc de condutor retornou o mesmo primeiro registro.',
    )
    logStep('ordenacao asc/desc por condutor ok')

    const originalItem = await findPaginatedFixture({
      resourcePath: '/api/condutor',
      predicate: (item) => {
        return Boolean(String(item.codigo ?? '').trim())
          && Boolean(String(item.crmc ?? '').trim())
          && isStrictlyFutureDate(item.validade_crmc)
          && isStrictlyFutureDate(item.validade_curso)
      },
      description: 'condutor com CRMC e validade futura',
    })
    const targetCode = String(originalItem.codigo)
    const updatedTipoVinculo = 'Cooperado'
    const updatedHistorico = 'SMOKE TEST API CONDUTOR'
    const updatedDataCurso = '2025-12-31'
    const updatedValidadeCurso = shiftDateInputValueYears(updatedDataCurso, 5)
    const importedFixtureCode = '14392'
    const importedFixtureDataCurso = '2023-07-16'
    const importedFixtureValidadeCurso = shiftDateInputValueYears(importedFixtureDataCurso, 5)

    await requestJson(`/api/condutor/${encodeURIComponent(targetCode)}`, {
      method: 'PUT',
      body: JSON.stringify({
        codigo: originalItem.codigo,
        condutor: originalItem.condutor,
        cpfCondutor: originalItem.cpf_condutor,
        crmc: originalItem.crmc,
        validadeCrmc: originalItem.validade_crmc,
        validadeCurso: updatedValidadeCurso,
        tipoVinculo: updatedTipoVinculo,
        historico: updatedHistorico,
      }),
    })

    const updatedItem = await findExactItemByCode('/api/condutor', targetCode)
    assert(Boolean(updatedItem), `Registro ${targetCode} do condutor nao foi localizado apos alteracao.`)
    assert(updatedItem.tipo_vinculo === updatedTipoVinculo, 'Alteracao do condutor nao persistiu tipo de vinculo.')
    assert(updatedItem.historico === updatedHistorico, 'Alteracao do condutor nao persistiu historico.')
    assert(updatedItem.validade_curso === updatedValidadeCurso, 'Alteracao do condutor nao persistiu validade do curso.')
    logStep(`edicao do registro importado ${targetCode} ok`)

    const deleteResponse = await requestJson(`/api/condutor/${encodeURIComponent(targetCode)}`, { method: 'DELETE' })
    assert(deleteResponse.deletedCodigo === targetCode, 'Exclusao do condutor nao retornou o codigo esperado.')
    const deletedItem = await findExactItemByCode('/api/condutor', targetCode)
    assert(!deletedItem, `Registro ${targetCode} ainda foi encontrado apos exclusao.`)
    logStep(`exclusao do registro importado ${targetCode} ok`)

    const validImport = await requestJson('/api/condutor/import-xml', {
      method: 'POST',
      body: JSON.stringify({ fileName: 'Condutor.xml' }),
    })
    recordImport(suiteReport, 'valid-import', validImport)
    assert(validImport.total >= validImport.processed, 'Importacao valida de condutor retornou total inconsistente.')
    assert((validImport.processed + validImport.skipped) === validImport.total, 'Importacao valida de condutor nao fechou a contagem total.')
    assert((validImport.inserted + validImport.updated) === validImport.processed, 'Importacao valida de condutor retornou contagem inconsistente.')
    assert(validImport.skipped >= 0, 'Importacao valida de condutor retornou recusas invalidas.')
    logStep(`importacao valida do condutor: ${validImport.processed} processado(s), ${validImport.updated} alterado(s), ${validImport.inserted} incluido(s), ${validImport.skipped} recusado(s)`)

    const importedFixtureItem = await findExactItemByCode('/api/condutor', importedFixtureCode)
    assert(Boolean(importedFixtureItem), `Registro ${importedFixtureCode} nao foi localizado apos importacao valida do condutor.`)
    assert(importedFixtureItem.validade_curso === importedFixtureValidadeCurso, 'Importacao de condutor nao recalculou validade do curso a partir da data do curso do XML.')
    logStep(`importacao do condutor recalculou validade do curso para o registro ${importedFixtureCode}`)

    const restoredItem = await findExactItemByCode('/api/condutor', targetCode)
    assert(Boolean(restoredItem), `Registro ${targetCode} nao foi restaurado apos reimportacao valida.`)
    assert(restoredItem.tipo_vinculo === originalItem.tipo_vinculo, 'Tipo de vinculo original nao foi restaurado apos reimportacao valida.')
    assert(restoredItem.historico === originalItem.historico, 'Historico original nao foi restaurado apos reimportacao valida.')
    assert(restoredItem.validade_curso === originalItem.validade_curso, 'Validade do curso original nao foi restaurada apos reimportacao valida.')
    logStep(`reimportacao valida e restauracao do registro ${targetCode} ok (${validImport.skipped} recusa(s) existente(s) no XML fonte)`)

    const invalidImport = await requestJson('/api/condutor/import-xml', {
      method: 'POST',
      body: JSON.stringify({ fileName: 'Condutor-invalid.xml' }),
    })
    recordImport(suiteReport, 'invalid-import', invalidImport)
    assert(invalidImport.skipped === 3, 'Importacao invalida de condutor nao retornou 3 recusas.')
    assert(invalidImport.processed === 0, 'Importacao invalida de condutor nao retornou 0 registros processados.')
    assert(Array.isArray(invalidImport.skippedRecords) && invalidImport.skippedRecords.length === 3, 'Importacao invalida de condutor nao retornou os 3 registros recusados no payload.')
    assert(invalidImport.skippedRecords.some((item) => item.index === 1 && item.message.includes('nome do condutor invalido no XML')), 'Recusa explicita por nome invalido nao encontrada no payload de condutor.')
    logStep(`importacao invalida do condutor: ${invalidImport.processed} processado(s), ${invalidImport.skipped} recusado(s)`)

    const rejectionResponse = await requestJson('/api/condutor/import-rejections?page=1&pageSize=20&search=Condutor-invalid.xml')
    const rejectionReasons = rejectionResponse.items
      .filter((item) => item.arquivo_xml === 'Condutor-invalid.xml')
      .map((item) => item.motivo_recusa)

  assert(rejectionReasons.some((reason) => reason.includes('nome do condutor invalido no XML')), 'Recusa por nome invalido nao encontrada para condutor.')
    assert(rejectionReasons.some((reason) => reason.includes('codigo invalido no XML')), 'Recusa por codigo invalido nao encontrada para condutor.')
    assert(rejectionReasons.some((reason) => reason.includes('CPF invalido no XML')), 'Recusa por CPF invalido nao encontrada para condutor.')
    logStep('importacao invalida e painel de recusas do condutor ok')

    finalizeSuite(suiteReport, 'passed')
  } catch (error) {
    finalizeSuite(suiteReport, 'failed')
    throw error
  }
}

const runMonitorSmoke = async () => {
  console.log('Smoke test da API Monitor')
  const suiteReport = recordSuite('monitor')

  try {
    const listResponse = await requestJson('/api/monitor?page=1&pageSize=5')
    assert(Array.isArray(listResponse.items), 'Listagem de monitor nao retornou items.')
    assert(listResponse.total > 0, 'Listagem de monitor retornou total zerado.')
    logStep(`listagem inicial ok com ${listResponse.total} registro(s)`)

    const ascResponse = await requestJson('/api/monitor?page=1&pageSize=5&sortBy=monitor&sortDirection=asc')
    const descResponse = await requestJson('/api/monitor?page=1&pageSize=5&sortBy=monitor&sortDirection=desc')
    expectSortedBy(ascResponse.items, 'monitor', 'asc')
    expectSortedBy(descResponse.items, 'monitor', 'desc')
    assert(
      String(ascResponse.items[0]?.monitor ?? '') !== String(descResponse.items[0]?.monitor ?? ''),
      'Ordenacao asc/desc de monitor retornou o mesmo primeiro registro.',
    )
    logStep('ordenacao asc/desc por monitor ok')

    const validImport = await requestJson('/api/monitor/import-xml', {
      method: 'POST',
      body: JSON.stringify({ fileName: 'Monitor.xml' }),
    })
    recordImport(suiteReport, 'valid-import', validImport)
    assert(validImport.total >= validImport.processed, 'Importacao valida de monitor retornou total inconsistente.')
    assert((validImport.processed + validImport.skipped) === validImport.total, 'Importacao valida de monitor nao fechou a contagem total.')
    assert((validImport.inserted + validImport.updated) === validImport.processed, 'Importacao valida de monitor retornou contagem inconsistente.')
    logStep(`importacao valida do monitor: ${validImport.processed} processado(s), ${validImport.updated} alterado(s), ${validImport.inserted} incluido(s), ${validImport.skipped} recusado(s)`)

    const fixtureCode = '15141'
    const fixtureCurso = '2023-06-04'
    const fixtureValidadeCurso = shiftDateInputValueYears(fixtureCurso, 5)
    const originalItem = await findExactItemByCode('/api/monitor', fixtureCode)
    assert(Boolean(originalItem), `Registro ${fixtureCode} do monitor nao foi localizado apos importacao valida.`)
    assert(originalItem.curso_monitor === fixtureCurso, 'Importacao de monitor nao persistiu a data do curso esperada do XML.')
    assert(originalItem.validade_curso === fixtureValidadeCurso, 'Importacao de monitor nao recalculou validade do curso a partir da data do curso do XML.')
    logStep(`importacao do monitor recalculou validade do curso para o registro ${fixtureCode}`)

    const updatedTipoVinculo = 'Funcionario'
    const updatedCursoMonitor = '2024-07-01'
    const updatedValidadeCurso = shiftDateInputValueYears(updatedCursoMonitor, 5)

    await requestJson(`/api/monitor/${encodeURIComponent(fixtureCode)}`, {
      method: 'PUT',
      body: JSON.stringify({
        codigo: originalItem.codigo,
        monitor: originalItem.monitor,
        cpfMonitor: originalItem.cpf_monitor,
        cursoMonitor: updatedCursoMonitor,
        validadeCurso: updatedValidadeCurso,
        tipoVinculo: updatedTipoVinculo,
        nascimento: originalItem.nascimento,
      }),
    })

    const updatedItem = await findExactItemByCode('/api/monitor', fixtureCode)
    assert(Boolean(updatedItem), `Registro ${fixtureCode} do monitor nao foi localizado apos alteracao.`)
    assert(updatedItem.curso_monitor === updatedCursoMonitor, 'Alteracao do monitor nao persistiu a data do curso.')
    assert(updatedItem.validade_curso === updatedValidadeCurso, 'Alteracao do monitor nao persistiu a validade do curso derivada.')
    assert(updatedItem.tipo_vinculo === updatedTipoVinculo, 'Alteracao do monitor nao persistiu tipo de vinculo.')
    logStep(`edicao do registro importado ${fixtureCode} ok`)

    const restoreImport = await requestJson('/api/monitor/import-xml', {
      method: 'POST',
      body: JSON.stringify({ fileName: 'Monitor.xml' }),
    })
    recordImport(suiteReport, 'restore-import', restoreImport)
    assert((restoreImport.processed + restoreImport.skipped) === restoreImport.total, 'Reimportacao valida de monitor nao fechou a contagem total.')
    assert((restoreImport.inserted + restoreImport.updated) === restoreImport.processed, 'Reimportacao valida de monitor retornou contagem inconsistente.')

    const restoredItem = await findExactItemByCode('/api/monitor', fixtureCode)
    assert(Boolean(restoredItem), `Registro ${fixtureCode} nao foi restaurado apos reimportacao valida do monitor.`)
    assert(restoredItem.curso_monitor === fixtureCurso, 'Data do curso original nao foi restaurada apos reimportacao valida do monitor.')
    assert(restoredItem.validade_curso === fixtureValidadeCurso, 'Validade do curso original nao foi restaurada apos reimportacao valida do monitor.')
    logStep(`reimportacao valida e restauracao do registro ${fixtureCode} ok`)

    finalizeSuite(suiteReport, 'passed')
  } catch (error) {
    finalizeSuite(suiteReport, 'failed')
    throw error
  }
}

const runCredenciadaSmoke = async () => {
  console.log('Smoke test da API Credenciada')
  const suiteReport = recordSuite('credenciada')
  const xmlFixtureCodes = ['3789', '3434', '4946', '5524', '5781']

  try {
    const listResponse = await requestJson('/api/credenciada?page=1&pageSize=5')
    assert(Array.isArray(listResponse.items), 'Listagem de credenciada nao retornou items.')
    assert(listResponse.total > 0, 'Listagem de credenciada retornou total zerado.')
    logStep(`listagem inicial ok com ${listResponse.total} registro(s)`)

    const ascResponse = await requestJson('/api/credenciada?page=1&pageSize=5&sortBy=credenciado&sortDirection=asc')
    const descResponse = await requestJson('/api/credenciada?page=1&pageSize=5&sortBy=credenciado&sortDirection=desc')
    expectSortedBy(ascResponse.items, 'credenciado', 'asc')
    expectSortedBy(descResponse.items, 'credenciado', 'desc')
    assert(
      String(ascResponse.items[0]?.credenciado ?? '') !== String(descResponse.items[0]?.credenciado ?? ''),
      'Ordenacao asc/desc de credenciada retornou o mesmo primeiro registro.',
    )
    logStep('ordenacao asc/desc por credenciado ok')

    const existingCep = listResponse.items
      .map((item) => String(item.cep ?? '').trim())
      .find((value) => value.length > 0)

    assert(Boolean(existingCep), 'Nao foi encontrado CEP existente para validar a inclusao da credenciada.')

    const createdCredenciadaPayload = {
      credenciado: `SMOKE TEST CREDENCIADA ${buildUniqueDigits(6)}`,
      cnpjCpf: buildUniqueDigits(11),
      tipoPessoa: 'PESSOA FISICA',
      tpOptante: '',
      termoPermissao: '',
      cep: existingCep,
      numero: '100',
      complemento: 'SALA 1',
      email: buildUniqueEmail(),
      telefone1: '99999-9999',
      telefone2: '98888-8888',
      representante: '',
      cpfRepresentante: '',
      status: 'ATIVO',
    }

    const createdCredenciadaResponse = await requestJson('/api/credenciada', {
      method: 'POST',
      body: JSON.stringify(createdCredenciadaPayload),
    })

    const createdCredenciadaCode = String(createdCredenciadaResponse.item?.codigo ?? '').trim()
    assert(createdCredenciadaCode, 'Inclusao de credenciada nao retornou codigo.')

    const createdCredenciadaItem = await findExactItemByCode('/api/credenciada', createdCredenciadaCode)
    assert(Boolean(createdCredenciadaItem), `Credenciada ${createdCredenciadaCode} nao foi localizada apos inclusao.`)
    assert(createdCredenciadaItem.credenciado === createdCredenciadaPayload.credenciado, 'Inclusao de credenciada nao persistiu o nome informado.')
    assert(getDocumentDigits(createdCredenciadaItem.cnpj_cpf) === getDocumentDigits(createdCredenciadaPayload.cnpjCpf), 'Inclusao de credenciada nao persistiu o CNPJ/CPF informado.')
    logStep(`inclusao da credenciada ${createdCredenciadaCode} ok`)

    const createdCredenciadaDeleteResponse = await requestJson(`/api/credenciada/${encodeURIComponent(createdCredenciadaCode)}`, {
      method: 'DELETE',
    })
    assert(createdCredenciadaDeleteResponse.deletedCodigo === createdCredenciadaCode, 'Exclusao da credenciada criada nao retornou o codigo esperado.')
    const deletedCreatedCredenciada = await findExactItemByCode('/api/credenciada', createdCredenciadaCode)
    assert(!deletedCreatedCredenciada, `Credenciada ${createdCredenciadaCode} ainda foi encontrada apos exclusao.`)
    logStep(`exclusao da credenciada criada ${createdCredenciadaCode} ok`)

    const validImport = await requestJson('/api/credenciada/import-xml', {
      method: 'POST',
      body: JSON.stringify({ fileName: 'Credenciados.xml' }),
    })
    recordImport(suiteReport, 'valid-import', validImport)
    assert(validImport.skipped === 0, 'Importacao valida de credenciada retornou recusas inesperadas.')
    assert(validImport.processed === validImport.total, 'Importacao valida de credenciada nao processou todos os registros do XML.')
    assert((validImport.inserted + validImport.updated) === validImport.processed, 'Importacao valida de credenciada retornou contagem inconsistente.')
    logStep(`importacao valida da credenciada: ${validImport.processed} processado(s), ${validImport.updated} alterado(s), ${validImport.inserted} incluido(s), ${validImport.skipped} recusado(s)`)

    const originalItem = (await Promise.all(xmlFixtureCodes.map((codigo) => findExactItemByCode('/api/credenciada', codigo))))
      .find((item) => Boolean(item)
        && Boolean(String(item.codigo ?? '').trim())
        && Boolean(String(item.credenciado ?? '').trim())
        && Boolean(String(item.cnpj_cpf ?? '').trim())
        && Boolean(String(item.email ?? '').trim())
        && Boolean(String(item.telefone_01 ?? '').trim())
        && Boolean(String(item.representante ?? '').trim()))

    assert(Boolean(originalItem), 'Nenhum fixture estavel foi encontrado para credenciada importada do XML com dados suficientes para edicao.')
    const targetCode = String(originalItem.codigo)
    const updatedRepresentante = 'ROSALI APARECIDA POLI GOMES TESTE API'
    const normalizedOriginalStatus = String(originalItem.status ?? '').trim().toUpperCase() === 'CANCELADO' ? 'CANCELADO' : 'ATIVO'
    const updatedStatus = normalizedOriginalStatus === 'CANCELADO' ? 'ATIVO' : 'CANCELADO'

    await requestJson(`/api/credenciada/${encodeURIComponent(targetCode)}`, {
      method: 'PUT',
      body: JSON.stringify({
        codigo: originalItem.codigo,
        credenciado: originalItem.credenciado,
        cnpjCpf: originalItem.cnpj_cpf,
        cep: originalItem.cep,
        email: originalItem.email,
        telefone1: originalItem.telefone_01,
        telefone2: originalItem.telefone_02,
        representante: updatedRepresentante,
        cpfRepresentante: originalItem.cpf_representante,
        rgRepresentante: originalItem.rg_representante,
        status: updatedStatus,
      }),
    })

    const updatedItem = await findExactItemByCode('/api/credenciada', targetCode)
    assert(Boolean(updatedItem), `Registro ${targetCode} da credenciada nao foi localizado apos alteracao.`)
    assert(updatedItem.representante === updatedRepresentante, 'Alteracao da credenciada nao persistiu representante.')
    assert(updatedItem.status === updatedStatus, 'Alteracao da credenciada nao persistiu status.')
    logStep(`edicao do registro importado ${targetCode} ok`)

    const restoreImport = await requestJson('/api/credenciada/import-xml', {
      method: 'POST',
      body: JSON.stringify({ fileName: 'Credenciados.xml' }),
    })
    recordImport(suiteReport, 'restore-import', restoreImport)
    assert(restoreImport.skipped === 0, 'Reimportacao valida de credenciada retornou recusas inesperadas.')
    assert(restoreImport.processed === restoreImport.total, 'Reimportacao valida de credenciada nao processou todos os registros do XML.')
    assert((restoreImport.inserted + restoreImport.updated) === restoreImport.processed, 'Reimportacao valida de credenciada retornou contagem inconsistente.')
    logStep(`reimportacao valida da credenciada: ${restoreImport.processed} processado(s), ${restoreImport.updated} alterado(s), ${restoreImport.inserted} incluido(s), ${restoreImport.skipped} recusado(s)`)

    const restoredItem = await findExactItemByCode('/api/credenciada', targetCode)
    assert(Boolean(restoredItem), `Registro ${targetCode} nao foi restaurado apos reimportacao valida.`)
    assert(restoredItem.representante === originalItem.representante, 'Representante original nao foi restaurado apos reimportacao valida.')
    assert(restoredItem.status === normalizedOriginalStatus, 'Status original nao foi restaurado apos reimportacao valida.')
    logStep(`reimportacao valida e restauracao do registro ${targetCode} ok`)

    const invalidImport = await requestJson('/api/credenciada/import-xml', {
      method: 'POST',
      body: JSON.stringify({ fileName: 'Credenciados-invalid.xml' }),
    })
    recordImport(suiteReport, 'invalid-import', invalidImport)
    assert(invalidImport.skipped === 2, 'Importacao invalida de credenciada nao retornou 2 recusas.')
    assert(invalidImport.processed === 1, 'Importacao invalida de credenciada nao retornou 1 registro processado.')
    assert(Array.isArray(invalidImport.skippedRecords) && invalidImport.skippedRecords.length === 2, 'Importacao invalida de credenciada nao retornou os 2 registros recusados no payload.')
    assert(invalidImport.skippedRecords.some((item) => item.index === 2 && item.message.includes('codigo invalido no XML')), 'Recusa explicita por codigo invalido nao encontrada no payload de credenciada.')
    assert(invalidImport.skippedRecords.some((item) => item.index === 3 && item.message.includes('email invalido no XML')), 'Recusa explicita por email invalido nao encontrada no payload de credenciada.')
    logStep(`importacao invalida da credenciada: ${invalidImport.processed} processado(s), ${invalidImport.skipped} recusado(s)`)

    const rejectionResponse = await requestJson('/api/credenciada/import-rejections?page=1&pageSize=20&search=Credenciados-invalid.xml')
    const rejectionReasons = rejectionResponse.items
      .filter((item) => item.arquivo_xml === 'Credenciados-invalid.xml')
      .map((item) => item.motivo_recusa)

    assert(rejectionReasons.some((reason) => reason.includes('codigo invalido no XML')), 'Recusa por codigo invalido nao encontrada para credenciada.')
    assert(rejectionReasons.some((reason) => reason.includes('email invalido no XML')), 'Recusa por email invalido nao encontrada para credenciada.')
    logStep('importacao invalida e painel de recusas da credenciada ok')

    finalizeSuite(suiteReport, 'passed')
  } catch (error) {
    finalizeSuite(suiteReport, 'failed')
    throw error
  }
}

const runOrdemServicoSmoke = async () => {
  console.log('Smoke test da API OrdemServico')
  const suiteReport = recordSuite('ordem-servico')

  try {
    const listResponse = await requestJson('/api/ordem-servico?page=1&pageSize=5&sortBy=codigo&sortDirection=desc')
    assert(Array.isArray(listResponse.items), 'Listagem de OrdemServico nao retornou items.')
    assert(listResponse.total > 0, 'Listagem de OrdemServico retornou total zerado.')

    const baseItem = listResponse.items.find((item) => {
      return Boolean(String(item.codigo ?? '').trim())
        && Boolean(String(item.termo_adesao ?? '').trim())
        && Boolean(String(item.num_os ?? '').trim())
    })

    assert(Boolean(baseItem), 'Nenhum fixture estavel foi encontrado para OrdemServico.')
    logStep(`fixture selecionado: OS ${baseItem.codigo} (${baseItem.termo_adesao}/${baseItem.num_os}${baseItem.revisao || ''})`)

    const itemResponse = await requestJson(`/api/ordem-servico/${encodeURIComponent(String(baseItem.codigo))}`)
    assert(String(itemResponse.codigo ?? '').trim() === String(baseItem.codigo).trim(), 'Consulta detalhada da OrdemServico retornou codigo inesperado.')
    logStep(`consulta detalhada da OS ${baseItem.codigo} ok`)

    const nextRevisaoResponse = await requestJson(
      `/api/ordem-servico/next-revisao?termoAdesao=${encodeURIComponent(String(baseItem.termo_adesao ?? ''))}&numOs=${encodeURIComponent(String(baseItem.num_os ?? ''))}`,
    )

    assert(nextRevisaoResponse.codigoBase !== undefined, 'next-revisao nao retornou codigoBase.')
    assert(String(nextRevisaoResponse.termoAdesao ?? '').trim() === String(baseItem.termo_adesao ?? '').trim(), 'next-revisao nao retornou o termo esperado.')
    assert(String(nextRevisaoResponse.numOs ?? '').trim() === String(baseItem.num_os ?? '').trim(), 'next-revisao nao retornou o Num OS esperado.')
    assert(typeof nextRevisaoResponse.nextRevisao === 'string' && nextRevisaoResponse.nextRevisao.trim().length > 0, 'next-revisao nao retornou a proxima revisao.')
    assert(nextRevisaoResponse.nextRevisao !== 'Codigo invalido.', 'next-revisao colidiu com a rota generica de codigo.')
    logStep(`next-revisao ok para ${baseItem.termo_adesao}/${baseItem.num_os}: atual ${nextRevisaoResponse.revisaoAtual || '-'} -> proxima ${nextRevisaoResponse.nextRevisao}`)

    finalizeSuite(suiteReport, 'passed')
  } catch (error) {
    finalizeSuite(suiteReport, 'failed')
    throw error
  }
}

const runDocumentalSmoke = async () => {
  console.log('Smoke test documental da homologacao')
  const suiteReport = recordSuite('documental')

  try {
    await runDocumentalEmissionChecks()

    const emissaoOsItem = await findPaginatedFixture({
      resourcePath: '/api/ordem-servico',
      sortBy: 'codigo',
      sortDirection: 'desc',
      predicate: (item) => {
        return String(item.situacao ?? '').trim().toUpperCase() !== 'RASCUNHO'
          && Boolean(String(item.termo_adesao ?? '').trim())
          && Boolean(String(item.num_os ?? '').trim())
      },
      description: 'ordem de servico apta a validacao documental',
    })

    const nextNumOsResponse = await requestJson(`/api/ordem-servico/next-num-os?termoAdesao=${encodeURIComponent(String(emissaoOsItem.termo_adesao))}`)
    assert(typeof nextNumOsResponse.nextNumOs === 'string' && nextNumOsResponse.nextNumOs.trim().length > 0, 'next-num-os nao retornou o proximo numero de OS.')
    logStep(`next-num-os ok para ${emissaoOsItem.termo_adesao}: proxima ${nextNumOsResponse.nextNumOs}`)

    finalizeSuite(suiteReport, 'passed')
  } catch (error) {
    finalizeSuite(suiteReport, 'failed')
    throw error
  }
}

const runVeiculoSmoke = async () => {
  console.log('Smoke test da API Veiculo')
  const suiteReport = recordSuite('veiculo')

  try {
    let listResponse = await requestJson('/api/veiculo?page=1&pageSize=5')

    if (listResponse.total === 0) {
      const bootstrapImport = await requestJson('/api/veiculo/import-xml', {
        method: 'POST',
        body: JSON.stringify({ fileName: 'Veiculo.xml' }),
      })
      recordImport(suiteReport, 'bootstrap-import', bootstrapImport)
      listResponse = await requestJson('/api/veiculo?page=1&pageSize=5')
    }

    assert(Array.isArray(listResponse.items), 'Listagem de veiculo nao retornou items.')
    assert(listResponse.total > 0, 'Listagem de veiculo retornou total zerado.')
    logStep(`listagem inicial ok com ${listResponse.total} registro(s)`)

    const ascResponse = await requestJson('/api/veiculo?page=1&pageSize=5&sortBy=placas&sortDirection=asc')
    const descResponse = await requestJson('/api/veiculo?page=1&pageSize=5&sortBy=placas&sortDirection=desc')
    expectSortedBy(ascResponse.items, 'placas', 'asc')
    expectSortedBy(descResponse.items, 'placas', 'desc')
    assert(
      String(ascResponse.items[0]?.placas ?? '') !== String(descResponse.items[0]?.placas ?? ''),
      'Ordenacao asc/desc de veiculo retornou o mesmo primeiro registro.',
    )
    logStep('ordenacao asc/desc por placas ok')

    const originalItem = await findPaginatedFixture({
      resourcePath: '/api/veiculo',
      predicate: (item) => {
        return Boolean(String(item.codigo ?? '').trim())
          && Boolean(String(item.crm ?? '').trim())
          && Boolean(String(item.placas ?? '').trim())
          && Boolean(String(item.tipo_de_bancada ?? '').trim())
          && Boolean(String(item.tipo_de_veiculo ?? '').trim())
          && Boolean(String(item.marca_modelo ?? '').trim())
          && Boolean(String(item.titular ?? '').trim())
          && Boolean(String(item.cnpj_cpf ?? '').trim())
          && isStrictlyFutureDate(item.val_crm)
      },
      description: 'veiculo com CRM e validade futura',
    })

    const createdVeiculoPayload = {
      codigo: '',
      crm: buildUniqueCrm(),
      placas: buildUniquePlate(),
      ano: String(new Date().getFullYear()),
      capDetran: String(originalItem.cap_detran ?? '16'),
      capTeg: String(originalItem.cap_teg ?? '16'),
      capTegCreche: String(originalItem.cap_teg_creche ?? '0'),
      capAcessivel: String(originalItem.cap_acessivel ?? '0'),
      valCrm: addDaysToDateInputValue(365),
      seguradora: String(originalItem.seguradora ?? '').trim(),
      seguroInicio: '',
      seguroTermino: String(originalItem.seguro_termino ?? '').trim(),
      tipoDeBancada: String(originalItem.tipo_de_bancada ?? '').trim(),
      tipoDeVeiculo: String(originalItem.tipo_de_veiculo ?? '').trim(),
      marcaModelo: String(originalItem.marca_modelo ?? '').trim(),
      titular: String(originalItem.titular ?? '').trim(),
      cnpjCpf: String(originalItem.cnpj_cpf ?? '').trim(),
      valorVeiculo: String(originalItem.valor_veiculo ?? '100000.00').trim(),
      osEspecial: String(originalItem.os_especial ?? 'Nao').trim() || 'Nao',
    }

    const createdVeiculoResponse = await requestJson('/api/veiculo', {
      method: 'POST',
      body: JSON.stringify(createdVeiculoPayload),
    })

    const createdVeiculoCode = String(createdVeiculoResponse.item?.codigo ?? '').trim()
    assert(createdVeiculoCode, 'Inclusao de veiculo nao retornou codigo.')

    const createdVeiculoItem = await findExactItemByCode('/api/veiculo', createdVeiculoCode)
    assert(Boolean(createdVeiculoItem), `Veiculo ${createdVeiculoCode} nao foi localizado apos inclusao.`)
    assert(createdVeiculoItem.crm === createdVeiculoPayload.crm, 'Inclusao de veiculo nao persistiu o CRM informado.')
    assert(createdVeiculoItem.placas === createdVeiculoPayload.placas, 'Inclusao de veiculo nao persistiu a placa informada.')
    logStep(`inclusao do veiculo ${createdVeiculoCode} ok`)

    const createdVeiculoDeleteResponse = await requestJson(`/api/veiculo/${encodeURIComponent(createdVeiculoCode)}`, {
      method: 'DELETE',
    })
    assert(createdVeiculoDeleteResponse.deletedCodigo === createdVeiculoCode, 'Exclusao do veiculo criado nao retornou o codigo esperado.')
    const deletedCreatedVeiculo = await findExactItemByCode('/api/veiculo', createdVeiculoCode)
    assert(!deletedCreatedVeiculo, `Veiculo ${createdVeiculoCode} ainda foi encontrado apos exclusao.`)
    logStep(`exclusao do veiculo criado ${createdVeiculoCode} ok`)

    const targetCode = String(originalItem.codigo)
    const updatedTipoDeBancada = 'Creche'
    const updatedOsEspecial = 'Sim'
    const updatedMarcaModelo = 'I/M.BENZ311 RIBEIRO MO18 TESTE API'

    await requestJson(`/api/veiculo/${encodeURIComponent(targetCode)}`, {
      method: 'PUT',
      body: JSON.stringify({
        codigo: originalItem.codigo,
        crm: originalItem.crm,
        placas: originalItem.placas,
        ano: originalItem.ano,
        capDetran: originalItem.cap_detran,
        capTeg: originalItem.cap_teg,
        capTegCreche: originalItem.cap_teg_creche,
        capAcessivel: originalItem.cap_acessivel,
        valCrm: originalItem.val_crm,
        seguradora: originalItem.seguradora,
        seguroInicio: originalItem.seguro_inicio,
        seguroTermino: originalItem.seguro_termino,
        tipoDeBancada: updatedTipoDeBancada,
        tipoDeVeiculo: originalItem.tipo_de_veiculo,
        marcaModelo: updatedMarcaModelo,
        titular: originalItem.titular,
        cnpjCpf: originalItem.cnpj_cpf,
        valorVeiculo: originalItem.valor_veiculo,
        osEspecial: updatedOsEspecial,
      }),
    })

    const updatedItem = await findExactItemByCode('/api/veiculo', targetCode)
    assert(Boolean(updatedItem), `Registro ${targetCode} do veiculo nao foi localizado apos alteracao.`)
    assert(updatedItem.tipo_de_bancada === updatedTipoDeBancada, 'Alteracao do veiculo nao persistiu tipo de bancada.')
    assert(updatedItem.os_especial === updatedOsEspecial, 'Alteracao do veiculo nao persistiu OS especial.')
    assert(updatedItem.marca_modelo === updatedMarcaModelo, 'Alteracao do veiculo nao persistiu marca/modelo.')
    logStep(`edicao do registro importado ${targetCode} ok`)

    const deleteResponse = await requestJson(`/api/veiculo/${encodeURIComponent(targetCode)}`, { method: 'DELETE' })
    assert(deleteResponse.deletedCodigo === targetCode, 'Exclusao do veiculo nao retornou o codigo esperado.')
    const deletedItem = await findExactItemByCode('/api/veiculo', targetCode)
    assert(!deletedItem, `Registro ${targetCode} ainda foi encontrado apos exclusao.`)
    logStep(`exclusao do registro importado ${targetCode} ok`)

    const validImport = await requestJson('/api/veiculo/import-xml', {
      method: 'POST',
      body: JSON.stringify({ fileName: 'Veiculo.xml' }),
    })
    recordImport(suiteReport, 'valid-import', validImport)
    assert(validImport.total >= validImport.processed, 'Importacao valida de veiculo retornou total inconsistente.')
    assert((validImport.processed + validImport.skipped) === validImport.total, 'Importacao valida de veiculo nao fechou a contagem total.')
    assert((validImport.inserted + validImport.updated) === validImport.processed, 'Importacao valida de veiculo retornou contagem inconsistente.')
    logStep(`importacao valida do veiculo: ${validImport.processed} processado(s), ${validImport.updated} alterado(s), ${validImport.inserted} incluido(s), ${validImport.skipped} recusado(s)`) 

    const restoredItem = await findExactItemByCode('/api/veiculo', targetCode)
    assert(Boolean(restoredItem), `Registro ${targetCode} nao foi restaurado apos reimportacao valida.`)
    assert(restoredItem.tipo_de_bancada === originalItem.tipo_de_bancada, 'Tipo de bancada original nao foi restaurado apos reimportacao valida.')
    assert(restoredItem.os_especial === originalItem.os_especial, 'OS especial original nao foi restaurado apos reimportacao valida.')
    assert(restoredItem.marca_modelo === originalItem.marca_modelo, 'Marca/modelo original nao foi restaurado apos reimportacao valida.')
    logStep(`reimportacao valida e restauracao do registro ${targetCode} ok`)

    const invalidImport = await requestJson('/api/veiculo/import-xml', {
      method: 'POST',
      body: JSON.stringify({ fileName: 'Veiculo-invalid.xml' }),
    })
    recordImport(suiteReport, 'invalid-import', invalidImport)
    assert(invalidImport.skipped === 2, 'Importacao invalida de veiculo nao retornou 2 recusas.')
    assert(invalidImport.processed === 1, 'Importacao invalida de veiculo nao retornou 1 registro processado.')
    assert(Array.isArray(invalidImport.skippedRecords) && invalidImport.skippedRecords.length === 2, 'Importacao invalida de veiculo nao retornou os 2 registros recusados no payload.')
    assert(invalidImport.skippedRecords.some((item) => item.index === 2 && item.message.includes('codigo invalido no XML')), 'Recusa explicita por codigo invalido nao encontrada no payload de veiculo.')
    assert(invalidImport.skippedRecords.some((item) => item.index === 3 && (item.message.includes('tipo de bancada invalido no XML') || item.message.includes('tipo de veiculo invalido no XML'))), 'Recusa explicita por tipo invalido nao encontrada no payload de veiculo.')
    logStep(`importacao invalida do veiculo: ${invalidImport.processed} processado(s), ${invalidImport.skipped} recusado(s)`) 

    const rejectionResponse = await requestJson('/api/veiculo/import-rejections?page=1&pageSize=20&search=Veiculo-invalid.xml')
    const rejectionReasons = rejectionResponse.items
      .filter((item) => item.arquivo_xml === 'Veiculo-invalid.xml')
      .map((item) => item.motivo_recusa)

    assert(rejectionReasons.some((reason) => reason.includes('codigo invalido no XML')), 'Recusa por codigo invalido nao encontrada para veiculo.')
    assert(rejectionReasons.some((reason) => reason.includes('tipo de bancada invalido no XML') || reason.includes('tipo de veiculo invalido no XML')), 'Recusa por tipo invalido nao encontrada para veiculo.')
    logStep('importacao invalida e painel de recusas do veiculo ok')

    finalizeSuite(suiteReport, 'passed')
  } catch (error) {
    finalizeSuite(suiteReport, 'failed')
    throw error
  }
}

const runMarcaModeloSmoke = async () => {
  console.log('Smoke test da API Marca/Modelo')
  const suiteReport = recordSuite('marca-modelo')

  try {
    const baselineImport = await requestJson('/api/marca-modelo/import-xml', {
      method: 'POST',
      body: JSON.stringify({ fileName: 'marca-modelo.xml' }),
    })
    recordImport(suiteReport, 'baseline-import', baselineImport)

    let listResponse = await requestJson('/api/marca-modelo?page=1&pageSize=5&sortBy=codigo&sortDirection=asc')

    assert(Array.isArray(listResponse.items), 'Listagem de marca/modelo nao retornou items.')
    assert(listResponse.total > 0, 'Listagem de marca/modelo retornou total zerado.')
    logStep(`listagem inicial ok com ${listResponse.total} registro(s)`)

    const ascResponse = await requestJson('/api/marca-modelo?page=1&pageSize=5&sortBy=codigo&sortDirection=asc')
    const descResponse = await requestJson('/api/marca-modelo?page=1&pageSize=5&sortBy=codigo&sortDirection=desc')
    expectSortedByNumericString(ascResponse.items, 'codigo', 'asc')
    expectSortedByNumericString(descResponse.items, 'codigo', 'desc')
    assert(
      String(ascResponse.items[0]?.codigo ?? '') !== String(descResponse.items[0]?.codigo ?? ''),
      'Ordenacao asc/desc de marca/modelo retornou o mesmo primeiro registro.',
    )
    logStep('ordenacao numerica asc/desc por codigo ok')

    const targetResponse = await requestJson('/api/marca-modelo?page=1&pageSize=1&search=1')
    assert(targetResponse.total >= 1, 'Registro 1 de marca/modelo nao foi encontrado para o teste.')
    const originalItem = targetResponse.items.find((item) => item.codigo === '1') ?? targetResponse.items[0]
    assert(originalItem.codigo === '1', 'O smoke de marca/modelo exige o registro codigo 1.')
    const updatedDescricao = 'AGRALE/8.5NEOBUS THUNDER TESTE API'

    await requestJson('/api/marca-modelo/1', {
      method: 'PUT',
      body: JSON.stringify({
        codigo: originalItem.codigo,
        descricao: updatedDescricao,
      }),
    })

    const updatedResponse = await requestJson('/api/marca-modelo?page=1&pageSize=1&search=THUNDER TESTE API')
    assert(updatedResponse.total === 1, 'Alteracao de marca/modelo nao foi localizada apos edicao.')
    assert(updatedResponse.items[0]?.descricao === updatedDescricao, 'Alteracao de marca/modelo nao persistiu descricao.')
    logStep('edicao do registro importado 1 ok')

    const deleteResponse = await requestJson('/api/marca-modelo/1', { method: 'DELETE' })
    assert(deleteResponse.deletedCodigo === '1', 'Exclusao de marca/modelo nao retornou o codigo esperado.')
    const deletedLookup = await requestJson('/api/marca-modelo?page=1&pageSize=5&search=AGRALE/8.5NEOBUS THUNDER TESTE API')
    assert(deletedLookup.total === 0, 'Registro 1 ainda foi encontrado apos exclusao.')
    logStep('exclusao do registro importado 1 ok')

    const validImport = await requestJson('/api/marca-modelo/import-xml', {
      method: 'POST',
      body: JSON.stringify({ fileName: 'marca-modelo.xml' }),
    })
    recordImport(suiteReport, 'valid-import', validImport)
    assert(validImport.total >= validImport.processed, 'Importacao valida de marca/modelo retornou total inconsistente.')
    assert(validImport.processed > 0, 'Importacao valida de marca/modelo nao processou registros.')
    assert((validImport.inserted + validImport.updated) === validImport.processed, 'Importacao valida de marca/modelo retornou contagem inconsistente.')
    logStep(`importacao valida de marca/modelo: ${validImport.processed} processado(s), ${validImport.updated} alterado(s), ${validImport.inserted} incluido(s)`) 

    const restoredResponse = await requestJson('/api/marca-modelo?page=1&pageSize=5&search=AGRALE/8.5NEOBUS THUNDER')
    const restoredItem = restoredResponse.items.find((item) => item.codigo === '1')
    assert(Boolean(restoredItem), 'Registro 1 nao foi restaurado apos reimportacao valida.')
    assert(restoredItem?.descricao === originalItem.descricao, 'Descricao original nao foi restaurada apos reimportacao valida.')
    logStep('reimportacao valida e restauracao do registro 1 ok')

    finalizeSuite(suiteReport, 'passed')
  } catch (error) {
    finalizeSuite(suiteReport, 'failed')
    throw error
  }
}

const runApontamentoServicosSmoke = async () => {
  console.log('Smoke test da API Apontamento Servicos')
  const suiteReport = recordSuite('apontamento-servicos')

  try {
    await runNodeScript(new URL('./verify-apontamento-servicos-ordering.mjs', import.meta.url))
    logStep('ordenacao alfabetica oficial por empresa/condutor executada com sucesso')
    await runNodeScript(new URL('./verify-apontamento-servicos-negative-import.mjs', import.meta.url))
    logStep('importacao negativa oficial executada com sucesso para os tipos EMEI, EMEF, EMEE, CEI e CCA')
    finalizeSuite(suiteReport, 'passed')
  } catch (error) {
    finalizeSuite(suiteReport, 'failed')
    throw error
  }
}

try {
  if (suite === 'all' || suite === 'condutor') {
    await runCondutorSmoke()
  }

  if (suite === 'all') {
    console.log('')
  }

  if (suite === 'all' || suite === 'monitor') {
    await runMonitorSmoke()
  }

  if (suite === 'all') {
    console.log('')
  }

  if (suite === 'all' || suite === 'credenciada') {
    await runCredenciadaSmoke()
  }

  if (suite === 'all') {
    console.log('')
  }

  if (suite === 'all' || suite === 'ordem-servico') {
    await runOrdemServicoSmoke()
  }

  if (suite === 'all') {
    console.log('')
  }

  if (suite === 'veiculo' || (suite === 'all' && shouldRunVeiculoInAll)) {
    await runVeiculoSmoke()
  } else if (suite === 'all') {
    console.log('Suite de veiculo ignorada no smoke all (SMOKE_API_INCLUDE_VEICULO != true).')
  }

  if (suite === 'all') {
    console.log('')
  }

  if (suite === 'all' || suite === 'marca-modelo') {
    await runMarcaModeloSmoke()
  }

  if (suite === 'all') {
    console.log('')
  }

  if (suite === 'all' || suite === 'apontamento-servicos') {
    await runApontamentoServicosSmoke()
  }

  if (suite === 'documental') {
    await runDocumentalSmoke()
  }

  report.status = 'passed'
  console.log(`Smoke test concluido com sucesso (${suite}).`)
} catch (error) {
  report.status = 'failed'
  report.failureMessage = error instanceof Error ? error.message : String(error)
  console.error('Smoke test falhou.')
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  report.finishedAt = new Date().toISOString()
  await writeReportIfNeeded()
}
