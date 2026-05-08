export type ModalBancadaTpPagtoCondicaoItem = {
  codigo: string
  modalidadeTipoBancadaCodigo: string
  modalidadeCodigo: string
  modalidadeDescricao: string
  tipoBancadaCodigo: string
  tipoBancadaDescricao: string
  tipoPgtoCodigo: string
  tipoPgtoDescricao: string
  condicaoCodigo: string
  condicaoDescricao: string
  condicaoQtdeIni: number
  condicaoQtdeFim: number
}

type ModalBancadaTpPagtoCondicaoListResponse = {
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
    tipo_pgto_codigo: string
    tipo_pgto_descricao: string
    condicao_codigo: string
    condicao_descricao: string
    condicao_qtde_ini: number
    condicao_qtde_fim: number
  }>
}

export type ModalBancadaTpPagtoCondicaoListParams = {
  modalidadeTipoBancadaCodigo?: string
  tipoPgtoCodigo?: string
  condicaoCodigo?: string
  page?: number
  pageSize?: number
}

export type ModalBancadaTpPagtoCondicaoListResult = {
  items: ModalBancadaTpPagtoCondicaoItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

type ModalBancadaTpPagtoCondicaoCreateResponse = {
  item: ModalBancadaTpPagtoCondicaoListResponse['items'][number]
}

type ModalBancadaTpPagtoCondicaoUpdateResponse = {
  item: ModalBancadaTpPagtoCondicaoListResponse['items'][number]
}

type ModalBancadaTpPagtoCondicaoDeleteResponse = {
  deletedCodigo: string
}

export type ModalBancadaTpPagtoCondicaoSaveItem = {
  modalidadeTipoBancadaCodigo: string
  tipoPgtoCodigo: string
  condicaoCodigo: string
}

const getModalBancadaTpPagtoCondicaoUrl = () => {
  return import.meta.env.VITE_MODAL_BANCADA_CONDICAO_TIPO_PGTO_URL?.trim() || '/api/modal-bancada-condicao-tipo-pgto'
}

const buildListUrl = (params?: ModalBancadaTpPagtoCondicaoListParams) => {
  const url = new URL(getModalBancadaTpPagtoCondicaoUrl(), window.location.origin)

  if (params?.modalidadeTipoBancadaCodigo?.trim()) {
    url.searchParams.set('modalidadeTipoBancadaCodigo', params.modalidadeTipoBancadaCodigo.trim())
  }

  if (params?.tipoPgtoCodigo?.trim()) {
    url.searchParams.set('tipoPgtoCodigo', params.tipoPgtoCodigo.trim())
  }

  if (params?.condicaoCodigo?.trim()) {
    url.searchParams.set('condicaoCodigo', params.condicaoCodigo.trim())
  }

  if (typeof params?.page === 'number') {
    url.searchParams.set('page', String(params.page))
  }

  if (typeof params?.pageSize === 'number') {
    url.searchParams.set('pageSize', String(params.pageSize))
  }

  return `${url.pathname}${url.search}`
}

const getModalBancadaTpPagtoCondicaoItemUrl = (codigo: string) => {
  return `${getModalBancadaTpPagtoCondicaoUrl()}/${encodeURIComponent(codigo)}`
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
    : 'Falha ao processar dados da associacao de modalidade, bancada, pagamento e condicao.'
}

const mapItem = (item: ModalBancadaTpPagtoCondicaoListResponse['items'][number]): ModalBancadaTpPagtoCondicaoItem => {
  return {
    codigo: item.codigo,
    modalidadeTipoBancadaCodigo: item.modalidade_tipo_bancada_codigo,
    modalidadeCodigo: item.modalidade_codigo,
    modalidadeDescricao: item.modalidade_descricao,
    tipoBancadaCodigo: item.tipo_bancada_codigo,
    tipoBancadaDescricao: item.tipo_bancada_descricao,
    tipoPgtoCodigo: item.tipo_pgto_codigo,
    tipoPgtoDescricao: item.tipo_pgto_descricao,
    condicaoCodigo: item.condicao_codigo,
    condicaoDescricao: item.condicao_descricao,
    condicaoQtdeIni: Number(item.condicao_qtde_ini ?? 0),
    condicaoQtdeFim: Number(item.condicao_qtde_fim ?? 0),
  }
}

export async function listModalBancadaTpPagtoCondicaoItems(params?: ModalBancadaTpPagtoCondicaoListParams): Promise<ModalBancadaTpPagtoCondicaoListResult> {
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

  const typedPayload = payload as ModalBancadaTpPagtoCondicaoListResponse
  const items = (typedPayload.items ?? []).map(mapItem)

  return {
    items,
    total: typeof typedPayload.total === 'number' ? typedPayload.total : items.length,
    page: typeof typedPayload.page === 'number' ? typedPayload.page : (params?.page ?? 1),
    pageSize: typeof typedPayload.pageSize === 'number' ? typedPayload.pageSize : ((params?.pageSize ?? items.length) || 1),
    totalPages: typeof typedPayload.totalPages === 'number' ? typedPayload.totalPages : 1,
  }
}

export async function createModalBancadaTpPagtoCondicaoItem(item: ModalBancadaTpPagtoCondicaoSaveItem): Promise<ModalBancadaTpPagtoCondicaoItem> {
  const response = await fetch(getModalBancadaTpPagtoCondicaoUrl(), {
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

  return mapItem((payload as ModalBancadaTpPagtoCondicaoCreateResponse).item)
}

export async function updateModalBancadaTpPagtoCondicaoItem(codigo: string, item: ModalBancadaTpPagtoCondicaoSaveItem): Promise<ModalBancadaTpPagtoCondicaoItem> {
  const response = await fetch(getModalBancadaTpPagtoCondicaoItemUrl(codigo), {
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

  return mapItem((payload as ModalBancadaTpPagtoCondicaoUpdateResponse).item)
}

export async function deleteModalBancadaTpPagtoCondicaoItem(codigo: string): Promise<string> {
  const response = await fetch(getModalBancadaTpPagtoCondicaoItemUrl(codigo), {
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

  return (payload as ModalBancadaTpPagtoCondicaoDeleteResponse).deletedCodigo
}