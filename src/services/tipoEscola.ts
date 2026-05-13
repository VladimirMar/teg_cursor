export type TipoEscolaItem = {
  codigo: string
  sigla: string
  descricao: string
}

export type TipoEscolaSaveItem = {
  codigo?: string
  sigla: string
  descricao: string
}

type TipoEscolaListResponse = {
  items: TipoEscolaItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  sortBy: 'codigo' | 'sigla' | 'descricao'
  sortDirection: 'asc' | 'desc'
}

type TipoEscolaCreateResponse = {
  item: TipoEscolaItem
}

type TipoEscolaDeleteResponse = {
  deletedCodigo: string
}

export type TipoEscolaListParams = {
  search?: string
  page?: number
  pageSize?: number
  sortBy?: 'codigo' | 'sigla' | 'descricao'
  sortDirection?: 'asc' | 'desc'
}

export type TipoEscolaListResult = {
  items: TipoEscolaItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  sortBy: 'codigo' | 'sigla' | 'descricao'
  sortDirection: 'asc' | 'desc'
}

const getTipoEscolaUrl = () => {
  return import.meta.env.VITE_TIPO_ESCOLA_URL?.trim() || '/api/tipo-escola'
}

const getTipoEscolaItemUrl = (codigo: string) => {
  return `${getTipoEscolaUrl()}/${encodeURIComponent(codigo)}`
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
    : 'Falha ao processar dados do tipo de escola.'
}

export async function listTipoEscolaItemsPaginated(params: TipoEscolaListParams): Promise<TipoEscolaListResult> {
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

  const requestUrl = queryParams.size ? `${getTipoEscolaUrl()}?${queryParams.toString()}` : getTipoEscolaUrl()
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

  const result = payload as TipoEscolaListResponse
  return {
    items: result.items ?? [],
    total: result.total ?? 0,
    page: result.page ?? 1,
    pageSize: result.pageSize ?? params.pageSize ?? 5,
    totalPages: result.totalPages ?? 1,
    sortBy: result.sortBy ?? params.sortBy ?? 'codigo',
    sortDirection: result.sortDirection ?? params.sortDirection ?? 'asc',
  }
}

export async function createTipoEscolaItem(item: TipoEscolaSaveItem): Promise<TipoEscolaItem> {
  const response = await fetch(getTipoEscolaUrl(), {
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

  return (payload as TipoEscolaCreateResponse).item
}

export async function updateTipoEscolaItem(originalCodigo: string, item: TipoEscolaSaveItem): Promise<TipoEscolaItem> {
  const response = await fetch(getTipoEscolaItemUrl(originalCodigo), {
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

  return (payload as TipoEscolaCreateResponse).item
}

export async function deleteTipoEscolaItem(codigo: string): Promise<string> {
  const response = await fetch(getTipoEscolaItemUrl(codigo), {
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

  return (payload as TipoEscolaDeleteResponse).deletedCodigo
}