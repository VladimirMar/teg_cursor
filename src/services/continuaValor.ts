export type ContinuaValorTipo = 'Regular' | 'Cadeirante'

export type ContinuaValorItem = {
  codigo: string
  tipoContinua: ContinuaValorTipo
  data: string
  valor: number
}

type ContinuaValorListResponse = {
  total?: number
  page?: number
  pageSize?: number
  totalPages?: number
  items: Array<{
    codigo: string
    tipo_continua: ContinuaValorTipo
    data: string
    valor: string | number
  }>
}

type ContinuaValorCreateResponse = {
  item: ContinuaValorListResponse['items'][number]
}

type ContinuaValorDeleteResponse = {
  deletedCodigo: string
}

export type ContinuaValorListParams = {
  tipoContinua?: ContinuaValorTipo | ''
  data?: string
  page?: number
  pageSize?: number
}

export type ContinuaValorListResult = {
  items: ContinuaValorItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type ContinuaValorSaveItem = {
  tipoContinua: ContinuaValorTipo
  data: string
  valor: string
}

const getContinuaValorUrl = () => {
  return import.meta.env.VITE_CONTINUA_VALOR_URL?.trim() || '/api/continua-valor'
}

const buildListUrl = (params?: ContinuaValorListParams) => {
  const url = new URL(getContinuaValorUrl(), window.location.origin)

  if (params?.tipoContinua?.trim()) {
    url.searchParams.set('tipoContinua', params.tipoContinua.trim())
  }

  if (params?.data?.trim()) {
    url.searchParams.set('data', params.data.trim())
  }

  if (typeof params?.page === 'number') {
    url.searchParams.set('page', String(params.page))
  }

  if (typeof params?.pageSize === 'number') {
    url.searchParams.set('pageSize', String(params.pageSize))
  }

  return `${url.pathname}${url.search}`
}

const getContinuaValorItemUrl = (codigo: string) => {
  return `${getContinuaValorUrl()}/${encodeURIComponent(codigo)}`
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
    : 'Falha ao processar dados de continua valor.'
}

const mapItem = (item: ContinuaValorListResponse['items'][number]): ContinuaValorItem => {
  return {
    codigo: item.codigo,
    tipoContinua: item.tipo_continua,
    data: item.data,
    valor: Number(item.valor ?? 0),
  }
}

export async function listContinuaValorItems(params?: ContinuaValorListParams): Promise<ContinuaValorListResult> {
  const response = await fetch(buildListUrl(params), {
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

  const typedPayload = payload as ContinuaValorListResponse
  const items = (typedPayload.items ?? []).map(mapItem)

  return {
    items,
    total: typeof typedPayload.total === 'number' ? typedPayload.total : items.length,
    page: typeof typedPayload.page === 'number' ? typedPayload.page : (params?.page ?? 1),
    pageSize: typeof typedPayload.pageSize === 'number' ? typedPayload.pageSize : ((params?.pageSize ?? items.length) || 1),
    totalPages: typeof typedPayload.totalPages === 'number' ? typedPayload.totalPages : 1,
  }
}

export async function createContinuaValorItem(item: ContinuaValorSaveItem): Promise<ContinuaValorItem> {
  const response = await fetch(getContinuaValorUrl(), {
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

  return mapItem((payload as ContinuaValorCreateResponse).item)
}

export async function updateContinuaValorItem(codigo: string, item: ContinuaValorSaveItem): Promise<ContinuaValorItem> {
  const response = await fetch(getContinuaValorItemUrl(codigo), {
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

  return mapItem((payload as ContinuaValorCreateResponse).item)
}

export async function deleteContinuaValorItem(codigo: string): Promise<string> {
  const response = await fetch(getContinuaValorItemUrl(codigo), {
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

  return (payload as ContinuaValorDeleteResponse).deletedCodigo
}