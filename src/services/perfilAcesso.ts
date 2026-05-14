export type PerfilAcessoPermissao = 'consulta' | 'alteracao' | 'exclusao' | 'execucao' | 'todos'

export type PerfilAcessoItem = {
  codigo: string
  perfilCodigo: string
  perfilDescricao: string
  acessoPaginaCodigo: string
  acessoPaginaDescricao: string
  acessoPaginaFuncao: 'menu' | 'formulario'
  permissao: PerfilAcessoPermissao
}

export type PerfilAcessoSaveItem = {
  perfilCodigo: string
  acessoPaginaCodigo: string
  permissao: PerfilAcessoPermissao
}

export type PerfilAcessoPerfilOption = {
  codigo: string
  descricao: string
}

export type PerfilAcessoPaginaOption = {
  codigo: string
  sigla: string
  descricao: string
  funcao: 'menu' | 'formulario'
}

export type PerfilAcessoMatrixSaveItem = {
  acessoPaginaCodigo: string
  permissao: PerfilAcessoPermissao
}

type PerfilAcessoListResponse = {
  items: Array<{
    codigo: string
    perfil_codigo: string
    perfil_descricao: string
    acesso_pagina_codigo: string
    acesso_pagina_descricao: string
    acesso_pagina_funcao: 'menu' | 'formulario'
    permissao: PerfilAcessoPermissao
  }>
  total: number
  page: number
  pageSize: number
  totalPages: number
  sortBy: 'codigo' | 'perfilDescricao' | 'acessoPaginaDescricao' | 'permissao'
  sortDirection: 'asc' | 'desc'
}

type PerfilAcessoCreateResponse = {
  item: PerfilAcessoListResponse['items'][number]
}

type PerfilAcessoDeleteResponse = {
  deletedCodigo: string
}

type PerfilAcessoGenerateAllResponse = {
  message?: string
  item?: {
    total_perfis: number
    total_acessos: number
    existing_relations: number
    inserted_relations: number
  }
}

type OptionsResponse<TItem> = {
  items: TItem[]
}

type PerfilAcessoMatrixResponse = {
  perfil: PerfilAcessoPerfilOption
  items: PerfilAcessoListResponse['items']
}

export type PerfilAcessoListParams = {
  search?: string
  page?: number
  pageSize?: number
  sortBy?: 'codigo' | 'perfilDescricao' | 'acessoPaginaDescricao' | 'permissao'
  sortDirection?: 'asc' | 'desc'
}

export type PerfilAcessoListResult = {
  items: PerfilAcessoItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  sortBy: 'codigo' | 'perfilDescricao' | 'acessoPaginaDescricao' | 'permissao'
  sortDirection: 'asc' | 'desc'
}

const getPerfilAcessoUrl = () => {
  return import.meta.env.VITE_PERFIL_ACESSO_URL?.trim() || '/api/perfil-acesso'
}

const getPerfilAcessoItemUrl = (codigo: string) => {
  return `${getPerfilAcessoUrl()}/${encodeURIComponent(codigo)}`
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
    : 'Falha ao processar dados do PerfilAcesso.'
}

const mapPerfilAcessoItem = (item: PerfilAcessoListResponse['items'][number]): PerfilAcessoItem => ({
  codigo: item.codigo,
  perfilCodigo: item.perfil_codigo,
  perfilDescricao: item.perfil_descricao,
  acessoPaginaCodigo: item.acesso_pagina_codigo,
  acessoPaginaDescricao: item.acesso_pagina_descricao,
  acessoPaginaFuncao: item.acesso_pagina_funcao,
  permissao: item.permissao,
})

export async function listPerfilAcessoItemsPaginated(params: PerfilAcessoListParams): Promise<PerfilAcessoListResult> {
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

  const requestUrl = queryParams.size ? `${getPerfilAcessoUrl()}?${queryParams.toString()}` : getPerfilAcessoUrl()
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

  const result = payload as PerfilAcessoListResponse
  return {
    items: (result.items ?? []).map(mapPerfilAcessoItem),
    total: result.total ?? 0,
    page: result.page ?? 1,
    pageSize: result.pageSize ?? params.pageSize ?? 20,
    totalPages: result.totalPages ?? 1,
    sortBy: result.sortBy ?? params.sortBy ?? 'codigo',
    sortDirection: result.sortDirection ?? params.sortDirection ?? 'asc',
  }
}

export async function createPerfilAcessoItem(item: PerfilAcessoSaveItem): Promise<PerfilAcessoItem> {
  const response = await fetch(getPerfilAcessoUrl(), {
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

  return mapPerfilAcessoItem((payload as PerfilAcessoCreateResponse).item)
}

export async function updatePerfilAcessoItem(originalCodigo: string, item: PerfilAcessoSaveItem): Promise<PerfilAcessoItem> {
  const response = await fetch(getPerfilAcessoItemUrl(originalCodigo), {
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

  return mapPerfilAcessoItem((payload as PerfilAcessoCreateResponse).item)
}

export async function getPerfilAcessoMatrix(perfilCodigo: string): Promise<{
  perfil: PerfilAcessoPerfilOption
  items: PerfilAcessoItem[]
}> {
  const response = await fetch(`${getPerfilAcessoUrl()}/perfil/${encodeURIComponent(perfilCodigo)}`, {
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

  const result = payload as PerfilAcessoMatrixResponse
  return {
    perfil: result.perfil,
    items: (result.items ?? []).map(mapPerfilAcessoItem),
  }
}

export async function savePerfilAcessoMatrix(
  perfilCodigo: string,
  items: PerfilAcessoMatrixSaveItem[],
): Promise<{
  perfil: PerfilAcessoPerfilOption
  items: PerfilAcessoItem[]
}> {
  const response = await fetch(`${getPerfilAcessoUrl()}/perfil/${encodeURIComponent(perfilCodigo)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ items }),
  })

  const responseText = await response.text()
  const payload = parseJsonSafely(responseText)

  if (!response.ok) {
    throw new Error(getErrorMessage(payload))
  }

  const result = payload as PerfilAcessoMatrixResponse
  return {
    perfil: result.perfil,
    items: (result.items ?? []).map(mapPerfilAcessoItem),
  }
}

export async function deletePerfilAcessoItem(codigo: string): Promise<string> {
  const response = await fetch(getPerfilAcessoItemUrl(codigo), {
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

  return (payload as PerfilAcessoDeleteResponse).deletedCodigo
}

export async function generatePerfilAcessoAll(): Promise<{
  message: string
  totalPerfis: number
  totalAcessos: number
  existingRelations: number
  insertedRelations: number
}> {
  const response = await fetch(`${getPerfilAcessoUrl()}/generate-all`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
  })

  const responseText = await response.text()
  const payload = parseJsonSafely(responseText)

  if (!response.ok) {
    throw new Error(getErrorMessage(payload))
  }

  const result = payload as PerfilAcessoGenerateAllResponse
  return {
    message: typeof result.message === 'string' && result.message.trim()
      ? result.message
      : 'Processo de geracao executado com sucesso.',
    totalPerfis: result.item?.total_perfis ?? 0,
    totalAcessos: result.item?.total_acessos ?? 0,
    existingRelations: result.item?.existing_relations ?? 0,
    insertedRelations: result.item?.inserted_relations ?? 0,
  }
}

export async function listPerfilAcessoPerfilOptions(): Promise<PerfilAcessoPerfilOption[]> {
  const response = await fetch('/api/perfil/options', {
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

  return ((payload as OptionsResponse<PerfilAcessoPerfilOption>).items ?? []).map((item) => ({
    codigo: item.codigo,
    descricao: item.descricao,
  }))
}

export async function listPerfilAcessoPaginaOptions(): Promise<PerfilAcessoPaginaOption[]> {
  const response = await fetch('/api/acesso-pagina/options', {
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

  return ((payload as OptionsResponse<PerfilAcessoPaginaOption>).items ?? []).map((item) => ({
    codigo: item.codigo,
    sigla: item.sigla,
    descricao: item.descricao,
    funcao: item.funcao,
  }))
}