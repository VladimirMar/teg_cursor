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
  apuracaoFinanceiraSituacao: ApuracaoFinanceiraStatus
  dataReferencia: string
  isAtivoNaData: boolean
  naoCadeirantePresencial: number
  cadeirante: number
  atendimentoComplementarNaoCadeirante: number
  atendimentoComplementarCadeirante: number
  continuaNaoCadeirante: number
  continuaCadeirante: number
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
  mesAno: string
  dataReferencia: string
}

type ApontamentoServicosSaveResponse = {
  message?: string
}

export type ApontamentoServicosListParams = {
  mesAno: string
  dataReferencia: string
  dreCodigo?: string
  revisao?: number
  tipoPessoa?: ApuracaoTipoPessoa
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

  if (typeof params.revisao === 'number') {
    queryParams.set('revisao', String(params.revisao))
  }

  if (params.tipoPessoa?.trim()) {
    queryParams.set('tipoPessoa', params.tipoPessoa.trim())
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
