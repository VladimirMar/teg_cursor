import type { ApuracaoFinanceiraStatus } from './apuracaoFinanceira'
import type { ApuracaoTipoPessoa, ApuracaoTipoPessoaFilter } from './apuracaoTipoPessoa'

export type RemuneracaoServicosItem = {
  mesAno: string
  dreCodigo: string
  dreSigla: string
  dreDescricao: string
  ordemServicoCodigo: string
  ordemServicoOsConcat: string
  ordemServicoTermoAdesao: string
  ordemServicoNumOs: string
  revisao: number
  tipoPessoa: ApuracaoTipoPessoa
  periodoInicio: string
  periodoFim: string
  crmcCondutor: string
  contrato: string
  placa: string
  empresa: string
  nomeCondutor: string
  tipoVeiculo: string
  veiculoOsEspecial: string
  apuracaoFinanceiraSituacao: ApuracaoFinanceiraStatus
  dataReferencia: string
  isAtivoNaData: boolean
  tegRegularFixo: number
  tegRegularPercapita: number
  tegAcessivelFixo: number
  tegAcessivelPercapita: number
  tegEspecialRegularFixo: number
  tegEspecialRegularPercapita: number
  tegEspecialAcessivelFixo: number
  tegEspecialAcessivelPercapita: number
  tegCrecheFixo: number
  tegCrechePercapita: number
  kmValor: number
  continuaRegular: number
  continuaCadeirante: number
  ccaValor: number
}

export type RemuneracaoServicosSaveItem = Pick<
  RemuneracaoServicosItem,
  | 'dreCodigo'
  | 'ordemServicoCodigo'
  | 'revisao'
  | 'tipoPessoa'
  | 'tegRegularFixo'
  | 'tegRegularPercapita'
  | 'tegAcessivelFixo'
  | 'tegAcessivelPercapita'
  | 'tegEspecialRegularFixo'
  | 'tegEspecialRegularPercapita'
  | 'tegEspecialAcessivelFixo'
  | 'tegEspecialAcessivelPercapita'
  | 'tegCrecheFixo'
  | 'tegCrechePercapita'
  | 'kmValor'
  | 'continuaRegular'
  | 'continuaCadeirante'
  | 'ccaValor'
>

type RemuneracaoServicosListResponse = {
  items: RemuneracaoServicosItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  mesAno: string
  dataReferencia: string
}

type RemuneracaoServicosListParams = {
  mesAno: string
  dataReferencia: string
  dreCodigo?: string
  crmcCondutor?: string
  placa?: string
  revisao?: number
  tipoPessoa?: ApuracaoTipoPessoaFilter
  page?: number
  pageSize?: number
}

export type RemuneracaoServicosCalculateParams = {
  mesAno: string
  dataReferencia: string
  dreCodigo?: string
  crmcCondutor?: string
  placa?: string
  revisao?: number
  tipoPessoa?: ApuracaoTipoPessoaFilter
  page?: number
  pageSize?: number
}

export type RemuneracaoServicosCalculateResult = {
  totalRegistros: number
  totalCalculados: number
  totalAtualizados: number
  totalIgnorados: number
}

export type RemuneracaoServicosBatchStatus = {
  jobId: string
  message: string
  status: 'idle' | 'running' | 'passed' | 'failed'
  exitCode: number | null
  isRunning: boolean
  startedAt: string
  finishedAt: string
  requestedFilters: RemuneracaoServicosCalculateParams | null
  summary: RemuneracaoServicosCalculateResult | null
  errorMessage: string
  totalRegistros: number
  totalCalculados: number
  totalAtualizados: number
  totalIgnorados: number
}

const getRemuneracaoServicosUrl = () => {
  return import.meta.env.VITE_REMUNERACAO_SERVICOS_URL?.trim() || '/api/remuneracao-servicos'
}

const getRemuneracaoServicosBatchUrl = () => {
  return `${getRemuneracaoServicosUrl()}/calcular`
}

const parseJsonSafely = (value: string) => {
  if (!value) {
    return {}
  }

  try {
    return JSON.parse(value) as Record<string, unknown>
  } catch {
    return { message: value }
  }
}

const getErrorMessage = (payload: unknown, responseStatus?: number, responseStatusText?: string) => {
  if (Array.isArray(payload)) {
    const firstText = payload.find((value) => typeof value === 'string' && value.trim()) as string | undefined

    if (firstText) {
      return firstText.trim()
    }
  }

  if (!payload || typeof payload !== 'object') {
    if (Number.isInteger(responseStatus)) {
      const statusSuffix = responseStatusText?.trim() ? ` (${responseStatusText.trim()})` : ''
      return `Falha ao processar dados da remuneracao de servicos. HTTP ${responseStatus}${statusSuffix}.`
    }

    return 'Falha ao processar dados da remuneracao de servicos.'
  }

  const payloadObject = payload as Record<string, unknown>

  if (typeof payloadObject.message === 'string' && payloadObject.message.trim()) {
    return payloadObject.message.trim()
  }

  if (typeof payloadObject.errorMessage === 'string' && payloadObject.errorMessage.trim()) {
    return payloadObject.errorMessage.trim()
  }

  if (typeof payloadObject.error === 'string' && payloadObject.error.trim()) {
    return payloadObject.error.trim()
  }

  if (Array.isArray(payloadObject.errors)) {
    const firstListError = payloadObject.errors.find((value) => typeof value === 'string' && value.trim()) as string | undefined

    if (firstListError) {
      return firstListError.trim()
    }
  }

  if (payloadObject.errors && typeof payloadObject.errors === 'object' && !Array.isArray(payloadObject.errors)) {
    const firstError = Object.values(payloadObject.errors as Record<string, unknown>).find(
      (value) => typeof value === 'string' && value.trim(),
    ) as string | undefined

    if (firstError) {
      return firstError.trim()
    }
  }

  if (Number.isInteger(responseStatus)) {
    const statusSuffix = responseStatusText?.trim() ? ` (${responseStatusText.trim()})` : ''
    return `Falha ao processar dados da remuneracao de servicos. HTTP ${responseStatus}${statusSuffix}.`
  }

  return 'Falha ao processar dados da remuneracao de servicos.'
}

const normalizeBatchStatus = (
  payload: Record<string, unknown>,
  fallbackFilters: RemuneracaoServicosCalculateParams | null = null,
): RemuneracaoServicosBatchStatus => {
  const summaryPayload = (payload.summary as Partial<RemuneracaoServicosCalculateResult> | null | undefined) ?? null

  return {
    jobId: typeof payload.jobId === 'string' ? payload.jobId : '',
    message: typeof payload.message === 'string' && payload.message.trim()
      ? payload.message
      : 'Processamento em lote da remuneracao de servicos.',
    status: (payload.status as RemuneracaoServicosBatchStatus['status']) ?? 'idle',
    exitCode: payload.exitCode === null || payload.exitCode === undefined
      ? null
      : Number(payload.exitCode) || 0,
    isRunning: Boolean(payload.isRunning),
    startedAt: typeof payload.startedAt === 'string' ? payload.startedAt : '',
    finishedAt: typeof payload.finishedAt === 'string' ? payload.finishedAt : '',
    requestedFilters: (payload.requestedFilters as RemuneracaoServicosCalculateParams | null) ?? fallbackFilters,
    summary: summaryPayload
      ? {
          totalRegistros: Number(summaryPayload.totalRegistros) || 0,
          totalCalculados: Number(summaryPayload.totalCalculados) || 0,
          totalAtualizados: Number(summaryPayload.totalAtualizados) || 0,
          totalIgnorados: Number(summaryPayload.totalIgnorados) || 0,
        }
      : null,
    errorMessage: typeof payload.errorMessage === 'string' ? payload.errorMessage : '',
    totalRegistros: Number(payload.totalRegistros) || Number(summaryPayload?.totalRegistros) || 0,
    totalCalculados: Number(payload.totalCalculados) || Number(summaryPayload?.totalCalculados) || 0,
    totalAtualizados: Number(payload.totalAtualizados) || Number(summaryPayload?.totalAtualizados) || 0,
    totalIgnorados: Number(payload.totalIgnorados) || Number(summaryPayload?.totalIgnorados) || 0,
  }
}

export async function listRemuneracaoServicosItems(params: RemuneracaoServicosListParams): Promise<RemuneracaoServicosListResponse> {
  const queryParams = new URLSearchParams({
    mesAno: params.mesAno,
    dataReferencia: params.dataReferencia,
  })

  if (params.dreCodigo?.trim()) {
    queryParams.set('dreCodigo', params.dreCodigo.trim())
  }

  if (params.crmcCondutor?.trim()) {
    queryParams.set('crmcCondutor', params.crmcCondutor.trim())
  }

  if (params.placa?.trim()) {
    queryParams.set('placa', params.placa.trim())
  }

  if (typeof params.revisao === 'number') {
    queryParams.set('revisao', String(params.revisao))
  }

  if (params.tipoPessoa?.trim()) {
    queryParams.set('tipoPessoa', params.tipoPessoa.trim())
  }

  if (params.page) {
    queryParams.set('page', String(params.page))
  }

  if (params.pageSize) {
    queryParams.set('pageSize', String(params.pageSize))
  }

  const response = await fetch(`${getRemuneracaoServicosUrl()}?${queryParams.toString()}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  const responseText = await response.text()
  const payload = parseJsonSafely(responseText)

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, response.status, response.statusText))
  }

  return {
    items: (payload as RemuneracaoServicosListResponse).items ?? [],
    total: (payload as RemuneracaoServicosListResponse).total ?? 0,
    page: (payload as RemuneracaoServicosListResponse).page ?? params.page ?? 1,
    pageSize: (payload as RemuneracaoServicosListResponse).pageSize ?? params.pageSize ?? 20,
    totalPages: (payload as RemuneracaoServicosListResponse).totalPages ?? 1,
    mesAno: (payload as RemuneracaoServicosListResponse).mesAno ?? params.mesAno,
    dataReferencia: (payload as RemuneracaoServicosListResponse).dataReferencia ?? params.dataReferencia,
  }
}

export async function saveRemuneracaoServicosItems(params: {
  mesAno: string
  dataReferencia: string
  items: RemuneracaoServicosSaveItem[]
}): Promise<string> {
  const response = await fetch(getRemuneracaoServicosUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(params),
  })

  const responseText = await response.text()
  const payload = parseJsonSafely(responseText)

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, response.status, response.statusText))
  }

  return typeof payload.message === 'string'
    ? payload.message
    : 'Remuneracao de servicos gravada com sucesso.'
}

export async function startRemuneracaoServicosBatch(params: RemuneracaoServicosCalculateParams): Promise<RemuneracaoServicosBatchStatus> {
  const response = await fetch(getRemuneracaoServicosBatchUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(params),
  })

  const responseText = await response.text()
  const payload = parseJsonSafely(responseText)

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, response.status, response.statusText))
  }

  return normalizeBatchStatus(payload, params)
}

export async function getRemuneracaoServicosBatchStatus(): Promise<RemuneracaoServicosBatchStatus> {
  const response = await fetch(getRemuneracaoServicosBatchUrl(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  const responseText = await response.text()
  const payload = parseJsonSafely(responseText)

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, response.status, response.statusText))
  }

  return normalizeBatchStatus(payload)
}

export async function calculateRemuneracaoServicosItems(params: RemuneracaoServicosCalculateParams): Promise<RemuneracaoServicosBatchStatus> {
  return startRemuneracaoServicosBatch(params)
}
