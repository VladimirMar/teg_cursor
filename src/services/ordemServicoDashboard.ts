export type OrdemServicoDashboardModalidade = {
  descricao: string
  total: number
}

export type OrdemServicoDashboardRow = {
  dreCodigo: string
  dreDescricao: string
  totalGeral: number
  countsByModalidade: Record<string, number>
}

export type OrdemServicoDashboardData = {
  requestedMonth: string
  monthStart: string
  monthEnd: string
  generatedAt: string
  modalidades: OrdemServicoDashboardModalidade[]
  rows: OrdemServicoDashboardRow[]
  personTypeTotals: {
    pessoaFisica: number
    pessoaJuridica: number
    cooperativa: number
  }
  totals: {
    totalOverall: number
    totalDres: number
    totalModalidades: number
  }
}

export type OrdemServicoDashboardBancadaTipo = {
  descricao: string
  total: number
}

export type OrdemServicoDashboardBancadaRow = {
  dreCodigo: string
  dreDescricao: string
  modalidadeDescricao: string
  totalGeral: number
  countsByTipoBancada: Record<string, number>
}

export type OrdemServicoDashboardBancadaData = {
  requestedMonth: string
  monthStart: string
  monthEnd: string
  generatedAt: string
  tiposBancada: OrdemServicoDashboardBancadaTipo[]
  rows: OrdemServicoDashboardBancadaRow[]
  totals: {
    totalOverall: number
    totalCombinacoes: number
    totalTiposBancada: number
  }
}

export type OrdemServicoDashboardDetailItem = {
  codigo: string
  termoAdesao: string
  numOs: string
  revisao: string
  osConcat: string
  vigenciaOs: string
  dataEmissao: string
  credenciadaCodigo: string
  credenciado: string
  cnpjCpf: string
  tipoPessoa: string
  dreCodigo: string
  dreDescricao: string
  modalidadeDescricao: string
  cpfCondutor: string
  condutor: string
  crm: string
  veiculoPlacas: string
  veiculoTipoDeBancada: string
  situacao: string
  dataEncerramento: string
  dataEol: string
}

export type OrdemServicoDashboardDetailData = {
  requestedMonth: string
  dreCodigo: string
  modalidadeDescricao: string
  tipoDeBancada?: string
  total: number
  items: OrdemServicoDashboardDetailItem[]
}

const getDashboardUrl = () => {
  return import.meta.env.VITE_ORDEM_SERVICO_DASHBOARD_URL?.trim() || '/api/ordem-servico/dashboard-ativos'
}

const getDashboardDetailsUrl = () => {
  return `${getDashboardUrl()}/detalhes`
}

const getDashboardBancadaUrl = () => {
  return import.meta.env.VITE_ORDEM_SERVICO_DASHBOARD_BANCADA_URL?.trim() || '/api/ordem-servico/dashboard-ativos-bancada'
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
    : 'Falha ao carregar dashboard de OrdemServico.'
}

export async function getOrdemServicoDashboardAtivos(month: string): Promise<OrdemServicoDashboardData> {
  const params = new URLSearchParams({ month })
  const response = await fetch(`${getDashboardUrl()}?${params.toString()}`, {
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

  return payload as unknown as OrdemServicoDashboardData
}

export async function getOrdemServicoDashboardAtivosBancada(month: string): Promise<OrdemServicoDashboardBancadaData> {
  const params = new URLSearchParams({ month })
  const response = await fetch(`${getDashboardBancadaUrl()}?${params.toString()}`, {
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

  return payload as unknown as OrdemServicoDashboardBancadaData
}

export async function getOrdemServicoDashboardAtivosDetalhes({
  month,
  dreCodigo,
  modalidade,
  tipoDeBancada,
}: {
  month: string
  dreCodigo?: string
  modalidade?: string
  tipoDeBancada?: string
}): Promise<OrdemServicoDashboardDetailData> {
  const params = new URLSearchParams({ month })

  if (dreCodigo?.trim()) {
    params.set('dreCodigo', dreCodigo.trim())
  }

  if (modalidade?.trim()) {
    params.set('modalidade', modalidade.trim())
  }

  if (tipoDeBancada?.trim()) {
    params.set('tipoDeBancada', tipoDeBancada.trim())
  }

  const response = await fetch(`${getDashboardDetailsUrl()}?${params.toString()}`, {
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

  return payload as unknown as OrdemServicoDashboardDetailData
}