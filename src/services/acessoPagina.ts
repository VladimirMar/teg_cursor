export type AcessoPaginaFuncao = 'menu' | 'formulario'

export type AcessoPaginaItem = {
  codigo: string
  sigla: string
  descricao: string
  funcao: AcessoPaginaFuncao
}

export type AcessoPaginaSaveItem = {
  sigla: string
  descricao: string
  funcao: AcessoPaginaFuncao
}

type AcessoPaginaListResponse = {
  items: AcessoPaginaItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  sortBy: 'codigo' | 'sigla' | 'descricao' | 'funcao'
  sortDirection: 'asc' | 'desc'
}

type AcessoPaginaCreateResponse = {
  item: AcessoPaginaItem
}

type AcessoPaginaDeleteResponse = {
  deletedCodigo: string
}

export type AcessoPaginaListParams = {
  search?: string
  page?: number
  pageSize?: number
  sortBy?: 'codigo' | 'sigla' | 'descricao' | 'funcao'
  sortDirection?: 'asc' | 'desc'
}

export type AcessoPaginaListResult = {
  items: AcessoPaginaItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  sortBy: 'codigo' | 'sigla' | 'descricao' | 'funcao'
  sortDirection: 'asc' | 'desc'
}

const getAcessoPaginaUrl = () => {
  return import.meta.env.VITE_ACESSO_PAGINA_URL?.trim() || '/api/acesso-pagina'
}

const getAcessoPaginaItemUrl = (codigo: string) => {
  return `${getAcessoPaginaUrl()}/${encodeURIComponent(codigo)}`
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
    : 'Falha ao processar dados do acesso pagina.'
}

export async function listAcessoPaginaItemsPaginated(params: AcessoPaginaListParams): Promise<AcessoPaginaListResult> {
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

  const requestUrl = queryParams.size ? `${getAcessoPaginaUrl()}?${queryParams.toString()}` : getAcessoPaginaUrl()
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

  const result = payload as AcessoPaginaListResponse
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

export async function createAcessoPaginaItem(item: AcessoPaginaSaveItem): Promise<AcessoPaginaItem> {
  const response = await fetch(getAcessoPaginaUrl(), {
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

  return (payload as AcessoPaginaCreateResponse).item
}

export async function updateAcessoPaginaItem(originalCodigo: string, item: AcessoPaginaSaveItem): Promise<AcessoPaginaItem> {
  const response = await fetch(getAcessoPaginaItemUrl(originalCodigo), {
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

  return (payload as AcessoPaginaCreateResponse).item
}

export async function deleteAcessoPaginaItem(codigo: string): Promise<string> {
  const response = await fetch(getAcessoPaginaItemUrl(codigo), {
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

  return (payload as AcessoPaginaDeleteResponse).deletedCodigo
}