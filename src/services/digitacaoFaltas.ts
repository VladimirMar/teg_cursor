import type { ApuracaoTipoPessoa } from './apuracaoTipoPessoa'

export type DigitacaoFaltasApontamentoMatch = {
  ordemServicoCodigo: string
  ordemServicoOsConcat: string
  ordemServicoNumOs: string
  revisao: number
  placa: string
  contrato: string
  nomeCondutor: string
  crmcCondutor: string
  empresa: string
  registrosApontamento: number
}

export type DigitacaoFaltasItem = {
  mesAno: string
  dataReferencia: string
  dreCodigo: string
  ordemServicoCodigo: string
  revisao: number
  tipoPessoa: ApuracaoTipoPessoa
  placa: string
  tegTipo: string
  tegRegular: boolean
  tegAcessivel: boolean
  tegCreche: boolean
  tegEspecial: boolean
  ausenciaTotal: boolean
  quantidadeAlunosIntegral: number | null
  quantidadeAlunosMeioPeriodo: number | null
}

export type DigitacaoFaltasConsultaItem = DigitacaoFaltasItem & {
  ordemServicoOsConcat: string
  ordemServicoNumOs: string
  nomeCondutor: string
  crmcCondutor: string
  empresa: string
  dataInclusao: string
  dataAlteracao: string
}

export type DigitacaoFaltasConsultaListParams = {
  mesAno: string
  dreCodigo: string
  tipoPessoa: ApuracaoTipoPessoa
  dataReferencia: string
  revisao?: string | number
  crmcCondutor?: string
  placa?: string
}

export type DigitacaoFaltasApontamentoLookupResponse = {
  matched: boolean
  message: string
  match: DigitacaoFaltasApontamentoMatch | null
  item: DigitacaoFaltasItem | null
}

const getDigitacaoFaltasUrl = () => {
  return import.meta.env.VITE_DIGITACAO_FALTAS_URL?.trim() || '/api/digitacao-faltas'
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
    : 'Falha ao processar a digitacao de faltas.'
}

export async function listDigitacaoFaltasConsultaItems(
  params: DigitacaoFaltasConsultaListParams,
): Promise<DigitacaoFaltasConsultaItem[]> {
  const searchParams = new URLSearchParams({
    mesAno: params.mesAno,
    dreCodigo: params.dreCodigo,
    tipoPessoa: params.tipoPessoa,
    dataReferencia: params.dataReferencia,
  })

  if (params.revisao !== undefined && params.revisao !== '') {
    searchParams.set('revisao', String(params.revisao))
  }

  if (params.crmcCondutor?.trim()) {
    searchParams.set('crmcCondutor', params.crmcCondutor.trim())
  }

  if (params.placa?.trim()) {
    searchParams.set('placa', params.placa.trim())
  }

  const response = await fetch(`${getDigitacaoFaltasUrl()}?${searchParams.toString()}`, {
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

  const items = Array.isArray(payload.items) ? payload.items : []
  return items as DigitacaoFaltasConsultaItem[]
}

export async function listDigitacaoFaltasApontamentos(params: {
  mesAno: string
  dreCodigo: string
  tipoPessoa: ApuracaoTipoPessoa
  dataReferencia: string
  revisao?: string | number
}): Promise<DigitacaoFaltasApontamentoMatch[]> {
  const searchParams = new URLSearchParams({
    mesAno: params.mesAno,
    dreCodigo: params.dreCodigo,
    tipoPessoa: params.tipoPessoa,
    dataReferencia: params.dataReferencia,
  })

  if (params.revisao !== undefined && params.revisao !== '') {
    searchParams.set('revisao', String(params.revisao))
  }

  const response = await fetch(`${getDigitacaoFaltasUrl()}/apontamentos?${searchParams.toString()}`, {
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

  const items = Array.isArray(payload.items) ? payload.items : []
  return items as DigitacaoFaltasApontamentoMatch[]
}

export async function lookupDigitacaoFaltasApontamento(params: {
  mesAno: string
  dreCodigo: string
  tipoPessoa: ApuracaoTipoPessoa
  placa: string
  dataReferencia: string
  revisao?: string | number
}): Promise<DigitacaoFaltasApontamentoLookupResponse> {
  const searchParams = new URLSearchParams({
    mesAno: params.mesAno,
    dreCodigo: params.dreCodigo,
    tipoPessoa: params.tipoPessoa,
    placa: params.placa,
    dataReferencia: params.dataReferencia,
  })

  if (params.revisao !== undefined && params.revisao !== '') {
    searchParams.set('revisao', String(params.revisao))
  }

  const response = await fetch(`${getDigitacaoFaltasUrl()}/apontamento?${searchParams.toString()}`, {
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

  return payload as DigitacaoFaltasApontamentoLookupResponse
}

export async function saveDigitacaoFaltas(params: {
  mesAno: string
  dreCodigo: string
  tipoPessoa: ApuracaoTipoPessoa
  dataReferencia: string
  placa: string
  revisao?: number
  ordemServicoCodigo?: string
  tegRegular: boolean
  tegAcessivel: boolean
  tegCreche: boolean
  tegEspecial: boolean
  ausenciaTotal: boolean
  quantidadeAlunosIntegral?: number
  quantidadeAlunosMeioPeriodo?: number
}): Promise<{ message: string; item: DigitacaoFaltasItem | null }> {
  const response = await fetch(getDigitacaoFaltasUrl(), {
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

  return {
    message: typeof payload.message === 'string' ? payload.message : 'Digitacao de faltas gravada com sucesso.',
    item: (payload.item as DigitacaoFaltasItem | null) ?? null,
  }
}

export async function deleteDigitacaoFaltas(params: Pick<
  DigitacaoFaltasItem,
  'mesAno' | 'dataReferencia' | 'dreCodigo' | 'ordemServicoCodigo' | 'revisao' | 'tipoPessoa' | 'tegTipo'
>): Promise<{ message: string }> {
  const searchParams = new URLSearchParams({
    mesAno: params.mesAno,
    dataReferencia: params.dataReferencia,
    dreCodigo: params.dreCodigo,
    ordemServicoCodigo: params.ordemServicoCodigo,
    revisao: String(params.revisao),
    tipoPessoa: params.tipoPessoa,
    tegTipo: params.tegTipo,
  })

  const response = await fetch(`${getDigitacaoFaltasUrl()}?${searchParams.toString()}`, {
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

  return {
    message: typeof payload.message === 'string' ? payload.message : 'Digitacao de faltas excluida com sucesso.',
  }
}
