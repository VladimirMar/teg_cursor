export type ModalidadeTipoBancadaAssociationItem = {
  codigo: string
  modalidadeCodigo: string
  modalidadeDescricao: string
  tipoBancadaCodigo: string
  tipoBancadaDescricao: string
}

type ModalidadeTipoBancadaAssociationListResponse = {
  items: Array<{
    codigo: string
    modalidade_codigo: string
    modalidade_descricao: string
    tipo_bancada_codigo: string
    tipo_bancada_descricao: string
  }>
}

type ModalidadeTipoBancadaAssociationCreateResponse = {
  item: {
    codigo: string
    modalidade_codigo: string
    modalidade_descricao: string
    tipo_bancada_codigo: string
    tipo_bancada_descricao: string
  }
}

type ModalidadeTipoBancadaAssociationDeleteResponse = {
  deletedCodigo: string
}

export type ModalidadeTipoBancadaAssociationSaveItem = {
  modalidadeCodigo: string
  tipoBancadaCodigo: string
}

const getModalidadeTipoBancadaAssociationUrl = () => {
  return import.meta.env.VITE_MODALIDADE_TIPO_BANCADA_ASSOCIACAO_URL?.trim() || '/api/modalidade-tipo-bancada'
}

const getModalidadeTipoBancadaAssociationItemUrl = (codigo: string) => {
  return `${getModalidadeTipoBancadaAssociationUrl()}/${encodeURIComponent(codigo)}`
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
    : 'Falha ao processar dados da associacao de modalidade x tipo de bancada.'
}

const mapAssociationItem = (item: ModalidadeTipoBancadaAssociationListResponse['items'][number]): ModalidadeTipoBancadaAssociationItem => {
  return {
    codigo: item.codigo,
    modalidadeCodigo: item.modalidade_codigo,
    modalidadeDescricao: item.modalidade_descricao,
    tipoBancadaCodigo: item.tipo_bancada_codigo,
    tipoBancadaDescricao: item.tipo_bancada_descricao,
  }
}

export async function listModalidadeTipoBancadaAssociationItems(): Promise<ModalidadeTipoBancadaAssociationItem[]> {
  const response = await fetch(getModalidadeTipoBancadaAssociationUrl(), {
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

  return ((payload as ModalidadeTipoBancadaAssociationListResponse).items ?? []).map(mapAssociationItem)
}

export async function createModalidadeTipoBancadaAssociationItem(item: ModalidadeTipoBancadaAssociationSaveItem): Promise<ModalidadeTipoBancadaAssociationItem> {
  const response = await fetch(getModalidadeTipoBancadaAssociationUrl(), {
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

  return mapAssociationItem((payload as ModalidadeTipoBancadaAssociationCreateResponse).item)
}

export async function deleteModalidadeTipoBancadaAssociationItem(codigo: string): Promise<string> {
  const response = await fetch(getModalidadeTipoBancadaAssociationItemUrl(codigo), {
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

  return (payload as ModalidadeTipoBancadaAssociationDeleteResponse).deletedCodigo
}