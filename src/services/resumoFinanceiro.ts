import type { ApuracaoTipoPessoa } from './apuracaoTipoPessoa'

export type ResumoFinanceiroItem = {
  mesAno: string
  dreCodigo: string
  dreSigla: string
  dreDescricao: string
  tipoPessoa: ApuracaoTipoPessoa
  totalRevisoes: number
  maiorRevisao: number
  situacoesApuracaoFinanceira: string
  totalRegistros: number
  totalOrdensServico: number
  totalTiposEscola: number
  totalDatasReferencia: number
  naoCadeirantePresencial: number
  cadeirante: number
  atendimentoComplementarNaoCadeirante: number
  atendimentoComplementarCadeirante: number
  continuaNaoCadeirante: number
  continuaCadeirante: number
  kilometragem: string
  dataAlteracaoOrigem: string
}

export type ResumoFinanceiroSortField = 'mesAno' | 'dreDescricao' | 'tipoPessoa' | 'maiorRevisao' | 'totalRevisoes' | 'totalRegistros' | 'kilometragem' | 'dataAlteracaoOrigem'

type ResumoFinanceiroListResponse = {
  items: ResumoFinanceiroItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  sortBy: ResumoFinanceiroSortField
  sortDirection: 'asc' | 'desc'
}

export type ResumoFinanceiroListParams = {
  search?: string
  page?: number
  pageSize?: number
  sortBy?: ResumoFinanceiroSortField
  sortDirection?: 'asc' | 'desc'
}

export type ResumoFinanceiroListResult = {
  items: ResumoFinanceiroItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  sortBy: ResumoFinanceiroSortField
  sortDirection: 'asc' | 'desc'
}

export type ResumoFinanceiroDeleteCascadeRequest = {
  mesAno: string
  dreCodigo?: string
  revisao?: number | null
  tipoPessoa?: ApuracaoTipoPessoa | null
}

export type ResumoFinanceiroDeleteCascadeResult = {
  deletedRemuneracaoServicos: number
  deletedApuracaoServicos: number
  deletedApuracaoFinanceira: number
  filters: {
    mesAno: string
    dreCodigo: string
    revisao: number | null
    tipoPessoa: ApuracaoTipoPessoa | null
  }
}

const getResumoFinanceiroUrl = () => {
  return import.meta.env.VITE_RESUMO_FINANCEIRO_URL?.trim() || '/api/resumo-financeiro'
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
    : 'Falha ao processar o resumo financeiro.'
}

export async function listResumoFinanceiroItemsPaginated(params: ResumoFinanceiroListParams): Promise<ResumoFinanceiroListResult> {
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

  const requestUrl = queryParams.size ? `${getResumoFinanceiroUrl()}?${queryParams.toString()}` : getResumoFinanceiroUrl()
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

  const result = payload as ResumoFinanceiroListResponse

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

export async function deleteResumoFinanceiroCascade(request: ResumoFinanceiroDeleteCascadeRequest): Promise<ResumoFinanceiroDeleteCascadeResult> {
  const response = await fetch(`${getResumoFinanceiroUrl()}/excluir-cadeia`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(request),
  })

  const responseText = await response.text()
  const payload = parseJsonSafely(responseText)

  if (!response.ok) {
    throw new Error(getErrorMessage(payload))
  }

  return payload as ResumoFinanceiroDeleteCascadeResult
}