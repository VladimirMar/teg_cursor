export const ALIQUOTA_OPTANTE_TIPO_EMPRESA_OPTIONS = ['Cooperativa', 'Outros'] as const

export type AliquotaOptanteTipoEmpresa = (typeof ALIQUOTA_OPTANTE_TIPO_EMPRESA_OPTIONS)[number]

export type AliquotaOptanteItem = {
  data: string
  tipoEmpresa: AliquotaOptanteTipoEmpresa
  aliquota: number
}

export type AliquotaOptanteSaveItem = {
  data: string
  tipoEmpresa: AliquotaOptanteTipoEmpresa
  aliquota: string
}

export type AliquotaOptanteKey = {
  data: string
  tipoEmpresa: AliquotaOptanteTipoEmpresa
}

export type AliquotaOptanteSortField = 'data' | 'tipoEmpresa' | 'aliquota'

type AliquotaOptanteListResponse = {
  items: Array<{
    data: string
    tipo_empresa: AliquotaOptanteTipoEmpresa
    aliquota: string | number
  }>
  total: number
  page: number
  pageSize: number
  totalPages: number
  sortBy: AliquotaOptanteSortField
  sortDirection: 'asc' | 'desc'
}

type AliquotaOptanteCreateResponse = {
  item: AliquotaOptanteListResponse['items'][number]
}

type AliquotaOptanteDeleteResponse = {
  deletedKey: {
    data: string
    tipo_empresa: AliquotaOptanteTipoEmpresa
  }
}

export type AliquotaOptanteListParams = {
  search?: string
  page?: number
  pageSize?: number
  sortBy?: AliquotaOptanteSortField
  sortDirection?: 'asc' | 'desc'
}

export type AliquotaOptanteListResult = {
  items: AliquotaOptanteItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  sortBy: AliquotaOptanteSortField
  sortDirection: 'asc' | 'desc'
}

const getAliquotaOptanteUrl = () => {
  return import.meta.env.VITE_ALIQUOTA_OPTANTE_URL?.trim() || '/api/aliquota-optante'
}

const getAliquotaOptanteItemUrl = (key: AliquotaOptanteKey) => {
  return `${getAliquotaOptanteUrl()}/${encodeURIComponent(key.data)}/${encodeURIComponent(key.tipoEmpresa)}`
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
    : 'Falha ao processar dados de aliquota optante.'
}

const mapItem = (item: AliquotaOptanteListResponse['items'][number]): AliquotaOptanteItem => ({
  data: item.data,
  tipoEmpresa: item.tipo_empresa,
  aliquota: Number(item.aliquota ?? 0),
})

export async function listAliquotaOptanteItemsPaginated(params: AliquotaOptanteListParams): Promise<AliquotaOptanteListResult> {
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

  const requestUrl = queryParams.size ? `${getAliquotaOptanteUrl()}?${queryParams.toString()}` : getAliquotaOptanteUrl()
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

  const typedPayload = payload as AliquotaOptanteListResponse
  const items = (typedPayload.items ?? []).map(mapItem)

  return {
    items,
    total: typedPayload.total ?? items.length,
    page: typedPayload.page ?? params.page ?? 1,
    pageSize: typedPayload.pageSize ?? params.pageSize ?? 5,
    totalPages: typedPayload.totalPages ?? 1,
    sortBy: typedPayload.sortBy ?? params.sortBy ?? 'data',
    sortDirection: typedPayload.sortDirection ?? params.sortDirection ?? 'desc',
  }
}

export async function createAliquotaOptanteItem(item: AliquotaOptanteSaveItem): Promise<AliquotaOptanteItem> {
  const response = await fetch(getAliquotaOptanteUrl(), {
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

  return mapItem((payload as AliquotaOptanteCreateResponse).item)
}

export async function updateAliquotaOptanteItem(originalKey: AliquotaOptanteKey, item: AliquotaOptanteSaveItem): Promise<AliquotaOptanteItem> {
  const response = await fetch(getAliquotaOptanteItemUrl(originalKey), {
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

  return mapItem((payload as AliquotaOptanteCreateResponse).item)
}

export async function deleteAliquotaOptanteItem(key: AliquotaOptanteKey): Promise<AliquotaOptanteKey> {
  const response = await fetch(getAliquotaOptanteItemUrl(key), {
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

  const deletedKey = (payload as AliquotaOptanteDeleteResponse).deletedKey

  return {
    data: deletedKey.data,
    tipoEmpresa: deletedKey.tipo_empresa,
  }
}