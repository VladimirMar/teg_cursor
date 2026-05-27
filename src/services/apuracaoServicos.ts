import type { ApuracaoFinanceiraStatus } from './apuracaoFinanceira'
import type { ApuracaoTipoPessoa } from './apuracaoTipoPessoa'

export type ApuracaoServicosKey = {
  mesAno: string
  dataReferencia: string
  dreCodigo: string
  ordemServicoCodigo: string
  revisao: number
  tipoPessoa: ApuracaoTipoPessoa
}

export type ApuracaoServicosItem = ApuracaoServicosKey & {
  dreSigla: string
  dreDescricao: string
  ordemServicoOsConcat: string
  ordemServicoTermoAdesao: string
  ordemServicoNumOs: string
  apuracaoFinanceiraSituacao: ApuracaoFinanceiraStatus
  naoCadeirantePresencial: number
  cadeirante: number
  atendimentoComplementarNaoCadeirante: number
  atendimentoComplementarCadeirante: number
  continuaNaoCadeirante: number
  continuaCadeirante: number
  kilometragem: string
  dataInclusao: string
  dataAlteracao: string
}

export type ApuracaoServicosSaveItem = ApuracaoServicosKey & {
  naoCadeirantePresencial: number
  cadeirante: number
  atendimentoComplementarNaoCadeirante: number
  atendimentoComplementarCadeirante: number
  continuaNaoCadeirante: number
  continuaCadeirante: number
  kilometragem: string
}

export type ApuracaoServicosOrdemServicoOption = {
  codigo: string
  osConcat: string
  termoAdesao: string
  numOs: string
  revisao: string
  dreCodigo: string
  dreDescricao: string
  modalidadeDescricao: string
  tipoPessoa: ApuracaoTipoPessoa
}

export type ApuracaoServicosSortField = 'mesAno' | 'dataReferencia' | 'dreCodigo' | 'dreDescricao' | 'ordemServicoCodigo' | 'revisao' | 'tipoPessoa' | 'dataInclusao' | 'dataAlteracao'

type ApuracaoServicosListResponse = {
  items: ApuracaoServicosItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  sortBy: ApuracaoServicosSortField
  sortDirection: 'asc' | 'desc'
}

type ApuracaoServicosCreateResponse = {
  item: ApuracaoServicosItem
}

type ApuracaoServicosDeleteResponse = {
  deletedKey: ApuracaoServicosKey
}

type OrdemServicoOptionsResponse = {
  items: ApuracaoServicosOrdemServicoOption[]
}

export type ApuracaoServicosListParams = {
  search?: string
  mesAno?: string
  dataReferencia?: string
  dreCodigo?: string
  revisao?: number
  tipoPessoa?: ApuracaoTipoPessoa
  page?: number
  pageSize?: number
  sortBy?: ApuracaoServicosSortField
  sortDirection?: 'asc' | 'desc'
}

export type ApuracaoServicosListResult = {
  items: ApuracaoServicosItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  sortBy: ApuracaoServicosSortField
  sortDirection: 'asc' | 'desc'
}

const getApuracaoServicosUrl = () => {
  return import.meta.env.VITE_APURACAO_SERVICOS_URL?.trim() || '/api/apuracao-servicos'
}

const getApuracaoServicosItemUrl = (key: ApuracaoServicosKey) => {
  return `${getApuracaoServicosUrl()}/${encodeURIComponent(key.mesAno)}/${encodeURIComponent(key.dreCodigo)}/${encodeURIComponent(key.ordemServicoCodigo)}/${encodeURIComponent(String(key.revisao))}/${encodeURIComponent(key.tipoPessoa)}/${encodeURIComponent(key.dataReferencia)}`
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

const getErrorMessage = (payload: Record<string, unknown>) => {
  return typeof payload.message === 'string' && payload.message.trim()
    ? payload.message
    : 'Falha ao processar dados de total de servicos.'
}

export async function listApuracaoServicosItemsPaginated(params: ApuracaoServicosListParams): Promise<ApuracaoServicosListResult> {
  const queryParams = new URLSearchParams()

  if (params.search?.trim()) {
    queryParams.set('search', params.search.trim())
  }

  if (params.mesAno?.trim()) {
    queryParams.set('mesAno', params.mesAno.trim())
  }

  if (params.dataReferencia?.trim()) {
    queryParams.set('dataReferencia', params.dataReferencia.trim())
  }

  if (params.dreCodigo?.trim()) {
    queryParams.set('dreCodigo', params.dreCodigo.trim())
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

  if (params.sortBy) {
    queryParams.set('sortBy', params.sortBy)
  }

  if (params.sortDirection) {
    queryParams.set('sortDirection', params.sortDirection)
  }

  const requestUrl = queryParams.size ? `${getApuracaoServicosUrl()}?${queryParams.toString()}` : getApuracaoServicosUrl()
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

  const result = payload as ApuracaoServicosListResponse
  return {
    items: result.items ?? [],
    total: result.total ?? 0,
    page: result.page ?? 1,
    pageSize: result.pageSize ?? params.pageSize ?? 20,
    totalPages: result.totalPages ?? 1,
    sortBy: result.sortBy ?? params.sortBy ?? 'mesAno',
    sortDirection: result.sortDirection ?? params.sortDirection ?? 'desc',
  }
}

export async function listApuracaoServicosOrdemServicoOptions(params: { mesAno: string; dreCodigo?: string; tipoPessoa?: ApuracaoTipoPessoa }): Promise<ApuracaoServicosOrdemServicoOption[]> {
  const queryParams = new URLSearchParams({
    mesAno: params.mesAno,
  })

  if (params.dreCodigo?.trim()) {
    queryParams.set('dreCodigo', params.dreCodigo.trim())
  }

  if (params.tipoPessoa?.trim()) {
    queryParams.set('tipoPessoa', params.tipoPessoa.trim())
  }

  const response = await fetch(`${getApuracaoServicosUrl()}/ordem-servico-options?${queryParams.toString()}`, {
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

  return (payload as OrdemServicoOptionsResponse).items ?? []
}

export async function createApuracaoServicosItem(item: ApuracaoServicosSaveItem): Promise<ApuracaoServicosItem> {
  const response = await fetch(getApuracaoServicosUrl(), {
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

  return (payload as ApuracaoServicosCreateResponse).item
}

export async function updateApuracaoServicosItem(originalKey: ApuracaoServicosKey, item: ApuracaoServicosSaveItem): Promise<ApuracaoServicosItem> {
  const response = await fetch(getApuracaoServicosItemUrl(originalKey), {
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

  return (payload as ApuracaoServicosCreateResponse).item
}

export async function deleteApuracaoServicosItem(key: ApuracaoServicosKey): Promise<ApuracaoServicosKey> {
  const response = await fetch(getApuracaoServicosItemUrl(key), {
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

  return (payload as ApuracaoServicosDeleteResponse).deletedKey
}