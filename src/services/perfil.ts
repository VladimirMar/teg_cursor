export type PerfilItem = {
  codigo: string
  descricao: string
}

export type PerfilSaveItem = {
  descricao: string
}

type PerfilListResponse = {
  items: PerfilItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  sortBy: 'codigo' | 'descricao'
  sortDirection: 'asc' | 'desc'
}

type PerfilCreateResponse = {
  item: PerfilItem
}

type PerfilDeleteResponse = {
  deletedCodigo: string
}

export type PerfilListParams = {
  search?: string
  page?: number
  pageSize?: number
  sortBy?: 'codigo' | 'descricao'
  sortDirection?: 'asc' | 'desc'
}

export type PerfilListResult = {
  items: PerfilItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  sortBy: 'codigo' | 'descricao'
  sortDirection: 'asc' | 'desc'
}

const getPerfilUrl = () => {
  return import.meta.env.VITE_PERFIL_URL?.trim() || '/api/perfil'
}

const getPerfilItemUrl = (codigo: string) => {
  return `${getPerfilUrl()}/${encodeURIComponent(codigo)}`
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
    : 'Falha ao processar dados do perfil.'
}

export async function listPerfilItemsPaginated(params: PerfilListParams): Promise<PerfilListResult> {
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

  const requestUrl = queryParams.size ? `${getPerfilUrl()}?${queryParams.toString()}` : getPerfilUrl()
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

  const result = payload as PerfilListResponse
  return {
    items: result.items ?? [],
    total: result.total ?? 0,
    page: result.page ?? 1,
    pageSize: result.pageSize ?? params.pageSize ?? 20,
    totalPages: result.totalPages ?? 1,
    sortBy: result.sortBy ?? params.sortBy ?? 'codigo',
    sortDirection: result.sortDirection ?? params.sortDirection ?? 'asc',
  }
}

export async function createPerfilItem(item: PerfilSaveItem): Promise<PerfilItem> {
  const response = await fetch(getPerfilUrl(), {
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

  return (payload as PerfilCreateResponse).item
}

export async function updatePerfilItem(originalCodigo: string, item: PerfilSaveItem): Promise<PerfilItem> {
  const response = await fetch(getPerfilItemUrl(originalCodigo), {
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

  return (payload as PerfilCreateResponse).item
}

export async function deletePerfilItem(codigo: string): Promise<string> {
  const response = await fetch(getPerfilItemUrl(codigo), {
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

  return (payload as PerfilDeleteResponse).deletedCodigo
}