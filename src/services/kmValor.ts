export type KmValorItem = {
  codigo: string
  condicaoCodigo: string
  condicaoDescricao: string
  condicaoQtdeIni: number
  condicaoQtdeFim: number
  data: string
  valor: number
}

type KmValorListResponse = {
  total?: number
  page?: number
  pageSize?: number
  totalPages?: number
  items: Array<{
    codigo: string
    condicao_codigo: string
    condicao_descricao: string
    condicao_qtde_ini: number
    condicao_qtde_fim: number
    data: string
    valor: string | number
  }>
}

type KmValorCreateResponse = {
  item: KmValorListResponse['items'][number]
}

type KmValorDeleteResponse = {
  deletedCodigo: string
}

export type KmValorListParams = {
  condicaoCodigo?: string
  data?: string
  page?: number
  pageSize?: number
}

export type KmValorListResult = {
  items: KmValorItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type KmValorSaveItem = {
  condicaoCodigo: string
  data: string
  valor: string
}

const getKmValorUrl = () => {
  return import.meta.env.VITE_KM_VALOR_URL?.trim() || '/api/km-valor'
}

const buildListUrl = (params?: KmValorListParams) => {
  const url = new URL(getKmValorUrl(), window.location.origin)

  if (params?.condicaoCodigo?.trim()) {
    url.searchParams.set('condicaoCodigo', params.condicaoCodigo.trim())
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

const getKmValorItemUrl = (codigo: string) => {
  return `${getKmValorUrl()}/${encodeURIComponent(codigo)}`
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
    : 'Falha ao processar dados de km valor.'
}

const mapItem = (item: KmValorListResponse['items'][number]): KmValorItem => {
  return {
    codigo: item.codigo,
    condicaoCodigo: item.condicao_codigo,
    condicaoDescricao: item.condicao_descricao,
    condicaoQtdeIni: Number(item.condicao_qtde_ini ?? 0),
    condicaoQtdeFim: Number(item.condicao_qtde_fim ?? 0),
    data: item.data,
    valor: Number(item.valor ?? 0),
  }
}

export async function listKmValorItems(params?: KmValorListParams): Promise<KmValorListResult> {
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

  const typedPayload = payload as KmValorListResponse
  const items = (typedPayload.items ?? []).map(mapItem)

  return {
    items,
    total: typeof typedPayload.total === 'number' ? typedPayload.total : items.length,
    page: typeof typedPayload.page === 'number' ? typedPayload.page : (params?.page ?? 1),
    pageSize: typeof typedPayload.pageSize === 'number' ? typedPayload.pageSize : ((params?.pageSize ?? items.length) || 1),
    totalPages: typeof typedPayload.totalPages === 'number' ? typedPayload.totalPages : 1,
  }
}

export async function createKmValorItem(item: KmValorSaveItem): Promise<KmValorItem> {
  const response = await fetch(getKmValorUrl(), {
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

  return mapItem((payload as KmValorCreateResponse).item)
}

export async function updateKmValorItem(codigo: string, item: KmValorSaveItem): Promise<KmValorItem> {
  const response = await fetch(getKmValorItemUrl(codigo), {
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

  return mapItem((payload as KmValorCreateResponse).item)
}

export async function deleteKmValorItem(codigo: string): Promise<string> {
  const response = await fetch(getKmValorItemUrl(codigo), {
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

  return (payload as KmValorDeleteResponse).deletedCodigo
}