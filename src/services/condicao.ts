export type CondicaoItem = {
  codigo: string
  descricao: string
  qtdeIni: number
  qtdeFim: number
  exibirKmValor: boolean
}

export type CondicaoSaveItem = {
  descricao: string
  qtdeIni: number
  qtdeFim: number
}

type CondicaoListResponseItem = {
  codigo: string
  descricao: string
  qtde_ini: number
  qtde_fim: number
  exibir_km_valor?: string
}

type CondicaoListResponse = {
  items: CondicaoListResponseItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  sortBy: CondicaoSortField
  sortDirection: 'asc' | 'desc'
}

type CondicaoCreateResponse = {
  item: CondicaoListResponseItem
}

type CondicaoDeleteResponse = {
  deletedCodigo: string
}

export type CondicaoSortField = 'codigo' | 'descricao' | 'qtdeIni' | 'qtdeFim'

export type CondicaoListParams = {
  search?: string
  page?: number
  pageSize?: number
  sortBy?: CondicaoSortField
  sortDirection?: 'asc' | 'desc'
}

export type CondicaoListResult = {
  items: CondicaoItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  sortBy: CondicaoSortField
  sortDirection: 'asc' | 'desc'
}

const getCondicaoUrl = () => {
  return import.meta.env.VITE_CONDICAO_URL?.trim() || '/api/condicao'
}

const getCondicaoItemUrl = (codigo: string) => {
  return `${getCondicaoUrl()}/${encodeURIComponent(codigo)}`
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
    : 'Falha ao processar dados da condicao.'
}

const mapCondicaoItem = (item: CondicaoListResponseItem): CondicaoItem => {
  return {
    codigo: item.codigo,
    descricao: item.descricao,
    qtdeIni: Number(item.qtde_ini ?? 0),
    qtdeFim: Number(item.qtde_fim ?? 0),
    exibirKmValor: String(item.exibir_km_valor ?? '').trim().toLowerCase() === 'yes',
  }
}

export async function listCondicaoItemsPaginated(params: CondicaoListParams): Promise<CondicaoListResult> {
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

  const requestUrl = queryParams.size ? `${getCondicaoUrl()}?${queryParams.toString()}` : getCondicaoUrl()
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

  const result = payload as CondicaoListResponse
  return {
    items: (result.items ?? []).map(mapCondicaoItem),
    total: result.total ?? 0,
    page: result.page ?? 1,
    pageSize: result.pageSize ?? params.pageSize ?? 5,
    totalPages: result.totalPages ?? 1,
    sortBy: result.sortBy ?? params.sortBy ?? 'codigo',
    sortDirection: result.sortDirection ?? params.sortDirection ?? 'asc',
  }
}

export async function createCondicaoItem(item: CondicaoSaveItem): Promise<CondicaoItem> {
  const response = await fetch(getCondicaoUrl(), {
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

  return mapCondicaoItem((payload as CondicaoCreateResponse).item)
}

export async function updateCondicaoItem(originalCodigo: string, item: CondicaoSaveItem): Promise<CondicaoItem> {
  const response = await fetch(getCondicaoItemUrl(originalCodigo), {
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

  return mapCondicaoItem((payload as CondicaoCreateResponse).item)
}

export async function deleteCondicaoItem(codigo: string): Promise<string> {
  const response = await fetch(getCondicaoItemUrl(codigo), {
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

  return (payload as CondicaoDeleteResponse).deletedCodigo
}