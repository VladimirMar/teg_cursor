import type { ApuracaoTipoPessoa } from './apuracaoTipoPessoa'
import { listTotalRemuneracaoServicosItems } from './totalRemuneracaoServicos'

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
  continuaRegularValor: number
  continuaCadeiranteValor: number
  ccaValor: number
}

export type ResumoFinanceiroRemuneracaoTotals = Pick<
  ResumoFinanceiroItem,
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
  | 'continuaRegularValor'
  | 'continuaCadeiranteValor'
  | 'ccaValor'
>

export type ResumoFinanceiroSortField = 'mesAno' | 'dreDescricao' | 'tipoPessoa' | 'maiorRevisao' | 'totalRevisoes' | 'totalRegistros' | 'totalOrdensServico' | 'kilometragem' | 'dataAlteracaoOrigem'

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

const createEmptyResumoFinanceiroRemuneracaoTotals = (): ResumoFinanceiroRemuneracaoTotals => ({
  tegRegularFixo: 0,
  tegRegularPercapita: 0,
  tegAcessivelFixo: 0,
  tegAcessivelPercapita: 0,
  tegEspecialRegularFixo: 0,
  tegEspecialRegularPercapita: 0,
  tegEspecialAcessivelFixo: 0,
  tegEspecialAcessivelPercapita: 0,
  tegCrecheFixo: 0,
  tegCrechePercapita: 0,
  kmValor: 0,
  continuaRegularValor: 0,
  continuaCadeiranteValor: 0,
  ccaValor: 0,
})

export async function fetchRemuneracaoTotalsForResumoItem(
  item: Pick<ResumoFinanceiroItem, 'mesAno' | 'dreCodigo' | 'tipoPessoa' | 'maiorRevisao'>,
): Promise<ResumoFinanceiroRemuneracaoTotals> {
  const totals = createEmptyResumoFinanceiroRemuneracaoTotals()
  let page = 1
  let totalPages = 1
  const pageSize = 50

  while (page <= totalPages) {
    const result = await listTotalRemuneracaoServicosItems({
      mesAno: item.mesAno,
      dreCodigo: item.dreCodigo,
      tipoPessoa: item.tipoPessoa,
      revisao: item.maiorRevisao,
      page,
      pageSize,
    })

    totalPages = result.totalPages

    for (const row of result.items) {
      totals.tegRegularFixo += row.tegRegularFixo || 0
      totals.tegRegularPercapita += row.tegRegularPercapita || 0
      totals.tegAcessivelFixo += row.tegAcessivelFixo || 0
      totals.tegAcessivelPercapita += row.tegAcessivelPercapita || 0
      totals.tegEspecialRegularFixo += row.tegEspecialRegularFixo || 0
      totals.tegEspecialRegularPercapita += row.tegEspecialRegularPercapita || 0
      totals.tegEspecialAcessivelFixo += row.tegEspecialAcessivelFixo || 0
      totals.tegEspecialAcessivelPercapita += row.tegEspecialAcessivelPercapita || 0
      totals.tegCrecheFixo += row.tegCrecheFixo || 0
      totals.tegCrechePercapita += row.tegCrechePercapita || 0
      totals.kmValor += row.kmValor || 0
      totals.continuaRegularValor += row.continuaRegular || 0
      totals.continuaCadeiranteValor += row.continuaCadeirante || 0
      totals.ccaValor += row.ccaValor || 0
    }

    page += 1
  }

  return totals
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