import type { ApuracaoFinanceiraStatus } from './apuracaoFinanceira'
import type { ApuracaoTipoPessoa, ApuracaoTipoPessoaFilter } from './apuracaoTipoPessoa'

export type TotalRemuneracaoServicosItem = {
  mesAno: string
  dreCodigo: string
  dreSigla: string
  dreDescricao: string
  ordemServicoCodigo: string
  ordemServicoOsConcat: string
  ordemServicoTermoAdesao: string
  ordemServicoNumOs: string
  revisao: number
  tipoPessoa: ApuracaoTipoPessoa
  periodoInicio: string
  periodoFim: string
  crmcCondutor: string
  placa: string
  empresa: string
  nomeCondutor: string
  tipoVeiculo: string
  apuracaoFinanceiraSituacao: ApuracaoFinanceiraStatus
  totalDiasReferencia: number
  tegRegularFixo: number
  tegRegularPercapita: number
  tegAcessivelFixo: number
  tegAcessivelPercapita: number
  tegEspecialRegularFixo: number
  tegEspecialRegularPercapita: number
  tegEspecialAcessivelFixo: number
  tegEspecialAcessivelPercapita: number
  tegCrecheFixo: number
  tegCrechePercapita: number
  kmValor: number
  continuaRegular: number
  continuaCadeirante: number
  ccaValor: number
}

type TotalRemuneracaoServicosListResponse = {
  items: TotalRemuneracaoServicosItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  mesAno: string
}

export type TotalRemuneracaoServicosListParams = {
  mesAno: string
  dreCodigo?: string
  crmcCondutor?: string
  placa?: string
  revisao?: number
  tipoPessoa?: ApuracaoTipoPessoaFilter
  page?: number
  pageSize?: number
}

const getTotalRemuneracaoServicosUrl = () => {
  return import.meta.env.VITE_TOTAL_REMUNERACAO_SERVICOS_URL?.trim() || '/api/total-remuneracao-servicos'
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

const getErrorMessage = (payload: unknown, responseStatus?: number, responseStatusText?: string) => {
  if (!payload || typeof payload !== 'object') {
    if (Number.isInteger(responseStatus)) {
      const statusSuffix = responseStatusText?.trim() ? ` (${responseStatusText.trim()})` : ''
      return `Falha ao processar dados do total de remuneracao de servicos. HTTP ${responseStatus}${statusSuffix}.`
    }

    return 'Falha ao processar dados do total de remuneracao de servicos.'
  }

  const payloadObject = payload as Record<string, unknown>

  if (typeof payloadObject.message === 'string' && payloadObject.message.trim()) {
    return payloadObject.message.trim()
  }

  if (Number.isInteger(responseStatus)) {
    const statusSuffix = responseStatusText?.trim() ? ` (${responseStatusText.trim()})` : ''
    return `Falha ao processar dados do total de remuneracao de servicos. HTTP ${responseStatus}${statusSuffix}.`
  }

  return 'Falha ao processar dados do total de remuneracao de servicos.'
}

export async function listTotalRemuneracaoServicosItems(params: TotalRemuneracaoServicosListParams): Promise<TotalRemuneracaoServicosListResponse> {
  const queryParams = new URLSearchParams({
    mesAno: params.mesAno,
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

  const response = await fetch(`${getTotalRemuneracaoServicosUrl()}?${queryParams.toString()}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  const responseText = await response.text()
  const payload = parseJsonSafely(responseText)

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, response.status, response.statusText))
  }

  return {
    items: (payload as TotalRemuneracaoServicosListResponse).items ?? [],
    total: (payload as TotalRemuneracaoServicosListResponse).total ?? 0,
    page: (payload as TotalRemuneracaoServicosListResponse).page ?? params.page ?? 1,
    pageSize: (payload as TotalRemuneracaoServicosListResponse).pageSize ?? params.pageSize ?? 20,
    totalPages: (payload as TotalRemuneracaoServicosListResponse).totalPages ?? 1,
    mesAno: (payload as TotalRemuneracaoServicosListResponse).mesAno ?? params.mesAno,
  }
}
