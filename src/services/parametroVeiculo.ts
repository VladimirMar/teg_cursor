export type ParametroVeiculoItem = {
  codigo: string
  modalidadeTipoBancadaCodigo: string
  modalidadeCodigo: string
  modalidadeDescricao: string
  tipoBancadaCodigo: string
  tipoBancadaDescricao: string
  condicao: string
  qtdeCondicao: number
  data: string
}

type ParametroVeiculoListResponse = {
  total?: number
  page?: number
  pageSize?: number
  totalPages?: number
  items: Array<{
    codigo: string
    modalidade_tipo_bancada_codigo: string
    modalidade_codigo: string
    modalidade_descricao: string
    tipo_bancada_codigo: string
    tipo_bancada_descricao: string
    condicao: string
    qtde_condicao: number
    data: string
  }>
}

type ParametroVeiculoCreateResponse = {
  item: ParametroVeiculoListResponse['items'][number]
}

type ParametroVeiculoDeleteResponse = {
  deletedCodigo: string
}

export type ParametroVeiculoListParams = {
  modalidadeTipoBancadaCodigo?: string
  condicao?: string
  data?: string
  page?: number
  pageSize?: number
}

export type ParametroVeiculoListResult = {
  items: ParametroVeiculoItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type ParametroVeiculoSaveItem = {
  modalidadeTipoBancadaCodigo: string
  condicao: string
  qtdeCondicao: string
  data: string
}

const getParametroVeiculoUrl = () => {
  return import.meta.env.VITE_PARAMETRO_VEICULO_URL?.trim() || '/api/parametro-veiculo'
}

const buildListUrl = (params?: ParametroVeiculoListParams) => {
  const url = new URL(getParametroVeiculoUrl(), window.location.origin)

  if (params?.modalidadeTipoBancadaCodigo?.trim()) {
    url.searchParams.set('modalidadeTipoBancadaCodigo', params.modalidadeTipoBancadaCodigo.trim())
  }

  if (params?.condicao?.trim()) {
    url.searchParams.set('condicao', params.condicao.trim())
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

const getParametroVeiculoItemUrl = (codigo: string) => {
  return `${getParametroVeiculoUrl()}/${encodeURIComponent(codigo)}`
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
    : 'Falha ao processar dados de parametro veiculo.'
}

const mapItem = (item: ParametroVeiculoListResponse['items'][number]): ParametroVeiculoItem => {
  return {
    codigo: item.codigo,
    modalidadeTipoBancadaCodigo: item.modalidade_tipo_bancada_codigo,
    modalidadeCodigo: item.modalidade_codigo,
    modalidadeDescricao: item.modalidade_descricao,
    tipoBancadaCodigo: item.tipo_bancada_codigo,
    tipoBancadaDescricao: item.tipo_bancada_descricao,
    condicao: item.condicao,
    qtdeCondicao: Number(item.qtde_condicao ?? 0),
    data: item.data,
  }
}

export async function listParametroVeiculoItems(params?: ParametroVeiculoListParams): Promise<ParametroVeiculoListResult> {
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

  const typedPayload = payload as ParametroVeiculoListResponse
  const items = (typedPayload.items ?? []).map(mapItem)

  return {
    items,
    total: typeof typedPayload.total === 'number' ? typedPayload.total : items.length,
    page: typeof typedPayload.page === 'number' ? typedPayload.page : (params?.page ?? 1),
    pageSize: typeof typedPayload.pageSize === 'number' ? typedPayload.pageSize : ((params?.pageSize ?? items.length) || 1),
    totalPages: typeof typedPayload.totalPages === 'number' ? typedPayload.totalPages : 1,
  }
}

export async function createParametroVeiculoItem(item: ParametroVeiculoSaveItem): Promise<ParametroVeiculoItem> {
  const response = await fetch(getParametroVeiculoUrl(), {
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

  return mapItem((payload as ParametroVeiculoCreateResponse).item)
}

export async function updateParametroVeiculoItem(codigo: string, item: ParametroVeiculoSaveItem): Promise<ParametroVeiculoItem> {
  const response = await fetch(getParametroVeiculoItemUrl(codigo), {
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

  return mapItem((payload as ParametroVeiculoCreateResponse).item)
}

export async function deleteParametroVeiculoItem(codigo: string): Promise<string> {
  const response = await fetch(getParametroVeiculoItemUrl(codigo), {
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

  return (payload as ParametroVeiculoDeleteResponse).deletedCodigo
}
