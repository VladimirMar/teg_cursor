export type ModalBancadaTpPagtoCondicaoValorItem = {
  codigo: string
  modalBancadaTpPagtoCondicaoCodigo: string
  modalidadeTipoBancadaCodigo: string
  modalidadeCodigo: string
  modalidadeDescricao: string
  tipoBancadaCodigo: string
  tipoBancadaDescricao: string
  tipoPgtoCodigo: string
  tipoPgtoDescricao: string
  condicaoCodigo: string
  condicaoDescricao: string
  data: string
  valor: number
}

type ModalBancadaTpPagtoCondicaoValorListResponse = {
  total?: number
  page?: number
  pageSize?: number
  totalPages?: number
  items: Array<{
    codigo: string
    modal_bancada_condicao_tipo_pgto_codigo: string
    modalidade_tipo_bancada_codigo: string
    modalidade_codigo: string
    modalidade_descricao: string
    tipo_bancada_codigo: string
    tipo_bancada_descricao: string
    tipo_pgto_codigo: string
    tipo_pgto_descricao: string
    condicao_codigo: string
    condicao_descricao: string
    data: string
    valor: string | number
  }>
}

type ModalBancadaTpPagtoCondicaoValorCreateResponse = {
  item: ModalBancadaTpPagtoCondicaoValorListResponse['items'][number]
}

type ModalBancadaTpPagtoCondicaoValorUpdateResponse = {
  item: ModalBancadaTpPagtoCondicaoValorListResponse['items'][number]
}

type ModalBancadaTpPagtoCondicaoValorDeleteResponse = {
  deletedCodigo: string
}

export type ModalBancadaTpPagtoCondicaoValorListParams = {
  modalBancadaTpPagtoCondicaoCodigo?: string
  data?: string
  page?: number
  pageSize?: number
}

export type ModalBancadaTpPagtoCondicaoValorListResult = {
  items: ModalBancadaTpPagtoCondicaoValorItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type ModalBancadaTpPagtoCondicaoValorSaveItem = {
  modalBancadaTpPagtoCondicaoCodigo: string
  data: string
  valor: string
}

const getModalBancadaTpPagtoCondicaoValorUrl = () => {
  return import.meta.env.VITE_MODAL_BANCADA_CONDICAO_TIPO_PGTO_VALOR_URL?.trim() || '/api/modal-bancada-condicao-tipo-pgto-valor'
}

const buildListUrl = (params?: ModalBancadaTpPagtoCondicaoValorListParams) => {
  const url = new URL(getModalBancadaTpPagtoCondicaoValorUrl(), window.location.origin)

  if (params?.modalBancadaTpPagtoCondicaoCodigo?.trim()) {
    url.searchParams.set('modalBancadaTpPagtoCondicaoCodigo', params.modalBancadaTpPagtoCondicaoCodigo.trim())
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

const getModalBancadaTpPagtoCondicaoValorItemUrl = (codigo: string) => {
  return `${getModalBancadaTpPagtoCondicaoValorUrl()}/${encodeURIComponent(codigo)}`
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
    : 'Falha ao processar dados do valor da associacao de modalidade, bancada, pagamento e condicao.'
}

const mapItem = (item: ModalBancadaTpPagtoCondicaoValorListResponse['items'][number]): ModalBancadaTpPagtoCondicaoValorItem => {
  return {
    codigo: item.codigo,
    modalBancadaTpPagtoCondicaoCodigo: item.modal_bancada_condicao_tipo_pgto_codigo,
    modalidadeTipoBancadaCodigo: item.modalidade_tipo_bancada_codigo,
    modalidadeCodigo: item.modalidade_codigo,
    modalidadeDescricao: item.modalidade_descricao,
    tipoBancadaCodigo: item.tipo_bancada_codigo,
    tipoBancadaDescricao: item.tipo_bancada_descricao,
    tipoPgtoCodigo: item.tipo_pgto_codigo,
    tipoPgtoDescricao: item.tipo_pgto_descricao,
    condicaoCodigo: item.condicao_codigo,
    condicaoDescricao: item.condicao_descricao,
    data: item.data,
    valor: Number(item.valor ?? 0),
  }
}

export async function listModalBancadaTpPagtoCondicaoValorItems(params?: ModalBancadaTpPagtoCondicaoValorListParams): Promise<ModalBancadaTpPagtoCondicaoValorListResult> {
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

  const typedPayload = payload as ModalBancadaTpPagtoCondicaoValorListResponse
  const items = (typedPayload.items ?? []).map(mapItem)

  return {
    items,
    total: typeof typedPayload.total === 'number' ? typedPayload.total : items.length,
    page: typeof typedPayload.page === 'number' ? typedPayload.page : (params?.page ?? 1),
    pageSize: typeof typedPayload.pageSize === 'number' ? typedPayload.pageSize : ((params?.pageSize ?? items.length) || 1),
    totalPages: typeof typedPayload.totalPages === 'number' ? typedPayload.totalPages : 1,
  }
}

export async function createModalBancadaTpPagtoCondicaoValorItem(item: ModalBancadaTpPagtoCondicaoValorSaveItem): Promise<ModalBancadaTpPagtoCondicaoValorItem> {
  const response = await fetch(getModalBancadaTpPagtoCondicaoValorUrl(), {
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

  return mapItem((payload as ModalBancadaTpPagtoCondicaoValorCreateResponse).item)
}

export async function updateModalBancadaTpPagtoCondicaoValorItem(codigo: string, item: ModalBancadaTpPagtoCondicaoValorSaveItem): Promise<ModalBancadaTpPagtoCondicaoValorItem> {
  const response = await fetch(getModalBancadaTpPagtoCondicaoValorItemUrl(codigo), {
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

  return mapItem((payload as ModalBancadaTpPagtoCondicaoValorUpdateResponse).item)
}

export async function deleteModalBancadaTpPagtoCondicaoValorItem(codigo: string): Promise<string> {
  const response = await fetch(getModalBancadaTpPagtoCondicaoValorItemUrl(codigo), {
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

  return (payload as ModalBancadaTpPagtoCondicaoValorDeleteResponse).deletedCodigo
}