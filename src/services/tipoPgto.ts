export type TipoPgtoItem = {
  codigo: string
  descricao: string
}

export type TipoPgtoSaveItem = {
  codigo?: string
  descricao: string
}

type TipoPgtoListResponse = {
  items: TipoPgtoItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  sortBy: 'codigo' | 'descricao'
  sortDirection: 'asc' | 'desc'
}

type TipoPgtoCreateResponse = {
  item: TipoPgtoItem
}

type TipoPgtoDeleteResponse = {
  deletedCodigo: string
}

export type TipoPgtoListParams = {
  search?: string
  page?: number
  pageSize?: number
  sortBy?: 'codigo' | 'descricao'
  sortDirection?: 'asc' | 'desc'
}

export type TipoPgtoListResult = {
  items: TipoPgtoItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  sortBy: 'codigo' | 'descricao'
  sortDirection: 'asc' | 'desc'
}

const getTipoPgtoUrl = () => {
  return import.meta.env.VITE_TIPO_PGTO_URL?.trim() || '/api/tipo-pgto'
}

const getTipoPgtoItemUrl = (codigo: string) => {
  return `${getTipoPgtoUrl()}/${encodeURIComponent(codigo)}`
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
    : 'Falha ao processar dados do tipo de pagamento.'
}

export async function listTipoPgtoItemsPaginated(params: TipoPgtoListParams): Promise<TipoPgtoListResult> {
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

  const requestUrl = queryParams.size ? `${getTipoPgtoUrl()}?${queryParams.toString()}` : getTipoPgtoUrl()
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

  const result = payload as TipoPgtoListResponse
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

export async function createTipoPgtoItem(item: TipoPgtoSaveItem): Promise<TipoPgtoItem> {
  const response = await fetch(getTipoPgtoUrl(), {
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

  return (payload as TipoPgtoCreateResponse).item
}

export async function updateTipoPgtoItem(originalCodigo: string, item: TipoPgtoSaveItem): Promise<TipoPgtoItem> {
  const response = await fetch(getTipoPgtoItemUrl(originalCodigo), {
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

  return (payload as TipoPgtoCreateResponse).item
}

export async function deleteTipoPgtoItem(codigo: string): Promise<string> {
  const response = await fetch(getTipoPgtoItemUrl(codigo), {
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

  return (payload as TipoPgtoDeleteResponse).deletedCodigo
}