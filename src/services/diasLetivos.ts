export type DiasLetivosItem = {
  data: string
  diasLetivos: number
}

export type DiasLetivosSaveItem = {
  data: string
  diasLetivos: string
}

export type DiasLetivosSortField = 'data' | 'diasLetivos'

type DiasLetivosListResponse = {
  items: Array<{
    data: string
    dias_letivos: string | number
  }>
  total: number
  page: number
  pageSize: number
  totalPages: number
  sortBy: DiasLetivosSortField
  sortDirection: 'asc' | 'desc'
}

type DiasLetivosCreateResponse = {
  item: DiasLetivosListResponse['items'][number]
}

type DiasLetivosDeleteResponse = {
  deletedData: string
}

export type DiasLetivosListParams = {
  search?: string
  page?: number
  pageSize?: number
  sortBy?: DiasLetivosSortField
  sortDirection?: 'asc' | 'desc'
}

export type DiasLetivosListResult = {
  items: DiasLetivosItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  sortBy: DiasLetivosSortField
  sortDirection: 'asc' | 'desc'
}

const getDiasLetivosUrl = () => {
  return import.meta.env.VITE_DIAS_LETIVOS_URL?.trim() || '/api/dias-letivos'
}

const getDiasLetivosItemUrl = (data: string) => `${getDiasLetivosUrl()}/${encodeURIComponent(data)}`

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
    : 'Falha ao processar dados de dias letivos.'
}

const mapItem = (item: DiasLetivosListResponse['items'][number]): DiasLetivosItem => ({
  data: item.data,
  diasLetivos: Number(item.dias_letivos ?? 0),
})

export async function listDiasLetivosItemsPaginated(params: DiasLetivosListParams): Promise<DiasLetivosListResult> {
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

  const requestUrl = queryParams.size ? `${getDiasLetivosUrl()}?${queryParams.toString()}` : getDiasLetivosUrl()
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

  const typedPayload = payload as DiasLetivosListResponse
  const items = (typedPayload.items ?? []).map(mapItem)

  return {
    items,
    total: typedPayload.total ?? items.length,
    page: typedPayload.page ?? params.page ?? 1,
    pageSize: typedPayload.pageSize ?? params.pageSize ?? 5,
    totalPages: typedPayload.totalPages ?? 1,
    sortBy: typedPayload.sortBy ?? params.sortBy ?? 'data',
    sortDirection: typedPayload.sortDirection ?? params.sortDirection ?? 'asc',
  }
}

export async function createDiasLetivosItem(item: DiasLetivosSaveItem): Promise<DiasLetivosItem> {
  const response = await fetch(getDiasLetivosUrl(), {
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

  return mapItem((payload as DiasLetivosCreateResponse).item)
}

export async function updateDiasLetivosItem(originalData: string, item: DiasLetivosSaveItem): Promise<DiasLetivosItem> {
  const response = await fetch(getDiasLetivosItemUrl(originalData), {
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

  return mapItem((payload as DiasLetivosCreateResponse).item)
}

export async function deleteDiasLetivosItem(data: string): Promise<string> {
  const response = await fetch(getDiasLetivosItemUrl(data), {
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

  return (payload as DiasLetivosDeleteResponse).deletedData
}