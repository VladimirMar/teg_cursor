import type { ApuracaoFinanceiraStatus } from './apuracaoFinanceira'
import type { ApuracaoTipoPessoa } from './apuracaoTipoPessoa'

export type ApontamentoServicosItem = {
  mesAno: string
  dreCodigo: string
  dreSigla: string
  dreDescricao: string
  ordemServicoCodigo: string
  ordemServicoOsConcat: string
  ordemServicoTermoAdesao: string
  ordemServicoNumOs: string
  ordemServicoModalidadeDescricao: string
  revisao: number
  tipoEscolaCodigo: string
  tipoEscolaSigla: string
  tipoEscolaDescricao: string
  tipoPessoa: ApuracaoTipoPessoa
  periodoInicio: string
  periodoFim: string
  crmcCondutor: string
  contrato: string
  placa: string
  empresa: string
  nomeCondutor: string
  tipoVeiculo: string
  veiculoOsEspecial: string
  apuracaoFinanceiraSituacao: ApuracaoFinanceiraStatus
  dataReferencia: string
  isAtivoNaData: boolean
  naoCadeirantePresencial: number
  cadeirante: number
  atendimentoComplementarNaoCadeirante: number
  atendimentoComplementarCadeirante: number
  continuaNaoCadeirante: number
  continuaCadeirante: number
  naoCadeirantePresencialAcm: number
  cadeiranteAcm: number
  atendimentoComplementarNaoCadeiranteAcm: number
  atendimentoComplementarCadeiranteAcm: number
  continuaNaoCadeiranteAcm: number
  continuaCadeiranteAcm: number
  kilometragem: string
}

export type ApontamentoServicosSaveItem = Pick<
  ApontamentoServicosItem,
  | 'dreCodigo'
  | 'ordemServicoCodigo'
  | 'revisao'
  | 'tipoEscolaCodigo'
  | 'tipoPessoa'
  | 'naoCadeirantePresencial'
  | 'cadeirante'
  | 'atendimentoComplementarNaoCadeirante'
  | 'atendimentoComplementarCadeirante'
  | 'continuaNaoCadeirante'
  | 'continuaCadeirante'
  | 'kilometragem'
>

type ApontamentoServicosListResponse = {
  items: ApontamentoServicosItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  mesAno: string
  dataReferencia: string
}

type ApontamentoServicosSaveResponse = {
  message?: string
}

export type ApontamentoServicosImportSkippedRecord = {
  fileName?: string
  rowNumber: number
  ordemServico: string
  reason: string
}

export type ApontamentoServicosImportResponse = {
  importId?: string
  directoryPath: string
  message: string
  filePath: string
  fileName: string
  mesAno: string
  dreCodigo: string
  dreDescricao: string
  revisao: number
  tipoPessoa: ApuracaoTipoPessoa
  dataReferencia: string
  processedFiles: number
  processedItems: number
  processedDates: number
  skippedRecords: ApontamentoServicosImportSkippedRecord[]
}

export type ApontamentoServicosImportParams = {
  directoryPath?: string
  fileName?: string
  importId?: string
}

export type ApontamentoServicosImportStatus = {
  importId: string
  status: 'pending' | 'running' | 'completed' | 'error'
  directoryPath: string
  currentFileName: string
  currentFilePath: string
  currentFileIndex: number
  totalFiles: number
  currentRecord: number
  totalRecords: number
  currentRowNumber: number
  processedFiles: number
  processedItems: number
  processedDates: number
  skippedRecords: number
  oldDirectoryPath: string
  movedFileName: string
  message: string
  errorMessage: string
  updatedAt: string
}

export type ApontamentoServicosListParams = {
  mesAno: string
  dataReferencia: string
  dreCodigo?: string
  crmcCondutor?: string
  placa?: string
  revisao?: number
  tipoPessoa?: ApuracaoTipoPessoa
  page?: number
  pageSize?: number
}

const getApontamentoServicosUrl = () => {
  return import.meta.env.VITE_APONTAMENTO_SERVICOS_URL?.trim() || '/api/apontamento-servicos'
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
    : 'Falha ao processar dados do apontamento de servicos.'
}

export async function listApontamentoServicosItems(params: ApontamentoServicosListParams): Promise<ApontamentoServicosListResponse> {
  const queryParams = new URLSearchParams({
    mesAno: params.mesAno,
    dataReferencia: params.dataReferencia,
  })

  if (params.dreCodigo?.trim()) {
    queryParams.set('dreCodigo', params.dreCodigo.trim())
  }

  if (params.crmcCondutor?.trim()) {
    queryParams.set('crmcCondutor', params.crmcCondutor.trim())
  }

  if (params.placa?.trim()) {
    queryParams.set('placa', params.placa.trim())
  }

  if (typeof params.revisao === 'number') {
    queryParams.set('revisao', String(params.revisao))
  }

  if (params.tipoPessoa?.trim()) {
    queryParams.set('tipoPessoa', params.tipoPessoa.trim())
  }

  if (params.page) {
    queryParams.set('page', String(params.page))
  }

  if (params.pageSize) {
    queryParams.set('pageSize', String(params.pageSize))
  }

  const response = await fetch(`${getApontamentoServicosUrl()}?${queryParams.toString()}`, {
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

  return {
    items: (payload as ApontamentoServicosListResponse).items ?? [],
    total: (payload as ApontamentoServicosListResponse).total ?? 0,
    page: (payload as ApontamentoServicosListResponse).page ?? params.page ?? 1,
    pageSize: (payload as ApontamentoServicosListResponse).pageSize ?? params.pageSize ?? 20,
    totalPages: (payload as ApontamentoServicosListResponse).totalPages ?? 1,
    mesAno: (payload as ApontamentoServicosListResponse).mesAno ?? params.mesAno,
    dataReferencia: (payload as ApontamentoServicosListResponse).dataReferencia ?? params.dataReferencia,
  }
}

export async function saveApontamentoServicosItems(params: {
  mesAno: string
  dataReferencia: string
  items: ApontamentoServicosSaveItem[]
}): Promise<string> {
  const response = await fetch(getApontamentoServicosUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(params),
  })

  const responseText = await response.text()
  const payload = parseJsonSafely(responseText)

  if (!response.ok) {
    throw new Error(getErrorMessage(payload))
  }

  return typeof (payload as ApontamentoServicosSaveResponse).message === 'string'
    ? (payload as ApontamentoServicosSaveResponse).message as string
    : 'Apontamento de servicos gravado com sucesso.'
}

export async function importApontamentoServicosExcel(params?: ApontamentoServicosImportParams): Promise<ApontamentoServicosImportResponse> {
  const response = await fetch(`${getApontamentoServicosUrl()}/import-excel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      directoryPath: params?.directoryPath,
      fileName: params?.fileName,
      importId: params?.importId,
    }),
  })

  const responseText = await response.text()
  const payload = parseJsonSafely(responseText)

  if (!response.ok) {
    throw new Error(getErrorMessage(payload))
  }

  return {
    importId: typeof (payload as ApontamentoServicosImportResponse).importId === 'string'
      ? (payload as ApontamentoServicosImportResponse).importId
      : '',
    directoryPath: typeof (payload as ApontamentoServicosImportResponse).directoryPath === 'string'
      ? (payload as ApontamentoServicosImportResponse).directoryPath
      : '',
    message: typeof (payload as ApontamentoServicosImportResponse).message === 'string'
      ? (payload as ApontamentoServicosImportResponse).message
      : 'Importacao concluida com sucesso.',
    filePath: typeof (payload as ApontamentoServicosImportResponse).filePath === 'string'
      ? (payload as ApontamentoServicosImportResponse).filePath
      : '',
    fileName: typeof (payload as ApontamentoServicosImportResponse).fileName === 'string'
      ? (payload as ApontamentoServicosImportResponse).fileName
      : '',
    mesAno: typeof (payload as ApontamentoServicosImportResponse).mesAno === 'string'
      ? (payload as ApontamentoServicosImportResponse).mesAno
      : '',
    dreCodigo: typeof (payload as ApontamentoServicosImportResponse).dreCodigo === 'string'
      ? (payload as ApontamentoServicosImportResponse).dreCodigo
      : '',
    dreDescricao: typeof (payload as ApontamentoServicosImportResponse).dreDescricao === 'string'
      ? (payload as ApontamentoServicosImportResponse).dreDescricao
      : '',
    revisao: Number((payload as ApontamentoServicosImportResponse).revisao) || 0,
    tipoPessoa: ((payload as ApontamentoServicosImportResponse).tipoPessoa === 'PJ' ? 'PJ' : 'PF') as ApuracaoTipoPessoa,
    dataReferencia: typeof (payload as ApontamentoServicosImportResponse).dataReferencia === 'string'
      ? (payload as ApontamentoServicosImportResponse).dataReferencia
      : '',
    processedFiles: Number((payload as ApontamentoServicosImportResponse).processedFiles) || 0,
    processedItems: Number((payload as ApontamentoServicosImportResponse).processedItems) || 0,
    processedDates: Number((payload as ApontamentoServicosImportResponse).processedDates) || 0,
    skippedRecords: Array.isArray((payload as ApontamentoServicosImportResponse).skippedRecords)
      ? (payload as ApontamentoServicosImportResponse).skippedRecords
      : [],
  }
}

export async function getApontamentoServicosImportStatus(importId: string): Promise<ApontamentoServicosImportStatus> {
  const queryParams = new URLSearchParams({ importId })
  const response = await fetch(`${getApontamentoServicosUrl()}/import-excel/status?${queryParams.toString()}`, {
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

  return {
    importId: typeof (payload as ApontamentoServicosImportStatus).importId === 'string' ? (payload as ApontamentoServicosImportStatus).importId : importId,
    status: (payload as ApontamentoServicosImportStatus).status === 'error'
      ? 'error'
      : (payload as ApontamentoServicosImportStatus).status === 'completed'
        ? 'completed'
        : (payload as ApontamentoServicosImportStatus).status === 'running'
          ? 'running'
          : 'pending',
    directoryPath: typeof (payload as ApontamentoServicosImportStatus).directoryPath === 'string' ? (payload as ApontamentoServicosImportStatus).directoryPath : '',
    currentFileName: typeof (payload as ApontamentoServicosImportStatus).currentFileName === 'string' ? (payload as ApontamentoServicosImportStatus).currentFileName : '',
    currentFilePath: typeof (payload as ApontamentoServicosImportStatus).currentFilePath === 'string' ? (payload as ApontamentoServicosImportStatus).currentFilePath : '',
    currentFileIndex: Number((payload as ApontamentoServicosImportStatus).currentFileIndex) || 0,
    totalFiles: Number((payload as ApontamentoServicosImportStatus).totalFiles) || 0,
    currentRecord: Number((payload as ApontamentoServicosImportStatus).currentRecord) || 0,
    totalRecords: Number((payload as ApontamentoServicosImportStatus).totalRecords) || 0,
    currentRowNumber: Number((payload as ApontamentoServicosImportStatus).currentRowNumber) || 0,
    processedFiles: Number((payload as ApontamentoServicosImportStatus).processedFiles) || 0,
    processedItems: Number((payload as ApontamentoServicosImportStatus).processedItems) || 0,
    processedDates: Number((payload as ApontamentoServicosImportStatus).processedDates) || 0,
    skippedRecords: Number((payload as ApontamentoServicosImportStatus).skippedRecords) || 0,
    oldDirectoryPath: typeof (payload as ApontamentoServicosImportStatus).oldDirectoryPath === 'string' ? (payload as ApontamentoServicosImportStatus).oldDirectoryPath : '',
    movedFileName: typeof (payload as ApontamentoServicosImportStatus).movedFileName === 'string' ? (payload as ApontamentoServicosImportStatus).movedFileName : '',
    message: typeof (payload as ApontamentoServicosImportStatus).message === 'string' ? (payload as ApontamentoServicosImportStatus).message : '',
    errorMessage: typeof (payload as ApontamentoServicosImportStatus).errorMessage === 'string' ? (payload as ApontamentoServicosImportStatus).errorMessage : '',
    updatedAt: typeof (payload as ApontamentoServicosImportStatus).updatedAt === 'string' ? (payload as ApontamentoServicosImportStatus).updatedAt : '',
  }
}
