import type { ApuracaoTipoPessoa } from './apuracaoTipoPessoa'

export const APURACAO_FINANCEIRA_STATUS_OPTIONS = [
  'A processar',
  'Processado',
  'Em digitacao',
  'Digitado',
  'Em aprovacao',
  'Aprovado SME',
  'Aguardando calculo',
  'Calculado',
  'Em liquidacao',
  'Liquidado',
  'Concluido',
] as const

export type ApuracaoFinanceiraStatus = (typeof APURACAO_FINANCEIRA_STATUS_OPTIONS)[number]

export type ApuracaoFinanceiraKey = {
  mesAno: string
  dreCodigo: string
  revisao: number
  tipoPessoa: ApuracaoTipoPessoa
}

export type ApuracaoFinanceiraItem = ApuracaoFinanceiraKey & {
  dreSigla: string
  dreDescricao: string
  situacao: ApuracaoFinanceiraStatus
  dataInclusao: string
  dataAlteracao: string
}

export type ApuracaoFinanceiraSaveItem = ApuracaoFinanceiraKey & {
  situacao: ApuracaoFinanceiraStatus
}

export type ApuracaoFinanceiraSortField = 'mesAno' | 'dreCodigo' | 'dreDescricao' | 'revisao' | 'tipoPessoa' | 'situacao' | 'dataInclusao' | 'dataAlteracao'

type ApuracaoFinanceiraListResponse = {
  items: ApuracaoFinanceiraItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  sortBy: ApuracaoFinanceiraSortField
  sortDirection: 'asc' | 'desc'
}

type ApuracaoFinanceiraCreateResponse = {
  item: ApuracaoFinanceiraItem
}

type ApuracaoFinanceiraDeleteResponse = {
  deletedKey: ApuracaoFinanceiraKey
}

type ApuracaoFinanceiraProcessDreSummary = {
  dreCodigo: string
  dreSigla: string
  dreDescricao: string
  tipoPessoa: ApuracaoTipoPessoa
  activeOrdemServicoCount: number
  createdApuracaoServicosCount: number
  existingApuracaoServicosCount: number
}

export type ApuracaoFinanceiraProcessRequest = {
  mesAno: string
  revisao: number
  tipoPessoa: ApuracaoTipoPessoa
  situacao: ApuracaoFinanceiraStatus
  dreCodigos: string[]
  replaceExistingDreCodigos?: string[]
  replaceExistingTipoPessoa?: ApuracaoTipoPessoa
}

type ApuracaoFinanceiraProcessActor = {
  name?: string | null
  email?: string | null
}

export type ApuracaoFinanceiraProcessResult = {
  mesAno: string
  revisao: number
  tipoPessoa: ApuracaoTipoPessoa
  situacao: ApuracaoFinanceiraStatus
  totalProcessedDres: number
  totalTipoEscola: number
  totalActiveOrdemServicos: number
  totalCreatedApuracaoServicos: number
  totalExistingApuracaoServicos: number
  processedDres: ApuracaoFinanceiraProcessDreSummary[]
}

type ApuracaoFinanceiraProcessResponse = {
  summary: ApuracaoFinanceiraProcessResult
}

export type ApuracaoFinanceiraListParams = {
  search?: string
  page?: number
  pageSize?: number
  sortBy?: ApuracaoFinanceiraSortField
  sortDirection?: 'asc' | 'desc'
}

export type ApuracaoFinanceiraListResult = {
  items: ApuracaoFinanceiraItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  sortBy: ApuracaoFinanceiraSortField
  sortDirection: 'asc' | 'desc'
}

const getApuracaoFinanceiraUrl = () => {
  return import.meta.env.VITE_APURACAO_FINANCEIRA_URL?.trim() || '/api/apuracao-financeira'
}

const getApuracaoFinanceiraItemUrl = (key: ApuracaoFinanceiraKey) => {
  return `${getApuracaoFinanceiraUrl()}/${encodeURIComponent(key.mesAno)}/${encodeURIComponent(key.dreCodigo)}/${encodeURIComponent(String(key.revisao))}/${encodeURIComponent(key.tipoPessoa)}`
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

const createApiError = (status: number, message: string) => {
  const error = new Error(message)
  ;(error as Error & { statusCode?: number }).statusCode = status
  return error
}

const getErrorMessage = (payload: Record<string, unknown>) => {
  return typeof payload.message === 'string' && payload.message.trim()
    ? payload.message
    : 'Falha ao processar dados da apuracao financeira.'
}

export async function listApuracaoFinanceiraItemsPaginated(params: ApuracaoFinanceiraListParams): Promise<ApuracaoFinanceiraListResult> {
  const queryParams = new URLSearchParams()

  if (params.search?.trim()) {
    queryParams.set('search', params.search.trim())
  }

  if (params.page) {
    queryParams.set('page', String(params.page))
  }

  if (params.pageSize) {
    queryParams.set('pageSize', String(params.pageSize))
  }

  if (params.sortBy) {
    queryParams.set('sortBy', params.sortBy)
  }

  if (params.sortDirection) {
    queryParams.set('sortDirection', params.sortDirection)
  }

  const requestUrl = queryParams.size ? `${getApuracaoFinanceiraUrl()}?${queryParams.toString()}` : getApuracaoFinanceiraUrl()
  const response = await fetch(requestUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  const responseText = await response.text()
  const payload = parseJsonSafely(responseText)

  if (!response.ok) {
    throw new Error(getErrorMessage(payload))
  }

  const result = payload as ApuracaoFinanceiraListResponse
  return {
    items: result.items ?? [],
    total: result.total ?? 0,
    page: result.page ?? 1,
    pageSize: result.pageSize ?? params.pageSize ?? 5,
    totalPages: result.totalPages ?? 1,
    sortBy: result.sortBy ?? params.sortBy ?? 'mesAno',
    sortDirection: result.sortDirection ?? params.sortDirection ?? 'desc',
  }
}

export async function createApuracaoFinanceiraItem(item: ApuracaoFinanceiraSaveItem): Promise<ApuracaoFinanceiraItem> {
  const response = await fetch(getApuracaoFinanceiraUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(item),
  })

  const responseText = await response.text()
  const payload = parseJsonSafely(responseText)

  if (!response.ok) {
    throw new Error(getErrorMessage(payload))
  }

  return (payload as ApuracaoFinanceiraCreateResponse).item
}

export async function updateApuracaoFinanceiraItem(originalKey: ApuracaoFinanceiraKey, item: ApuracaoFinanceiraSaveItem): Promise<ApuracaoFinanceiraItem> {
  const response = await fetch(getApuracaoFinanceiraItemUrl(originalKey), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(item),
  })

  const responseText = await response.text()
  const payload = parseJsonSafely(responseText)

  if (!response.ok) {
    throw new Error(getErrorMessage(payload))
  }

  return (payload as ApuracaoFinanceiraCreateResponse).item
}

export async function deleteApuracaoFinanceiraItem(key: ApuracaoFinanceiraKey): Promise<ApuracaoFinanceiraKey> {
  const response = await fetch(getApuracaoFinanceiraItemUrl(key), {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
    },
  })

  const responseText = await response.text()
  const payload = parseJsonSafely(responseText)

  if (!response.ok) {
    throw new Error(getErrorMessage(payload))
  }

  return (payload as ApuracaoFinanceiraDeleteResponse).deletedKey
}

export async function processApuracaoFinanceiraData(
  item: ApuracaoFinanceiraProcessRequest,
  actor?: ApuracaoFinanceiraProcessActor,
): Promise<ApuracaoFinanceiraProcessResult> {
  const response = await fetch(`${getApuracaoFinanceiraUrl()}/processar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(actor?.name ? { 'x-user-name': actor.name } : {}),
      ...(actor?.email ? { 'x-user-email': actor.email } : {}),
    },
    body: JSON.stringify(item),
  })

  const responseText = await response.text()
  const payload = parseJsonSafely(responseText)

  if (!response.ok) {
    throw createApiError(response.status, getErrorMessage(payload))
  }

  return (payload as ApuracaoFinanceiraProcessResponse).summary
}