import { useCallback, useDeferredValue, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import AcessoPaginaView from './AcessoPaginaView'
import ApontamentoServicosView from './ApontamentoServicosView'
import ApuracaoServicosView from './ApuracaoServicosView'
import BatchProcessMonitorView from './BatchProcessMonitorView'
import EnvironmentMonitoringView from './EnvironmentMonitoringView'
import RemuneracaoServicosView from './RemuneracaoServicosView'
import PerfilAcessoView from './PerfilAcessoView'
import PerfilView from './PerfilView'
import ResumoFinanceiroView from './ResumoFinanceiroView'
import { authenticate } from './services/auth'
import { createDreItem, deleteDreItem, listDreItemsPaginated, updateDreItem } from './services/dre'
import type { DreItem } from './services/dre'
import { createModalidadeItem, deleteModalidadeItem, listModalidadeItemsPaginated, updateModalidadeItem } from './services/modalidade'
import type { ModalidadeItem } from './services/modalidade'
import { createCondicaoItem, deleteCondicaoItem, listCondicaoItemsPaginated, updateCondicaoItem } from './services/condicao'
import type { CondicaoItem, CondicaoSortField } from './services/condicao'
import { createTipoBancadaItem, deleteTipoBancadaItem, listTipoBancadaItemsPaginated, updateTipoBancadaItem } from './services/tipoBancada'
import type { TipoBancadaItem } from './services/tipoBancada'
import { createTipoPgtoItem, deleteTipoPgtoItem, listTipoPgtoItemsPaginated, updateTipoPgtoItem } from './services/tipoPgto'
import type { TipoPgtoItem } from './services/tipoPgto'
import { createTipoEscolaItem, deleteTipoEscolaItem, listTipoEscolaItemsPaginated, updateTipoEscolaItem } from './services/tipoEscola'
import type { TipoEscolaItem } from './services/tipoEscola'
import {
  ALIQUOTA_OPTANTE_TIPO_EMPRESA_OPTIONS,
  createAliquotaOptanteItem,
  deleteAliquotaOptanteItem,
  listAliquotaOptanteItemsPaginated,
  updateAliquotaOptanteItem,
} from './services/aliquotaOptante'
import type {
  AliquotaOptanteItem,
  AliquotaOptanteKey,
  AliquotaOptanteSortField,
  AliquotaOptanteTipoEmpresa,
} from './services/aliquotaOptante'
import {
  createDiasLetivosItem,
  deleteDiasLetivosItem,
  listDiasLetivosItemsPaginated,
  updateDiasLetivosItem,
} from './services/diasLetivos'
import type { DiasLetivosItem, DiasLetivosSortField } from './services/diasLetivos'
import {
  APURACAO_FINANCEIRA_STATUS_OPTIONS,
  deleteApuracaoFinanceiraItem,
  getApuracaoFinanceiraChildTotalsSummary,
  listApuracaoFinanceiraItemsPaginated,
  processApuracaoFinanceiraData,
  updateApuracaoFinanceiraItem,
} from './services/apuracaoFinanceira'
import type {
  ApuracaoFinanceiraChildTotalsSummary,
  ApuracaoFinanceiraItem,
  ApuracaoFinanceiraKey,
  ApuracaoFinanceiraProcessResult,
  ApuracaoFinanceiraSortField,
  ApuracaoFinanceiraStatus,
} from './services/apuracaoFinanceira'
import {
  APURACAO_TIPO_PESSOA_OPTIONS,
  formatApuracaoTipoPessoaLabel,
} from './services/apuracaoTipoPessoa'
import type { ApuracaoTipoPessoa } from './services/apuracaoTipoPessoa'

type ApuracaoFinanceiraTipoPessoaFormValue = ApuracaoTipoPessoa | 'TODOS'
type ApuracaoFinanceiraGridRow = {
  key: string
  representativeItem: ApuracaoFinanceiraItem
  items: ApuracaoFinanceiraItem[]
  dreCodigos: string[]
  dreText: string
  tipoPessoaFormValue: ApuracaoFinanceiraTipoPessoaFormValue
  tipoPessoaLabel: string
}

type ApuracaoFinanceiraFormMode = 'create' | 'view' | 'batch-status'

const APURACAO_FINANCEIRA_DELETE_STATUS = 'A processar'

const APURACAO_FINANCEIRA_TIPO_PESSOA_FORM_OPTIONS = [
  { value: 'TODOS', label: 'Todos' },
  ...APURACAO_TIPO_PESSOA_OPTIONS,
] as const
import {
  createModalidadeTipoBancadaAssociationItem,
  deleteModalidadeTipoBancadaAssociationItem,
  listModalidadeTipoBancadaAssociationItems,
} from './services/modalidadeTipoBancadaAssociacao'
import type { ModalidadeTipoBancadaAssociationItem } from './services/modalidadeTipoBancadaAssociacao'
import {
  createModalBancadaTpPagtoCondicaoItem,
  deleteModalBancadaTpPagtoCondicaoItem,
  listModalBancadaTpPagtoCondicaoItems,
  updateModalBancadaTpPagtoCondicaoItem,
} from './services/modalBancadaTpPagtoCondicao'
import type { ModalBancadaTpPagtoCondicaoItem } from './services/modalBancadaTpPagtoCondicao'
import {
  createModalBancadaTpPagtoCondicaoValorItem,
  deleteModalBancadaTpPagtoCondicaoValorItem,
  listModalBancadaTpPagtoCondicaoValorItems,
  updateModalBancadaTpPagtoCondicaoValorItem,
} from './services/modalBancadaTpPagtoCondicaoValor'
import type { ModalBancadaTpPagtoCondicaoValorItem } from './services/modalBancadaTpPagtoCondicaoValor'
import {
  createKmValorItem,
  deleteKmValorItem,
  listKmValorItems,
  updateKmValorItem,
} from './services/kmValor'
import type { KmValorItem } from './services/kmValor'
import {
  createContinuaValorItem,
  deleteContinuaValorItem,
  listContinuaValorItems,
  updateContinuaValorItem,
} from './services/continuaValor'
import type { ContinuaValorItem, ContinuaValorTipo } from './services/continuaValor'
import {
  createParametroVeiculoItem,
  deleteParametroVeiculoItem,
  listParametroVeiculoItems,
  updateParametroVeiculoItem,
} from './services/parametroVeiculo'
import type { ParametroVeiculoItem } from './services/parametroVeiculo'
import { createTitularItem, deleteTitularItem, listTitularItemsPaginated, updateTitularItem } from './services/titular'
import type { TitularItem } from './services/titular'
import { createMarcaModeloItem, deleteMarcaModeloItem, listMarcaModeloItemsPaginated, updateMarcaModeloItem } from './services/marcaModelo'
import type { MarcaModeloItem } from './services/marcaModelo'
import { createSeguradoraItem, deleteSeguradoraItem, listSeguradoraItemsPaginated, updateSeguradoraItem } from './services/seguradora'
import type { SeguradoraItem } from './services/seguradora'
import { getOrdemServicoDashboardAtivos, getOrdemServicoDashboardAtivosBancada, getOrdemServicoDashboardAtivosDetalhes } from './services/ordemServicoDashboard'
import type {
  OrdemServicoDashboardBancadaData,
  OrdemServicoDashboardData,
  OrdemServicoDashboardDetailData,
  OrdemServicoDashboardDetailItem,
} from './services/ordemServicoDashboard'

type DashboardBancadaMatrixRow = {
  dreCodigo: string
  dreDescricao: string
  totalGeral: number
  totalsByModalidade: Record<string, number>
  countsByModalidadeAndTipo: Record<string, Record<string, number>>
}

type StatusTone = 'idle' | 'error' | 'success' | 'warning'

async function getTermoCountByStatus(statusTermo: string): Promise<number> {
  const params = new URLSearchParams({
    statusTermo,
    page: '1',
    pageSize: '1',
  })
  const response = await fetch(`/api/termo?${params.toString()}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })
  const payload = await response.json()

  if (!response.ok) {
    throw new Error(payload?.message || 'Falha ao carregar a contagem de termos.')
  }

  return typeof payload.total === 'number' ? payload.total : 0
}

async function getOrdemServicoCountBySituacao(situacao: string): Promise<number> {
  const params = new URLSearchParams({
    situacao,
    page: '1',
    pageSize: '1',
  })
  const response = await fetch(`/api/ordem-servico?${params.toString()}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })
  const payload = await response.json()

  if (!response.ok) {
    throw new Error(payload?.message || 'Falha ao carregar a contagem de Ordens de Servico.')
  }

  return typeof payload.total === 'number' ? payload.total : 0
}

type ActiveView = 'inicio' | 'dre' | 'modalidade' | 'condicao' | 'tipoPgto' | 'tipoEscola' | 'aliquotaOptante' | 'diasLetivos' | 'resumoFinanceiro' | 'apuracaoFinanceira' | 'apuracaoServicos' | 'apontamentoServicos' | 'remuneracaoServicos' | 'batchProcessMonitor' | 'monitoramentoAmbiente' | 'modalBancadaTpPagtoCondicao' | 'modalBancadaTpPagtoCondicaoValor' | 'kmValor' | 'continuaValor' | 'parametroVeiculo' | 'tipoBancada' | 'titular' | 'marcaModelo' | 'seguradora' | 'troca' | 'acesso' | 'acessoPagina' | 'perfil' | 'perfilAcesso' | 'loginDre' | 'condutor' | 'monitor' | 'credenciada' | 'credenciamentoTermo' | 'termoHistorico' | 'ordemServicoHistorico' | 'financeiroReprocessamento' | 'emissaoDocumentoParametro' | 'veiculo' | 'veiculoHistorico' | 'vinculoCondutor' | 'vinculoMonitor' | 'ordemServico' | 'cep' | 'xmlImportLote' | 'smoke'
type SmokeSuite = 'all' | 'condutor' | 'credenciada' | 'veiculo' | 'marca-modelo'
type SmokeLogStream = 'stdout' | 'stderr'
type DreSortField = 'codigo' | 'descricao'
type TipoEscolaSortField = 'codigo' | 'sigla' | 'descricao'
type DreSortDirection = 'asc' | 'desc'
type TitularSortField = 'codigo' | 'cnpj_cpf' | 'titular'
type MarcaModeloSortField = 'codigo' | 'descricao'
type SeguradoraSortField = 'codigo' | 'controle' | 'descricao'
type FormMode = 'create' | 'edit' | 'view'
type CollapsedMenuGroup = 'cadastros' | 'operacional' | 'operacionalAdministrativo' | 'condutor' | 'monitor' | 'termo' | 'ordemServico' | 'veiculo' | 'operacionalFinanceiro' | 'apuracaoFinanceira' | 'apuracaoServicos' | 'acesso' | 'cadastrosOperacional' | 'cadastrosFinanceiro' | 'monitoramento'

type DashboardDrillDownContext = {
  dreCodigo: string
  dreDescricao: string
  modalidadeDescricao: string
  tipoDeBancada?: string
  total: number
}

const formatModalBancadaTpPagtoCondicaoLabel = (
  item: Pick<ModalBancadaTpPagtoCondicaoItem, 'modalidadeDescricao' | 'tipoBancadaDescricao' | 'tipoPgtoDescricao' | 'condicaoDescricao'>,
) => {
  return `${item.modalidadeDescricao} / ${item.tipoBancadaDescricao} / ${item.tipoPgtoDescricao} / ${item.condicaoDescricao}`
}

const formatModalidadeTipoBancadaLabel = (
  item: Pick<ModalidadeTipoBancadaAssociationItem, 'modalidadeDescricao' | 'tipoBancadaDescricao'>,
) => {
  return `${item.modalidadeDescricao} / ${item.tipoBancadaDescricao}`
}

const normalizeMonthYearInput = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 6)

  if (digits.length <= 2) {
    return digits
  }

  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

const isValidMonthYear = (value: string) => /^(0[1-9]|1[0-2])\/\d{4}$/.test(value)

const convertMonthYearToDashboardMonth = (value: string) => {
  if (!isValidMonthYear(value)) {
    return ''
  }

  const [month, year] = value.split('/')
  return `${year}-${month}`
}

const formatApuracaoFinanceiraKey = (item: Pick<ApuracaoFinanceiraKey, 'mesAno' | 'dreCodigo' | 'revisao' | 'tipoPessoa'>) => {
  return `${item.mesAno}|${item.dreCodigo}|${item.revisao}|${item.tipoPessoa}`
}

const formatApuracaoFinanceiraGridKey = (item: Pick<ApuracaoFinanceiraItem, 'mesAno' | 'dreCodigo' | 'revisao' | 'tipoPessoa' | 'dataReferencia'>) => {
  return `${formatApuracaoFinanceiraKey(item)}|${item.dataReferencia}`
}

const formatApuracaoFinanceiraDreLabel = (item: Pick<ApuracaoFinanceiraItem, 'dreCodigo' | 'dreSigla' | 'dreDescricao'>) => {
  return `${item.dreCodigo} - ${item.dreSigla} - ${item.dreDescricao}`
}

const formatApuracaoFinanceiraDreOptionLabel = (item: Pick<DreItem, 'codigo' | 'sigla' | 'descricao'>) => {
  return `${item.codigo} - ${item.sigla} - ${item.descricao}`
}

const formatApuracaoFinanceiraDreShortLabel = (item: Pick<DreItem, 'codigo' | 'sigla' | 'descricao'>) => {
  return item.sigla || item.descricao || item.codigo
}

const formatAliquotaOptanteKey = (item: Pick<AliquotaOptanteKey, 'data' | 'tipoEmpresa'>) => {
  return `${item.data}|${item.tipoEmpresa}`
}

const formatAliquotaOptanteValue = (value: number) => {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  })
}

const formatIntegerValue = (value: number) => {
  return value.toLocaleString('pt-BR')
}

const formatFourDecimalValue = (value: number | string) => {
  const numericValue = typeof value === 'number'
    ? value
    : Number.parseFloat(value.replace(',', '.'))

  if (!Number.isFinite(numericValue)) {
    return '0,0000'
  }

  return numericValue.toLocaleString('pt-BR', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  })
}

const currencyInputFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const normalizeCurrencyInput = (value: string) => {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return ''
  }

  const decimalCandidate = trimmedValue.replace(/\s+/g, '')

  if (/^-?\d+(?:\.\d+)?$/.test(decimalCandidate)) {
    return Number(decimalCandidate).toFixed(2)
  }

  const digitsOnly = trimmedValue.replace(/\D/g, '')

  if (!digitsOnly) {
    return ''
  }

  return (Number(digitsOnly) / 100).toFixed(2)
}

const formatCurrencyInput = (value: string | number) => {
  const normalizedValue = typeof value === 'number'
    ? value.toFixed(2)
    : normalizeCurrencyInput(value)

  if (!normalizedValue) {
    return ''
  }

  const parsedValue = Number(normalizedValue)

  if (!Number.isFinite(parsedValue)) {
    return ''
  }

  return currencyInputFormatter.format(parsedValue)
}

const CONTINUA_TIPO_OPTIONS: ContinuaValorTipo[] = ['Regular', 'Cadeirante']
const PARAMETRO_VEICULO_CONDICAO_OPTIONS = ['Capacidade', 'Desconto/ Viagem', 'Viagem'] as const

const getDefaultCollapsedMenuGroups = (): Record<CollapsedMenuGroup, boolean> => ({
  cadastros: true,
  operacional: true,
  operacionalAdministrativo: true,
  condutor: true,
  monitor: true,
  termo: true,
  ordemServico: true,
  veiculo: true,
  operacionalFinanceiro: true,
  apuracaoFinanceira: true,
  apuracaoServicos: true,
  acesso: true,
  cadastrosOperacional: true,
  cadastrosFinanceiro: true,
  monitoramento: true,
})

const getExpandedGroupsForView = (view: ActiveView): CollapsedMenuGroup[] => {
  switch (view) {
    case 'titular':
    case 'credenciada':
      return ['operacional', 'operacionalAdministrativo']
    case 'credenciamentoTermo':
    case 'termoHistorico':
      return ['operacional', 'operacionalAdministrativo', 'termo']
    case 'ordemServicoHistorico':
    case 'ordemServico':
      return ['operacional', 'operacionalAdministrativo', 'ordemServico']
    case 'condutor':
    case 'vinculoCondutor':
      return ['operacional', 'operacionalAdministrativo', 'condutor']
    case 'monitor':
    case 'vinculoMonitor':
      return ['operacional', 'operacionalAdministrativo', 'monitor']
    case 'veiculo':
    case 'veiculoHistorico':
      return ['operacional', 'operacionalAdministrativo', 'veiculo']
    case 'resumoFinanceiro':
      return ['operacional', 'operacionalFinanceiro']
    case 'apuracaoFinanceira':
      return ['operacional', 'operacionalFinanceiro', 'apuracaoFinanceira']
    case 'apuracaoServicos':
    case 'apontamentoServicos':
    case 'remuneracaoServicos':
      return ['operacional', 'operacionalFinanceiro', 'apuracaoFinanceira', 'apuracaoServicos']
    case 'monitoramentoAmbiente':
    case 'batchProcessMonitor':
    case 'xmlImportLote':
    case 'financeiroReprocessamento':
    case 'smoke':
      return ['monitoramento']
    case 'dre':
    case 'modalidade':
    case 'tipoBancada':
    case 'marcaModelo':
    case 'seguradora':
    case 'troca':
    case 'emissaoDocumentoParametro':
    case 'cep':
      return ['cadastros', 'cadastrosOperacional']
    case 'condicao':
    case 'tipoPgto':
    case 'tipoEscola':
    case 'aliquotaOptante':
    case 'diasLetivos':
    case 'modalBancadaTpPagtoCondicao':
    case 'modalBancadaTpPagtoCondicaoValor':
    case 'kmValor':
    case 'continuaValor':
    case 'parametroVeiculo':
      return ['cadastros', 'cadastrosFinanceiro']
    case 'acesso':
    case 'acessoPagina':
    case 'perfil':
    case 'perfilAcesso':
    case 'loginDre':
      return ['acesso']
    default:
      return []
  }
}

type SmokeSkippedRecord = {
  index: number
  codigoXml?: string
  message: string
}

type SmokeImportSummary = {
  label: string
  fileName: string
  total: number
  processed: number
  inserted: number
  updated: number
  skipped: number
  skippedRecords: SmokeSkippedRecord[]
}

type SmokeRunReport = {
  requestedSuite: string
  status: string
  startedAt: string
  finishedAt: string | null
  failureMessage: string
  executedSuites: Array<{
    name: string
    status: string
    startedAt?: string
    finishedAt?: string | null
    failureMessage?: string
    imports?: SmokeImportSummary[]
  }>
}

type SmokeInvalidFixtureReport = {
  requestedSuite: string
  status: string
  startedAt: string
  finishedAt: string | null
  failureMessage: string
  executedSuites: Array<{
    suite: string
    fileName: string
    status: string
    startedAt: string
    finishedAt: string | null
    failureMessage: string
    importSummary: Omit<SmokeImportSummary, 'label' | 'fileName'> | null
    rejectionReasons: string[]
  }>
}

type SmokeRunResponse = {
  message: string
  suite: string
  scriptName: string
  status: string
  exitCode: number
  reportPath: string
  report: SmokeRunReport | null
  stdoutTail: string
  stderrTail: string
  invalidFixtureStatus: string
  invalidFixtureReportPath: string
  invalidFixtureReport: SmokeInvalidFixtureReport | null
}

type XmlImportAllStepSummary = {
  total: number | null
  processed: number | null
  inserted: number | null
  updated: number | null
  deleted: number | null
  skipped: number | null
}

type XmlImportAllSkippedRecord = {
  index?: number
  message?: string
  [key: string]: string | number | null | undefined
}

type XmlImportAllStepResponse = {
  message?: string
  source?: string
  databasePath?: string
  skippedRecords?: XmlImportAllSkippedRecord[]
}

type XmlImportAllStepResult = {
  key: string
  label: string
  fileName: string
  source?: string
  endpoint: string
  startedAt: string
  finishedAt: string
  ok: boolean
  skipped?: boolean
  optional?: boolean
  message?: string
  status?: number
  statusText?: string
  logPath?: string
  summary?: XmlImportAllStepSummary
  response?: XmlImportAllStepResponse
  error?: {
    message?: string
    cause?: {
      message?: string
    }
  }
}

type XmlImportAllReport = {
  startedAt: string
  finishedAt: string | null
  baseUrl: string
  source?: string
  logPath?: string
  accessDbPath?: string
  deleteMissing?: boolean
  continueOnError: boolean
  selectedStepKeys: string[]
  ok: boolean
  failedSteps: string[]
  skippedSteps: string[]
  results: XmlImportAllStepResult[]
}

type XmlImportAllRunResponse = {
  message: string
  scriptName: string
  status: string
  exitCode: number | null
  reportPath: string
  logPath?: string
  report: XmlImportAllReport | null
  stdoutTail: string
  stderrTail: string
  logTail?: string
  source?: string
  accessDbPath?: string
  generateFromAccess?: boolean
  truncateBeforeImport?: boolean
  selectedStepKeys?: string[]
  totalSteps?: number
  currentStepKey?: string
  currentStepIndex?: number | null
  currentStepSource?: string
  isRunning?: boolean
  startedAt?: string
  finishedAt?: string
  currentStepLabel?: string
  currentFileName?: string
  currentRecord?: number | null
  totalRecords?: number | null
  currentProgressText?: string
  progressDetail?: string
}

const smokeSuiteOptions: Array<{ value: SmokeSuite, label: string }> = [
  { value: 'all', label: 'Aplicacao completa' },
  { value: 'condutor', label: 'Condutor' },
  { value: 'credenciada', label: 'Credenciada' },
  { value: 'veiculo', label: 'Veiculo' },
  { value: 'marca-modelo', label: 'Marca/Modelo' },
]

const getXmlImportAllStepStatusLabel = (stepResult: XmlImportAllStepResult) => {
  if (stepResult.skipped) {
    return 'ignorado'
  }

  return stepResult.ok ? 'ok' : 'falhou'
}

const formatXmlImportAllSkippedRecordContext = (record: XmlImportAllSkippedRecord) => {
  return Object.entries(record)
    .filter(([key, value]) => key !== 'message' && value != null && String(value).trim() !== '')
    .map(([key, value]) => `${key}: ${value}`)
    .join(' | ')
}

type StoredSession = {
  email: string
  displayName: string
  token: string | null
  user: unknown
  payload: Record<string, unknown>
  authenticatedAt: string
}

type SessionUserMenuAccess = {
  chaveSistema: string
  funcao: 'menu' | 'formulario'
  permissao: string
}

const SESSION_STORAGE_KEY = 'tegfinanc.auth'
const DRE_PAGE_SIZE = 20
const visibleMenuPermissionLevels = new Set(['consulta', 'todos'])
const editableFormPermissionLevels = new Set(['alteracao', 'todos'])
const deletableFormPermissionLevels = new Set(['exclusao', 'todos'])
const appFormEditAccessKeys = {
  dre: 'form_dreform003',
  modalidade: 'form_modalid004',
  condicao: 'form_condica005',
  tipoPgto: 'form_tipopag006',
  tipoEscola: 'form_tipesco007',
  aliquotaOptante: 'form_aliqopt008',
  modalBancadaTpPagtoCondicao: 'form_mbtpcon009',
  modalBancadaTpPagtoCondicaoValor: 'form_mbtpval010',
  diasLetivos: 'form_dialetv011',
  kmValor: 'form_kmvalor012',
  continuaValor: 'form_cntvalr013',
  tipoBancada: 'form_tipbanc014',
  titular: 'form_titucrm015',
  marcaModelo: 'form_marcmod016',
  parametroVeiculo: 'form_parveic017',
  seguradora: 'form_segurad018',
  apuracaoFinanceira: 'form_apurfin019',
} as const
const operationalAdministrativeViews: ActiveView[] = [
  'titular',
  'condutor',
  'vinculoCondutor',
  'monitor',
  'vinculoMonitor',
  'credenciada',
  'credenciamentoTermo',
  'termoHistorico',
  'ordemServico',
  'ordemServicoHistorico',
  'veiculo',
  'veiculoHistorico',
]
const operationalFinanceiroViews: ActiveView[] = [
  'apuracaoFinanceira',
  'resumoFinanceiro',
  'apuracaoServicos',
  'apontamentoServicos',
  'remuneracaoServicos',
]
const cadastroOperationalViews: ActiveView[] = [
  'dre',
  'modalidade',
  'tipoBancada',
  'marcaModelo',
  'seguradora',
  'troca',
  'emissaoDocumentoParametro',
  'cep',
]
const cadastroFinanceiroViews: ActiveView[] = [
  'condicao',
  'modalBancadaTpPagtoCondicao',
  'modalBancadaTpPagtoCondicaoValor',
  'kmValor',
  'continuaValor',
  'parametroVeiculo',
  'tipoPgto',
  'tipoEscola',
  'aliquotaOptante',
  'diasLetivos',
]
const monitoramentoViews: ActiveView[] = [
  'monitoramentoAmbiente',
  'batchProcessMonitor',
  'xmlImportLote',
  'financeiroReprocessamento',
  'smoke',
]
const accessManagementViews: ActiveView[] = [
  'acessoPagina',
  'perfil',
  'perfilAcesso',
  'loginDre',
]
const menuAccessByView: Record<ActiveView, string> = {
  inicio: 'menu_dashboard',
  dre: 'menu_dre',
  modalidade: 'menu_modalidade',
  condicao: 'menu_condicao',
  tipoPgto: 'menu_tipo_pagamento',
  tipoEscola: 'menu_tipo_escola',
  aliquotaOptante: 'menu_aliquota_optante',
  diasLetivos: 'menu_dias_letivos',
  resumoFinanceiro: 'menu_resumo_financeiro',
  apuracaoFinanceira: 'menu_apuracao_financeira',
  apuracaoServicos: 'menu_apuracao_servicos',
  apontamentoServicos: 'menu_apuracao_servicos',
  remuneracaoServicos: 'menu_apuracao_servicos',
  batchProcessMonitor: 'menu_apuracao_servicos',
  monitoramentoAmbiente: 'menu_apuracao_servicos',
  modalBancadaTpPagtoCondicao: 'menu_modal_bancada_tp_pagto_condicao',
  modalBancadaTpPagtoCondicaoValor: 'menu_modal_bancada_tp_pagto_condicao_valor',
  kmValor: 'menu_km_valor',
  continuaValor: 'menu_continua_valor',
  parametroVeiculo: 'menu_parametro_veiculo',
  tipoBancada: 'menu_tipo_bancada',
  titular: 'menu_titular_crm',
  marcaModelo: 'menu_marca_modelo',
  seguradora: 'menu_seguradoras',
  troca: 'menu_tipo_troca',
  acesso: 'menu_controle_acesso',
  acessoPagina: 'menu_acesso_pagina',
  perfil: 'menu_perfil',
  perfilAcesso: 'menu_perfil_acesso',
  loginDre: 'menu_login_dre',
  condutor: 'menu_condutor',
  vinculoCondutor: 'menu_vinculo_condutor',
  monitor: 'menu_monitor',
  vinculoMonitor: 'menu_vinculo_monitor',
  credenciada: 'menu_credenciada',
  credenciamentoTermo: 'menu_termo',
  termoHistorico: 'menu_historico_termo',
  ordemServico: 'menu_ordem_servico',
  ordemServicoHistorico: 'menu_historico_ordem_servico',
  veiculo: 'menu_veiculo',
  veiculoHistorico: 'menu_historico_veiculo',
  financeiroReprocessamento: 'menu_reprocessar_valores',
  emissaoDocumentoParametro: 'menu_param_emissao',
  cep: 'menu_cep',
  xmlImportLote: 'menu_importacao_xml_lote',
  smoke: 'menu_smoke_test',
}
const orderedMenuViews: ActiveView[] = [
  'inicio',
  ...operationalAdministrativeViews,
  ...operationalFinanceiroViews,
  ...cadastroOperationalViews,
  ...cadastroFinanceiroViews,
  ...monitoramentoViews,
  'acesso',
  ...accessManagementViews,
]

const normalizeDreSiglaInput = (value: string) => value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2)

function getCurrentMonthInputValue() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function formatDashboardMonthLabel(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value)) {
    return value
  }

  const [yearText, monthText] = value.split('-')
  const monthDate = new Date(Number(yearText), Number(monthText) - 1, 1)

  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(monthDate)
}

function formatDashboardGeneratedAt(value: string) {
  const generatedDate = new Date(value)

  if (Number.isNaN(generatedDate.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(generatedDate)
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function normalizeDashboardDrillDownSearchValue(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim()
}

function buildDashboardReportMarkup(dashboardData: OrdemServicoDashboardData, options?: { autoPrint?: boolean }) {
  const monthLabel = formatDashboardMonthLabel(dashboardData.requestedMonth)
  const generatedAt = formatDashboardGeneratedAt(dashboardData.generatedAt)
  const autoPrint = Boolean(options?.autoPrint)
  const tableRows = dashboardData.rows
    .map((row) => {
      const modalidadeCells = dashboardData.modalidades
        .map((modalidade) => `<td class="report-number">${row.countsByModalidade[modalidade.descricao] ?? 0}</td>`)
        .join('')

      return `
        <tr>
          <td>
            <div class="report-dre-cell">
              <strong>${escapeHtml(row.dreCodigo)}</strong>
              <span>${escapeHtml(row.dreDescricao)}</span>
            </div>
          </td>
          ${modalidadeCells}
          <td class="report-number report-total-cell">${row.totalGeral}</td>
        </tr>`
    })
    .join('')

  const totalCells = dashboardData.modalidades
    .map((modalidade) => `<th class="report-number">${modalidade.total}</th>`)
    .join('')

  const printScript = autoPrint
    ? `
    <script>
      window.addEventListener('load', function () {
        window.focus();
        window.print();
      });

      window.addEventListener('afterprint', function () {
        window.close();
      });
    </script>`
    : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>Dashboard OrdemServico ${escapeHtml(dashboardData.requestedMonth)}</title>
    <style>
      body {
        margin: 24px;
        font-family: Calibri, Arial, sans-serif;
        color: #111827;
      }

      .report-header {
        margin-bottom: 18px;
      }

      .report-header h1 {
        margin: 0 0 8px;
        font-size: 24px;
      }

      .report-header p {
        margin: 4px 0;
        font-size: 13px;
      }

      .report-table,
      .report-person-table {
        width: 100%;
        border-collapse: collapse;
      }

      .report-table {
        table-layout: fixed;
      }

      .report-table th,
      .report-table td,
      .report-person-table th,
      .report-person-table td {
        border: 1px solid #6b7280;
        padding: 6px 8px;
        font-size: 12px;
      }

      .report-table thead th,
      .report-table tfoot th,
      .report-person-table th {
        background: #e5e7eb;
      }

      .report-table th:first-child,
      .report-table td:first-child {
        text-align: left;
      }

      .report-number {
        text-align: right;
        font-variant-numeric: tabular-nums;
      }

      .report-dre-cell {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .report-dre-cell span {
        color: #4b5563;
      }

      .report-total-cell {
        font-weight: 700;
      }

      .report-footer {
        margin-top: 18px;
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 18px;
      }

      .report-person-table {
        max-width: 420px;
      }

      .report-generated {
        min-width: 220px;
        text-align: right;
      }

      .report-generated p {
        margin: 4px 0;
        font-size: 13px;
      }

      @media print {
        body {
          margin: 12px;
        }
      }
    </style>
  </head>
  <body>
    <header class="report-header">
      <h1>Ordens de Servico Ativas por DRE e Modalidade</h1>
      <p><strong>Mes:</strong> ${escapeHtml(monthLabel)}</p>
      <p><strong>Gerado em:</strong> ${escapeHtml(generatedAt)}</p>
    </header>
    <section>
      <table class="report-table">
        <thead>
          <tr>
            <th>DRE</th>
            ${dashboardData.modalidades.map((modalidade) => `<th>${escapeHtml(modalidade.descricao)}</th>`).join('')}
            <th>Total Geral</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
        <tfoot>
          <tr>
            <th>Total</th>
            ${totalCells}
            <th class="report-number">${dashboardData.totals.totalOverall}</th>
          </tr>
        </tfoot>
      </table>
    </section>
    <section class="report-footer">
      <table class="report-person-table">
        <tbody>
          <tr>
            <th>PESSOA FISICA</th>
            <td class="report-number">${dashboardData.personTypeTotals.pessoaFisica}</td>
          </tr>
          <tr>
            <th>PESSOA JURIDICA</th>
            <td class="report-number">${dashboardData.personTypeTotals.pessoaJuridica}</td>
          </tr>
          <tr>
            <th>COOPERATIVA</th>
            <td class="report-number">${dashboardData.personTypeTotals.cooperativa}</td>
          </tr>
        </tbody>
      </table>
      <div class="report-generated">
        <p><strong>Data da geracao:</strong></p>
        <p>${escapeHtml(generatedAt)}</p>
      </div>
    </section>${printScript}
  </body>
</html>`
}

function getDashboardBancadaLayout(dashboardBancadaData: OrdemServicoDashboardBancadaData) {
  const modalidades = Array.from(new Set(dashboardBancadaData.rows.map((row) => row.modalidadeDescricao)))
    .sort((left, right) => left.localeCompare(right, 'pt-BR'))

  const totalsByModalidade = modalidades.reduce<Record<string, {
    totalGeral: number
    countsByTipoBancada: Record<string, number>
  }>>((accumulator, modalidadeDescricao) => {
    accumulator[modalidadeDescricao] = {
      totalGeral: 0,
      countsByTipoBancada: {},
    }

    return accumulator
  }, {})

  const matrixRows = Array.from(dashboardBancadaData.rows.reduce((accumulator, row) => {
    if (!accumulator.has(row.dreCodigo)) {
      accumulator.set(row.dreCodigo, {
        dreCodigo: row.dreCodigo,
        dreDescricao: row.dreDescricao,
        totalGeral: 0,
        totalsByModalidade: {},
        countsByModalidadeAndTipo: {},
      })
    }

    const currentRow = accumulator.get(row.dreCodigo) as DashboardBancadaMatrixRow
    currentRow.totalGeral += row.totalGeral
    currentRow.totalsByModalidade[row.modalidadeDescricao] = row.totalGeral
    currentRow.countsByModalidadeAndTipo[row.modalidadeDescricao] = row.countsByTipoBancada

    if (!totalsByModalidade[row.modalidadeDescricao]) {
      totalsByModalidade[row.modalidadeDescricao] = {
        totalGeral: 0,
        countsByTipoBancada: {},
      }
    }

    totalsByModalidade[row.modalidadeDescricao].totalGeral += row.totalGeral

    for (const tipoBancada of dashboardBancadaData.tiposBancada) {
      totalsByModalidade[row.modalidadeDescricao].countsByTipoBancada[tipoBancada.descricao] =
        (totalsByModalidade[row.modalidadeDescricao].countsByTipoBancada[tipoBancada.descricao] ?? 0)
        + (row.countsByTipoBancada[tipoBancada.descricao] ?? 0)
    }

    return accumulator
  }, new Map<string, DashboardBancadaMatrixRow>()).values())
    .sort((left, right) => left.dreCodigo.localeCompare(right.dreCodigo, 'pt-BR'))

  const visibleTiposByModalidade = modalidades.reduce<Record<string, string[]>>((accumulator, modalidadeDescricao) => {
    accumulator[modalidadeDescricao] = dashboardBancadaData.tiposBancada
      .filter((tipoBancada) => (totalsByModalidade[modalidadeDescricao]?.countsByTipoBancada[tipoBancada.descricao] ?? 0) > 0)
      .map((tipoBancada) => tipoBancada.descricao)

    return accumulator
  }, {})

  return {
    modalidades,
    matrixRows,
    totalsByModalidade,
    visibleTiposByModalidade,
  }
}

function buildDashboardBancadaReportMarkup(dashboardBancadaData: OrdemServicoDashboardBancadaData, options?: { autoPrint?: boolean }) {
  const monthLabel = formatDashboardMonthLabel(dashboardBancadaData.requestedMonth)
  const generatedAt = formatDashboardGeneratedAt(dashboardBancadaData.generatedAt)
  const autoPrint = Boolean(options?.autoPrint)
  const layout = getDashboardBancadaLayout(dashboardBancadaData)

  const headerTopCells = layout.modalidades
    .map((modalidadeDescricao) => `<th colspan="${layout.visibleTiposByModalidade[modalidadeDescricao]?.length ?? 0}">${escapeHtml(modalidadeDescricao)}</th>`)
    .join('')

  const headerBottomCells = layout.modalidades
    .flatMap((modalidadeDescricao) => (layout.visibleTiposByModalidade[modalidadeDescricao] ?? [])
      .map((tipoBancadaDescricao) => `<th>${escapeHtml(tipoBancadaDescricao)}</th>`))
    .join('')

  const bodyRows = layout.matrixRows
    .map((row) => {
      const bancadaCells = layout.modalidades
        .flatMap((modalidadeDescricao) => (layout.visibleTiposByModalidade[modalidadeDescricao] ?? [])
          .map((tipoBancadaDescricao) => `<td class="report-number">${row.countsByModalidadeAndTipo[modalidadeDescricao]?.[tipoBancadaDescricao] ?? 0}</td>`))
        .join('')

      return `
        <tr>
          <td>
            <div class="report-dre-cell">
              <strong>${escapeHtml(row.dreCodigo)}</strong>
              <span>${escapeHtml(row.dreDescricao)}</span>
            </div>
          </td>
          ${bancadaCells}
          <td class="report-number report-total-cell">${row.totalGeral}</td>
        </tr>`
    })
    .join('')

  const totalCells = layout.modalidades
    .flatMap((modalidadeDescricao) => (layout.visibleTiposByModalidade[modalidadeDescricao] ?? [])
      .map((tipoBancadaDescricao) => `<th class="report-number">${layout.totalsByModalidade[modalidadeDescricao]?.countsByTipoBancada[tipoBancadaDescricao] ?? 0}</th>`))
    .join('')

  const printScript = autoPrint
    ? `
    <script>
      window.addEventListener('load', function () {
        window.focus();
        window.print();
      });

      window.addEventListener('afterprint', function () {
        window.close();
      });
    </script>`
    : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>Dashboard Bancada ${escapeHtml(dashboardBancadaData.requestedMonth)}</title>
    <style>
      body { margin: 24px; font-family: Calibri, Arial, sans-serif; color: #111827; }
      .report-header { margin-bottom: 18px; }
      .report-header h1 { margin: 0 0 8px; font-size: 24px; }
      .report-header p { margin: 4px 0; font-size: 13px; }
      .report-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      .report-table th, .report-table td { border: 1px solid #6b7280; padding: 6px 8px; font-size: 12px; }
      .report-table thead th, .report-table tfoot th { background: #e5e7eb; }
      .report-table th:first-child, .report-table td:first-child { text-align: left; }
      .report-number { text-align: right; font-variant-numeric: tabular-nums; }
      .report-dre-cell { display: flex; flex-direction: column; gap: 2px; }
      .report-dre-cell span { color: #4b5563; }
      .report-total-cell { font-weight: 700; }
      @media print { body { margin: 12px; } }
    </style>
  </head>
  <body>
    <header class="report-header">
      <h1>Ordens de Servico Ativas por DRE, Modalidade e Tipo de Bancada</h1>
      <p><strong>Mes:</strong> ${escapeHtml(monthLabel)}</p>
      <p><strong>Gerado em:</strong> ${escapeHtml(generatedAt)}</p>
    </header>
    <section>
      <table class="report-table">
        <thead>
          <tr>
            <th rowspan="2">DRE</th>
            ${headerTopCells}
            <th rowspan="2">Total Geral</th>
          </tr>
          <tr>
            ${headerBottomCells}
          </tr>
        </thead>
        <tbody>${bodyRows}</tbody>
        <tfoot>
          <tr>
            <th>Total</th>
            ${totalCells}
            <th class="report-number">${dashboardBancadaData.totals.totalOverall}</th>
          </tr>
        </tfoot>
      </table>
    </section>${printScript}
  </body>
</html>`
}

function downloadTextFile(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = fileName
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}

function getStoredSession() {
  const storedValue = sessionStorage.getItem(SESSION_STORAGE_KEY)

  if (!storedValue) {
    return null
  }

  try {
    return JSON.parse(storedValue) as StoredSession
  } catch {
    sessionStorage.removeItem(SESSION_STORAGE_KEY)
    return null
  }
}

function getUserDisplayName(user: unknown, fallbackEmail: string) {
  if (user && typeof user === 'object') {
    const candidateName = 'name' in user ? user.name : null
    if (typeof candidateName === 'string' && candidateName.trim()) {
      return candidateName.trim()
    }

    const candidateEmail = 'email' in user ? user.email : null
    if (typeof candidateEmail === 'string' && candidateEmail.trim()) {
      return candidateEmail.trim()
    }
  }

  return fallbackEmail
}

function getSessionUserMenuAccess(user: unknown): SessionUserMenuAccess[] {
  if (!user || typeof user !== 'object' || !('acessos' in user)) {
    return []
  }

  const rawAcessos = user.acessos

  if (!Array.isArray(rawAcessos)) {
    return []
  }

  return rawAcessos.flatMap((item) => {
    if (!item || typeof item !== 'object') {
      return []
    }

    const chaveSistema = 'chave_sistema' in item ? item.chave_sistema : 'chaveSistema' in item ? item.chaveSistema : ''
    const funcao = 'funcao' in item ? item.funcao : ''
    const permissao = 'permissao' in item ? item.permissao : ''

    if (typeof chaveSistema !== 'string' || typeof funcao !== 'string' || typeof permissao !== 'string') {
      return []
    }

    const normalizedChaveSistema = chaveSistema.trim()
    const normalizedFuncao = funcao.trim().toLowerCase()
    const normalizedPermissao = permissao.trim().toLowerCase()

    if (!normalizedChaveSistema || normalizedFuncao !== 'menu' || !visibleMenuPermissionLevels.has(normalizedPermissao)) {
      return []
    }

    return [{
      chaveSistema: normalizedChaveSistema,
      funcao: 'menu',
      permissao: normalizedPermissao,
    }]
  })
}

function getSessionUserFormAccess(
  user: unknown,
  allowedPermissionLevels: ReadonlySet<string>,
): SessionUserMenuAccess[] {
  if (!user || typeof user !== 'object' || !('acessos' in user)) {
    return []
  }

  const rawAcessos = user.acessos

  if (!Array.isArray(rawAcessos)) {
    return []
  }

  return rawAcessos.flatMap((item) => {
    if (!item || typeof item !== 'object') {
      return []
    }

    const chaveSistema = 'chave_sistema' in item ? item.chave_sistema : 'chaveSistema' in item ? item.chaveSistema : ''
    const funcao = 'funcao' in item ? item.funcao : ''
    const permissao = 'permissao' in item ? item.permissao : ''

    if (typeof chaveSistema !== 'string' || typeof funcao !== 'string' || typeof permissao !== 'string') {
      return []
    }

    const normalizedChaveSistema = chaveSistema.trim()
    const normalizedFuncao = funcao.trim().toLowerCase()
    const normalizedPermissao = permissao.trim().toLowerCase()

    if (!normalizedChaveSistema || normalizedFuncao !== 'formulario' || !allowedPermissionLevels.has(normalizedPermissao)) {
      return []
    }

    return [{
      chaveSistema: normalizedChaveSistema,
      funcao: 'formulario',
      permissao: normalizedPermissao,
    }]
  })
}

function getMenuPermissionKeys(session: StoredSession | null) {
  return new Set(getSessionUserMenuAccess(session?.user).map((item) => item.chaveSistema))
}

function getEditableFormPermissionKeys(session: StoredSession | null) {
  return new Set(getSessionUserFormAccess(session?.user, editableFormPermissionLevels).map((item) => item.chaveSistema))
}

function getDeletableFormPermissionKeys(session: StoredSession | null) {
  return new Set(getSessionUserFormAccess(session?.user, deletableFormPermissionLevels).map((item) => item.chaveSistema))
}

function isMenuKeyAllowed(key: string, allowedKeys: Set<string>) {
  return allowedKeys.has(key)
}

function isViewAllowed(view: ActiveView, allowedKeys: Set<string>) {
  if (view === 'resumoFinanceiro') {
    return isMenuKeyAllowed('menu_resumo_financeiro', allowedKeys) || isMenuKeyAllowed('menu_apuracao_financeira', allowedKeys)
  }

  return isMenuKeyAllowed(menuAccessByView[view], allowedKeys)
}

function getFirstAllowedView(allowedKeys: Set<string>) {
  return orderedMenuViews.find((view) => isViewAllowed(view, allowedKeys)) ?? 'inicio'
}

function getFormEditPermissionMessage(formLabel: string) {
  return `Usuario sem permissao de alteracao para o formulario ${formLabel}.`
}

function getFormDeletePermissionMessage(formLabel: string) {
  return `Usuario sem permissao de exclusao para o formulario ${formLabel}.`
}

function formatCpfOrCnpj(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 14)

  if (digits.length <= 3) {
    return digits
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`
  }

  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  }

  if (digits.length <= 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`
  }

  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
  }

  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`
}

function getSmokeReportFileName(result: SmokeRunResponse | null) {
  if (!result?.reportPath) {
    return 'smoke-report.json'
  }

  const normalizedPath = result.reportPath.replace(/\\/g, '/')
  const segments = normalizedPath.split('/')
  return segments[segments.length - 1] || 'smoke-report.json'
}

function App() {
  const environmentName = import.meta.env.VITE_APP_ENV_NAME?.trim() ?? ''
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [statusTone, setStatusTone] = useState<StatusTone>('idle')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [session, setSession] = useState<StoredSession | null>(null)
  const [activeView, setActiveView] = useState<ActiveView>('inicio')
  const [collapsedMenuGroups, setCollapsedMenuGroups] = useState<Record<CollapsedMenuGroup, boolean>>(getDefaultCollapsedMenuGroups)
  const [isRunningSmoke, setIsRunningSmoke] = useState(false)
  const [selectedSmokeSuite, setSelectedSmokeSuite] = useState<SmokeSuite>('all')
  const [smokeStatusMessage, setSmokeStatusMessage] = useState('')
  const [smokeStatusTone, setSmokeStatusTone] = useState<StatusTone>('idle')
  const [smokeStdout, setSmokeStdout] = useState('')
  const [smokeStderr, setSmokeStderr] = useState('')
  const [selectedSmokeLogStream, setSelectedSmokeLogStream] = useState<SmokeLogStream>('stdout')
  const [smokeReportActionMessage, setSmokeReportActionMessage] = useState('')
  const [smokeResult, setSmokeResult] = useState<SmokeRunResponse | null>(null)
  const [isRunningXmlImportAll, setIsRunningXmlImportAll] = useState(false)
  const [xmlImportAllStatusMessage, setXmlImportAllStatusMessage] = useState('')
  const [xmlImportAllStatusTone, setXmlImportAllStatusTone] = useState<StatusTone>('idle')
  const [xmlImportAllStdout, setXmlImportAllStdout] = useState('')
  const [xmlImportAllStderr, setXmlImportAllStderr] = useState('')
  const [xmlImportAllAccessDbPathInput, setXmlImportAllAccessDbPathInput] = useState('')
  const [xmlImportAllLastUpdatedAt, setXmlImportAllLastUpdatedAt] = useState('')
  const [selectedXmlImportAllLogStream, setSelectedXmlImportAllLogStream] = useState<SmokeLogStream>('stdout')
  const [xmlImportAllResult, setXmlImportAllResult] = useState<XmlImportAllRunResponse | null>(null)
  const [selectedXmlImportAllStepKey, setSelectedXmlImportAllStepKey] = useState('')
  const [dashboardMonth, setDashboardMonth] = useState(getCurrentMonthInputValue())
  const [dashboardData, setDashboardData] = useState<OrdemServicoDashboardData | null>(null)
  const [dashboardBancadaData, setDashboardBancadaData] = useState<OrdemServicoDashboardBancadaData | null>(null)
  const [dashboardStatusMessage, setDashboardStatusMessage] = useState('')
  const [dashboardStatusTone, setDashboardStatusTone] = useState<StatusTone>('idle')
  const [termoAtivosCount, setTermoAtivosCount] = useState(0)
  const [termoRescindidosCount, setTermoRescindidosCount] = useState(0)
  const [osCanceladasCount, setOsCanceladasCount] = useState(0)
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false)
  const [isDashboardResumoExpanded, setIsDashboardResumoExpanded] = useState(false)
  const [isDashboardBancadaExpanded, setIsDashboardBancadaExpanded] = useState(false)
  const [isDashboardDrillDownVisible, setIsDashboardDrillDownVisible] = useState(false)
  const [isLoadingDashboardDrillDown, setIsLoadingDashboardDrillDown] = useState(false)
  const [dashboardDrillDownContext, setDashboardDrillDownContext] = useState<DashboardDrillDownContext | null>(null)
  const [dashboardDrillDownData, setDashboardDrillDownData] = useState<OrdemServicoDashboardDetailData | null>(null)
  const [dashboardDrillDownSearch, setDashboardDrillDownSearch] = useState('')
  const [isSidebarVisible, setIsSidebarVisible] = useState(true)
  const [dashboardDrillDownStatusMessage, setDashboardDrillDownStatusMessage] = useState('')
  const [isDashboardOsPopupVisible, setIsDashboardOsPopupVisible] = useState(false)
  const [dashboardOsPopupUrl, setDashboardOsPopupUrl] = useState('')
  const [dreItems, setDreItems] = useState<DreItem[]>([])
  const [dreSigla, setDreSigla] = useState('')
  const [dreSiglaError, setDreSiglaError] = useState('')
  const [dreDescricao, setDreDescricao] = useState('')
  const [dreDescricaoError, setDreDescricaoError] = useState('')
  const [dreStatusMessage, setDreStatusMessage] = useState('')
  const [dreStatusTone, setDreStatusTone] = useState<StatusTone>('idle')
  const [isLoadingDre, setIsLoadingDre] = useState(false)
  const [isSavingDre, setIsSavingDre] = useState(false)
  const [isDeletingDre, setIsDeletingDre] = useState(false)
  const [isDreFormVisible, setIsDreFormVisible] = useState(false)
  const [editingDreCodigo, setEditingDreCodigo] = useState<string | null>(null)
  const [dreFormMode, setDreFormMode] = useState<FormMode>('create')
  const [dreSearch, setDreSearch] = useState('')
  const [drePage, setDrePage] = useState(1)
  const [dreTotalItems, setDreTotalItems] = useState(0)
  const [dreTotalPages, setDreTotalPages] = useState(1)
  const [dreSortBy, setDreSortBy] = useState<DreSortField>('codigo')
  const [dreSortDirection, setDreSortDirection] = useState<DreSortDirection>('asc')
  const deferredDreSearch = useDeferredValue(dreSearch)
  const [modalidadeItems, setModalidadeItems] = useState<ModalidadeItem[]>([])
  const [modalidadeDescricao, setModalidadeDescricao] = useState('')
  const [modalidadeDescricaoError, setModalidadeDescricaoError] = useState('')
  const [modalidadeStatusMessage, setModalidadeStatusMessage] = useState('')
  const [modalidadeStatusTone, setModalidadeStatusTone] = useState<StatusTone>('idle')
  const [isLoadingModalidade, setIsLoadingModalidade] = useState(false)
  const [isSavingModalidade, setIsSavingModalidade] = useState(false)
  const [isDeletingModalidade, setIsDeletingModalidade] = useState(false)
  const [isModalidadeFormVisible, setIsModalidadeFormVisible] = useState(false)
  const [editingModalidadeCodigo, setEditingModalidadeCodigo] = useState<string | null>(null)
  const [modalidadeFormMode, setModalidadeFormMode] = useState<FormMode>('create')
  const [modalidadeSearch, setModalidadeSearch] = useState('')
  const [modalidadePage, setModalidadePage] = useState(1)
  const [modalidadeTotalItems, setModalidadeTotalItems] = useState(0)
  const [modalidadeTotalPages, setModalidadeTotalPages] = useState(1)
  const [modalidadeSortBy, setModalidadeSortBy] = useState<DreSortField>('codigo')
  const [modalidadeSortDirection, setModalidadeSortDirection] = useState<DreSortDirection>('asc')
  const deferredModalidadeSearch = useDeferredValue(modalidadeSearch)
  const [condicaoItems, setCondicaoItems] = useState<CondicaoItem[]>([])
  const [condicaoDescricao, setCondicaoDescricao] = useState('')
  const [condicaoDescricaoError, setCondicaoDescricaoError] = useState('')
  const [condicaoQtdeIni, setCondicaoQtdeIni] = useState('')
  const [condicaoQtdeIniError, setCondicaoQtdeIniError] = useState('')
  const [condicaoQtdeFim, setCondicaoQtdeFim] = useState('')
  const [condicaoQtdeFimError, setCondicaoQtdeFimError] = useState('')
  const [condicaoStatusMessage, setCondicaoStatusMessage] = useState('')
  const [condicaoStatusTone, setCondicaoStatusTone] = useState<StatusTone>('idle')
  const [isLoadingCondicao, setIsLoadingCondicao] = useState(false)
  const [isSavingCondicao, setIsSavingCondicao] = useState(false)
  const [isDeletingCondicao, setIsDeletingCondicao] = useState(false)
  const [isCondicaoFormVisible, setIsCondicaoFormVisible] = useState(false)
  const [editingCondicaoCodigo, setEditingCondicaoCodigo] = useState<string | null>(null)
  const [condicaoFormMode, setCondicaoFormMode] = useState<FormMode>('create')
  const [condicaoSearch, setCondicaoSearch] = useState('')
  const [condicaoPage, setCondicaoPage] = useState(1)
  const [condicaoTotalItems, setCondicaoTotalItems] = useState(0)
  const [condicaoTotalPages, setCondicaoTotalPages] = useState(1)
  const [condicaoSortBy, setCondicaoSortBy] = useState<CondicaoSortField>('codigo')
  const [condicaoSortDirection, setCondicaoSortDirection] = useState<DreSortDirection>('asc')
  const deferredCondicaoSearch = useDeferredValue(condicaoSearch)
  const [tipoBancadaItems, setTipoBancadaItems] = useState<TipoBancadaItem[]>([])
  const [tipoBancadaDescricao, setTipoBancadaDescricao] = useState('')
  const [tipoBancadaDescricaoError, setTipoBancadaDescricaoError] = useState('')
  const [tipoBancadaStatusMessage, setTipoBancadaStatusMessage] = useState('')
  const [tipoBancadaStatusTone, setTipoBancadaStatusTone] = useState<StatusTone>('idle')
  const [isLoadingTipoBancada, setIsLoadingTipoBancada] = useState(false)
  const [isSavingTipoBancada, setIsSavingTipoBancada] = useState(false)
  const [isDeletingTipoBancada, setIsDeletingTipoBancada] = useState(false)
  const [isTipoBancadaFormVisible, setIsTipoBancadaFormVisible] = useState(false)
  const [editingTipoBancadaCodigo, setEditingTipoBancadaCodigo] = useState<string | null>(null)
  const [tipoBancadaFormMode, setTipoBancadaFormMode] = useState<FormMode>('create')
  const [tipoBancadaSearch, setTipoBancadaSearch] = useState('')
  const [tipoBancadaPage, setTipoBancadaPage] = useState(1)
  const [tipoBancadaTotalItems, setTipoBancadaTotalItems] = useState(0)
  const [tipoBancadaTotalPages, setTipoBancadaTotalPages] = useState(1)
  const [tipoBancadaSortBy, setTipoBancadaSortBy] = useState<DreSortField>('codigo')
  const [tipoBancadaSortDirection, setTipoBancadaSortDirection] = useState<DreSortDirection>('asc')
  const deferredTipoBancadaSearch = useDeferredValue(tipoBancadaSearch)
  const [tipoPgtoItems, setTipoPgtoItems] = useState<TipoPgtoItem[]>([])
  const [tipoPgtoDescricao, setTipoPgtoDescricao] = useState('')
  const [tipoPgtoDescricaoError, setTipoPgtoDescricaoError] = useState('')
  const [tipoPgtoStatusMessage, setTipoPgtoStatusMessage] = useState('')
  const [tipoPgtoStatusTone, setTipoPgtoStatusTone] = useState<StatusTone>('idle')
  const [isLoadingTipoPgto, setIsLoadingTipoPgto] = useState(false)
  const [isSavingTipoPgto, setIsSavingTipoPgto] = useState(false)
  const [isDeletingTipoPgto, setIsDeletingTipoPgto] = useState(false)
  const [isTipoPgtoFormVisible, setIsTipoPgtoFormVisible] = useState(false)
  const [editingTipoPgtoCodigo, setEditingTipoPgtoCodigo] = useState<string | null>(null)
  const [tipoPgtoFormMode, setTipoPgtoFormMode] = useState<FormMode>('create')
  const [tipoPgtoSearch, setTipoPgtoSearch] = useState('')
  const [tipoPgtoPage, setTipoPgtoPage] = useState(1)
  const [tipoPgtoTotalItems, setTipoPgtoTotalItems] = useState(0)
  const [tipoPgtoTotalPages, setTipoPgtoTotalPages] = useState(1)
  const [tipoPgtoSortBy, setTipoPgtoSortBy] = useState<DreSortField>('codigo')
  const [tipoPgtoSortDirection, setTipoPgtoSortDirection] = useState<DreSortDirection>('asc')
  const deferredTipoPgtoSearch = useDeferredValue(tipoPgtoSearch)
  const [tipoEscolaItems, setTipoEscolaItems] = useState<TipoEscolaItem[]>([])
  const [tipoEscolaSigla, setTipoEscolaSigla] = useState('')
  const [tipoEscolaSiglaError, setTipoEscolaSiglaError] = useState('')
  const [tipoEscolaDescricao, setTipoEscolaDescricao] = useState('')
  const [tipoEscolaDescricaoError, setTipoEscolaDescricaoError] = useState('')
  const [tipoEscolaStatusMessage, setTipoEscolaStatusMessage] = useState('')
  const [tipoEscolaStatusTone, setTipoEscolaStatusTone] = useState<StatusTone>('idle')
  const [isLoadingTipoEscola, setIsLoadingTipoEscola] = useState(false)
  const [isSavingTipoEscola, setIsSavingTipoEscola] = useState(false)
  const [isDeletingTipoEscola, setIsDeletingTipoEscola] = useState(false)
  const [isTipoEscolaFormVisible, setIsTipoEscolaFormVisible] = useState(false)
  const [editingTipoEscolaCodigo, setEditingTipoEscolaCodigo] = useState<string | null>(null)
  const [tipoEscolaFormMode, setTipoEscolaFormMode] = useState<FormMode>('create')
  const [tipoEscolaSearch, setTipoEscolaSearch] = useState('')
  const [tipoEscolaPage, setTipoEscolaPage] = useState(1)
  const [tipoEscolaTotalItems, setTipoEscolaTotalItems] = useState(0)
  const [tipoEscolaTotalPages, setTipoEscolaTotalPages] = useState(1)
  const [tipoEscolaSortBy, setTipoEscolaSortBy] = useState<TipoEscolaSortField>('codigo')
  const [tipoEscolaSortDirection, setTipoEscolaSortDirection] = useState<DreSortDirection>('asc')
  const deferredTipoEscolaSearch = useDeferredValue(tipoEscolaSearch)
  const [aliquotaOptanteItems, setAliquotaOptanteItems] = useState<AliquotaOptanteItem[]>([])
  const [aliquotaOptanteData, setAliquotaOptanteData] = useState('')
  const [aliquotaOptanteDataError, setAliquotaOptanteDataError] = useState('')
  const [aliquotaOptanteTipoEmpresa, setAliquotaOptanteTipoEmpresa] = useState<AliquotaOptanteTipoEmpresa>(ALIQUOTA_OPTANTE_TIPO_EMPRESA_OPTIONS[0])
  const [aliquotaOptanteTipoEmpresaError, setAliquotaOptanteTipoEmpresaError] = useState('')
  const [aliquotaOptanteValor, setAliquotaOptanteValor] = useState('')
  const [aliquotaOptanteValorError, setAliquotaOptanteValorError] = useState('')
  const [aliquotaOptanteStatusMessage, setAliquotaOptanteStatusMessage] = useState('')
  const [aliquotaOptanteStatusTone, setAliquotaOptanteStatusTone] = useState<StatusTone>('idle')
  const [isLoadingAliquotaOptante, setIsLoadingAliquotaOptante] = useState(false)
  const [isSavingAliquotaOptante, setIsSavingAliquotaOptante] = useState(false)
  const [isDeletingAliquotaOptante, setIsDeletingAliquotaOptante] = useState(false)
  const [isAliquotaOptanteFormVisible, setIsAliquotaOptanteFormVisible] = useState(false)
  const [editingAliquotaOptanteKey, setEditingAliquotaOptanteKey] = useState<AliquotaOptanteKey | null>(null)
  const [aliquotaOptanteFormMode, setAliquotaOptanteFormMode] = useState<FormMode>('create')
  const [aliquotaOptanteSearch, setAliquotaOptanteSearch] = useState('')
  const [aliquotaOptantePage, setAliquotaOptantePage] = useState(1)
  const [aliquotaOptanteTotalItems, setAliquotaOptanteTotalItems] = useState(0)
  const [aliquotaOptanteTotalPages, setAliquotaOptanteTotalPages] = useState(1)
  const [aliquotaOptanteSortBy, setAliquotaOptanteSortBy] = useState<AliquotaOptanteSortField>('data')
  const [aliquotaOptanteSortDirection, setAliquotaOptanteSortDirection] = useState<DreSortDirection>('desc')
  const deferredAliquotaOptanteSearch = useDeferredValue(aliquotaOptanteSearch)
  const [diasLetivosItems, setDiasLetivosItems] = useState<DiasLetivosItem[]>([])
  const [diasLetivosData, setDiasLetivosData] = useState('')
  const [diasLetivosDataError, setDiasLetivosDataError] = useState('')
  const [diasLetivosQuantidade, setDiasLetivosQuantidade] = useState('')
  const [diasLetivosQuantidadeError, setDiasLetivosQuantidadeError] = useState('')
  const [diasLetivosStatusMessage, setDiasLetivosStatusMessage] = useState('')
  const [diasLetivosStatusTone, setDiasLetivosStatusTone] = useState<StatusTone>('idle')
  const [isLoadingDiasLetivos, setIsLoadingDiasLetivos] = useState(false)
  const [isSavingDiasLetivos, setIsSavingDiasLetivos] = useState(false)
  const [isDeletingDiasLetivos, setIsDeletingDiasLetivos] = useState(false)
  const [isDiasLetivosFormVisible, setIsDiasLetivosFormVisible] = useState(false)
  const [editingDiasLetivosData, setEditingDiasLetivosData] = useState<string | null>(null)
  const [diasLetivosFormMode, setDiasLetivosFormMode] = useState<FormMode>('create')
  const [diasLetivosSearch, setDiasLetivosSearch] = useState('')
  const [diasLetivosPage, setDiasLetivosPage] = useState(1)
  const [diasLetivosTotalItems, setDiasLetivosTotalItems] = useState(0)
  const [diasLetivosTotalPages, setDiasLetivosTotalPages] = useState(1)
  const [diasLetivosSortBy, setDiasLetivosSortBy] = useState<DiasLetivosSortField>('data')
  const [diasLetivosSortDirection, setDiasLetivosSortDirection] = useState<DreSortDirection>('asc')
  const deferredDiasLetivosSearch = useDeferredValue(diasLetivosSearch)
  const [apuracaoFinanceiraItems, setApuracaoFinanceiraItems] = useState<ApuracaoFinanceiraItem[]>([])
  const [apuracaoFinanceiraMesAno, setApuracaoFinanceiraMesAno] = useState('')
  const [apuracaoFinanceiraMesAnoError, setApuracaoFinanceiraMesAnoError] = useState('')
  const [apuracaoFinanceiraDreCodigo, setApuracaoFinanceiraDreCodigo] = useState('')
  const [apuracaoFinanceiraDreCodigoError, setApuracaoFinanceiraDreCodigoError] = useState('')
  const [apuracaoFinanceiraSelectedDreCodigos, setApuracaoFinanceiraSelectedDreCodigos] = useState<string[]>([])
  const apuracaoFinanceiraSelectedDreCodigosRef = useRef<string[]>([])
  const [apuracaoFinanceiraSelectedDresError, setApuracaoFinanceiraSelectedDresError] = useState('')
  const [apuracaoFinanceiraRevisao, setApuracaoFinanceiraRevisao] = useState('0')
  const [apuracaoFinanceiraRevisaoError, setApuracaoFinanceiraRevisaoError] = useState('')
  const [apuracaoFinanceiraTipoPessoa, setApuracaoFinanceiraTipoPessoa] = useState<ApuracaoFinanceiraTipoPessoaFormValue>('TODOS')
  const [apuracaoFinanceiraTipoPessoaError, setApuracaoFinanceiraTipoPessoaError] = useState('')
  const [apuracaoFinanceiraSituacao, setApuracaoFinanceiraSituacao] = useState<ApuracaoFinanceiraStatus>(APURACAO_FINANCEIRA_STATUS_OPTIONS[0])
  const [apuracaoFinanceiraStatusMessage, setApuracaoFinanceiraStatusMessage] = useState('')
  const [apuracaoFinanceiraStatusTone, setApuracaoFinanceiraStatusTone] = useState<StatusTone>('idle')
  const [apuracaoFinanceiraDreOptions, setApuracaoFinanceiraDreOptions] = useState<DreItem[]>([])
  const [apuracaoFinanceiraActiveDreOptions, setApuracaoFinanceiraActiveDreOptions] = useState<DreItem[]>([])
  const [isLoadingApuracaoFinanceiraOptions, setIsLoadingApuracaoFinanceiraOptions] = useState(false)
  const [isLoadingApuracaoFinanceiraActiveDres, setIsLoadingApuracaoFinanceiraActiveDres] = useState(false)
  const [isLoadingApuracaoFinanceira, setIsLoadingApuracaoFinanceira] = useState(false)
  const isSavingApuracaoFinanceira = false
  const [isProcessingApuracaoFinanceira, setIsProcessingApuracaoFinanceira] = useState(false)
  const [isUpdatingApuracaoFinanceiraBatchStatus, setIsUpdatingApuracaoFinanceiraBatchStatus] = useState(false)
  const [isDeletingApuracaoFinanceira, setIsDeletingApuracaoFinanceira] = useState(false)
  const [isApuracaoFinanceiraFormVisible, setIsApuracaoFinanceiraFormVisible] = useState(false)
  const [isApuracaoFinanceiraChildTotalsVisible, setIsApuracaoFinanceiraChildTotalsVisible] = useState(false)
  const [isLoadingApuracaoFinanceiraChildTotals, setIsLoadingApuracaoFinanceiraChildTotals] = useState(false)
  const [apuracaoFinanceiraChildTotals, setApuracaoFinanceiraChildTotals] = useState<ApuracaoFinanceiraChildTotalsSummary | null>(null)
  const [apuracaoFinanceiraChildTotalsStatusMessage, setApuracaoFinanceiraChildTotalsStatusMessage] = useState('')
  const [apuracaoFinanceiraChildTotalsStatusTone, setApuracaoFinanceiraChildTotalsStatusTone] = useState<StatusTone>('idle')
  const [editingApuracaoFinanceiraKey, setEditingApuracaoFinanceiraKey] = useState<ApuracaoFinanceiraKey | null>(null)
  const [apuracaoFinanceiraFormMode, setApuracaoFinanceiraFormMode] = useState<ApuracaoFinanceiraFormMode>('create')
  const [apuracaoFinanceiraSearch, setApuracaoFinanceiraSearch] = useState('')
  const [apuracaoFinanceiraPage, setApuracaoFinanceiraPage] = useState(1)
  const [apuracaoFinanceiraTotalPages, setApuracaoFinanceiraTotalPages] = useState(1)
  const [apuracaoFinanceiraSortBy, setApuracaoFinanceiraSortBy] = useState<ApuracaoFinanceiraSortField>('mesAno')
  const [apuracaoFinanceiraSortDirection, setApuracaoFinanceiraSortDirection] = useState<DreSortDirection>('desc')
  const deferredApuracaoFinanceiraSearch = useDeferredValue(apuracaoFinanceiraSearch)
  const [apuracaoFinanceiraGridActiveDreCounts, setApuracaoFinanceiraGridActiveDreCounts] = useState<Record<string, number>>({})
  const [tipoBancadaAssociationItems, setTipoBancadaAssociationItems] = useState<ModalidadeTipoBancadaAssociationItem[]>([])
  const [associationModalidadeCodigo, setAssociationModalidadeCodigo] = useState('')
  const [associationTipoBancadaCodigo, setAssociationTipoBancadaCodigo] = useState('')
  const [associationStatusMessage, setAssociationStatusMessage] = useState('')
  const [associationStatusTone, setAssociationStatusTone] = useState<StatusTone>('idle')
  const [associationModalidadeOptions, setAssociationModalidadeOptions] = useState<ModalidadeItem[]>([])
  const [associationTipoBancadaOptions, setAssociationTipoBancadaOptions] = useState<TipoBancadaItem[]>([])
  const [isLoadingAssociationOptions, setIsLoadingAssociationOptions] = useState(false)
  const [isLoadingTipoBancadaAssociations, setIsLoadingTipoBancadaAssociations] = useState(false)
  const [isSavingTipoBancadaAssociation, setIsSavingTipoBancadaAssociation] = useState(false)
  const [isDeletingTipoBancadaAssociation, setIsDeletingTipoBancadaAssociation] = useState(false)
  const [modalBancadaTpPagtoCondicaoItems, setModalBancadaTpPagtoCondicaoItems] = useState<ModalBancadaTpPagtoCondicaoItem[]>([])
  const [modalBancadaTpPagtoCondicaoAssociationCodigo, setModalBancadaTpPagtoCondicaoAssociationCodigo] = useState('')
  const [modalBancadaTpPagtoCondicaoTipoPgtoCodigo, setModalBancadaTpPagtoCondicaoTipoPgtoCodigo] = useState('')
  const [modalBancadaTpPagtoCondicaoCondicaoCodigo, setModalBancadaTpPagtoCondicaoCondicaoCodigo] = useState('')
  const [modalBancadaTpPagtoCondicaoStatusMessage, setModalBancadaTpPagtoCondicaoStatusMessage] = useState('')
  const [modalBancadaTpPagtoCondicaoStatusTone, setModalBancadaTpPagtoCondicaoStatusTone] = useState<StatusTone>('idle')
  const [modalBancadaTpPagtoCondicaoAssociationOptions, setModalBancadaTpPagtoCondicaoAssociationOptions] = useState<ModalidadeTipoBancadaAssociationItem[]>([])
  const [modalBancadaTpPagtoCondicaoTipoPgtoOptions, setModalBancadaTpPagtoCondicaoTipoPgtoOptions] = useState<TipoPgtoItem[]>([])
  const [modalBancadaTpPagtoCondicaoCondicaoOptions, setModalBancadaTpPagtoCondicaoCondicaoOptions] = useState<CondicaoItem[]>([])
  const [isLoadingModalBancadaTpPagtoCondicaoOptions, setIsLoadingModalBancadaTpPagtoCondicaoOptions] = useState(false)
  const [isLoadingModalBancadaTpPagtoCondicaoItems, setIsLoadingModalBancadaTpPagtoCondicaoItems] = useState(false)
  const [isSavingModalBancadaTpPagtoCondicao, setIsSavingModalBancadaTpPagtoCondicao] = useState(false)
  const [isDeletingModalBancadaTpPagtoCondicao, setIsDeletingModalBancadaTpPagtoCondicao] = useState(false)
  const [isModalBancadaTpPagtoCondicaoFormVisible, setIsModalBancadaTpPagtoCondicaoFormVisible] = useState(false)
  const [editingModalBancadaTpPagtoCondicaoCodigo, setEditingModalBancadaTpPagtoCondicaoCodigo] = useState<string | null>(null)
  const [modalBancadaTpPagtoCondicaoFormMode, setModalBancadaTpPagtoCondicaoFormMode] = useState<FormMode>('create')
  const [modalBancadaTpPagtoCondicaoFilterAssociationCodigo, setModalBancadaTpPagtoCondicaoFilterAssociationCodigo] = useState('')
  const [modalBancadaTpPagtoCondicaoFilterTipoPgtoCodigo, setModalBancadaTpPagtoCondicaoFilterTipoPgtoCodigo] = useState('')
  const [modalBancadaTpPagtoCondicaoFilterCondicaoCodigo, setModalBancadaTpPagtoCondicaoFilterCondicaoCodigo] = useState('')
  const [appliedModalBancadaTpPagtoCondicaoFilterAssociationCodigo, setAppliedModalBancadaTpPagtoCondicaoFilterAssociationCodigo] = useState('')
  const [appliedModalBancadaTpPagtoCondicaoFilterTipoPgtoCodigo, setAppliedModalBancadaTpPagtoCondicaoFilterTipoPgtoCodigo] = useState('')
  const [appliedModalBancadaTpPagtoCondicaoFilterCondicaoCodigo, setAppliedModalBancadaTpPagtoCondicaoFilterCondicaoCodigo] = useState('')
  const [modalBancadaTpPagtoCondicaoPage, setModalBancadaTpPagtoCondicaoPage] = useState(1)
  const [modalBancadaTpPagtoCondicaoTotalItems, setModalBancadaTpPagtoCondicaoTotalItems] = useState(0)
  const [modalBancadaTpPagtoCondicaoTotalPages, setModalBancadaTpPagtoCondicaoTotalPages] = useState(1)
  const [modalBancadaTpPagtoCondicaoValorItems, setModalBancadaTpPagtoCondicaoValorItems] = useState<ModalBancadaTpPagtoCondicaoValorItem[]>([])
  const [modalBancadaTpPagtoCondicaoValorAssociationCodigo, setModalBancadaTpPagtoCondicaoValorAssociationCodigo] = useState('')
  const [modalBancadaTpPagtoCondicaoValorData, setModalBancadaTpPagtoCondicaoValorData] = useState('')
  const [modalBancadaTpPagtoCondicaoValorValor, setModalBancadaTpPagtoCondicaoValorValor] = useState('')
  const [modalBancadaTpPagtoCondicaoValorStatusMessage, setModalBancadaTpPagtoCondicaoValorStatusMessage] = useState('')
  const [modalBancadaTpPagtoCondicaoValorStatusTone, setModalBancadaTpPagtoCondicaoValorStatusTone] = useState<StatusTone>('idle')
  const [modalBancadaTpPagtoCondicaoValorOptions, setModalBancadaTpPagtoCondicaoValorOptions] = useState<ModalBancadaTpPagtoCondicaoItem[]>([])
  const [isLoadingModalBancadaTpPagtoCondicaoValorOptions, setIsLoadingModalBancadaTpPagtoCondicaoValorOptions] = useState(false)
  const [isLoadingModalBancadaTpPagtoCondicaoValorItems, setIsLoadingModalBancadaTpPagtoCondicaoValorItems] = useState(false)
  const [isSavingModalBancadaTpPagtoCondicaoValor, setIsSavingModalBancadaTpPagtoCondicaoValor] = useState(false)
  const [isDeletingModalBancadaTpPagtoCondicaoValor, setIsDeletingModalBancadaTpPagtoCondicaoValor] = useState(false)
  const [isModalBancadaTpPagtoCondicaoValorFormVisible, setIsModalBancadaTpPagtoCondicaoValorFormVisible] = useState(false)
  const [editingModalBancadaTpPagtoCondicaoValorCodigo, setEditingModalBancadaTpPagtoCondicaoValorCodigo] = useState<string | null>(null)
  const [modalBancadaTpPagtoCondicaoValorFormMode, setModalBancadaTpPagtoCondicaoValorFormMode] = useState<FormMode>('create')
  const [modalBancadaTpPagtoCondicaoValorFilterAssociationCodigo, setModalBancadaTpPagtoCondicaoValorFilterAssociationCodigo] = useState('')
  const [modalBancadaTpPagtoCondicaoValorFilterData, setModalBancadaTpPagtoCondicaoValorFilterData] = useState('')
  const [appliedModalBancadaTpPagtoCondicaoValorFilterAssociationCodigo, setAppliedModalBancadaTpPagtoCondicaoValorFilterAssociationCodigo] = useState('')
  const [appliedModalBancadaTpPagtoCondicaoValorFilterData, setAppliedModalBancadaTpPagtoCondicaoValorFilterData] = useState('')
  const [modalBancadaTpPagtoCondicaoValorPage, setModalBancadaTpPagtoCondicaoValorPage] = useState(1)
  const [modalBancadaTpPagtoCondicaoValorTotalItems, setModalBancadaTpPagtoCondicaoValorTotalItems] = useState(0)
  const [modalBancadaTpPagtoCondicaoValorTotalPages, setModalBancadaTpPagtoCondicaoValorTotalPages] = useState(1)
  const [kmValorItems, setKmValorItems] = useState<KmValorItem[]>([])
  const [kmValorCondicaoCodigo, setKmValorCondicaoCodigo] = useState('')
  const [kmValorData, setKmValorData] = useState('')
  const [kmValorValor, setKmValorValor] = useState('')
  const [kmValorStatusMessage, setKmValorStatusMessage] = useState('')
  const [kmValorStatusTone, setKmValorStatusTone] = useState<StatusTone>('idle')
  const [kmValorCondicaoOptions, setKmValorCondicaoOptions] = useState<CondicaoItem[]>([])
  const [isLoadingKmValorOptions, setIsLoadingKmValorOptions] = useState(false)
  const [isLoadingKmValorItems, setIsLoadingKmValorItems] = useState(false)
  const [isSavingKmValor, setIsSavingKmValor] = useState(false)
  const [isDeletingKmValor, setIsDeletingKmValor] = useState(false)
  const [isKmValorFormVisible, setIsKmValorFormVisible] = useState(false)
  const [editingKmValorCodigo, setEditingKmValorCodigo] = useState<string | null>(null)
  const [kmValorFormMode, setKmValorFormMode] = useState<FormMode>('create')
  const [kmValorFilterCondicaoCodigo, setKmValorFilterCondicaoCodigo] = useState('')
  const [kmValorFilterData, setKmValorFilterData] = useState('')
  const [appliedKmValorFilterCondicaoCodigo, setAppliedKmValorFilterCondicaoCodigo] = useState('')
  const [appliedKmValorFilterData, setAppliedKmValorFilterData] = useState('')
  const [kmValorPage, setKmValorPage] = useState(1)
  const [kmValorTotalItems, setKmValorTotalItems] = useState(0)
  const [kmValorTotalPages, setKmValorTotalPages] = useState(1)
  const [continuaValorItems, setContinuaValorItems] = useState<ContinuaValorItem[]>([])
  const [continuaValorTipo, setContinuaValorTipo] = useState<ContinuaValorTipo | ''>('')
  const [continuaValorData, setContinuaValorData] = useState('')
  const [continuaValorValor, setContinuaValorValor] = useState('')
  const [continuaValorStatusMessage, setContinuaValorStatusMessage] = useState('')
  const [continuaValorStatusTone, setContinuaValorStatusTone] = useState<StatusTone>('idle')
  const [isLoadingContinuaValorItems, setIsLoadingContinuaValorItems] = useState(false)
  const [isSavingContinuaValor, setIsSavingContinuaValor] = useState(false)
  const [isDeletingContinuaValor, setIsDeletingContinuaValor] = useState(false)
  const [isContinuaValorFormVisible, setIsContinuaValorFormVisible] = useState(false)
  const [editingContinuaValorCodigo, setEditingContinuaValorCodigo] = useState<string | null>(null)
  const [continuaValorFormMode, setContinuaValorFormMode] = useState<FormMode>('create')
  const [continuaValorFilterTipo, setContinuaValorFilterTipo] = useState<ContinuaValorTipo | ''>('')
  const [continuaValorFilterData, setContinuaValorFilterData] = useState('')
  const [appliedContinuaValorFilterTipo, setAppliedContinuaValorFilterTipo] = useState<ContinuaValorTipo | ''>('')
  const [appliedContinuaValorFilterData, setAppliedContinuaValorFilterData] = useState('')
  const [continuaValorPage, setContinuaValorPage] = useState(1)
  const [continuaValorTotalItems, setContinuaValorTotalItems] = useState(0)
  const [continuaValorTotalPages, setContinuaValorTotalPages] = useState(1)
  const [parametroVeiculoItems, setParametroVeiculoItems] = useState<ParametroVeiculoItem[]>([])
  const [parametroVeiculoModalidadeTipoBancadaCodigo, setParametroVeiculoModalidadeTipoBancadaCodigo] = useState('')
  const [parametroVeiculoCondicao, setParametroVeiculoCondicao] = useState('')
  const [parametroVeiculoQtdeCondicao, setParametroVeiculoQtdeCondicao] = useState('')
  const [parametroVeiculoData, setParametroVeiculoData] = useState('')
  const [parametroVeiculoStatusMessage, setParametroVeiculoStatusMessage] = useState('')
  const [parametroVeiculoStatusTone, setParametroVeiculoStatusTone] = useState<StatusTone>('idle')
  const [parametroVeiculoAssociationOptions, setParametroVeiculoAssociationOptions] = useState<ModalidadeTipoBancadaAssociationItem[]>([])
  const [isLoadingParametroVeiculoOptions, setIsLoadingParametroVeiculoOptions] = useState(false)
  const [isLoadingParametroVeiculoItems, setIsLoadingParametroVeiculoItems] = useState(false)
  const [isSavingParametroVeiculo, setIsSavingParametroVeiculo] = useState(false)
  const [isDeletingParametroVeiculo, setIsDeletingParametroVeiculo] = useState(false)
  const [isParametroVeiculoFormVisible, setIsParametroVeiculoFormVisible] = useState(false)
  const [editingParametroVeiculoCodigo, setEditingParametroVeiculoCodigo] = useState<string | null>(null)
  const [parametroVeiculoFormMode, setParametroVeiculoFormMode] = useState<FormMode>('create')
  const [parametroVeiculoFilterModalidadeTipoBancadaCodigo, setParametroVeiculoFilterModalidadeTipoBancadaCodigo] = useState('')
  const [parametroVeiculoFilterCondicao, setParametroVeiculoFilterCondicao] = useState('')
  const [parametroVeiculoFilterData, setParametroVeiculoFilterData] = useState('')
  const [appliedParametroVeiculoFilterModalidadeTipoBancadaCodigo, setAppliedParametroVeiculoFilterModalidadeTipoBancadaCodigo] = useState('')
  const [appliedParametroVeiculoFilterCondicao, setAppliedParametroVeiculoFilterCondicao] = useState('')
  const [appliedParametroVeiculoFilterData, setAppliedParametroVeiculoFilterData] = useState('')
  const [parametroVeiculoPage, setParametroVeiculoPage] = useState(1)
  const [parametroVeiculoTotalItems, setParametroVeiculoTotalItems] = useState(0)
  const [parametroVeiculoTotalPages, setParametroVeiculoTotalPages] = useState(1)
  const [titularItems, setTitularItems] = useState<TitularItem[]>([])
  const [titularCnpjCpf, setTitularCnpjCpf] = useState('')
  const [titularNome, setTitularNome] = useState('')
  const [titularCnpjCpfError, setTitularCnpjCpfError] = useState('')
  const [titularNomeError, setTitularNomeError] = useState('')
  const [titularStatusMessage, setTitularStatusMessage] = useState('')
  const [titularStatusTone, setTitularStatusTone] = useState<StatusTone>('idle')
  const [isLoadingTitular, setIsLoadingTitular] = useState(false)
  const [isSavingTitular, setIsSavingTitular] = useState(false)
  const [isDeletingTitular, setIsDeletingTitular] = useState(false)
  const [isTitularFormVisible, setIsTitularFormVisible] = useState(false)
  const [editingTitularCodigo, setEditingTitularCodigo] = useState<string | null>(null)
  const [titularFormMode, setTitularFormMode] = useState<FormMode>('create')
  const [titularSearch, setTitularSearch] = useState('')
  const [titularPage, setTitularPage] = useState(1)
  const [titularTotalItems, setTitularTotalItems] = useState(0)
  const [titularTotalPages, setTitularTotalPages] = useState(1)
  const [titularSortBy, setTitularSortBy] = useState<TitularSortField>('codigo')
  const [titularSortDirection, setTitularSortDirection] = useState<DreSortDirection>('asc')
  const deferredTitularSearch = useDeferredValue(titularSearch)
  const [marcaModeloItems, setMarcaModeloItems] = useState<MarcaModeloItem[]>([])
  const [marcaModeloDescricao, setMarcaModeloDescricao] = useState('')
  const [marcaModeloDescricaoError, setMarcaModeloDescricaoError] = useState('')
  const [marcaModeloStatusMessage, setMarcaModeloStatusMessage] = useState('')
  const [marcaModeloStatusTone, setMarcaModeloStatusTone] = useState<StatusTone>('idle')
  const [isLoadingMarcaModelo, setIsLoadingMarcaModelo] = useState(false)
  const [isSavingMarcaModelo, setIsSavingMarcaModelo] = useState(false)
  const [isDeletingMarcaModelo, setIsDeletingMarcaModelo] = useState(false)
  const [isMarcaModeloFormVisible, setIsMarcaModeloFormVisible] = useState(false)
  const [editingMarcaModeloCodigo, setEditingMarcaModeloCodigo] = useState<string | null>(null)
  const [marcaModeloFormMode, setMarcaModeloFormMode] = useState<FormMode>('create')
  const [marcaModeloSearch, setMarcaModeloSearch] = useState('')
  const [marcaModeloPage, setMarcaModeloPage] = useState(1)
  const [marcaModeloTotalItems, setMarcaModeloTotalItems] = useState(0)
  const [marcaModeloTotalPages, setMarcaModeloTotalPages] = useState(1)
  const [marcaModeloSortBy, setMarcaModeloSortBy] = useState<MarcaModeloSortField>('codigo')
  const [marcaModeloSortDirection, setMarcaModeloSortDirection] = useState<DreSortDirection>('asc')
  const deferredMarcaModeloSearch = useDeferredValue(marcaModeloSearch)
  const [seguradoraItems, setSeguradoraItems] = useState<SeguradoraItem[]>([])
  const [seguradoraControle, setSeguradoraControle] = useState('')
  const [seguradoraLista, setSeguradoraLista] = useState('')
  const [seguradoraControleError, setSeguradoraControleError] = useState('')
  const [seguradoraListaError, setSeguradoraListaError] = useState('')
  const [seguradoraStatusMessage, setSeguradoraStatusMessage] = useState('')
  const [seguradoraStatusTone, setSeguradoraStatusTone] = useState<StatusTone>('idle')
  const [isLoadingSeguradora, setIsLoadingSeguradora] = useState(false)
  const [isSavingSeguradora, setIsSavingSeguradora] = useState(false)
  const [isDeletingSeguradora, setIsDeletingSeguradora] = useState(false)
  const [isSeguradoraFormVisible, setIsSeguradoraFormVisible] = useState(false)
  const [editingSeguradoraCodigo, setEditingSeguradoraCodigo] = useState<string | null>(null)
  const [seguradoraFormMode, setSeguradoraFormMode] = useState<FormMode>('create')
  const [seguradoraSearch, setSeguradoraSearch] = useState('')
  const [seguradoraPage, setSeguradoraPage] = useState(1)
  const [seguradoraTotalItems, setSeguradoraTotalItems] = useState(0)
  const [seguradoraTotalPages, setSeguradoraTotalPages] = useState(1)
  const [seguradoraSortBy, setSeguradoraSortBy] = useState<SeguradoraSortField>('codigo')
  const [seguradoraSortDirection, setSeguradoraSortDirection] = useState<DreSortDirection>('asc')
  const deferredSeguradoraSearch = useDeferredValue(seguradoraSearch)
  const deferredDashboardDrillDownSearch = useDeferredValue(dashboardDrillDownSearch)
  const menuPermissionKeys = getMenuPermissionKeys(session)
  const editableFormPermissionKeys = getEditableFormPermissionKeys(session)
  const deletableFormPermissionKeys = getDeletableFormPermissionKeys(session)
  const hasDeleteFormPermission = (formAccessKey: string) => deletableFormPermissionKeys.has(formAccessKey)
  const hasDreEditFormAccess = editableFormPermissionKeys.has(appFormEditAccessKeys.dre)
  const hasModalidadeEditFormAccess = editableFormPermissionKeys.has(appFormEditAccessKeys.modalidade)
  const hasCondicaoEditFormAccess = editableFormPermissionKeys.has(appFormEditAccessKeys.condicao)
  const hasTipoPgtoEditFormAccess = editableFormPermissionKeys.has(appFormEditAccessKeys.tipoPgto)
  const hasTipoEscolaEditFormAccess = editableFormPermissionKeys.has(appFormEditAccessKeys.tipoEscola)
  const hasAliquotaOptanteEditFormAccess = editableFormPermissionKeys.has(appFormEditAccessKeys.aliquotaOptante)
  const hasModalBancadaTpPagtoCondicaoEditFormAccess = editableFormPermissionKeys.has(appFormEditAccessKeys.modalBancadaTpPagtoCondicao)
  const hasModalBancadaTpPagtoCondicaoValorEditFormAccess = editableFormPermissionKeys.has(appFormEditAccessKeys.modalBancadaTpPagtoCondicaoValor)
  const hasDiasLetivosEditFormAccess = editableFormPermissionKeys.has(appFormEditAccessKeys.diasLetivos)
  const hasKmValorEditFormAccess = editableFormPermissionKeys.has(appFormEditAccessKeys.kmValor)
  const hasContinuaValorEditFormAccess = editableFormPermissionKeys.has(appFormEditAccessKeys.continuaValor)
  const hasTipoBancadaEditFormAccess = editableFormPermissionKeys.has(appFormEditAccessKeys.tipoBancada)
  const hasTitularEditFormAccess = editableFormPermissionKeys.has(appFormEditAccessKeys.titular)
  const hasMarcaModeloEditFormAccess = editableFormPermissionKeys.has(appFormEditAccessKeys.marcaModelo)
  const hasParametroVeiculoEditFormAccess = editableFormPermissionKeys.has(appFormEditAccessKeys.parametroVeiculo)
  const hasSeguradoraEditFormAccess = editableFormPermissionKeys.has(appFormEditAccessKeys.seguradora)
  const hasDashboardAccess = isViewAllowed('inicio', menuPermissionKeys)
  const hasOperationalAdministrativeAccess = isMenuKeyAllowed('menu_operacional_administrativo', menuPermissionKeys)
    && operationalAdministrativeViews.some((view) => isViewAllowed(view, menuPermissionKeys))
  const hasOperationalFinanceiroAccess = isMenuKeyAllowed('menu_operacional_financeiro', menuPermissionKeys)
    && operationalFinanceiroViews.some((view) => isViewAllowed(view, menuPermissionKeys))
  const hasOperationalAccess = isMenuKeyAllowed('menu_operacional_root', menuPermissionKeys)
    && (hasOperationalAdministrativeAccess || hasOperationalFinanceiroAccess)
  const hasCadastroOperationalAccess = isMenuKeyAllowed('menu_cadastros_operacional', menuPermissionKeys)
    && cadastroOperationalViews.some((view) => isViewAllowed(view, menuPermissionKeys))
  const hasCadastroFinanceiroAccess = isMenuKeyAllowed('menu_cadastros_financeiro', menuPermissionKeys)
    && cadastroFinanceiroViews.some((view) => isViewAllowed(view, menuPermissionKeys))
  const hasCadastroAccess = isMenuKeyAllowed('menu_cadastros_root', menuPermissionKeys)
    && (hasCadastroOperationalAccess || hasCadastroFinanceiroAccess)
  const hasMonitoringAccess = monitoramentoViews.some((view) => isViewAllowed(view, menuPermissionKeys))
  const hasAccessManagementAccess = isViewAllowed('acesso', menuPermissionKeys)

  useEffect(() => {
    setSession(getStoredSession())
  }, [])

  useEffect(() => {
    if (!session) {
      return
    }

    if (!isViewAllowed(activeView, menuPermissionKeys)) {
      setActiveView(getFirstAllowedView(menuPermissionKeys))
    }
  }, [activeView, menuPermissionKeys, session])

  const loadDashboardAtivos = useCallback(async (monthToLoad: string) => {
    setIsLoadingDashboard(true)
    setDashboardStatusTone('idle')
    setDashboardStatusMessage('Carregando painel mensal de OrdemServico...')
    setTermoAtivosCount(0)
    setTermoRescindidosCount(0)
    setOsCanceladasCount(0)
    setIsDashboardDrillDownVisible(false)
    setDashboardDrillDownContext(null)
    setDashboardDrillDownData(null)
    setDashboardDrillDownSearch('')
    setDashboardDrillDownStatusMessage('')
    setIsDashboardOsPopupVisible(false)
    setDashboardOsPopupUrl('')

    try {
      const [result, bancadaResult, termoAtivos, termoRescindidos, osCanceladas] = await Promise.all([
        getOrdemServicoDashboardAtivos(monthToLoad),
        getOrdemServicoDashboardAtivosBancada(monthToLoad),
        getTermoCountByStatus('ATIVO').catch(() => 0),
        getTermoCountByStatus('RESCINDIDO').catch(() => 0),
        getOrdemServicoCountBySituacao('Cancelado').catch(() => 0),
      ])

      setDashboardData(result)
      setDashboardBancadaData(bancadaResult)
      setTermoAtivosCount(termoAtivos)
      setTermoRescindidosCount(termoRescindidos)
      setOsCanceladasCount(osCanceladas)
      setDashboardStatusMessage(result.rows.length ? '' : 'Nenhuma OrdemServico esteve ativa no mes selecionado.')
      setDashboardStatusTone('idle')
    } catch (error) {
      setDashboardData(null)
      setDashboardBancadaData(null)
      setDashboardStatusTone('error')
      setDashboardStatusMessage(error instanceof Error ? error.message : 'Falha ao carregar o dashboard de OrdemServico.')
    } finally {
      setIsLoadingDashboard(false)
    }
  }, [])

  const handleCloseDashboardDrillDown = useCallback(() => {
    setIsDashboardDrillDownVisible(false)
    setIsLoadingDashboardDrillDown(false)
    setDashboardDrillDownContext(null)
    setDashboardDrillDownData(null)
    setDashboardDrillDownSearch('')
    setDashboardDrillDownStatusMessage('')
  }, [])

  const handleCloseDashboardOsPopup = useCallback(() => {
    setIsDashboardOsPopupVisible(false)
    setDashboardOsPopupUrl('')
  }, [])

  const openDashboardTab = (relativePath: string) => {
    const url = `${window.location.origin}${relativePath}`
    window.open(url, '_blank')
  }

  const handleOpenTermosGrid = () => openDashboardTab('/src/credenciamentoTermo.html')
  const handleOpenOrdemServicoGrid = () => openDashboardTab('/src/ordemServico.html')

  useEffect(() => {
    const handleDashboardOsPopupMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return
      }

      if (!event.data || typeof event.data !== 'object') {
        return
      }

      if ((event.data as { type?: string }).type !== 'teg-dashboard-close-os-popup') {
        return
      }

      handleCloseDashboardOsPopup()
    }

    window.addEventListener('message', handleDashboardOsPopupMessage)

    return () => {
      window.removeEventListener('message', handleDashboardOsPopupMessage)
    }
  }, [handleCloseDashboardOsPopup])

  const loadDreItems = useCallback(async (pageToLoad: number) => {
    setIsLoadingDre(true)
    setDreStatusMessage('Carregando registros da DRE...')
    setDreStatusTone('idle')

    try {
      const result = await listDreItemsPaginated({
        search: deferredDreSearch,
        page: pageToLoad,
        pageSize: DRE_PAGE_SIZE,
        sortBy: dreSortBy,
        sortDirection: dreSortDirection,
      })

      setDreItems(result.items)
      setDreTotalItems(result.total)
      setDreTotalPages(result.totalPages)
      setDrePage(result.page)
      setDreSortBy(result.sortBy)
      setDreSortDirection(result.sortDirection)
      setDreStatusMessage(result.items.length ? '' : 'Nenhum registro encontrado na tabela DRE.')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar os registros da DRE.'

      setDreStatusTone('error')
      setDreStatusMessage(message)
    } finally {
      setIsLoadingDre(false)
    }
  }, [deferredDreSearch, dreSortBy, dreSortDirection])

  const loadModalidadeItems = useCallback(async (pageToLoad: number) => {
    setIsLoadingModalidade(true)
    setModalidadeStatusMessage('Carregando registros de modalidade...')
    setModalidadeStatusTone('idle')

    try {
      const result = await listModalidadeItemsPaginated({
        search: deferredModalidadeSearch,
        page: pageToLoad,
        pageSize: DRE_PAGE_SIZE,
        sortBy: modalidadeSortBy,
        sortDirection: modalidadeSortDirection,
      })

      setModalidadeItems(result.items)
      setModalidadeTotalItems(result.total)
      setModalidadeTotalPages(result.totalPages)
      setModalidadePage(result.page)
      setModalidadeSortBy(result.sortBy)
      setModalidadeSortDirection(result.sortDirection)
      setModalidadeStatusMessage(result.items.length ? '' : 'Nenhum registro encontrado na tabela Modalidade.')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar os registros de modalidade.'

      setModalidadeStatusTone('error')
      setModalidadeStatusMessage(message)
    } finally {
      setIsLoadingModalidade(false)
    }
  }, [deferredModalidadeSearch, modalidadeSortBy, modalidadeSortDirection])

  const loadCondicaoItems = useCallback(async (pageToLoad: number) => {
    setIsLoadingCondicao(true)
    setCondicaoStatusMessage('Carregando registros de condicao...')
    setCondicaoStatusTone('idle')

    try {
      const result = await listCondicaoItemsPaginated({
        search: deferredCondicaoSearch,
        page: pageToLoad,
        pageSize: DRE_PAGE_SIZE,
        sortBy: condicaoSortBy,
        sortDirection: condicaoSortDirection,
      })

      const normalizedCondicaoItems = result.sortBy === 'codigo'
        ? [...result.items].sort((left, right) => {
            const leftCodigo = Number(left.codigo)
            const rightCodigo = Number(right.codigo)

            if (!Number.isNaN(leftCodigo) && !Number.isNaN(rightCodigo)) {
              return result.sortDirection === 'asc'
                ? leftCodigo - rightCodigo
                : rightCodigo - leftCodigo
            }

            return result.sortDirection === 'asc'
              ? left.codigo.localeCompare(right.codigo, 'pt-BR', { numeric: true })
              : right.codigo.localeCompare(left.codigo, 'pt-BR', { numeric: true })
          })
        : result.items

      setCondicaoItems(normalizedCondicaoItems)
      setCondicaoTotalItems(result.total)
      setCondicaoTotalPages(result.totalPages)
      setCondicaoPage(result.page)
      setCondicaoSortBy(result.sortBy)
      setCondicaoSortDirection(result.sortDirection)
      setCondicaoStatusMessage(normalizedCondicaoItems.length ? '' : 'Nenhum registro encontrado na tabela Condicao.')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar os registros de condicao.'

      setCondicaoStatusTone('error')
      setCondicaoStatusMessage(message)
    } finally {
      setIsLoadingCondicao(false)
    }
  }, [condicaoSortBy, condicaoSortDirection, deferredCondicaoSearch])

  const loadTipoBancadaItems = useCallback(async (pageToLoad: number) => {
    setIsLoadingTipoBancada(true)
    setTipoBancadaStatusMessage('Carregando registros de tipo de bancada...')
    setTipoBancadaStatusTone('idle')

    try {
      const result = await listTipoBancadaItemsPaginated({
        search: deferredTipoBancadaSearch,
        page: pageToLoad,
        pageSize: DRE_PAGE_SIZE,
        sortBy: tipoBancadaSortBy,
        sortDirection: tipoBancadaSortDirection,
      })

      setTipoBancadaItems(result.items)
      setTipoBancadaTotalItems(result.total)
      setTipoBancadaTotalPages(result.totalPages)
      setTipoBancadaPage(result.page)
      setTipoBancadaSortBy(result.sortBy)
      setTipoBancadaSortDirection(result.sortDirection)
      setTipoBancadaStatusMessage(result.items.length ? '' : 'Nenhum registro encontrado na tabela Tipo de Bancada.')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar os registros de tipo de bancada.'

      setTipoBancadaStatusTone('error')
      setTipoBancadaStatusMessage(message)
    } finally {
      setIsLoadingTipoBancada(false)
    }
  }, [deferredTipoBancadaSearch, tipoBancadaSortBy, tipoBancadaSortDirection])

  const loadTipoPgtoItems = useCallback(async (pageToLoad: number) => {
    setIsLoadingTipoPgto(true)
    setTipoPgtoStatusMessage('Carregando registros de tipo de pagamento...')
    setTipoPgtoStatusTone('idle')

    try {
      const result = await listTipoPgtoItemsPaginated({
        search: deferredTipoPgtoSearch,
        page: pageToLoad,
        pageSize: 20,
        sortBy: tipoPgtoSortBy,
        sortDirection: tipoPgtoSortDirection,
      })

      setTipoPgtoItems(result.items)
      setTipoPgtoTotalItems(result.total)
      setTipoPgtoTotalPages(result.totalPages)
      setTipoPgtoPage(result.page)
      setTipoPgtoSortBy(result.sortBy)
      setTipoPgtoSortDirection(result.sortDirection)
      setTipoPgtoStatusMessage(result.items.length ? '' : 'Nenhum registro encontrado na tabela Tipo_pgto.')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar os registros de tipo de pagamento.'

      setTipoPgtoStatusTone('error')
      setTipoPgtoStatusMessage(message)
    } finally {
      setIsLoadingTipoPgto(false)
    }
  }, [deferredTipoPgtoSearch, tipoPgtoSortBy, tipoPgtoSortDirection])

  const loadTipoEscolaItems = useCallback(async (pageToLoad: number) => {
    setIsLoadingTipoEscola(true)
    setTipoEscolaStatusMessage('Carregando registros de tipo de escola...')
    setTipoEscolaStatusTone('idle')

    try {
      const result = await listTipoEscolaItemsPaginated({
        search: deferredTipoEscolaSearch,
        page: pageToLoad,
        pageSize: 20,
        sortBy: tipoEscolaSortBy,
        sortDirection: tipoEscolaSortDirection,
      })

      setTipoEscolaItems(result.items)
      setTipoEscolaTotalItems(result.total)
      setTipoEscolaTotalPages(result.totalPages)
      setTipoEscolaPage(result.page)
      setTipoEscolaSortBy(result.sortBy)
      setTipoEscolaSortDirection(result.sortDirection)
      setTipoEscolaStatusMessage(result.items.length ? '' : 'Nenhum registro encontrado na tabela Tipo Escola.')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar os registros de tipo de escola.'

      setTipoEscolaStatusTone('error')
      setTipoEscolaStatusMessage(message)
    } finally {
      setIsLoadingTipoEscola(false)
    }
  }, [deferredTipoEscolaSearch, tipoEscolaSortBy, tipoEscolaSortDirection])

  const loadAliquotaOptanteItems = useCallback(async (pageToLoad: number) => {
    setIsLoadingAliquotaOptante(true)
    setAliquotaOptanteStatusMessage('Carregando registros de aliquota optante...')
    setAliquotaOptanteStatusTone('idle')

    try {
      const result = await listAliquotaOptanteItemsPaginated({
        search: deferredAliquotaOptanteSearch,
        page: pageToLoad,
        pageSize: 20,
        sortBy: aliquotaOptanteSortBy,
        sortDirection: aliquotaOptanteSortDirection,
      })

      setAliquotaOptanteItems(result.items)
      setAliquotaOptanteTotalItems(result.total)
      setAliquotaOptanteTotalPages(result.totalPages)
      setAliquotaOptantePage(result.page)
      setAliquotaOptanteSortBy(result.sortBy)
      setAliquotaOptanteSortDirection(result.sortDirection)
      setAliquotaOptanteStatusMessage(result.items.length ? '' : 'Nenhum registro encontrado na tabela Aliquota Optante.')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar os registros de aliquota optante.'

      setAliquotaOptanteStatusTone('error')
      setAliquotaOptanteStatusMessage(message)
    } finally {
      setIsLoadingAliquotaOptante(false)
    }
  }, [aliquotaOptanteSortBy, aliquotaOptanteSortDirection, deferredAliquotaOptanteSearch])

  const loadDiasLetivosItems = useCallback(async (pageToLoad: number) => {
    setIsLoadingDiasLetivos(true)
    setDiasLetivosStatusMessage('Carregando registros de dias letivos...')
    setDiasLetivosStatusTone('idle')

    try {
      const result = await listDiasLetivosItemsPaginated({
        search: deferredDiasLetivosSearch,
        page: pageToLoad,
        pageSize: 20,
        sortBy: diasLetivosSortBy,
        sortDirection: diasLetivosSortDirection,
      })

      setDiasLetivosItems(result.items)
      setDiasLetivosTotalItems(result.total)
      setDiasLetivosTotalPages(result.totalPages)
      setDiasLetivosPage(result.page)
      setDiasLetivosSortBy(result.sortBy)
      setDiasLetivosSortDirection(result.sortDirection)
      setDiasLetivosStatusMessage(result.items.length ? '' : 'Nenhum registro encontrado na tabela Dias Letivos.')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar os registros de dias letivos.'

      setDiasLetivosStatusTone('error')
      setDiasLetivosStatusMessage(message)
    } finally {
      setIsLoadingDiasLetivos(false)
    }
  }, [deferredDiasLetivosSearch, diasLetivosSortBy, diasLetivosSortDirection])

  const loadApuracaoFinanceiraDreOptions = useCallback(async () => {
    setIsLoadingApuracaoFinanceiraOptions(true)
    setApuracaoFinanceiraStatusTone('idle')
    setApuracaoFinanceiraStatusMessage('Carregando opcoes de DRE...')

    try {
      const result = await listDreItemsPaginated({
        page: 1,
        pageSize: 500,
        sortBy: 'descricao',
        sortDirection: 'asc',
      })

      setApuracaoFinanceiraDreOptions(result.items)
      setApuracaoFinanceiraStatusMessage('')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar as DREs da apuracao financeira.'

      setApuracaoFinanceiraStatusTone('error')
      setApuracaoFinanceiraStatusMessage(message)
    } finally {
      setIsLoadingApuracaoFinanceiraOptions(false)
    }
  }, [])

  const loadApuracaoFinanceiraActiveDreOptions = useCallback(async (mesAno: string) => {
    if (!isValidMonthYear(mesAno)) {
      setApuracaoFinanceiraActiveDreOptions([])
      setApuracaoFinanceiraSelectedDreCodigos([])
      setApuracaoFinanceiraSelectedDresError('')
      return
    }

    setIsLoadingApuracaoFinanceiraActiveDres(true)
    setApuracaoFinanceiraSelectedDresError('')

    try {
      const dashboardMonth = convertMonthYearToDashboardMonth(mesAno)
      const result = await getOrdemServicoDashboardAtivos(dashboardMonth)
      const activeOperationalCodes = new Set(
        result.rows
          .map((item) => item.dreCodigo.trim())
          .filter((item) => item && item !== 'SEM DRE'),
      )

      const nextOptions = apuracaoFinanceiraDreOptions.filter((item) => activeOperationalCodes.has(item.sigla))
      const selectedDreCodigos = apuracaoFinanceiraSelectedDreCodigosRef.current
      const preservedSelectedOptions = apuracaoFinanceiraDreOptions.filter((item) => (
        selectedDreCodigos.includes(item.codigo)
        && !nextOptions.some((option) => option.codigo === item.codigo)
      ))
      const mergedOptions = [...nextOptions, ...preservedSelectedOptions]

      mergedOptions.sort((left, right) => formatApuracaoFinanceiraDreOptionLabel(left).localeCompare(formatApuracaoFinanceiraDreOptionLabel(right), 'pt-BR'))
      setApuracaoFinanceiraActiveDreOptions(mergedOptions)
      setApuracaoFinanceiraSelectedDreCodigos((currentSelected) => currentSelected.filter((codigo) => mergedOptions.some((item) => item.codigo === codigo)))
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar as DREs ativas da apuracao financeira.'

      setApuracaoFinanceiraActiveDreOptions([])
      setApuracaoFinanceiraSelectedDresError(message)
    } finally {
      setIsLoadingApuracaoFinanceiraActiveDres(false)
    }
  }, [apuracaoFinanceiraDreOptions])

  const loadApuracaoFinanceiraItems = useCallback(async (
    pageToLoad: number,
    options?: {
      preserveStatusMessage?: boolean
    },
  ) => {
    const preserveStatusMessage = options?.preserveStatusMessage ?? false

    setIsLoadingApuracaoFinanceira(true)

    if (!preserveStatusMessage) {
      setApuracaoFinanceiraStatusMessage('Carregando registros de apuracao financeira...')
      setApuracaoFinanceiraStatusTone('idle')
    }

    try {
      const result = await listApuracaoFinanceiraItemsPaginated({
        search: deferredApuracaoFinanceiraSearch,
        page: pageToLoad,
        pageSize: 20,
        sortBy: apuracaoFinanceiraSortBy,
        sortDirection: apuracaoFinanceiraSortDirection,
      })

      setApuracaoFinanceiraItems(result.items)
      setApuracaoFinanceiraTotalPages(result.totalPages)
      setApuracaoFinanceiraPage(result.page)
      setApuracaoFinanceiraSortBy(result.sortBy)
      setApuracaoFinanceiraSortDirection(result.sortDirection)

      if (!preserveStatusMessage) {
        setApuracaoFinanceiraStatusMessage(result.items.length ? '' : 'Nenhum registro encontrado na tabela Apuracao Financeira.')
      }
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar os registros de apuracao financeira.'

      setApuracaoFinanceiraStatusTone('error')
      setApuracaoFinanceiraStatusMessage(message)
    } finally {
      setIsLoadingApuracaoFinanceira(false)
    }
  }, [apuracaoFinanceiraSortBy, apuracaoFinanceiraSortDirection, deferredApuracaoFinanceiraSearch])

  const loadAssociationOptions = useCallback(async () => {
    setIsLoadingAssociationOptions(true)
    setAssociationStatusTone('idle')
    setAssociationStatusMessage('Carregando opções de modalidade e tipo de bancada...')

    try {
      const [modalidadeResult, tipoBancadaResult] = await Promise.all([
        listModalidadeItemsPaginated({
          page: 1,
          pageSize: 500,
          sortBy: 'descricao',
          sortDirection: 'asc',
        }),
        listTipoBancadaItemsPaginated({
          page: 1,
          pageSize: 500,
          sortBy: 'descricao',
          sortDirection: 'asc',
        }),
      ])

      setAssociationModalidadeOptions(modalidadeResult.items)
      setAssociationTipoBancadaOptions(tipoBancadaResult.items)
      setAssociationStatusMessage('')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar as opções de associação.'

      setAssociationStatusTone('error')
      setAssociationStatusMessage(message)
    } finally {
      setIsLoadingAssociationOptions(false)
    }
  }, [])

  const loadTipoBancadaAssociationItems = useCallback(async () => {
    setIsLoadingTipoBancadaAssociations(true)

    try {
      const items = await listModalidadeTipoBancadaAssociationItems()
      setTipoBancadaAssociationItems(items)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar as associacoes de modalidade x tipo de bancada.'

      setAssociationStatusTone('error')
      setAssociationStatusMessage(message)
    } finally {
      setIsLoadingTipoBancadaAssociations(false)
    }
  }, [])

  const handleAddTipoBancadaAssociation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setAssociationStatusTone('idle')
    setAssociationStatusMessage('')

    if (!associationModalidadeCodigo || !associationTipoBancadaCodigo) {
      setAssociationStatusTone('error')
      setAssociationStatusMessage('Selecione Modalidade e Tipo de Bancada.')
      return
    }

    const modalidade = associationModalidadeOptions.find((item) => item.codigo === associationModalidadeCodigo)
    const tipoBancada = associationTipoBancadaOptions.find((item) => item.codigo === associationTipoBancadaCodigo)

    if (!modalidade || !tipoBancada) {
      setAssociationStatusTone('error')
      setAssociationStatusMessage('Selecao invalida.')
      return
    }

    setIsSavingTipoBancadaAssociation(true)

    try {
      await createModalidadeTipoBancadaAssociationItem({
        modalidadeCodigo: modalidade.codigo,
        tipoBancadaCodigo: tipoBancada.codigo,
      })

      setAssociationModalidadeCodigo('')
      setAssociationTipoBancadaCodigo('')
      setAssociationStatusTone('success')
      setAssociationStatusMessage('Associacao criada com sucesso.')
      await loadTipoBancadaAssociationItems()
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao criar a associacao.'

      setAssociationStatusTone('error')
      setAssociationStatusMessage(message)
    } finally {
      setIsSavingTipoBancadaAssociation(false)
    }
  }

  const handleDeleteTipoBancadaAssociation = async (item: ModalidadeTipoBancadaAssociationItem) => {
    if (!hasDeleteFormPermission(appFormEditAccessKeys.tipoBancada)) {
      setAssociationStatusTone('warning')
      setAssociationStatusMessage(getFormDeletePermissionMessage('Modalidade x Tipo de Bancada'))
      return
    }

    const confirmed = window.confirm(`Excluir a associacao ${item.modalidadeDescricao} x ${item.tipoBancadaDescricao}?`)

    if (!confirmed) {
      return
    }

    setIsDeletingTipoBancadaAssociation(true)

    try {
      await deleteModalidadeTipoBancadaAssociationItem(item.codigo)
      setAssociationStatusTone('success')
      setAssociationStatusMessage('Associacao removida.')
      await loadTipoBancadaAssociationItems()
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao excluir a associacao.'

      setAssociationStatusTone('error')
      setAssociationStatusMessage(message)
    } finally {
      setIsDeletingTipoBancadaAssociation(false)
    }
  }

  const loadModalBancadaTpPagtoCondicaoOptions = useCallback(async () => {
    setIsLoadingModalBancadaTpPagtoCondicaoOptions(true)
    setModalBancadaTpPagtoCondicaoStatusTone('idle')
    setModalBancadaTpPagtoCondicaoStatusMessage('Carregando opcoes de Modalidade x Tipo de Bancada, Tipo de Pagamento e Condicao...')

    try {
      const [associationItems, tipoPgtoResult, condicaoResult] = await Promise.all([
        listModalidadeTipoBancadaAssociationItems(),
        listTipoPgtoItemsPaginated({
          page: 1,
          pageSize: 500,
          sortBy: 'codigo',
          sortDirection: 'asc',
        }),
        listCondicaoItemsPaginated({
          page: 1,
          pageSize: 500,
          sortBy: 'codigo',
          sortDirection: 'asc',
        }),
      ])

      setModalBancadaTpPagtoCondicaoAssociationOptions(associationItems)
      setModalBancadaTpPagtoCondicaoTipoPgtoOptions(tipoPgtoResult.items)
      setModalBancadaTpPagtoCondicaoCondicaoOptions(condicaoResult.items)
      setModalBancadaTpPagtoCondicaoStatusMessage('')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar as opcoes da associacao de modalidade, bancada, pagamento e condicao.'

      setModalBancadaTpPagtoCondicaoStatusTone('error')
      setModalBancadaTpPagtoCondicaoStatusMessage(message)
    } finally {
      setIsLoadingModalBancadaTpPagtoCondicaoOptions(false)
    }
  }, [])

  const loadModalBancadaTpPagtoCondicaoItems = useCallback(async (pageToLoad: number) => {
    setIsLoadingModalBancadaTpPagtoCondicaoItems(true)
    setModalBancadaTpPagtoCondicaoStatusTone('idle')
    setModalBancadaTpPagtoCondicaoStatusMessage('Carregando registros da associacao de modalidade, bancada, pagamento e condicao...')

    try {
      const result = await listModalBancadaTpPagtoCondicaoItems({
        modalidadeTipoBancadaCodigo: appliedModalBancadaTpPagtoCondicaoFilterAssociationCodigo,
        tipoPgtoCodigo: appliedModalBancadaTpPagtoCondicaoFilterTipoPgtoCodigo,
        condicaoCodigo: appliedModalBancadaTpPagtoCondicaoFilterCondicaoCodigo,
        page: pageToLoad,
        pageSize: DRE_PAGE_SIZE,
      })
      setModalBancadaTpPagtoCondicaoItems(result.items)
      setModalBancadaTpPagtoCondicaoTotalItems(result.total)
      setModalBancadaTpPagtoCondicaoTotalPages(result.totalPages)
      setModalBancadaTpPagtoCondicaoPage(result.page)
      setModalBancadaTpPagtoCondicaoStatusMessage(result.items.length ? '' : 'Nenhum registro encontrado na associacao de modalidade, bancada, pagamento e condicao.')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar os registros da associacao de modalidade, bancada, pagamento e condicao.'

      setModalBancadaTpPagtoCondicaoStatusTone('error')
      setModalBancadaTpPagtoCondicaoStatusMessage(message)
    } finally {
      setIsLoadingModalBancadaTpPagtoCondicaoItems(false)
    }
  }, [
    appliedModalBancadaTpPagtoCondicaoFilterAssociationCodigo,
    appliedModalBancadaTpPagtoCondicaoFilterCondicaoCodigo,
    appliedModalBancadaTpPagtoCondicaoFilterTipoPgtoCodigo,
  ])

  const loadModalBancadaTpPagtoCondicaoValorOptions = useCallback(async () => {
    setIsLoadingModalBancadaTpPagtoCondicaoValorOptions(true)
    setModalBancadaTpPagtoCondicaoValorStatusTone('idle')
    setModalBancadaTpPagtoCondicaoValorStatusMessage('Carregando opcoes da associacao de modalidade, bancada, pagamento e condicao...')

    try {
      const result = await listModalBancadaTpPagtoCondicaoItems({
        page: 1,
        pageSize: 500,
      })

      setModalBancadaTpPagtoCondicaoValorOptions(result.items)
      setModalBancadaTpPagtoCondicaoValorStatusMessage('')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar as opcoes do valor da associacao de modalidade, bancada, pagamento e condicao.'

      setModalBancadaTpPagtoCondicaoValorStatusTone('error')
      setModalBancadaTpPagtoCondicaoValorStatusMessage(message)
    } finally {
      setIsLoadingModalBancadaTpPagtoCondicaoValorOptions(false)
    }
  }, [])

  const loadModalBancadaTpPagtoCondicaoValorItems = useCallback(async (pageToLoad: number) => {
    setIsLoadingModalBancadaTpPagtoCondicaoValorItems(true)
    setModalBancadaTpPagtoCondicaoValorStatusTone('idle')
    setModalBancadaTpPagtoCondicaoValorStatusMessage('Carregando registros de valor da associacao de modalidade, bancada, pagamento e condicao...')

    try {
      const result = await listModalBancadaTpPagtoCondicaoValorItems({
        modalBancadaTpPagtoCondicaoCodigo: appliedModalBancadaTpPagtoCondicaoValorFilterAssociationCodigo,
        data: appliedModalBancadaTpPagtoCondicaoValorFilterData,
        page: pageToLoad,
        pageSize: DRE_PAGE_SIZE,
      })

      setModalBancadaTpPagtoCondicaoValorItems(result.items)
      setModalBancadaTpPagtoCondicaoValorTotalItems(result.total)
      setModalBancadaTpPagtoCondicaoValorTotalPages(result.totalPages)
      setModalBancadaTpPagtoCondicaoValorPage(result.page)
      setModalBancadaTpPagtoCondicaoValorStatusMessage(result.items.length ? '' : 'Nenhum registro de valor encontrado.')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar os registros de valor da associacao de modalidade, bancada, pagamento e condicao.'

      setModalBancadaTpPagtoCondicaoValorStatusTone('error')
      setModalBancadaTpPagtoCondicaoValorStatusMessage(message)
    } finally {
      setIsLoadingModalBancadaTpPagtoCondicaoValorItems(false)
    }
  }, [
    appliedModalBancadaTpPagtoCondicaoValorFilterAssociationCodigo,
    appliedModalBancadaTpPagtoCondicaoValorFilterData,
  ])

  const loadKmValorOptions = useCallback(async () => {
    setIsLoadingKmValorOptions(true)
    setKmValorStatusTone('idle')
    setKmValorStatusMessage('Carregando opcoes de condicao...')

    try {
      const result = await listCondicaoItemsPaginated({
        page: 1,
        pageSize: 500,
        sortBy: 'descricao',
        sortDirection: 'asc',
      })

      setKmValorCondicaoOptions(result.items.filter((item) => item.exibirKmValor))
      setKmValorStatusMessage('')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar as opcoes de condicao para km valor.'

      setKmValorStatusTone('error')
      setKmValorStatusMessage(message)
    } finally {
      setIsLoadingKmValorOptions(false)
    }
  }, [])

  const loadKmValorItems = useCallback(async (pageToLoad: number) => {
    setIsLoadingKmValorItems(true)
    setKmValorStatusTone('idle')
    setKmValorStatusMessage('Carregando registros de km valor...')

    try {
      const result = await listKmValorItems({
        condicaoCodigo: appliedKmValorFilterCondicaoCodigo,
        data: appliedKmValorFilterData,
        page: pageToLoad,
        pageSize: DRE_PAGE_SIZE,
      })

      setKmValorItems(result.items)
      setKmValorTotalItems(result.total)
      setKmValorTotalPages(result.totalPages)
      setKmValorPage(result.page)
      setKmValorStatusMessage(result.items.length ? '' : 'Nenhum registro de km valor encontrado.')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar os registros de km valor.'

      setKmValorStatusTone('error')
      setKmValorStatusMessage(message)
    } finally {
      setIsLoadingKmValorItems(false)
    }
  }, [
    appliedKmValorFilterCondicaoCodigo,
    appliedKmValorFilterData,
  ])

  const loadContinuaValorItems = useCallback(async (pageToLoad: number) => {
    setIsLoadingContinuaValorItems(true)
    setContinuaValorStatusTone('idle')
    setContinuaValorStatusMessage('Carregando registros de continua valor...')

    try {
      const result = await listContinuaValorItems({
        tipoContinua: appliedContinuaValorFilterTipo,
        data: appliedContinuaValorFilterData,
        page: pageToLoad,
        pageSize: DRE_PAGE_SIZE,
      })

      setContinuaValorItems(result.items)
      setContinuaValorTotalItems(result.total)
      setContinuaValorTotalPages(result.totalPages)
      setContinuaValorPage(result.page)
      setContinuaValorStatusMessage(result.items.length ? '' : 'Nenhum registro de continua valor encontrado.')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar os registros de continua valor.'

      setContinuaValorStatusTone('error')
      setContinuaValorStatusMessage(message)
    } finally {
      setIsLoadingContinuaValorItems(false)
    }
  }, [
    appliedContinuaValorFilterData,
    appliedContinuaValorFilterTipo,
  ])

  const loadParametroVeiculoOptions = useCallback(async () => {
    setIsLoadingParametroVeiculoOptions(true)
    setParametroVeiculoStatusTone('idle')
    setParametroVeiculoStatusMessage('Carregando opcoes de modalidade x tipo de bancada...')

    try {
      const items = await listModalidadeTipoBancadaAssociationItems()
      setParametroVeiculoAssociationOptions(items)
      setParametroVeiculoStatusMessage('')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar as opcoes de modalidade x tipo de bancada para parametro veiculo.'

      setParametroVeiculoStatusTone('error')
      setParametroVeiculoStatusMessage(message)
    } finally {
      setIsLoadingParametroVeiculoOptions(false)
    }
  }, [])

  const loadParametroVeiculoItems = useCallback(async (pageToLoad: number) => {
    setIsLoadingParametroVeiculoItems(true)
    setParametroVeiculoStatusTone('idle')
    setParametroVeiculoStatusMessage('Carregando registros de parametro veiculo...')

    try {
      const result = await listParametroVeiculoItems({
        modalidadeTipoBancadaCodigo: appliedParametroVeiculoFilterModalidadeTipoBancadaCodigo,
        condicao: appliedParametroVeiculoFilterCondicao,
        data: appliedParametroVeiculoFilterData,
        page: pageToLoad,
        pageSize: DRE_PAGE_SIZE,
      })

      setParametroVeiculoItems(result.items)
      setParametroVeiculoTotalItems(result.total)
      setParametroVeiculoTotalPages(result.totalPages)
      setParametroVeiculoPage(result.page)
      setParametroVeiculoStatusMessage(result.items.length ? '' : 'Nenhum registro de parametro veiculo encontrado.')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar os registros de parametro veiculo.'

      setParametroVeiculoStatusTone('error')
      setParametroVeiculoStatusMessage(message)
    } finally {
      setIsLoadingParametroVeiculoItems(false)
    }
  }, [
    appliedParametroVeiculoFilterCondicao,
    appliedParametroVeiculoFilterData,
    appliedParametroVeiculoFilterModalidadeTipoBancadaCodigo,
  ])

  const handleCreateModalBancadaTpPagtoCondicao = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (modalBancadaTpPagtoCondicaoFormMode === 'view') {
      setModalBancadaTpPagtoCondicaoStatusTone('idle')
      setModalBancadaTpPagtoCondicaoStatusMessage('Consulta em modo somente leitura.')
      return
    }

    setModalBancadaTpPagtoCondicaoStatusTone('idle')
    setModalBancadaTpPagtoCondicaoStatusMessage('')

    if (!modalBancadaTpPagtoCondicaoAssociationCodigo || !modalBancadaTpPagtoCondicaoTipoPgtoCodigo || !modalBancadaTpPagtoCondicaoCondicaoCodigo) {
      setModalBancadaTpPagtoCondicaoStatusTone('error')
      setModalBancadaTpPagtoCondicaoStatusMessage('Selecione Modalidade x Tipo de Bancada, Tipo de Pagamento e Condicao.')
      return
    }

    const association = modalBancadaTpPagtoCondicaoAssociationOptions.find(
      (item) => item.codigo === modalBancadaTpPagtoCondicaoAssociationCodigo,
    )
    const tipoPgto = modalBancadaTpPagtoCondicaoTipoPgtoOptions.find(
      (item) => item.codigo === modalBancadaTpPagtoCondicaoTipoPgtoCodigo,
    )
    const condicao = modalBancadaTpPagtoCondicaoCondicaoOptions.find(
      (item) => item.codigo === modalBancadaTpPagtoCondicaoCondicaoCodigo,
    )

    if (!association || !tipoPgto || !condicao) {
      setModalBancadaTpPagtoCondicaoStatusTone('error')
      setModalBancadaTpPagtoCondicaoStatusMessage('Selecao invalida.')
      return
    }

    const editingCodigo = editingModalBancadaTpPagtoCondicaoCodigo

    setIsSavingModalBancadaTpPagtoCondicao(true)
    setModalBancadaTpPagtoCondicaoStatusMessage(editingCodigo ? 'Alterando associacao...' : 'Gravando associacao...')

    try {
      await (editingCodigo
        ? updateModalBancadaTpPagtoCondicaoItem(editingCodigo, {
            modalidadeTipoBancadaCodigo: association.codigo,
            tipoPgtoCodigo: tipoPgto.codigo,
            condicaoCodigo: condicao.codigo,
          })
        : createModalBancadaTpPagtoCondicaoItem({
            modalidadeTipoBancadaCodigo: association.codigo,
            tipoPgtoCodigo: tipoPgto.codigo,
            condicaoCodigo: condicao.codigo,
          }))

      resetModalBancadaTpPagtoCondicaoForm()
      setIsModalBancadaTpPagtoCondicaoFormVisible(false)
      setModalBancadaTpPagtoCondicaoStatusTone('success')
      setModalBancadaTpPagtoCondicaoStatusMessage(editingCodigo
        ? 'Registro da associacao de modalidade, bancada, pagamento e condicao alterado com sucesso.'
        : 'Registro da associacao de modalidade, bancada, pagamento e condicao criado com sucesso.')
      await loadModalBancadaTpPagtoCondicaoItems(editingCodigo ? modalBancadaTpPagtoCondicaoPage : 1)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao salvar o registro da associacao de modalidade, bancada, pagamento e condicao.'

      setModalBancadaTpPagtoCondicaoStatusTone('error')
      setModalBancadaTpPagtoCondicaoStatusMessage(message)
    } finally {
      setIsSavingModalBancadaTpPagtoCondicao(false)
    }
  }

  const handleDeleteModalBancadaTpPagtoCondicao = async (item: ModalBancadaTpPagtoCondicaoItem) => {
    if (!hasDeleteFormPermission(appFormEditAccessKeys.modalBancadaTpPagtoCondicao)) {
      setModalBancadaTpPagtoCondicaoStatusTone('warning')
      setModalBancadaTpPagtoCondicaoStatusMessage(getFormDeletePermissionMessage('Modalidade x Bancada x Pagamento x Condicao'))
      return
    }

    const confirmed = window.confirm(
      `Excluir a associacao ${item.modalidadeDescricao} x ${item.tipoBancadaDescricao} x ${item.tipoPgtoDescricao} x ${item.condicaoDescricao}?`,
    )

    if (!confirmed) {
      return
    }

    setIsDeletingModalBancadaTpPagtoCondicao(true)

    try {
      await deleteModalBancadaTpPagtoCondicaoItem(item.codigo)
      setModalBancadaTpPagtoCondicaoStatusTone('success')
      setModalBancadaTpPagtoCondicaoStatusMessage('Registro da associacao de modalidade, bancada, pagamento e condicao removido.')
      await loadModalBancadaTpPagtoCondicaoItems(modalBancadaTpPagtoCondicaoPage)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao excluir o registro da associacao de modalidade, bancada, pagamento e condicao.'

      setModalBancadaTpPagtoCondicaoStatusTone('error')
      setModalBancadaTpPagtoCondicaoStatusMessage(message)
    } finally {
      setIsDeletingModalBancadaTpPagtoCondicao(false)
    }
  }

  const handleCreateModalBancadaTpPagtoCondicaoValor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (modalBancadaTpPagtoCondicaoValorFormMode === 'view') {
      setModalBancadaTpPagtoCondicaoValorStatusTone('idle')
      setModalBancadaTpPagtoCondicaoValorStatusMessage('Consulta em modo somente leitura.')
      return
    }

    setModalBancadaTpPagtoCondicaoValorStatusTone('idle')
    setModalBancadaTpPagtoCondicaoValorStatusMessage('')

    if (!modalBancadaTpPagtoCondicaoValorAssociationCodigo || !modalBancadaTpPagtoCondicaoValorData || modalBancadaTpPagtoCondicaoValorValor.trim() === '') {
      setModalBancadaTpPagtoCondicaoValorStatusTone('error')
      setModalBancadaTpPagtoCondicaoValorStatusMessage('Selecione a associacao e informe data e valor.')
      return
    }

    const editingCodigo = editingModalBancadaTpPagtoCondicaoValorCodigo

    setIsSavingModalBancadaTpPagtoCondicaoValor(true)
    setModalBancadaTpPagtoCondicaoValorStatusMessage(editingCodigo ? 'Alterando registro de valor...' : 'Gravando registro de valor...')

    try {
      await (editingCodigo
        ? updateModalBancadaTpPagtoCondicaoValorItem(editingCodigo, {
            modalBancadaTpPagtoCondicaoCodigo: modalBancadaTpPagtoCondicaoValorAssociationCodigo,
            data: modalBancadaTpPagtoCondicaoValorData,
            valor: modalBancadaTpPagtoCondicaoValorValor,
          })
        : createModalBancadaTpPagtoCondicaoValorItem({
            modalBancadaTpPagtoCondicaoCodigo: modalBancadaTpPagtoCondicaoValorAssociationCodigo,
            data: modalBancadaTpPagtoCondicaoValorData,
            valor: modalBancadaTpPagtoCondicaoValorValor,
          }))

      resetModalBancadaTpPagtoCondicaoValorForm()
      setIsModalBancadaTpPagtoCondicaoValorFormVisible(false)
      setModalBancadaTpPagtoCondicaoValorStatusTone('success')
      setModalBancadaTpPagtoCondicaoValorStatusMessage(editingCodigo
        ? 'Registro de valor alterado com sucesso.'
        : 'Registro de valor criado com sucesso.')
      await loadModalBancadaTpPagtoCondicaoValorItems(editingCodigo ? modalBancadaTpPagtoCondicaoValorPage : 1)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao salvar o registro de valor da associacao de modalidade, bancada, pagamento e condicao.'

      setModalBancadaTpPagtoCondicaoValorStatusTone('error')
      setModalBancadaTpPagtoCondicaoValorStatusMessage(message)
    } finally {
      setIsSavingModalBancadaTpPagtoCondicaoValor(false)
    }
  }

  const handleDeleteModalBancadaTpPagtoCondicaoValor = async (item: ModalBancadaTpPagtoCondicaoValorItem) => {
    if (!hasDeleteFormPermission(appFormEditAccessKeys.modalBancadaTpPagtoCondicaoValor)) {
      setModalBancadaTpPagtoCondicaoValorStatusTone('warning')
      setModalBancadaTpPagtoCondicaoValorStatusMessage(getFormDeletePermissionMessage('Modalidade x Bancada x Pagamento x Condicao Valor'))
      return
    }

    const confirmed = window.confirm(
      `Excluir o valor ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.valor)} da data ${item.data}?`,
    )

    if (!confirmed) {
      return
    }

    setIsDeletingModalBancadaTpPagtoCondicaoValor(true)

    try {
      await deleteModalBancadaTpPagtoCondicaoValorItem(item.codigo)
      setModalBancadaTpPagtoCondicaoValorStatusTone('success')
      setModalBancadaTpPagtoCondicaoValorStatusMessage('Registro de valor removido.')
      await loadModalBancadaTpPagtoCondicaoValorItems(modalBancadaTpPagtoCondicaoValorPage)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao excluir o registro de valor.'

      setModalBancadaTpPagtoCondicaoValorStatusTone('error')
      setModalBancadaTpPagtoCondicaoValorStatusMessage(message)
    } finally {
      setIsDeletingModalBancadaTpPagtoCondicaoValor(false)
    }
  }

  const handleCreateKmValor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (kmValorFormMode === 'view') {
      setKmValorStatusTone('idle')
      setKmValorStatusMessage('Consulta em modo somente leitura.')
      return
    }

    setKmValorStatusTone('idle')
    setKmValorStatusMessage('')

    const normalizedKmValor = normalizeCurrencyInput(kmValorValor)

    if (!kmValorCondicaoCodigo || !kmValorData || !normalizedKmValor) {
      setKmValorStatusTone('error')
      setKmValorStatusMessage('Selecione a condicao e informe data e valor.')
      return
    }

    const editingCodigo = editingKmValorCodigo

    setIsSavingKmValor(true)
    setKmValorStatusMessage(editingCodigo ? 'Alterando registro de km valor...' : 'Gravando registro de km valor...')

    try {
      await (editingCodigo
        ? updateKmValorItem(editingCodigo, {
            condicaoCodigo: kmValorCondicaoCodigo,
            data: kmValorData,
            valor: normalizedKmValor,
          })
        : createKmValorItem({
            condicaoCodigo: kmValorCondicaoCodigo,
            data: kmValorData,
            valor: normalizedKmValor,
          }))

      resetKmValorForm()
      setIsKmValorFormVisible(false)
      setKmValorStatusTone('success')
      setKmValorStatusMessage(editingCodigo
        ? 'Registro de km valor alterado com sucesso.'
        : 'Registro de km valor criado com sucesso.')
      await loadKmValorItems(editingCodigo ? kmValorPage : 1)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao salvar o registro de km valor.'

      setKmValorStatusTone('error')
      setKmValorStatusMessage(message)
    } finally {
      setIsSavingKmValor(false)
    }
  }

  const handleDeleteKmValor = async (item: KmValorItem) => {
    if (!hasDeleteFormPermission(appFormEditAccessKeys.kmValor)) {
      setKmValorStatusTone('warning')
      setKmValorStatusMessage(getFormDeletePermissionMessage('Km_Valor'))
      return
    }

    const confirmed = window.confirm(
      `Excluir o km valor ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.valor)} da data ${item.data} para a condicao ${item.condicaoDescricao}?`,
    )

    if (!confirmed) {
      return
    }

    setIsDeletingKmValor(true)

    try {
      await deleteKmValorItem(item.codigo)
      setKmValorStatusTone('success')
      setKmValorStatusMessage('Registro de km valor removido.')
      await loadKmValorItems(kmValorPage)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao excluir o registro de km valor.'

      setKmValorStatusTone('error')
      setKmValorStatusMessage(message)
    } finally {
      setIsDeletingKmValor(false)
    }
  }

  const handleCreateContinuaValor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (continuaValorFormMode === 'view') {
      setContinuaValorStatusTone('idle')
      setContinuaValorStatusMessage('Consulta em modo somente leitura.')
      return
    }

    setContinuaValorStatusTone('idle')
    setContinuaValorStatusMessage('')

    const normalizedContinuaValor = normalizeCurrencyInput(continuaValorValor)

    if (!continuaValorTipo || !continuaValorData || !normalizedContinuaValor) {
      setContinuaValorStatusTone('error')
      setContinuaValorStatusMessage('Selecione o tipo continua e informe data e valor.')
      return
    }

    const editingCodigo = editingContinuaValorCodigo

    setIsSavingContinuaValor(true)
    setContinuaValorStatusMessage(editingCodigo ? 'Alterando registro de continua valor...' : 'Gravando registro de continua valor...')

    try {
      await (editingCodigo
        ? updateContinuaValorItem(editingCodigo, {
            tipoContinua: continuaValorTipo,
            data: continuaValorData,
            valor: normalizedContinuaValor,
          })
        : createContinuaValorItem({
            tipoContinua: continuaValorTipo,
            data: continuaValorData,
            valor: normalizedContinuaValor,
          }))

      resetContinuaValorForm()
      setIsContinuaValorFormVisible(false)
      setContinuaValorStatusTone('success')
      setContinuaValorStatusMessage(editingCodigo
        ? 'Registro de continua valor alterado com sucesso.'
        : 'Registro de continua valor criado com sucesso.')
      await loadContinuaValorItems(editingCodigo ? continuaValorPage : 1)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao salvar o registro de continua valor.'

      setContinuaValorStatusTone('error')
      setContinuaValorStatusMessage(message)
    } finally {
      setIsSavingContinuaValor(false)
    }
  }

  const handleDeleteContinuaValor = async (item: ContinuaValorItem) => {
    if (!hasDeleteFormPermission(appFormEditAccessKeys.continuaValor)) {
      setContinuaValorStatusTone('warning')
      setContinuaValorStatusMessage(getFormDeletePermissionMessage('Continua_Valor'))
      return
    }

    const confirmed = window.confirm(
      `Excluir o continua valor ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.valor)} da data ${item.data} para o tipo ${item.tipoContinua}?`,
    )

    if (!confirmed) {
      return
    }

    setIsDeletingContinuaValor(true)

    try {
      await deleteContinuaValorItem(item.codigo)
      setContinuaValorStatusTone('success')
      setContinuaValorStatusMessage('Registro de continua valor removido.')
      await loadContinuaValorItems(continuaValorPage)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao excluir o registro de continua valor.'

      setContinuaValorStatusTone('error')
      setContinuaValorStatusMessage(message)
    } finally {
      setIsDeletingContinuaValor(false)
    }
  }

  const handleCreateParametroVeiculo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (parametroVeiculoFormMode === 'view') {
      setParametroVeiculoStatusTone('idle')
      setParametroVeiculoStatusMessage('Consulta em modo somente leitura.')
      return
    }

    setParametroVeiculoStatusTone('idle')
    setParametroVeiculoStatusMessage('')

    if (!parametroVeiculoModalidadeTipoBancadaCodigo || !parametroVeiculoCondicao.trim() || !parametroVeiculoQtdeCondicao.trim() || !parametroVeiculoData) {
      setParametroVeiculoStatusTone('error')
      setParametroVeiculoStatusMessage('Informe modalidade x tipo de bancada, condicao, qtde da condicao e data.')
      return
    }

    if (!PARAMETRO_VEICULO_CONDICAO_OPTIONS.includes(parametroVeiculoCondicao as (typeof PARAMETRO_VEICULO_CONDICAO_OPTIONS)[number])) {
      setParametroVeiculoStatusTone('error')
      setParametroVeiculoStatusMessage('Selecione uma condicao valida.')
      return
    }

    const qtdeCondicao = Number(parametroVeiculoQtdeCondicao)

    if (!Number.isInteger(qtdeCondicao) || qtdeCondicao < 0) {
      setParametroVeiculoStatusTone('error')
      setParametroVeiculoStatusMessage('Qtde da condicao deve ser um numero inteiro maior ou igual a zero.')
      return
    }

    const editingCodigo = editingParametroVeiculoCodigo

    setIsSavingParametroVeiculo(true)
    setParametroVeiculoStatusMessage(editingCodigo ? 'Alterando registro de parametro veiculo...' : 'Gravando registro de parametro veiculo...')

    try {
      await (editingCodigo
        ? updateParametroVeiculoItem(editingCodigo, {
            modalidadeTipoBancadaCodigo: parametroVeiculoModalidadeTipoBancadaCodigo,
            condicao: parametroVeiculoCondicao,
            qtdeCondicao: String(qtdeCondicao),
            data: parametroVeiculoData,
          })
        : createParametroVeiculoItem({
            modalidadeTipoBancadaCodigo: parametroVeiculoModalidadeTipoBancadaCodigo,
            condicao: parametroVeiculoCondicao,
            qtdeCondicao: String(qtdeCondicao),
            data: parametroVeiculoData,
          }))

      resetParametroVeiculoForm()
      setIsParametroVeiculoFormVisible(false)
      setParametroVeiculoStatusTone('success')
      setParametroVeiculoStatusMessage(editingCodigo
        ? 'Registro de parametro veiculo alterado com sucesso.'
        : 'Registro de parametro veiculo criado com sucesso.')
      await loadParametroVeiculoItems(editingCodigo ? parametroVeiculoPage : 1)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao salvar o registro de parametro veiculo.'

      setParametroVeiculoStatusTone('error')
      setParametroVeiculoStatusMessage(message)
    } finally {
      setIsSavingParametroVeiculo(false)
    }
  }

  const handleDeleteParametroVeiculo = async (item: ParametroVeiculoItem) => {
    if (!hasDeleteFormPermission(appFormEditAccessKeys.parametroVeiculo)) {
      setParametroVeiculoStatusTone('warning')
      setParametroVeiculoStatusMessage(getFormDeletePermissionMessage('Parametro Pgto Veiculo'))
      return
    }

    const confirmed = window.confirm(
      `Excluir o parametro veiculo ${formatModalidadeTipoBancadaLabel(item)} / ${item.condicao} / ${item.data}?`,
    )

    if (!confirmed) {
      return
    }

    setIsDeletingParametroVeiculo(true)

    try {
      await deleteParametroVeiculoItem(item.codigo)
      setParametroVeiculoStatusTone('success')
      setParametroVeiculoStatusMessage('Registro de parametro veiculo removido.')
      await loadParametroVeiculoItems(parametroVeiculoPage)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao excluir o registro de parametro veiculo.'

      setParametroVeiculoStatusTone('error')
      setParametroVeiculoStatusMessage(message)
    } finally {
      setIsDeletingParametroVeiculo(false)
    }
  }

  const loadSeguradoraItems = useCallback(async (pageToLoad: number) => {
    setIsLoadingSeguradora(true)
    setSeguradoraStatusMessage('Carregando registros de seguradoras...')
    setSeguradoraStatusTone('idle')

    try {
      const result = await listSeguradoraItemsPaginated({
        search: deferredSeguradoraSearch,
        page: pageToLoad,
        pageSize: DRE_PAGE_SIZE,
        sortBy: seguradoraSortBy,
        sortDirection: seguradoraSortDirection,
      })

      setSeguradoraItems(result.items)
      setSeguradoraTotalItems(result.total)
      setSeguradoraTotalPages(result.totalPages)
      setSeguradoraPage(result.page)
      setSeguradoraSortBy(result.sortBy)
      setSeguradoraSortDirection(result.sortDirection)
      setSeguradoraStatusMessage(result.items.length ? '' : 'Nenhum registro encontrado na tabela seguradora.')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar os registros de seguradoras.'

      setSeguradoraStatusTone('error')
      setSeguradoraStatusMessage(message)
    } finally {
      setIsLoadingSeguradora(false)
    }
  }, [deferredSeguradoraSearch, seguradoraSortBy, seguradoraSortDirection])

  const loadTitularItems = useCallback(async (pageToLoad: number) => {
    setIsLoadingTitular(true)
    setTitularStatusMessage('Carregando registros de titulares do CRM...')
    setTitularStatusTone('idle')

    try {
      const result = await listTitularItemsPaginated({
        search: deferredTitularSearch,
        page: pageToLoad,
        pageSize: DRE_PAGE_SIZE,
        sortBy: titularSortBy,
        sortDirection: titularSortDirection,
      })

      setTitularItems(result.items)
      setTitularTotalItems(result.total)
      setTitularTotalPages(result.totalPages)
      setTitularPage(result.page)
      setTitularSortBy(result.sortBy)
      setTitularSortDirection(result.sortDirection)
      setTitularStatusMessage(result.items.length ? '' : 'Nenhum registro encontrado na tabela titular do CRM.')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar os registros de titulares do CRM.'

      setTitularStatusTone('error')
      setTitularStatusMessage(message)
    } finally {
      setIsLoadingTitular(false)
    }
  }, [deferredTitularSearch, titularSortBy, titularSortDirection])

  const loadMarcaModeloItems = useCallback(async (pageToLoad: number) => {
    setIsLoadingMarcaModelo(true)
    setMarcaModeloStatusMessage('Carregando registros de marca/modelo...')
    setMarcaModeloStatusTone('idle')

    try {
      const result = await listMarcaModeloItemsPaginated({
        search: deferredMarcaModeloSearch,
        page: pageToLoad,
        pageSize: DRE_PAGE_SIZE,
        sortBy: marcaModeloSortBy,
        sortDirection: marcaModeloSortDirection,
      })

      setMarcaModeloItems(result.items)
      setMarcaModeloTotalItems(result.total)
      setMarcaModeloTotalPages(result.totalPages)
      setMarcaModeloPage(result.page)
      setMarcaModeloSortBy(result.sortBy)
      setMarcaModeloSortDirection(result.sortDirection)
      setMarcaModeloStatusMessage(result.items.length ? '' : 'Nenhum registro encontrado na tabela marca/modelo.')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar os registros de marca/modelo.'

      setMarcaModeloStatusTone('error')
      setMarcaModeloStatusMessage(message)
    } finally {
      setIsLoadingMarcaModelo(false)
    }
  }, [deferredMarcaModeloSearch, marcaModeloSortBy, marcaModeloSortDirection])

  useEffect(() => {
    if (!session || activeView !== 'dre') {
      return
    }

    void loadDreItems(drePage)
  }, [activeView, drePage, loadDreItems, session])

  useEffect(() => {
    if (!session || activeView !== 'modalidade') {
      return
    }

    void loadModalidadeItems(modalidadePage)
  }, [activeView, loadModalidadeItems, modalidadePage, session])

  useEffect(() => {
    if (!session || activeView !== 'condicao') {
      return
    }

    void loadCondicaoItems(condicaoPage)
  }, [activeView, condicaoPage, loadCondicaoItems, session])

  useEffect(() => {
    if (!session || activeView !== 'tipoBancada') {
      return
    }

    void loadTipoBancadaItems(tipoBancadaPage)
    void loadAssociationOptions()
    void loadTipoBancadaAssociationItems()
  }, [activeView, loadTipoBancadaItems, loadAssociationOptions, loadTipoBancadaAssociationItems, session, tipoBancadaPage])

  useEffect(() => {
    if (!session || activeView !== 'tipoPgto') {
      return
    }

    void loadTipoPgtoItems(tipoPgtoPage)
  }, [activeView, loadTipoPgtoItems, session, tipoPgtoPage])

  useEffect(() => {
    if (!session || activeView !== 'tipoEscola') {
      return
    }

    void loadTipoEscolaItems(tipoEscolaPage)
  }, [activeView, loadTipoEscolaItems, session, tipoEscolaPage])

  useEffect(() => {
    if (!session || activeView !== 'aliquotaOptante') {
      return
    }

    void loadAliquotaOptanteItems(aliquotaOptantePage)
  }, [activeView, aliquotaOptantePage, loadAliquotaOptanteItems, session])

  useEffect(() => {
    if (!session || activeView !== 'diasLetivos') {
      return
    }

    void loadDiasLetivosItems(diasLetivosPage)
  }, [activeView, diasLetivosPage, loadDiasLetivosItems, session])

  useEffect(() => {
    apuracaoFinanceiraSelectedDreCodigosRef.current = apuracaoFinanceiraSelectedDreCodigos
  }, [apuracaoFinanceiraSelectedDreCodigos])

  useEffect(() => {
    if (!session || activeView !== 'apuracaoFinanceira') {
      return
    }

    void loadApuracaoFinanceiraDreOptions()
    void loadApuracaoFinanceiraItems(apuracaoFinanceiraPage)
  }, [activeView, apuracaoFinanceiraPage, loadApuracaoFinanceiraDreOptions, loadApuracaoFinanceiraItems, session])

  useEffect(() => {
    if (
      !session
      || activeView !== 'apuracaoFinanceira'
      || !isApuracaoFinanceiraFormVisible
      || apuracaoFinanceiraFormMode === 'view'
    ) {
      return
    }

    void loadApuracaoFinanceiraActiveDreOptions(apuracaoFinanceiraMesAno)
  }, [
    activeView,
    apuracaoFinanceiraFormMode,
    apuracaoFinanceiraMesAno,
    isApuracaoFinanceiraFormVisible,
    loadApuracaoFinanceiraActiveDreOptions,
    session,
  ])

  useEffect(() => {
    if (!session || activeView !== 'apuracaoFinanceira' || apuracaoFinanceiraItems.length === 0 || apuracaoFinanceiraDreOptions.length === 0) {
      return
    }

    const mesAnoToLoad = [...new Set(
      apuracaoFinanceiraItems
        .map((item) => item.mesAno)
        .filter((item) => isValidMonthYear(item) && apuracaoFinanceiraGridActiveDreCounts[item] === undefined),
    )]

    if (mesAnoToLoad.length === 0) {
      return
    }

    let isCancelled = false

    const loadGridActiveDreCounts = async () => {
      const nextEntries = await Promise.all(
        mesAnoToLoad.map(async (mesAno) => {
          try {
            const result = await getOrdemServicoDashboardAtivos(convertMonthYearToDashboardMonth(mesAno))
            const activeOperationalCodes = new Set(
              result.rows
                .map((item) => item.dreCodigo.trim())
                .filter((item) => item && item !== 'SEM DRE'),
            )

            const activeCount = apuracaoFinanceiraDreOptions.filter((item) => activeOperationalCodes.has(item.sigla)).length
            return [mesAno, activeCount] as const
          } catch {
            return [mesAno, 0] as const
          }
        }),
      )

      if (isCancelled) {
        return
      }

      setApuracaoFinanceiraGridActiveDreCounts((current) => {
        const next = { ...current }

        nextEntries.forEach(([mesAno, activeCount]) => {
          next[mesAno] = activeCount
        })

        return next
      })
    }

    void loadGridActiveDreCounts()

    return () => {
      isCancelled = true
    }
  }, [activeView, apuracaoFinanceiraDreOptions, apuracaoFinanceiraGridActiveDreCounts, apuracaoFinanceiraItems, session])

  useEffect(() => {
    if (!session || activeView !== 'modalBancadaTpPagtoCondicao') {
      return
    }

    void loadModalBancadaTpPagtoCondicaoOptions()
    void loadModalBancadaTpPagtoCondicaoItems(modalBancadaTpPagtoCondicaoPage)
  }, [activeView, loadModalBancadaTpPagtoCondicaoItems, loadModalBancadaTpPagtoCondicaoOptions, modalBancadaTpPagtoCondicaoPage, session])

  useEffect(() => {
    if (!session || activeView !== 'modalBancadaTpPagtoCondicaoValor') {
      return
    }

    void loadModalBancadaTpPagtoCondicaoValorOptions()
    void loadModalBancadaTpPagtoCondicaoValorItems(modalBancadaTpPagtoCondicaoValorPage)
  }, [
    activeView,
    loadModalBancadaTpPagtoCondicaoValorItems,
    loadModalBancadaTpPagtoCondicaoValorOptions,
    modalBancadaTpPagtoCondicaoValorPage,
    session,
  ])

  useEffect(() => {
    if (!session || activeView !== 'kmValor') {
      return
    }

    void loadKmValorOptions()
    void loadKmValorItems(kmValorPage)
  }, [activeView, kmValorPage, loadKmValorItems, loadKmValorOptions, session])

  useEffect(() => {
    if (!session || activeView !== 'continuaValor') {
      return
    }

    void loadContinuaValorItems(continuaValorPage)
  }, [activeView, continuaValorPage, loadContinuaValorItems, session])

  useEffect(() => {
    if (!session || activeView !== 'parametroVeiculo') {
      return
    }

    void loadParametroVeiculoOptions()
    void loadParametroVeiculoItems(parametroVeiculoPage)
  }, [activeView, loadParametroVeiculoItems, loadParametroVeiculoOptions, parametroVeiculoPage, session])

  useEffect(() => {
    if (!session || activeView !== 'seguradora') {
      return
    }

    void loadSeguradoraItems(seguradoraPage)
  }, [activeView, loadSeguradoraItems, seguradoraPage, session])

  useEffect(() => {
    if (!session || activeView !== 'marcaModelo') {
      return
    }

    void loadMarcaModeloItems(marcaModeloPage)
  }, [activeView, loadMarcaModeloItems, marcaModeloPage, session])

  useEffect(() => {
    setDrePage(1)
  }, [deferredDreSearch])

  useEffect(() => {
    setModalidadePage(1)
  }, [deferredModalidadeSearch])

  useEffect(() => {
    setTipoBancadaPage(1)
  }, [deferredTipoBancadaSearch])

  useEffect(() => {
    if (!session || activeView !== 'titular') {
      return
    }

    void loadTitularItems(titularPage)
  }, [activeView, loadTitularItems, session, titularPage])

  useEffect(() => {
    setTitularPage(1)
  }, [deferredTitularSearch])

  useEffect(() => {
    setSeguradoraPage(1)
  }, [deferredSeguradoraSearch])

  useEffect(() => {
    setMarcaModeloPage(1)
  }, [deferredMarcaModeloSearch])

  useEffect(() => {
    document.title = environmentName
      ? `${environmentName} - TEG Cursor`
      : 'TEG Cursor'
  }, [environmentName])

  const validateEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedEmail = email.trim()
    const trimmedPassword = password.trim()

    let hasError = false

    if (!trimmedEmail) {
      setEmailError('Informe o email.')
      hasError = true
    } else if (!validateEmail(trimmedEmail)) {
      setEmailError('Digite um email valido.')
      hasError = true
    } else {
      setEmailError('')
    }

    if (!trimmedPassword) {
      setPasswordError('Informe a senha.')
      hasError = true
    } else {
      setPasswordError('')
    }

    if (hasError) {
      setStatusTone('error')
      setStatusMessage('Corrija os campos destacados para continuar.')
      return
    }

    setStatusMessage('Autenticando...')
    setStatusTone('idle')
    setIsSubmitting(true)

    try {
      const result = await authenticate({
        email: trimmedEmail,
        password: trimmedPassword,
      })

      const nextSession: StoredSession = {
        email: trimmedEmail,
        displayName: getUserDisplayName(result.user, trimmedEmail),
        token: result.token,
        user: result.user,
        payload: result.payload,
        authenticatedAt: new Date().toISOString(),
      }

      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession))
      setSession(nextSession)
      setStatusTone('success')
      setStatusMessage(`Login realizado com sucesso para ${nextSession.displayName}.`)
      setPassword('')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha inesperada ao autenticar.'

      setStatusTone('error')
      setStatusMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setEmail('')
    setPassword('')
    setEmailError('')
    setPasswordError('')
    setStatusMessage('Fechando a aplicacao...')
    setStatusTone('idle')

    window.open('', '_self')
    window.close()
    window.location.replace('about:blank')
  }

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY)
    setSession(null)
    setPassword('')
    setStatusTone('idle')
    setStatusMessage('Sessao encerrada.')
    setActiveView('inicio')
  }

  const handleRunFullSmoke = async () => {
    setIsRunningSmoke(true)
    setSmokeStatusTone('idle')
    setSmokeStatusMessage(`Executando smoke ${selectedSmokeSuite === 'all' ? 'completo da aplicacao' : `da suite ${selectedSmokeSuite}`}...`)
    setSmokeStdout('')
    setSmokeStderr('')
    setSmokeReportActionMessage('')

    try {
      const response = await fetch('/api/smoke/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ suite: selectedSmokeSuite }),
      })

      const payload = await response.json().catch(() => null) as SmokeRunResponse | null

      setSmokeResult(payload)
      setSmokeStdout(payload?.stdoutTail ?? '')
      setSmokeStderr(payload?.stderrTail ?? '')
      setSelectedSmokeLogStream(payload?.status === 'failed' ? 'stderr' : 'stdout')

      if (!response.ok) {
        throw new Error(payload?.message || 'Falha ao executar smoke da aplicacao.')
      }

      setSmokeStatusTone('success')
      setSmokeStatusMessage(payload?.message || 'Smoke completo executado com sucesso.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao executar smoke da aplicacao.'
      setSmokeStatusTone('error')
      setSmokeStatusMessage(message)
    } finally {
      setIsRunningSmoke(false)
    }
  }

  const handleRunXmlImportAll = async () => {
    const deleteMissing = window.confirm('Ativar exclusao automatica de ausentes nesta importacao?')

    setIsRunningXmlImportAll(true)
    setXmlImportAllStatusTone('idle')
    setXmlImportAllStatusMessage('Iniciando importacao XML com geracao a partir do Access...')
    setXmlImportAllStdout('')
    setXmlImportAllStderr('')

    try {
      const response = await fetch('/api/xml-import-all/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          accessDbPath: xmlImportAllAccessDbPathInput.trim(),
          deleteMissing,
        }),
      })

      const payload = await response.json().catch(() => null) as XmlImportAllRunResponse | null

      setXmlImportAllResult(payload)
      setSelectedXmlImportAllStepKey(payload?.report?.results?.[0]?.key ?? '')
      setXmlImportAllStdout(payload?.logTail || payload?.stdoutTail || '')
      setXmlImportAllStderr(payload?.stderrTail ?? '')
      setSelectedXmlImportAllLogStream(payload?.status === 'failed' ? 'stderr' : 'stdout')
      setXmlImportAllLastUpdatedAt(new Date().toISOString())

      if (!response.ok) {
        throw new Error(payload?.message || 'Falha ao executar a importacao XML consolidada.')
      }

      setIsRunningXmlImportAll(payload?.isRunning === true)
      setXmlImportAllStatusTone('idle')
      setXmlImportAllStatusMessage(payload?.message || 'Importacao XML consolidada iniciada.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao executar a importacao XML consolidada.'
      setXmlImportAllStatusTone('error')
      setXmlImportAllStatusMessage(message)
      setIsRunningXmlImportAll(false)
    }
  }

  const handleClearXmlImportAllAccessDbPath = () => {
    setXmlImportAllAccessDbPathInput('')
  }

  const loadXmlImportAllStatus = useCallback(async () => {
    const response = await fetch('/api/xml-import-all/status', {
      headers: {
        Accept: 'application/json',
      },
    })

    const payload = await response.json().catch(() => null) as XmlImportAllRunResponse | null

    if (!response.ok || !payload) {
      throw new Error(payload?.message || 'Falha ao consultar o status da importacao XML consolidada.')
    }

    setXmlImportAllResult(payload)
    setSelectedXmlImportAllStepKey((currentValue) => currentValue || payload.report?.results?.[0]?.key || '')
    setXmlImportAllStdout(payload.logTail || payload.stdoutTail || '')
    setXmlImportAllStderr(payload.stderrTail || '')
    setIsRunningXmlImportAll(payload.isRunning === true)
    setXmlImportAllLastUpdatedAt(new Date().toISOString())

    if (payload.isRunning) {
      setSelectedXmlImportAllLogStream('stdout')
      const runningMessage = payload.currentFileName
        ? `Importando ${payload.currentFileName}${payload.currentProgressText ? ` - registro ${payload.currentProgressText}` : ''}`
        : (payload.message || 'Importacao XML consolidada em execucao.')
      setXmlImportAllStatusTone('idle')
      setXmlImportAllStatusMessage(runningMessage)
      return payload
    }

    if (payload.status === 'passed') {
      setXmlImportAllStatusTone('success')
      setXmlImportAllStatusMessage(payload.message || 'Importacao XML consolidada executada com sucesso.')
    } else if (payload.status === 'failed') {
      setXmlImportAllStatusTone('error')
      setXmlImportAllStatusMessage(payload.message || 'Importacao XML consolidada finalizada com falhas.')
    } else {
      setXmlImportAllStatusTone('idle')
      setXmlImportAllStatusMessage(payload.message || 'Nenhuma importacao Xml/Access em lote em execucao.')
    }

    return payload
  }, [])

  useEffect(() => {
    if (activeView !== 'xmlImportLote') {
      return
    }

    void loadXmlImportAllStatus().catch(() => {
      // Ignore initial status read failures and keep the current idle UI state.
    })
  }, [activeView, loadXmlImportAllStatus])

  useEffect(() => {
    if (!isRunningXmlImportAll) {
      return
    }

    const intervalId = window.setInterval(() => {
      void loadXmlImportAllStatus().catch((error) => {
        const message = error instanceof Error ? error.message : 'Falha ao consultar a importacao XML consolidada.'
        setIsRunningXmlImportAll(false)
        setXmlImportAllStatusTone('error')
        setXmlImportAllStatusMessage(message)
      })
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [isRunningXmlImportAll, loadXmlImportAllStatus])

  const xmlImportAllStepResults = xmlImportAllResult?.report?.results ?? []
  const selectedXmlImportAllStep = xmlImportAllStepResults.find((stepResult) => stepResult.key === selectedXmlImportAllStepKey)
    ?? xmlImportAllStepResults[0]
    ?? null
  const selectedXmlImportAllSkippedRecords = selectedXmlImportAllStep?.response?.skippedRecords ?? []
  const selectedXmlImportAllReason = selectedXmlImportAllStep?.message
    || selectedXmlImportAllStep?.response?.message
    || selectedXmlImportAllStep?.error?.message
    || selectedXmlImportAllStep?.error?.cause?.message
  const xmlImportAllAccessDbPath = xmlImportAllResult?.report?.accessDbPath
    || xmlImportAllResult?.accessDbPath
    || selectedXmlImportAllStep?.response?.databasePath
    || ''
  const xmlImportAllSource = xmlImportAllResult?.report?.source
    || xmlImportAllResult?.source
    || selectedXmlImportAllStep?.source
    || selectedXmlImportAllStep?.response?.source
    || ''
  const xmlImportAllSourceLabel = xmlImportAllSource === 'access'
    ? 'Access direto'
    : (xmlImportAllResult?.generateFromAccess ? 'XML gerado via Access' : 'XML')
  const xmlImportAllTotalSteps = xmlImportAllResult?.totalSteps
    || xmlImportAllResult?.report?.selectedStepKeys.length
    || xmlImportAllResult?.selectedStepKeys?.length
    || 0
  const xmlImportAllCurrentStepIndex = xmlImportAllResult?.currentStepIndex ?? null
  const xmlImportAllStepProgressText = xmlImportAllCurrentStepIndex && xmlImportAllTotalSteps > 0
    ? `${xmlImportAllCurrentStepIndex}/${xmlImportAllTotalSteps}`
    : '-'
  const xmlImportAllLastUpdatedLabel = xmlImportAllLastUpdatedAt
    ? new Date(xmlImportAllLastUpdatedAt).toLocaleTimeString('pt-BR')
    : '-'

  useEffect(() => {
    if (!xmlImportAllAccessDbPathInput && xmlImportAllAccessDbPath) {
      setXmlImportAllAccessDbPathInput(xmlImportAllAccessDbPath)
    }
  }, [xmlImportAllAccessDbPathInput, xmlImportAllAccessDbPath])

  const handleCopySmokeReportPath = async () => {
    if (!smokeResult?.reportPath) {
      setSmokeReportActionMessage('Nenhum relatorio disponivel para copiar.')
      return
    }

    try {
      await navigator.clipboard.writeText(smokeResult.reportPath)
      setSmokeReportActionMessage('Caminho do relatorio copiado para a area de transferencia.')
    } catch {
      setSmokeReportActionMessage('Nao foi possivel copiar o caminho do relatorio.')
    }
  }

  const handleOpenSmokeReport = () => {
    if (!smokeResult?.report) {
      setSmokeReportActionMessage('Nenhum relatorio JSON disponivel para abrir.')
      return
    }

    const reportBlob = new Blob([`${JSON.stringify(smokeResult.report, null, 2)}\n`], { type: 'application/json' })
    const reportUrl = URL.createObjectURL(reportBlob)
    window.open(reportUrl, '_blank', 'noopener,noreferrer')
    window.setTimeout(() => URL.revokeObjectURL(reportUrl), 60_000)
    setSmokeReportActionMessage('Relatorio JSON aberto em uma nova aba.')
  }

  const handleDownloadSmokeReport = () => {
    if (!smokeResult?.report) {
      setSmokeReportActionMessage('Nenhum relatorio JSON disponivel para download.')
      return
    }

    const reportBlob = new Blob([`${JSON.stringify(smokeResult.report, null, 2)}\n`], { type: 'application/json' })
    const reportUrl = URL.createObjectURL(reportBlob)
    const link = document.createElement('a')
    link.href = reportUrl
    link.download = getSmokeReportFileName(smokeResult)
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(reportUrl), 60_000)
    setSmokeReportActionMessage('Download do relatorio JSON iniciado.')
  }

  const resetDreForm = useCallback(() => {
    setDreSigla('')
    setDreSiglaError('')
    setDreDescricao('')
    setDreDescricaoError('')
    setEditingDreCodigo(null)
    setDreFormMode('create')
  }, [])

  const resetModalidadeForm = useCallback(() => {
    setModalidadeDescricao('')
    setModalidadeDescricaoError('')
    setEditingModalidadeCodigo(null)
    setModalidadeFormMode('create')
  }, [])

  const resetCondicaoForm = useCallback(() => {
    setCondicaoDescricao('')
    setCondicaoDescricaoError('')
    setCondicaoQtdeIni('')
    setCondicaoQtdeIniError('')
    setCondicaoQtdeFim('')
    setCondicaoQtdeFimError('')
    setEditingCondicaoCodigo(null)
    setCondicaoFormMode('create')
  }, [])

  const resetTipoBancadaForm = useCallback(() => {
    setTipoBancadaDescricao('')
    setTipoBancadaDescricaoError('')
    setEditingTipoBancadaCodigo(null)
    setTipoBancadaFormMode('create')
  }, [])

  const resetTipoPgtoForm = useCallback(() => {
    setTipoPgtoDescricao('')
    setTipoPgtoDescricaoError('')
    setEditingTipoPgtoCodigo(null)
    setTipoPgtoFormMode('create')
  }, [])

  const resetTipoEscolaForm = useCallback(() => {
    setTipoEscolaSigla('')
    setTipoEscolaSiglaError('')
    setTipoEscolaDescricao('')
    setTipoEscolaDescricaoError('')
    setEditingTipoEscolaCodigo(null)
    setTipoEscolaFormMode('create')
  }, [])

  const resetAliquotaOptanteForm = useCallback(() => {
    setAliquotaOptanteData('')
    setAliquotaOptanteDataError('')
    setAliquotaOptanteTipoEmpresa(ALIQUOTA_OPTANTE_TIPO_EMPRESA_OPTIONS[0])
    setAliquotaOptanteTipoEmpresaError('')
    setAliquotaOptanteValor('')
    setAliquotaOptanteValorError('')
    setEditingAliquotaOptanteKey(null)
    setAliquotaOptanteFormMode('create')
  }, [])

  const resetDiasLetivosForm = useCallback(() => {
    setDiasLetivosData('')
    setDiasLetivosDataError('')
    setDiasLetivosQuantidade('')
    setDiasLetivosQuantidadeError('')
    setEditingDiasLetivosData(null)
    setDiasLetivosFormMode('create')
  }, [])

  const resetApuracaoFinanceiraForm = useCallback(() => {
    setApuracaoFinanceiraMesAno('')
    setApuracaoFinanceiraMesAnoError('')
    setApuracaoFinanceiraDreCodigo('')
    setApuracaoFinanceiraDreCodigoError('')
    setApuracaoFinanceiraSelectedDreCodigos([])
    setApuracaoFinanceiraSelectedDresError('')
    setApuracaoFinanceiraActiveDreOptions([])
    setApuracaoFinanceiraRevisao('0')
    setApuracaoFinanceiraRevisaoError('')
    setApuracaoFinanceiraTipoPessoa('TODOS')
    setApuracaoFinanceiraTipoPessoaError('')
    setApuracaoFinanceiraSituacao(APURACAO_FINANCEIRA_STATUS_OPTIONS[0])
    setEditingApuracaoFinanceiraKey(null)
    setApuracaoFinanceiraFormMode('create')
  }, [])

  const resetModalBancadaTpPagtoCondicaoForm = () => {
    setModalBancadaTpPagtoCondicaoAssociationCodigo('')
    setModalBancadaTpPagtoCondicaoTipoPgtoCodigo('')
    setModalBancadaTpPagtoCondicaoCondicaoCodigo('')
    setEditingModalBancadaTpPagtoCondicaoCodigo(null)
    setModalBancadaTpPagtoCondicaoFormMode('create')
  }

  const resetModalBancadaTpPagtoCondicaoValorForm = () => {
    setModalBancadaTpPagtoCondicaoValorAssociationCodigo('')
    setModalBancadaTpPagtoCondicaoValorData('')
    setModalBancadaTpPagtoCondicaoValorValor('')
    setEditingModalBancadaTpPagtoCondicaoValorCodigo(null)
    setModalBancadaTpPagtoCondicaoValorFormMode('create')
  }

  const resetKmValorForm = useCallback(() => {
    setKmValorCondicaoCodigo('')
    setKmValorData('')
    setKmValorValor('')
    setEditingKmValorCodigo(null)
    setKmValorFormMode('create')
  }, [])

  const resetContinuaValorForm = useCallback(() => {
    setContinuaValorTipo('')
    setContinuaValorData('')
    setContinuaValorValor('')
    setEditingContinuaValorCodigo(null)
    setContinuaValorFormMode('create')
  }, [])

  const resetParametroVeiculoForm = useCallback(() => {
    setParametroVeiculoModalidadeTipoBancadaCodigo('')
    setParametroVeiculoCondicao('')
    setParametroVeiculoQtdeCondicao('')
    setParametroVeiculoData('')
    setEditingParametroVeiculoCodigo(null)
    setParametroVeiculoFormMode('create')
  }, [])

  const handleStartInsertDre = () => {
    resetDreForm()
    setDreFormMode('create')
    setDreStatusTone('idle')
    setDreStatusMessage('')
    setIsDreFormVisible(true)
  }

  const handleStartInsertModalidade = () => {
    resetModalidadeForm()
    setModalidadeFormMode('create')
    setModalidadeStatusTone('idle')
    setModalidadeStatusMessage('')
    setIsModalidadeFormVisible(true)
  }

  const handleStartInsertCondicao = () => {
    resetCondicaoForm()
    setCondicaoFormMode('create')
    setCondicaoStatusTone('idle')
    setCondicaoStatusMessage('')
    setIsCondicaoFormVisible(true)
  }

  const handleStartInsertTipoBancada = () => {
    resetTipoBancadaForm()
    setTipoBancadaFormMode('create')
    setTipoBancadaStatusTone('idle')
    setTipoBancadaStatusMessage('')
    setIsTipoBancadaFormVisible(true)
  }

  const handleStartInsertTipoPgto = () => {
    resetTipoPgtoForm()
    setTipoPgtoFormMode('create')
    setTipoPgtoStatusTone('idle')
    setTipoPgtoStatusMessage('')
    setIsTipoPgtoFormVisible(true)
  }

  const handleStartInsertTipoEscola = () => {
    resetTipoEscolaForm()
    setTipoEscolaFormMode('create')
    setTipoEscolaStatusTone('idle')
    setTipoEscolaStatusMessage('')
    setIsTipoEscolaFormVisible(true)
  }

  const handleStartInsertAliquotaOptante = () => {
    resetAliquotaOptanteForm()
    setAliquotaOptanteFormMode('create')
    setAliquotaOptanteStatusTone('idle')
    setAliquotaOptanteStatusMessage('')
    setIsAliquotaOptanteFormVisible(true)
  }

  const handleStartInsertDiasLetivos = () => {
    resetDiasLetivosForm()
    setDiasLetivosFormMode('create')
    setDiasLetivosStatusTone('idle')
    setDiasLetivosStatusMessage('')
    setIsDiasLetivosFormVisible(true)
  }

  const handleStartInsertApuracaoFinanceira = () => {
    resetApuracaoFinanceiraForm()
    setApuracaoFinanceiraFormMode('create')
    setApuracaoFinanceiraStatusTone('idle')
    setApuracaoFinanceiraStatusMessage('')
    setIsApuracaoFinanceiraFormVisible(true)
  }

  const handleStartBatchUpdateApuracaoFinanceira = () => {
    resetApuracaoFinanceiraForm()
    setApuracaoFinanceiraFormMode('batch-status')
    setApuracaoFinanceiraStatusTone('idle')
    setApuracaoFinanceiraStatusMessage('')
    setIsApuracaoFinanceiraFormVisible(true)
  }

  const handleToggleApuracaoFinanceiraSelectedDre = (codigo: string) => {
    setApuracaoFinanceiraSelectedDreCodigos((currentSelected) => (
      currentSelected.includes(codigo)
        ? currentSelected.filter((item) => item !== codigo)
        : [...currentSelected, codigo]
    ))
    setApuracaoFinanceiraSelectedDresError('')
  }

  const handleToggleAllApuracaoFinanceiraDres = () => {
    const allSelected = apuracaoFinanceiraActiveDreOptions.length > 0
      && apuracaoFinanceiraSelectedDreCodigos.length === apuracaoFinanceiraActiveDreOptions.length

    setApuracaoFinanceiraSelectedDreCodigos(allSelected ? [] : apuracaoFinanceiraActiveDreOptions.map((item) => item.codigo))
    setApuracaoFinanceiraSelectedDresError('')
  }

  const handleStartInsertModalBancadaTpPagtoCondicao = () => {
    resetModalBancadaTpPagtoCondicaoForm()
    setModalBancadaTpPagtoCondicaoFormMode('create')
    setModalBancadaTpPagtoCondicaoStatusTone('idle')
    setModalBancadaTpPagtoCondicaoStatusMessage('')
    setIsModalBancadaTpPagtoCondicaoFormVisible(true)
  }

  const handleStartInsertModalBancadaTpPagtoCondicaoValor = () => {
    resetModalBancadaTpPagtoCondicaoValorForm()
    setModalBancadaTpPagtoCondicaoValorFormMode('create')
    setModalBancadaTpPagtoCondicaoValorStatusTone('idle')
    setModalBancadaTpPagtoCondicaoValorStatusMessage('')
    setIsModalBancadaTpPagtoCondicaoValorFormVisible(true)
  }

  const handleStartInsertKmValor = () => {
    resetKmValorForm()
    setKmValorFormMode('create')
    setKmValorStatusTone('idle')
    setKmValorStatusMessage('')
    setIsKmValorFormVisible(true)
  }

  const handleStartInsertContinuaValor = () => {
    resetContinuaValorForm()
    setContinuaValorFormMode('create')
    setContinuaValorStatusTone('idle')
    setContinuaValorStatusMessage('')
    setIsContinuaValorFormVisible(true)
  }

  const handleStartInsertParametroVeiculo = () => {
    resetParametroVeiculoForm()
    setParametroVeiculoFormMode('create')
    setParametroVeiculoStatusTone('idle')
    setParametroVeiculoStatusMessage('')
    setIsParametroVeiculoFormVisible(true)
  }

  const handleFilterDreSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setDrePage(1)
    setDreStatusMessage('Aplicando filtro da DRE...')
    setDreStatusTone('idle')
  }

  const handleClearDreFilter = () => {
    setDreSearch('')
    setDrePage(1)
  }

  const handleFilterModalidadeSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setModalidadePage(1)
    setModalidadeStatusMessage('Aplicando filtro de modalidade...')
    setModalidadeStatusTone('idle')
  }

  const handleClearModalidadeFilter = () => {
    setModalidadeSearch('')
    setModalidadePage(1)
  }

  const handleFilterCondicaoSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCondicaoPage(1)
    setCondicaoStatusMessage('Aplicando filtro de condicao...')
    setCondicaoStatusTone('idle')
  }

  const handleClearCondicaoFilter = () => {
    setCondicaoSearch('')
    setCondicaoPage(1)
  }

  const handleFilterTipoBancadaSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTipoBancadaPage(1)
    setTipoBancadaStatusMessage('Aplicando filtro de tipo de bancada...')
    setTipoBancadaStatusTone('idle')
  }

  const handleClearTipoBancadaFilter = () => {
    setTipoBancadaSearch('')
    setTipoBancadaPage(1)
  }

  const handleFilterTipoPgtoSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTipoPgtoPage(1)
    setTipoPgtoStatusMessage('Aplicando filtro de tipo de pagamento...')
    setTipoPgtoStatusTone('idle')
  }

  const handleClearTipoPgtoFilter = () => {
    setTipoPgtoSearch('')
    setTipoPgtoPage(1)
  }

  const handleFilterTipoEscolaSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTipoEscolaPage(1)
    setTipoEscolaStatusMessage('Aplicando filtro de tipo de escola...')
    setTipoEscolaStatusTone('idle')
  }

  const handleClearTipoEscolaFilter = () => {
    setTipoEscolaSearch('')
    setTipoEscolaPage(1)
  }

  const handleFilterAliquotaOptanteSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAliquotaOptantePage(1)
    setAliquotaOptanteStatusMessage('Aplicando filtro de aliquota optante...')
    setAliquotaOptanteStatusTone('idle')
  }

  const handleClearAliquotaOptanteFilter = () => {
    setAliquotaOptanteSearch('')
    setAliquotaOptantePage(1)
  }

  const handleFilterDiasLetivosSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setDiasLetivosPage(1)
    setDiasLetivosStatusMessage('Aplicando filtro de dias letivos...')
    setDiasLetivosStatusTone('idle')
  }

  const handleClearDiasLetivosFilter = () => {
    setDiasLetivosSearch('')
    setDiasLetivosPage(1)
  }

  const handleFilterApuracaoFinanceiraSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setApuracaoFinanceiraPage(1)
    setApuracaoFinanceiraStatusMessage('Aplicando filtro da apuracao financeira...')
    setApuracaoFinanceiraStatusTone('idle')
  }

  const handleClearApuracaoFinanceiraFilter = () => {
    setApuracaoFinanceiraSearch('')
    setApuracaoFinanceiraPage(1)
  }

  const handleFilterModalBancadaTpPagtoCondicaoSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAppliedModalBancadaTpPagtoCondicaoFilterAssociationCodigo(modalBancadaTpPagtoCondicaoFilterAssociationCodigo)
    setAppliedModalBancadaTpPagtoCondicaoFilterTipoPgtoCodigo(modalBancadaTpPagtoCondicaoFilterTipoPgtoCodigo)
    setAppliedModalBancadaTpPagtoCondicaoFilterCondicaoCodigo(modalBancadaTpPagtoCondicaoFilterCondicaoCodigo)
    setModalBancadaTpPagtoCondicaoPage(1)
    setModalBancadaTpPagtoCondicaoStatusMessage('Aplicando filtro da associacao de modalidade, bancada, pagamento e condicao...')
    setModalBancadaTpPagtoCondicaoStatusTone('idle')
  }

  const handleClearModalBancadaTpPagtoCondicaoFilter = () => {
    setModalBancadaTpPagtoCondicaoFilterAssociationCodigo('')
    setModalBancadaTpPagtoCondicaoFilterTipoPgtoCodigo('')
    setModalBancadaTpPagtoCondicaoFilterCondicaoCodigo('')
    setAppliedModalBancadaTpPagtoCondicaoFilterAssociationCodigo('')
    setAppliedModalBancadaTpPagtoCondicaoFilterTipoPgtoCodigo('')
    setAppliedModalBancadaTpPagtoCondicaoFilterCondicaoCodigo('')
    setModalBancadaTpPagtoCondicaoPage(1)
  }

  const handleFilterModalBancadaTpPagtoCondicaoValorSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAppliedModalBancadaTpPagtoCondicaoValorFilterAssociationCodigo(modalBancadaTpPagtoCondicaoValorFilterAssociationCodigo)
    setAppliedModalBancadaTpPagtoCondicaoValorFilterData(modalBancadaTpPagtoCondicaoValorFilterData)
    setModalBancadaTpPagtoCondicaoValorPage(1)
    setModalBancadaTpPagtoCondicaoValorStatusMessage('Aplicando filtro de valor da associacao de modalidade, bancada, pagamento e condicao...')
    setModalBancadaTpPagtoCondicaoValorStatusTone('idle')
  }

  const handleClearModalBancadaTpPagtoCondicaoValorFilter = () => {
    setModalBancadaTpPagtoCondicaoValorFilterAssociationCodigo('')
    setModalBancadaTpPagtoCondicaoValorFilterData('')
    setAppliedModalBancadaTpPagtoCondicaoValorFilterAssociationCodigo('')
    setAppliedModalBancadaTpPagtoCondicaoValorFilterData('')
    setModalBancadaTpPagtoCondicaoValorPage(1)
  }

  const handleFilterKmValorSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAppliedKmValorFilterCondicaoCodigo(kmValorFilterCondicaoCodigo)
    setAppliedKmValorFilterData(kmValorFilterData)
    setKmValorPage(1)
    setKmValorStatusMessage('Aplicando filtro de km valor...')
    setKmValorStatusTone('idle')
  }

  const handleClearKmValorFilter = () => {
    setKmValorFilterCondicaoCodigo('')
    setKmValorFilterData('')
    setAppliedKmValorFilterCondicaoCodigo('')
    setAppliedKmValorFilterData('')
    setKmValorPage(1)
  }

  const handleFilterContinuaValorSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAppliedContinuaValorFilterTipo(continuaValorFilterTipo)
    setAppliedContinuaValorFilterData(continuaValorFilterData)
    setContinuaValorPage(1)
    setContinuaValorStatusMessage('Aplicando filtro de continua valor...')
    setContinuaValorStatusTone('idle')
  }

  const handleClearContinuaValorFilter = () => {
    setContinuaValorFilterTipo('')
    setContinuaValorFilterData('')
    setAppliedContinuaValorFilterTipo('')
    setAppliedContinuaValorFilterData('')
    setContinuaValorPage(1)
  }

  const handleFilterParametroVeiculoSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAppliedParametroVeiculoFilterModalidadeTipoBancadaCodigo(parametroVeiculoFilterModalidadeTipoBancadaCodigo)
    setAppliedParametroVeiculoFilterCondicao(parametroVeiculoFilterCondicao)
    setAppliedParametroVeiculoFilterData(parametroVeiculoFilterData)
    setParametroVeiculoPage(1)
    setParametroVeiculoStatusMessage('Aplicando filtro de parametro veiculo...')
    setParametroVeiculoStatusTone('idle')
  }

  const handleClearParametroVeiculoFilter = () => {
    setParametroVeiculoFilterModalidadeTipoBancadaCodigo('')
    setParametroVeiculoFilterCondicao('')
    setParametroVeiculoFilterData('')
    setAppliedParametroVeiculoFilterModalidadeTipoBancadaCodigo('')
    setAppliedParametroVeiculoFilterCondicao('')
    setAppliedParametroVeiculoFilterData('')
    setParametroVeiculoPage(1)
  }

  const handleSortDre = (field: DreSortField) => {
    setDrePage(1)
    setDreSortBy((currentField) => {
      if (currentField === field) {
        setDreSortDirection((currentDirection) => currentDirection === 'asc' ? 'desc' : 'asc')
        return currentField
      }

      setDreSortDirection('asc')
      return field
    })
  }

  const getSortIndicator = (field: DreSortField) => {
    if (dreSortBy !== field) {
      return '↕'
    }

    return dreSortDirection === 'asc' ? '↑' : '↓'
  }

  const handleSortModalidade = (field: DreSortField) => {
    setModalidadePage(1)
    setModalidadeSortBy((currentField) => {
      if (currentField === field) {
        setModalidadeSortDirection((currentDirection) => currentDirection === 'asc' ? 'desc' : 'asc')
        return currentField
      }

      setModalidadeSortDirection('asc')
      return field
    })
  }

  const getModalidadeSortIndicator = (field: DreSortField) => {
    if (modalidadeSortBy !== field) {
      return '↕'
    }

    return modalidadeSortDirection === 'asc' ? '↑' : '↓'
  }

  const handleSortCondicao = (field: CondicaoSortField) => {
    setCondicaoPage(1)
    setCondicaoSortBy((currentField) => {
      if (currentField === field) {
        setCondicaoSortDirection((currentDirection) => currentDirection === 'asc' ? 'desc' : 'asc')
        return currentField
      }

      setCondicaoSortDirection('asc')
      return field
    })
  }

  const getCondicaoSortIndicator = (field: CondicaoSortField) => {
    if (condicaoSortBy !== field) {
      return '↕'
    }

    return condicaoSortDirection === 'asc' ? '↑' : '↓'
  }

  const handleSortTipoPgto = (field: DreSortField) => {
    setTipoPgtoPage(1)
    setTipoPgtoSortBy((currentField) => {
      if (currentField === field) {
        setTipoPgtoSortDirection((currentDirection) => currentDirection === 'asc' ? 'desc' : 'asc')
        return currentField
      }

      setTipoPgtoSortDirection('asc')
      return field
    })
  }

  const getTipoPgtoSortIndicator = (field: DreSortField) => {
    if (tipoPgtoSortBy !== field) {
      return '↕'
    }

    return tipoPgtoSortDirection === 'asc' ? '↑' : '↓'
  }

  const handleSortTipoEscola = (field: TipoEscolaSortField) => {
    setTipoEscolaPage(1)
    setTipoEscolaSortBy((currentField) => {
      if (currentField === field) {
        setTipoEscolaSortDirection((currentDirection) => currentDirection === 'asc' ? 'desc' : 'asc')
        return currentField
      }

      setTipoEscolaSortDirection('asc')
      return field
    })
  }

  const getTipoEscolaSortIndicator = (field: TipoEscolaSortField) => {
    if (tipoEscolaSortBy !== field) {
      return '↕'
    }

    return tipoEscolaSortDirection === 'asc' ? '↑' : '↓'
  }

  const handleSortAliquotaOptante = (field: AliquotaOptanteSortField) => {
    setAliquotaOptantePage(1)
    setAliquotaOptanteSortBy((currentField) => {
      if (currentField === field) {
        setAliquotaOptanteSortDirection((currentDirection) => currentDirection === 'asc' ? 'desc' : 'asc')
        return currentField
      }

      setAliquotaOptanteSortDirection(field === 'data' ? 'desc' : 'asc')
      return field
    })
  }

  const getAliquotaOptanteSortIndicator = (field: AliquotaOptanteSortField) => {
    if (aliquotaOptanteSortBy !== field) {
      return '↕'
    }

    return aliquotaOptanteSortDirection === 'asc' ? '↑' : '↓'
  }

  const handleSortDiasLetivos = (field: DiasLetivosSortField) => {
    setDiasLetivosPage(1)
    setDiasLetivosSortBy((currentField) => {
      if (currentField === field) {
        setDiasLetivosSortDirection((currentDirection) => currentDirection === 'asc' ? 'desc' : 'asc')
        return currentField
      }

      setDiasLetivosSortDirection(field === 'data' ? 'asc' : 'desc')
      return field
    })
  }

  const getDiasLetivosSortIndicator = (field: DiasLetivosSortField) => {
    if (diasLetivosSortBy !== field) {
      return '↕'
    }

    return diasLetivosSortDirection === 'asc' ? '↑' : '↓'
  }

  const handleSortApuracaoFinanceira = (field: ApuracaoFinanceiraSortField) => {
    setApuracaoFinanceiraPage(1)
    setApuracaoFinanceiraSortBy((currentField) => {
      if (currentField === field) {
        setApuracaoFinanceiraSortDirection((currentDirection) => currentDirection === 'asc' ? 'desc' : 'asc')
        return currentField
      }

      setApuracaoFinanceiraSortDirection(field === 'mesAno' ? 'desc' : 'asc')
      return field
    })
  }

  const getApuracaoFinanceiraSortIndicator = (field: ApuracaoFinanceiraSortField) => {
    if (apuracaoFinanceiraSortBy !== field) {
      return '↕'
    }

    return apuracaoFinanceiraSortDirection === 'asc' ? '↑' : '↓'
  }

  const handleSortTipoBancada = (field: DreSortField) => {
    setTipoBancadaPage(1)
    setTipoBancadaSortBy((currentField) => {
      if (currentField === field) {
        setTipoBancadaSortDirection((currentDirection) => currentDirection === 'asc' ? 'desc' : 'asc')
        return currentField
      }

      setTipoBancadaSortDirection('asc')
      return field
    })
  }

  const getTipoBancadaSortIndicator = (field: DreSortField) => {
    if (tipoBancadaSortBy !== field) {
      return '↕'
    }

    return tipoBancadaSortDirection === 'asc' ? '↑' : '↓'
  }

  const handleStartEditDre = (item: DreItem) => {
    if (!hasDreEditFormAccess) {
      setDreStatusTone('warning')
      setDreStatusMessage(getFormEditPermissionMessage('DRE'))
      return
    }

    setEditingDreCodigo(item.codigo)
    setDreFormMode('edit')
    setDreSigla(item.sigla)
    setDreSiglaError('')
    setDreDescricao(item.descricao)
    setDreDescricaoError('')
    setDreStatusTone('idle')
    setDreStatusMessage(`Alterando registro ${item.codigo}.`)
    setIsDreFormVisible(true)
  }

  const handleStartViewDre = (item: DreItem) => {
    setEditingDreCodigo(item.codigo)
    setDreFormMode('view')
    setDreSigla(item.sigla)
    setDreSiglaError('')
    setDreDescricao(item.descricao)
    setDreDescricaoError('')
    setDreStatusTone('idle')
    setDreStatusMessage(`Consulta do registro ${item.codigo}.`)
    setIsDreFormVisible(true)
  }

  const handleCancelDreForm = useCallback(() => {
    resetDreForm()
    setIsDreFormVisible(false)
    setDreStatusTone('idle')
    setDreStatusMessage('')
  }, [resetDreForm])

  const handleStartEditModalidade = (item: ModalidadeItem) => {
    if (!hasModalidadeEditFormAccess) {
      setModalidadeStatusTone('warning')
      setModalidadeStatusMessage(getFormEditPermissionMessage('Modalidade'))
      return
    }

    setEditingModalidadeCodigo(item.codigo)
    setModalidadeFormMode('edit')
    setModalidadeDescricao(item.descricao)
    setModalidadeDescricaoError('')
    setModalidadeStatusTone('idle')
    setModalidadeStatusMessage(`Alterando registro ${item.codigo}.`)
    setIsModalidadeFormVisible(true)
  }

  const handleStartViewModalidade = (item: ModalidadeItem) => {
    setEditingModalidadeCodigo(item.codigo)
    setModalidadeFormMode('view')
    setModalidadeDescricao(item.descricao)
    setModalidadeDescricaoError('')
    setModalidadeStatusTone('idle')
    setModalidadeStatusMessage(`Consulta do registro ${item.codigo}.`)
    setIsModalidadeFormVisible(true)
  }

  const handleStartEditCondicao = (item: CondicaoItem) => {
    if (!hasCondicaoEditFormAccess) {
      setCondicaoStatusTone('warning')
      setCondicaoStatusMessage(getFormEditPermissionMessage('Condicao'))
      return
    }

    setEditingCondicaoCodigo(item.codigo)
    setCondicaoFormMode('edit')
    setCondicaoDescricao(item.descricao)
    setCondicaoDescricaoError('')
    setCondicaoQtdeIni(String(item.qtdeIni))
    setCondicaoQtdeIniError('')
    setCondicaoQtdeFim(String(item.qtdeFim))
    setCondicaoQtdeFimError('')
    setCondicaoStatusTone('idle')
    setCondicaoStatusMessage(`Alterando registro ${item.codigo}.`)
    setIsCondicaoFormVisible(true)
  }

  const handleStartViewCondicao = (item: CondicaoItem) => {
    setEditingCondicaoCodigo(item.codigo)
    setCondicaoFormMode('view')
    setCondicaoDescricao(item.descricao)
    setCondicaoDescricaoError('')
    setCondicaoQtdeIni(String(item.qtdeIni))
    setCondicaoQtdeIniError('')
    setCondicaoQtdeFim(String(item.qtdeFim))
    setCondicaoQtdeFimError('')
    setCondicaoStatusTone('idle')
    setCondicaoStatusMessage(`Consulta do registro ${item.codigo}.`)
    setIsCondicaoFormVisible(true)
  }

  const handleStartEditModalBancadaTpPagtoCondicao = (item: ModalBancadaTpPagtoCondicaoItem) => {
    if (!hasModalBancadaTpPagtoCondicaoEditFormAccess) {
      setModalBancadaTpPagtoCondicaoStatusTone('warning')
      setModalBancadaTpPagtoCondicaoStatusMessage(getFormEditPermissionMessage('Modalidade x Bancada x Pagamento x Condicao'))
      return
    }

    setEditingModalBancadaTpPagtoCondicaoCodigo(item.codigo)
    setModalBancadaTpPagtoCondicaoFormMode('edit')
    setModalBancadaTpPagtoCondicaoAssociationCodigo(item.modalidadeTipoBancadaCodigo)
    setModalBancadaTpPagtoCondicaoTipoPgtoCodigo(item.tipoPgtoCodigo)
    setModalBancadaTpPagtoCondicaoCondicaoCodigo(item.condicaoCodigo)
    setModalBancadaTpPagtoCondicaoStatusTone('idle')
    setModalBancadaTpPagtoCondicaoStatusMessage(`Alterando registro ${item.codigo}.`)
    setIsModalBancadaTpPagtoCondicaoFormVisible(true)
  }

  const handleStartViewModalBancadaTpPagtoCondicao = (item: ModalBancadaTpPagtoCondicaoItem) => {
    setEditingModalBancadaTpPagtoCondicaoCodigo(item.codigo)
    setModalBancadaTpPagtoCondicaoFormMode('view')
    setModalBancadaTpPagtoCondicaoAssociationCodigo(item.modalidadeTipoBancadaCodigo)
    setModalBancadaTpPagtoCondicaoTipoPgtoCodigo(item.tipoPgtoCodigo)
    setModalBancadaTpPagtoCondicaoCondicaoCodigo(item.condicaoCodigo)
    setModalBancadaTpPagtoCondicaoStatusTone('idle')
    setModalBancadaTpPagtoCondicaoStatusMessage(`Consulta do registro ${item.codigo}.`)
    setIsModalBancadaTpPagtoCondicaoFormVisible(true)
  }

  const handleStartEditModalBancadaTpPagtoCondicaoValor = (item: ModalBancadaTpPagtoCondicaoValorItem) => {
    if (!hasModalBancadaTpPagtoCondicaoValorEditFormAccess) {
      setModalBancadaTpPagtoCondicaoValorStatusTone('warning')
      setModalBancadaTpPagtoCondicaoValorStatusMessage(getFormEditPermissionMessage('Modalidade x Bancada x Pagamento x Condicao Valor'))
      return
    }

    setEditingModalBancadaTpPagtoCondicaoValorCodigo(item.codigo)
    setModalBancadaTpPagtoCondicaoValorFormMode('edit')
    setModalBancadaTpPagtoCondicaoValorAssociationCodigo(item.modalBancadaTpPagtoCondicaoCodigo)
    setModalBancadaTpPagtoCondicaoValorData(item.data)
    setModalBancadaTpPagtoCondicaoValorValor(String(item.valor))
    setModalBancadaTpPagtoCondicaoValorStatusTone('idle')
    setModalBancadaTpPagtoCondicaoValorStatusMessage(`Alterando registro ${item.codigo}.`)
    setIsModalBancadaTpPagtoCondicaoValorFormVisible(true)
  }

  const handleStartViewModalBancadaTpPagtoCondicaoValor = (item: ModalBancadaTpPagtoCondicaoValorItem) => {
    setEditingModalBancadaTpPagtoCondicaoValorCodigo(item.codigo)
    setModalBancadaTpPagtoCondicaoValorFormMode('view')
    setModalBancadaTpPagtoCondicaoValorAssociationCodigo(item.modalBancadaTpPagtoCondicaoCodigo)
    setModalBancadaTpPagtoCondicaoValorData(item.data)
    setModalBancadaTpPagtoCondicaoValorValor(String(item.valor))
    setModalBancadaTpPagtoCondicaoValorStatusTone('idle')
    setModalBancadaTpPagtoCondicaoValorStatusMessage(`Consulta do registro ${item.codigo}.`)
    setIsModalBancadaTpPagtoCondicaoValorFormVisible(true)
  }

  const handleStartEditKmValor = (item: KmValorItem) => {
    if (!hasKmValorEditFormAccess) {
      setKmValorStatusTone('warning')
      setKmValorStatusMessage(getFormEditPermissionMessage('Km_Valor'))
      return
    }

    setEditingKmValorCodigo(item.codigo)
    setKmValorFormMode('edit')
    setKmValorCondicaoCodigo(item.condicaoCodigo)
    setKmValorData(item.data)
    setKmValorValor(formatCurrencyInput(item.valor))
    setKmValorStatusTone('idle')
    setKmValorStatusMessage(`Alterando registro ${item.codigo}.`)
    setIsKmValorFormVisible(true)
  }

  const handleStartViewKmValor = (item: KmValorItem) => {
    setEditingKmValorCodigo(item.codigo)
    setKmValorFormMode('view')
    setKmValorCondicaoCodigo(item.condicaoCodigo)
    setKmValorData(item.data)
    setKmValorValor(formatCurrencyInput(item.valor))
    setKmValorStatusTone('idle')
    setKmValorStatusMessage(`Consulta do registro ${item.codigo}.`)
    setIsKmValorFormVisible(true)
  }

  const handleStartEditContinuaValor = (item: ContinuaValorItem) => {
    if (!hasContinuaValorEditFormAccess) {
      setContinuaValorStatusTone('warning')
      setContinuaValorStatusMessage(getFormEditPermissionMessage('Continua_Valor'))
      return
    }

    setEditingContinuaValorCodigo(item.codigo)
    setContinuaValorFormMode('edit')
    setContinuaValorTipo(item.tipoContinua)
    setContinuaValorData(item.data)
    setContinuaValorValor(formatCurrencyInput(item.valor))
    setContinuaValorStatusTone('idle')
    setContinuaValorStatusMessage(`Alterando registro ${item.codigo}.`)
    setIsContinuaValorFormVisible(true)
  }

  const handleStartViewContinuaValor = (item: ContinuaValorItem) => {
    setEditingContinuaValorCodigo(item.codigo)
    setContinuaValorFormMode('view')
    setContinuaValorTipo(item.tipoContinua)
    setContinuaValorData(item.data)
    setContinuaValorValor(formatCurrencyInput(item.valor))
    setContinuaValorStatusTone('idle')
    setContinuaValorStatusMessage(`Consulta do registro ${item.codigo}.`)
    setIsContinuaValorFormVisible(true)
  }

  const handleStartEditParametroVeiculo = (item: ParametroVeiculoItem) => {
    if (!hasParametroVeiculoEditFormAccess) {
      setParametroVeiculoStatusTone('warning')
      setParametroVeiculoStatusMessage(getFormEditPermissionMessage('Parametro Pgto Veiculo'))
      return
    }

    setEditingParametroVeiculoCodigo(item.codigo)
    setParametroVeiculoFormMode('edit')
    setParametroVeiculoModalidadeTipoBancadaCodigo(item.modalidadeTipoBancadaCodigo)
    setParametroVeiculoCondicao(item.condicao)
    setParametroVeiculoQtdeCondicao(String(item.qtdeCondicao))
    setParametroVeiculoData(item.data)
    setParametroVeiculoStatusTone('idle')
    setParametroVeiculoStatusMessage(`Alterando registro ${item.codigo}.`)
    setIsParametroVeiculoFormVisible(true)
  }

  const handleStartViewParametroVeiculo = (item: ParametroVeiculoItem) => {
    setEditingParametroVeiculoCodigo(item.codigo)
    setParametroVeiculoFormMode('view')
    setParametroVeiculoModalidadeTipoBancadaCodigo(item.modalidadeTipoBancadaCodigo)
    setParametroVeiculoCondicao(item.condicao)
    setParametroVeiculoQtdeCondicao(String(item.qtdeCondicao))
    setParametroVeiculoData(item.data)
    setParametroVeiculoStatusTone('idle')
    setParametroVeiculoStatusMessage(`Consulta do registro ${item.codigo}.`)
    setIsParametroVeiculoFormVisible(true)
  }

  const handleCancelModalidadeForm = useCallback(() => {
    resetModalidadeForm()
    setIsModalidadeFormVisible(false)
    setModalidadeStatusTone('idle')
    setModalidadeStatusMessage('')
  }, [resetModalidadeForm])

  const handleCancelCondicaoForm = useCallback(() => {
    resetCondicaoForm()
    setIsCondicaoFormVisible(false)
    setCondicaoStatusTone('idle')
    setCondicaoStatusMessage('')
  }, [resetCondicaoForm])

  const handleCancelModalBancadaTpPagtoCondicaoForm = () => {
    resetModalBancadaTpPagtoCondicaoForm()
    setIsModalBancadaTpPagtoCondicaoFormVisible(false)
    setModalBancadaTpPagtoCondicaoStatusTone('idle')
    setModalBancadaTpPagtoCondicaoStatusMessage('')
  }

  const handleCancelModalBancadaTpPagtoCondicaoValorForm = () => {
    resetModalBancadaTpPagtoCondicaoValorForm()
    setIsModalBancadaTpPagtoCondicaoValorFormVisible(false)
    setModalBancadaTpPagtoCondicaoValorStatusTone('idle')
    setModalBancadaTpPagtoCondicaoValorStatusMessage('')
  }

  const handleCancelKmValorForm = useCallback(() => {
    resetKmValorForm()
    setIsKmValorFormVisible(false)
    setKmValorStatusTone('idle')
    setKmValorStatusMessage('')
  }, [resetKmValorForm])

  const handleCancelContinuaValorForm = useCallback(() => {
    resetContinuaValorForm()
    setIsContinuaValorFormVisible(false)
    setContinuaValorStatusTone('idle')
    setContinuaValorStatusMessage('')
  }, [resetContinuaValorForm])

  const handleCancelParametroVeiculoForm = useCallback(() => {
    resetParametroVeiculoForm()
    setIsParametroVeiculoFormVisible(false)
    setParametroVeiculoStatusTone('idle')
    setParametroVeiculoStatusMessage('')
  }, [resetParametroVeiculoForm])

  useEffect(() => {
    if (!isKmValorFormVisible) {
      return
    }

    document.body.classList.add('management-modal-open')

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSavingKmValor) {
        handleCancelKmValorForm()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.classList.remove('management-modal-open')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleCancelKmValorForm, isKmValorFormVisible, isSavingKmValor])

  useEffect(() => {
    if (!isContinuaValorFormVisible) {
      return
    }

    document.body.classList.add('management-modal-open')

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSavingContinuaValor) {
        handleCancelContinuaValorForm()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.classList.remove('management-modal-open')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleCancelContinuaValorForm, isContinuaValorFormVisible, isSavingContinuaValor])

  useEffect(() => {
    if (!isParametroVeiculoFormVisible) {
      return
    }

    document.body.classList.add('management-modal-open')

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSavingParametroVeiculo) {
        handleCancelParametroVeiculoForm()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.classList.remove('management-modal-open')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleCancelParametroVeiculoForm, isParametroVeiculoFormVisible, isSavingParametroVeiculo])

  const handleStartEditTipoBancada = (item: TipoBancadaItem) => {
    if (!hasTipoBancadaEditFormAccess) {
      setTipoBancadaStatusTone('warning')
      setTipoBancadaStatusMessage(getFormEditPermissionMessage('Tipo de Bancada'))
      return
    }

    setEditingTipoBancadaCodigo(item.codigo)
    setTipoBancadaFormMode('edit')
    setTipoBancadaDescricao(item.descricao)
    setTipoBancadaDescricaoError('')
    setTipoBancadaStatusTone('idle')
    setTipoBancadaStatusMessage(`Alterando registro ${item.codigo}.`)
    setIsTipoBancadaFormVisible(true)
  }

  const handleStartViewTipoBancada = (item: TipoBancadaItem) => {
    setEditingTipoBancadaCodigo(item.codigo)
    setTipoBancadaFormMode('view')
    setTipoBancadaDescricao(item.descricao)
    setTipoBancadaDescricaoError('')
    setTipoBancadaStatusTone('idle')
    setTipoBancadaStatusMessage(`Consulta do registro ${item.codigo}.`)
    setIsTipoBancadaFormVisible(true)
  }

  const handleStartEditTipoPgto = (item: TipoPgtoItem) => {
    if (!hasTipoPgtoEditFormAccess) {
      setTipoPgtoStatusTone('warning')
      setTipoPgtoStatusMessage(getFormEditPermissionMessage('Tipo de Pagamento'))
      return
    }

    setEditingTipoPgtoCodigo(item.codigo)
    setTipoPgtoFormMode('edit')
    setTipoPgtoDescricao(item.descricao)
    setTipoPgtoDescricaoError('')
    setTipoPgtoStatusTone('idle')
    setTipoPgtoStatusMessage(`Alterando registro ${item.codigo}.`)
    setIsTipoPgtoFormVisible(true)
  }

  const handleStartViewTipoPgto = (item: TipoPgtoItem) => {
    setEditingTipoPgtoCodigo(item.codigo)
    setTipoPgtoFormMode('view')
    setTipoPgtoDescricao(item.descricao)
    setTipoPgtoDescricaoError('')
    setTipoPgtoStatusTone('idle')
    setTipoPgtoStatusMessage(`Consulta do registro ${item.codigo}.`)
    setIsTipoPgtoFormVisible(true)
  }

  const handleStartEditTipoEscola = (item: TipoEscolaItem) => {
    if (!hasTipoEscolaEditFormAccess) {
      setTipoEscolaStatusTone('warning')
      setTipoEscolaStatusMessage(getFormEditPermissionMessage('Tipo Escola'))
      return
    }

    setEditingTipoEscolaCodigo(item.codigo)
    setTipoEscolaFormMode('edit')
    setTipoEscolaSigla(item.sigla)
    setTipoEscolaSiglaError('')
    setTipoEscolaDescricao(item.descricao)
    setTipoEscolaDescricaoError('')
    setTipoEscolaStatusTone('idle')
    setTipoEscolaStatusMessage(`Alterando registro ${item.codigo}.`)
    setIsTipoEscolaFormVisible(true)
  }

  const handleStartViewTipoEscola = (item: TipoEscolaItem) => {
    setEditingTipoEscolaCodigo(item.codigo)
    setTipoEscolaFormMode('view')
    setTipoEscolaSigla(item.sigla)
    setTipoEscolaSiglaError('')
    setTipoEscolaDescricao(item.descricao)
    setTipoEscolaDescricaoError('')
    setTipoEscolaStatusTone('idle')
    setTipoEscolaStatusMessage(`Consulta do registro ${item.codigo}.`)
    setIsTipoEscolaFormVisible(true)
  }

  const handleStartEditAliquotaOptante = (item: AliquotaOptanteItem) => {
    if (!hasAliquotaOptanteEditFormAccess) {
      setAliquotaOptanteStatusTone('warning')
      setAliquotaOptanteStatusMessage(getFormEditPermissionMessage('Aliquota Optante'))
      return
    }

    setEditingAliquotaOptanteKey({ data: item.data, tipoEmpresa: item.tipoEmpresa })
    setAliquotaOptanteFormMode('edit')
    setAliquotaOptanteData(item.data)
    setAliquotaOptanteDataError('')
    setAliquotaOptanteTipoEmpresa(item.tipoEmpresa)
    setAliquotaOptanteTipoEmpresaError('')
    setAliquotaOptanteValor(item.aliquota.toFixed(4))
    setAliquotaOptanteValorError('')
    setAliquotaOptanteStatusTone('idle')
    setAliquotaOptanteStatusMessage(`Alterando registro ${item.data}.`)
    setIsAliquotaOptanteFormVisible(true)
  }

  const handleStartViewAliquotaOptante = (item: AliquotaOptanteItem) => {
    setEditingAliquotaOptanteKey({ data: item.data, tipoEmpresa: item.tipoEmpresa })
    setAliquotaOptanteFormMode('view')
    setAliquotaOptanteData(item.data)
    setAliquotaOptanteDataError('')
    setAliquotaOptanteTipoEmpresa(item.tipoEmpresa)
    setAliquotaOptanteTipoEmpresaError('')
    setAliquotaOptanteValor(item.aliquota.toFixed(4))
    setAliquotaOptanteValorError('')
    setAliquotaOptanteStatusTone('idle')
    setAliquotaOptanteStatusMessage(`Consulta do registro ${item.data}.`)
    setIsAliquotaOptanteFormVisible(true)
  }

  const handleStartEditDiasLetivos = (item: DiasLetivosItem) => {
    if (!hasDiasLetivosEditFormAccess) {
      setDiasLetivosStatusTone('warning')
      setDiasLetivosStatusMessage(getFormEditPermissionMessage('Dias Letivos'))
      return
    }

    setEditingDiasLetivosData(item.data)
    setDiasLetivosFormMode('edit')
    setDiasLetivosData(item.data)
    setDiasLetivosDataError('')
    setDiasLetivosQuantidade(String(item.diasLetivos))
    setDiasLetivosQuantidadeError('')
    setDiasLetivosStatusTone('idle')
    setDiasLetivosStatusMessage(`Alterando registro ${item.data}.`)
    setIsDiasLetivosFormVisible(true)
  }

  const handleStartViewDiasLetivos = (item: DiasLetivosItem) => {
    setEditingDiasLetivosData(item.data)
    setDiasLetivosFormMode('view')
    setDiasLetivosData(item.data)
    setDiasLetivosDataError('')
    setDiasLetivosQuantidade(String(item.diasLetivos))
    setDiasLetivosQuantidadeError('')
    setDiasLetivosStatusTone('idle')
    setDiasLetivosStatusMessage(`Consulta do registro ${item.data}.`)
    setIsDiasLetivosFormVisible(true)
  }

  const handleStartViewApuracaoFinanceira = (row: ApuracaoFinanceiraGridRow) => {
    const item = row.representativeItem

    setEditingApuracaoFinanceiraKey({
      mesAno: item.mesAno,
      dreCodigo: item.dreCodigo,
      revisao: item.revisao,
      tipoPessoa: item.tipoPessoa,
    })
    setApuracaoFinanceiraFormMode('view')
    setApuracaoFinanceiraMesAno(item.mesAno)
    setApuracaoFinanceiraMesAnoError('')
    setApuracaoFinanceiraDreCodigo(item.dreCodigo)
    setApuracaoFinanceiraDreCodigoError('')
    setApuracaoFinanceiraSelectedDreCodigos(row.dreCodigos)
    setApuracaoFinanceiraSelectedDresError('')
    setApuracaoFinanceiraActiveDreOptions([])
    setApuracaoFinanceiraRevisao(String(item.revisao))
    setApuracaoFinanceiraRevisaoError('')
    setApuracaoFinanceiraTipoPessoa(row.tipoPessoaFormValue)
    setApuracaoFinanceiraTipoPessoaError('')
    setApuracaoFinanceiraSituacao(item.situacao)
    setApuracaoFinanceiraStatusTone('idle')
    setApuracaoFinanceiraStatusMessage(`Consulta do registro ${item.mesAno} / ${row.dreText} / ${item.revisao} / ${row.tipoPessoaLabel}.`)
    setIsApuracaoFinanceiraFormVisible(true)
  }

  const handleCancelTipoBancadaForm = useCallback(() => {
    resetTipoBancadaForm()
    setIsTipoBancadaFormVisible(false)
    setTipoBancadaStatusTone('idle')
    setTipoBancadaStatusMessage('')
  }, [resetTipoBancadaForm])

  const handleCancelTipoPgtoForm = useCallback(() => {
    resetTipoPgtoForm()
    setIsTipoPgtoFormVisible(false)
    setTipoPgtoStatusTone('idle')
    setTipoPgtoStatusMessage('')
  }, [resetTipoPgtoForm])

  const handleCancelTipoEscolaForm = useCallback(() => {
    resetTipoEscolaForm()
    setIsTipoEscolaFormVisible(false)
    setTipoEscolaStatusTone('idle')
    setTipoEscolaStatusMessage('')
  }, [resetTipoEscolaForm])

  const handleCancelAliquotaOptanteForm = useCallback(() => {
    resetAliquotaOptanteForm()
    setIsAliquotaOptanteFormVisible(false)
    setAliquotaOptanteStatusTone('idle')
    setAliquotaOptanteStatusMessage('')
  }, [resetAliquotaOptanteForm])

  const handleCancelDiasLetivosForm = useCallback(() => {
    resetDiasLetivosForm()
    setIsDiasLetivosFormVisible(false)
    setDiasLetivosStatusTone('idle')
    setDiasLetivosStatusMessage('')
  }, [resetDiasLetivosForm])

  const handleCancelApuracaoFinanceiraForm = useCallback(() => {
    resetApuracaoFinanceiraForm()
    setIsApuracaoFinanceiraFormVisible(false)
    setApuracaoFinanceiraStatusTone('idle')
    setApuracaoFinanceiraStatusMessage('')
  }, [resetApuracaoFinanceiraForm])

  const handleCloseApuracaoFinanceiraChildTotals = useCallback(() => {
    setIsApuracaoFinanceiraChildTotalsVisible(false)
    setIsLoadingApuracaoFinanceiraChildTotals(false)
    setApuracaoFinanceiraChildTotals(null)
    setApuracaoFinanceiraChildTotalsStatusTone('idle')
    setApuracaoFinanceiraChildTotalsStatusMessage('')
  }, [])

  const handleOpenApuracaoFinanceiraChildTotals = useCallback(async (row: ApuracaoFinanceiraGridRow) => {
    setIsApuracaoFinanceiraChildTotalsVisible(true)
    setIsLoadingApuracaoFinanceiraChildTotals(true)
    setApuracaoFinanceiraChildTotals(null)
    setApuracaoFinanceiraChildTotalsStatusTone('idle')
    setApuracaoFinanceiraChildTotalsStatusMessage(`Carregando valores aglutinados de ${row.representativeItem.mesAno} / ${row.dreText} / ${row.representativeItem.revisao} / ${row.tipoPessoaLabel}.`)

    try {
      const summary = await getApuracaoFinanceiraChildTotalsSummary({
        mesAno: row.representativeItem.mesAno,
        dreCodigo: row.representativeItem.dreCodigo,
        revisao: row.representativeItem.revisao,
        tipoPessoa: row.representativeItem.tipoPessoa,
      })

      setApuracaoFinanceiraChildTotals(summary)
      setApuracaoFinanceiraChildTotalsStatusTone('success')
      setApuracaoFinanceiraChildTotalsStatusMessage('Valores aglutinados carregados a partir de Total Servicos, refletindo os filhos alimentados por Apontamento Servicos.')
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao consultar os valores aglutinados de Total Servicos.'
      const statusCode = error instanceof Error && typeof (error as Error & { statusCode?: number }).statusCode === 'number'
        ? (error as Error & { statusCode?: number }).statusCode
        : 500

      setApuracaoFinanceiraChildTotalsStatusTone(statusCode === 404 ? 'warning' : 'error')
      setApuracaoFinanceiraChildTotalsStatusMessage(message)
    } finally {
      setIsLoadingApuracaoFinanceiraChildTotals(false)
    }
  }, [])

  useEffect(() => {
    if (!isApuracaoFinanceiraFormVisible) {
      return
    }

    document.body.classList.add('management-modal-open')

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !(isSavingApuracaoFinanceira || isProcessingApuracaoFinanceira || isUpdatingApuracaoFinanceiraBatchStatus)) {
        handleCancelApuracaoFinanceiraForm()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.classList.remove('management-modal-open')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleCancelApuracaoFinanceiraForm, isApuracaoFinanceiraFormVisible, isProcessingApuracaoFinanceira, isSavingApuracaoFinanceira, isUpdatingApuracaoFinanceiraBatchStatus])

  useEffect(() => {
    if (!isAliquotaOptanteFormVisible) {
      return
    }

    document.body.classList.add('management-modal-open')

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSavingAliquotaOptante) {
        handleCancelAliquotaOptanteForm()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.classList.remove('management-modal-open')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleCancelAliquotaOptanteForm, isAliquotaOptanteFormVisible, isSavingAliquotaOptante])

  useEffect(() => {
    if (!isDiasLetivosFormVisible) {
      return
    }

    document.body.classList.add('management-modal-open')

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSavingDiasLetivos) {
        handleCancelDiasLetivosForm()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.classList.remove('management-modal-open')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleCancelDiasLetivosForm, isDiasLetivosFormVisible, isSavingDiasLetivos])

  useEffect(() => {
    if (!isModalidadeFormVisible) {
      return
    }

    document.body.classList.add('management-modal-open')

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSavingModalidade) {
        handleCancelModalidadeForm()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.classList.remove('management-modal-open')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleCancelModalidadeForm, isModalidadeFormVisible, isSavingModalidade])

  useEffect(() => {
    if (!isTipoBancadaFormVisible) {
      return
    }

    document.body.classList.add('management-modal-open')

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSavingTipoBancada) {
        handleCancelTipoBancadaForm()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.classList.remove('management-modal-open')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleCancelTipoBancadaForm, isSavingTipoBancada, isTipoBancadaFormVisible])

  useEffect(() => {
    if (!isTipoPgtoFormVisible) {
      return
    }

    document.body.classList.add('management-modal-open')

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSavingTipoPgto) {
        handleCancelTipoPgtoForm()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.classList.remove('management-modal-open')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleCancelTipoPgtoForm, isSavingTipoPgto, isTipoPgtoFormVisible])

  useEffect(() => {
    if (!isTipoEscolaFormVisible) {
      return
    }

    document.body.classList.add('management-modal-open')

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSavingTipoEscola) {
        handleCancelTipoEscolaForm()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.classList.remove('management-modal-open')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleCancelTipoEscolaForm, isSavingTipoEscola, isTipoEscolaFormVisible])

  useEffect(() => {
    if (!isCondicaoFormVisible) {
      return
    }

    document.body.classList.add('management-modal-open')

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSavingCondicao) {
        handleCancelCondicaoForm()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.classList.remove('management-modal-open')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleCancelCondicaoForm, isCondicaoFormVisible, isSavingCondicao])

  const handleCreateDre = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (dreFormMode === 'view') {
      setDreStatusTone('idle')
      setDreStatusMessage('Consulta em modo somente leitura.')
      return
    }

    if (dreFormMode === 'edit' && !hasDreEditFormAccess) {
      setDreStatusTone('warning')
      setDreStatusMessage('Usuario sem permissao de alteracao para o formulario DRE.')
      return
    }

    const normalizedSigla = normalizeDreSiglaInput(dreSigla)
    const normalizedDescricao = dreDescricao.trim()
    const editingCodigo = editingDreCodigo
    let hasError = false

    setDreSiglaError('')
    setDreDescricaoError('')

    if (normalizedSigla.length !== 2) {
      setDreSiglaError('Sigla deve conter 2 letras maiusculas.')
      hasError = true
    }

    if (!normalizedDescricao) {
      setDreDescricaoError('Descricao e obrigatoria.')
      hasError = true
    }

    if (hasError) {
      setDreStatusTone('error')
      setDreStatusMessage('Corrija os campos da DRE para continuar.')
      return
    }

    setIsSavingDre(true)
    setDreStatusTone('idle')
    setDreStatusMessage(editingCodigo ? 'Alterando registro da DRE...' : 'Gravando registro da DRE...')

    try {
      const savedItem = editingCodigo
        ? await updateDreItem(editingCodigo, {
            sigla: normalizedSigla,
            descricao: normalizedDescricao,
          })
        : await createDreItem({
            sigla: normalizedSigla,
            descricao: normalizedDescricao,
          })

      void savedItem
      resetDreForm()
      setIsDreFormVisible(false)
      setDreStatusTone('success')
      setDreStatusMessage(editingCodigo ? 'Registro da DRE alterado com sucesso.' : 'Registro da DRE cadastrado com sucesso.')
      await loadDreItems(editingCodigo ? drePage : 1)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao cadastrar registro da DRE.'

      setDreStatusTone('error')
      setDreStatusMessage(message)
    } finally {
      setIsSavingDre(false)
    }
  }

  const handleCreateModalidade = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (modalidadeFormMode === 'view') {
      setModalidadeStatusTone('idle')
      setModalidadeStatusMessage('Consulta em modo somente leitura.')
      return
    }

    const normalizedDescricao = modalidadeDescricao.trim()
    const editingCodigo = editingModalidadeCodigo
    let hasError = false

    setModalidadeDescricaoError('')

    if (!normalizedDescricao) {
      setModalidadeDescricaoError('Descricao e obrigatoria.')
      hasError = true
    }

    if (hasError) {
      setModalidadeStatusTone('error')
      setModalidadeStatusMessage('Corrija os campos da modalidade para continuar.')
      return
    }

    setIsSavingModalidade(true)
    setModalidadeStatusTone('idle')
    setModalidadeStatusMessage(editingCodigo ? 'Alterando registro da modalidade...' : 'Gravando registro da modalidade...')

    try {
      const savedItem = editingCodigo
        ? await updateModalidadeItem(editingCodigo, {
            descricao: normalizedDescricao,
          })
        : await createModalidadeItem({
            descricao: normalizedDescricao,
          })

      void savedItem
      resetModalidadeForm()
      setIsModalidadeFormVisible(false)
      setModalidadeStatusTone('success')
      setModalidadeStatusMessage(editingCodigo ? 'Registro da modalidade alterado com sucesso.' : 'Registro da modalidade cadastrado com sucesso.')
      await loadModalidadeItems(editingCodigo ? modalidadePage : 1)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao cadastrar registro da modalidade.'

      setModalidadeStatusTone('error')
      setModalidadeStatusMessage(message)
    } finally {
      setIsSavingModalidade(false)
    }
  }

  const handleCreateCondicao = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (condicaoFormMode === 'view') {
      setCondicaoStatusTone('idle')
      setCondicaoStatusMessage('Consulta em modo somente leitura.')
      return
    }

    const normalizedDescricao = condicaoDescricao.trim()
    const normalizedQtdeIni = condicaoQtdeIni.trim()
    const normalizedQtdeFim = condicaoQtdeFim.trim()
    const editingCodigo = editingCondicaoCodigo
    let hasError = false

    setCondicaoDescricaoError('')
    setCondicaoQtdeIniError('')
    setCondicaoQtdeFimError('')

    if (!normalizedDescricao) {
      setCondicaoDescricaoError('Descricao e obrigatoria.')
      hasError = true
    }

    if (!/^\d+$/.test(normalizedQtdeIni)) {
      setCondicaoQtdeIniError('Qtde inicial deve ser um numero inteiro maior ou igual a zero.')
      hasError = true
    }

    if (!/^\d+$/.test(normalizedQtdeFim)) {
      setCondicaoQtdeFimError('Qtde final deve ser um numero inteiro maior ou igual a zero.')
      hasError = true
    }

    const parsedQtdeIni = /^\d+$/.test(normalizedQtdeIni) ? Number(normalizedQtdeIni) : Number.NaN
    const parsedQtdeFim = /^\d+$/.test(normalizedQtdeFim) ? Number(normalizedQtdeFim) : Number.NaN

    if (!Number.isNaN(parsedQtdeIni) && !Number.isNaN(parsedQtdeFim) && parsedQtdeFim < parsedQtdeIni) {
      setCondicaoQtdeFimError('Qtde final deve ser maior ou igual a qtde inicial.')
      hasError = true
    }

    if (hasError) {
      setCondicaoStatusTone('error')
      setCondicaoStatusMessage('Corrija os campos da condicao para continuar.')
      return
    }

    setIsSavingCondicao(true)
    setCondicaoStatusTone('idle')
    setCondicaoStatusMessage(editingCodigo ? 'Alterando registro da condicao...' : 'Gravando registro da condicao...')

    try {
      const savedItem = editingCodigo
        ? await updateCondicaoItem(editingCodigo, {
            descricao: normalizedDescricao,
            qtdeIni: parsedQtdeIni,
            qtdeFim: parsedQtdeFim,
          })
        : await createCondicaoItem({
            descricao: normalizedDescricao,
            qtdeIni: parsedQtdeIni,
            qtdeFim: parsedQtdeFim,
          })

      void savedItem
      resetCondicaoForm()
      setIsCondicaoFormVisible(false)
      setCondicaoStatusTone('success')
      setCondicaoStatusMessage(editingCodigo ? 'Registro da condicao alterado com sucesso.' : 'Registro da condicao cadastrado com sucesso.')
      await loadCondicaoItems(editingCodigo ? condicaoPage : 1)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao cadastrar registro da condicao.'

      setCondicaoStatusTone('error')
      setCondicaoStatusMessage(message)
    } finally {
      setIsSavingCondicao(false)
    }
  }

  const handleCreateTipoBancada = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (tipoBancadaFormMode === 'view') {
      setTipoBancadaStatusTone('idle')
      setTipoBancadaStatusMessage('Consulta em modo somente leitura.')
      return
    }

    const normalizedDescricao = tipoBancadaDescricao.trim()
    const editingCodigo = editingTipoBancadaCodigo
    let hasError = false

    setTipoBancadaDescricaoError('')

    if (!normalizedDescricao) {
      setTipoBancadaDescricaoError('Descricao e obrigatoria.')
      hasError = true
    }

    if (hasError) {
      setTipoBancadaStatusTone('error')
      setTipoBancadaStatusMessage('Corrija os campos do tipo de bancada para continuar.')
      return
    }

    setIsSavingTipoBancada(true)
    setTipoBancadaStatusTone('idle')
    setTipoBancadaStatusMessage(editingCodigo ? 'Alterando registro do tipo de bancada...' : 'Gravando registro do tipo de bancada...')

    try {
      const savedItem = editingCodigo
        ? await updateTipoBancadaItem(editingCodigo, {
            descricao: normalizedDescricao,
          })
        : await createTipoBancadaItem({
            descricao: normalizedDescricao,
          })

      void savedItem
      resetTipoBancadaForm()
      setIsTipoBancadaFormVisible(false)
      setTipoBancadaStatusTone('success')
      setTipoBancadaStatusMessage(editingCodigo ? 'Registro do tipo de bancada alterado com sucesso.' : 'Registro do tipo de bancada cadastrado com sucesso.')
      await loadTipoBancadaItems(editingCodigo ? tipoBancadaPage : 1)
      await Promise.all([
        loadAssociationOptions(),
        loadTipoBancadaAssociationItems(),
      ])
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao cadastrar registro do tipo de bancada.'

      setTipoBancadaStatusTone('error')
      setTipoBancadaStatusMessage(message)
    } finally {
      setIsSavingTipoBancada(false)
    }
  }

  const handleCreateTipoPgto = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (tipoPgtoFormMode === 'view') {
      setTipoPgtoStatusTone('idle')
      setTipoPgtoStatusMessage('Consulta em modo somente leitura.')
      return
    }

    const normalizedDescricao = tipoPgtoDescricao.trim()
    const editingCodigo = editingTipoPgtoCodigo
    let hasError = false

    setTipoPgtoDescricaoError('')

    if (!normalizedDescricao) {
      setTipoPgtoDescricaoError('Descricao e obrigatoria.')
      hasError = true
    }

    if (hasError) {
      setTipoPgtoStatusTone('error')
      setTipoPgtoStatusMessage('Corrija os campos do tipo de pagamento para continuar.')
      return
    }

    setIsSavingTipoPgto(true)
    setTipoPgtoStatusTone('idle')
    setTipoPgtoStatusMessage(editingCodigo ? 'Alterando registro do tipo de pagamento...' : 'Gravando registro do tipo de pagamento...')

    try {
      const savedItem = editingCodigo
        ? await updateTipoPgtoItem(editingCodigo, {
            descricao: normalizedDescricao,
          })
        : await createTipoPgtoItem({
            descricao: normalizedDescricao,
          })

      void savedItem
      resetTipoPgtoForm()
      setIsTipoPgtoFormVisible(false)
      setTipoPgtoStatusTone('success')
      setTipoPgtoStatusMessage(editingCodigo ? 'Registro do tipo de pagamento alterado com sucesso.' : 'Registro do tipo de pagamento cadastrado com sucesso.')
      await loadTipoPgtoItems(editingCodigo ? tipoPgtoPage : 1)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao cadastrar registro do tipo de pagamento.'

      setTipoPgtoStatusTone('error')
      setTipoPgtoStatusMessage(message)
    } finally {
      setIsSavingTipoPgto(false)
    }
  }

  const handleCreateTipoEscola = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (tipoEscolaFormMode === 'view') {
      setTipoEscolaStatusTone('idle')
      setTipoEscolaStatusMessage('Consulta em modo somente leitura.')
      return
    }

    const normalizedSigla = tipoEscolaSigla.trim().toUpperCase()
    const normalizedDescricao = tipoEscolaDescricao.trim()
    const editingCodigo = editingTipoEscolaCodigo
    let hasError = false

    setTipoEscolaSiglaError('')
    setTipoEscolaDescricaoError('')

    if (!normalizedSigla) {
      setTipoEscolaSiglaError('Sigla e obrigatoria.')
      hasError = true
    }

    if (!normalizedDescricao) {
      setTipoEscolaDescricaoError('Nome do tipo de escola e obrigatorio.')
      hasError = true
    }

    if (hasError) {
      setTipoEscolaStatusTone('error')
      setTipoEscolaStatusMessage('Corrija os campos do tipo de escola para continuar.')
      return
    }

    setIsSavingTipoEscola(true)
    setTipoEscolaStatusTone('idle')
    setTipoEscolaStatusMessage(editingCodigo ? 'Alterando registro do tipo de escola...' : 'Gravando registro do tipo de escola...')

    try {
      const savedItem = editingCodigo
        ? await updateTipoEscolaItem(editingCodigo, {
            sigla: normalizedSigla,
            descricao: normalizedDescricao,
          })
        : await createTipoEscolaItem({
            sigla: normalizedSigla,
            descricao: normalizedDescricao,
          })

      void savedItem
      resetTipoEscolaForm()
      setIsTipoEscolaFormVisible(false)
      setTipoEscolaStatusTone('success')
      setTipoEscolaStatusMessage(editingCodigo ? 'Registro do tipo de escola alterado com sucesso.' : 'Registro do tipo de escola cadastrado com sucesso.')
      await loadTipoEscolaItems(editingCodigo ? tipoEscolaPage : 1)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao cadastrar registro do tipo de escola.'

      setTipoEscolaStatusTone('error')
      setTipoEscolaStatusMessage(message)
    } finally {
      setIsSavingTipoEscola(false)
    }
  }

  const handleCreateAliquotaOptante = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (aliquotaOptanteFormMode === 'view') {
      setAliquotaOptanteStatusTone('idle')
      setAliquotaOptanteStatusMessage('Consulta em modo somente leitura.')
      return
    }

    const normalizedData = aliquotaOptanteData.trim()
    const normalizedAliquota = aliquotaOptanteValor.trim().replace(',', '.')
  const editingKey = editingAliquotaOptanteKey
    let hasError = false

    setAliquotaOptanteDataError('')
    setAliquotaOptanteTipoEmpresaError('')
    setAliquotaOptanteValorError('')

    if (!normalizedData) {
      setAliquotaOptanteDataError('Data e obrigatoria.')
      hasError = true
    }

    if (!ALIQUOTA_OPTANTE_TIPO_EMPRESA_OPTIONS.includes(aliquotaOptanteTipoEmpresa)) {
      setAliquotaOptanteTipoEmpresaError('Tipo empresa e obrigatorio.')
      hasError = true
    }

    if (!normalizedAliquota || Number.isNaN(Number(normalizedAliquota))) {
      setAliquotaOptanteValorError('Aliquota e obrigatoria.')
      hasError = true
    }

    if (hasError) {
      setAliquotaOptanteStatusTone('error')
      setAliquotaOptanteStatusMessage('Corrija os campos de aliquota optante para continuar.')
      return
    }

    setIsSavingAliquotaOptante(true)
    setAliquotaOptanteStatusTone('idle')
    setAliquotaOptanteStatusMessage(editingKey ? 'Alterando registro de aliquota optante...' : 'Gravando registro de aliquota optante...')

    try {
      const savedItem = editingKey
        ? await updateAliquotaOptanteItem(editingKey, {
            data: normalizedData,
            tipoEmpresa: aliquotaOptanteTipoEmpresa,
            aliquota: normalizedAliquota,
          })
        : await createAliquotaOptanteItem({
            data: normalizedData,
            tipoEmpresa: aliquotaOptanteTipoEmpresa,
            aliquota: normalizedAliquota,
          })

      void savedItem
      resetAliquotaOptanteForm()
      setIsAliquotaOptanteFormVisible(false)
      setAliquotaOptanteStatusTone('success')
      setAliquotaOptanteStatusMessage(editingKey ? 'Registro de aliquota optante alterado com sucesso.' : 'Registro de aliquota optante cadastrado com sucesso.')
      await loadAliquotaOptanteItems(editingKey ? aliquotaOptantePage : 1)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao cadastrar registro de aliquota optante.'

      setAliquotaOptanteStatusTone('error')
      setAliquotaOptanteStatusMessage(message)
    } finally {
      setIsSavingAliquotaOptante(false)
    }
  }

  const handleCreateDiasLetivos = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (diasLetivosFormMode === 'view') {
      setDiasLetivosStatusTone('idle')
      setDiasLetivosStatusMessage('Consulta em modo somente leitura.')
      return
    }

    const normalizedData = normalizeMonthYearInput(diasLetivosData.trim())
    const normalizedQuantidade = diasLetivosQuantidade.trim()
    const parsedQuantidade = Number.parseInt(normalizedQuantidade, 10)
    const editingData = editingDiasLetivosData
    let hasError = false

    setDiasLetivosDataError('')
    setDiasLetivosQuantidadeError('')

    if (!normalizedData) {
      setDiasLetivosDataError('Competencia e obrigatoria.')
      hasError = true
    } else if (!isValidMonthYear(normalizedData)) {
      setDiasLetivosDataError('Competencia deve estar no formato MM/AAAA.')
      hasError = true
    }

    if (!normalizedQuantidade || !Number.isInteger(parsedQuantidade) || parsedQuantidade < 0) {
      setDiasLetivosQuantidadeError('Dias letivos deve ser um numero inteiro maior ou igual a zero.')
      hasError = true
    }

    if (hasError) {
      setDiasLetivosStatusTone('error')
      setDiasLetivosStatusMessage('Corrija os campos de dias letivos para continuar.')
      return
    }

    setIsSavingDiasLetivos(true)
    setDiasLetivosStatusTone('idle')
    setDiasLetivosStatusMessage(editingData ? 'Alterando registro de dias letivos...' : 'Gravando registro de dias letivos...')

    try {
      const savedItem = editingData
        ? await updateDiasLetivosItem(editingData, {
            data: normalizedData,
            diasLetivos: String(parsedQuantidade),
          })
        : await createDiasLetivosItem({
            data: normalizedData,
            diasLetivos: String(parsedQuantidade),
          })

      void savedItem
      resetDiasLetivosForm()
      setIsDiasLetivosFormVisible(false)
      setDiasLetivosStatusTone('success')
      setDiasLetivosStatusMessage(editingData ? 'Registro de dias letivos alterado com sucesso.' : 'Registro de dias letivos cadastrado com sucesso.')
      await loadDiasLetivosItems(editingData ? diasLetivosPage : 1)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao cadastrar registro de dias letivos.'

      setDiasLetivosStatusTone('error')
      setDiasLetivosStatusMessage(message)
    } finally {
      setIsSavingDiasLetivos(false)
    }
  }

  const validateApuracaoFinanceiraSubmission = (options?: {
    allowTodosInEdit?: boolean
  }) => {
    const allowTodosInEdit = options?.allowTodosInEdit ?? false

    if (apuracaoFinanceiraFormMode === 'view') {
      setApuracaoFinanceiraStatusTone('idle')
      setApuracaoFinanceiraStatusMessage('Consulta em modo somente leitura.')
      return null
    }

    const normalizedMesAno = normalizeMonthYearInput(apuracaoFinanceiraMesAno)
    const normalizedSelectedDreCodigos = [...new Set(apuracaoFinanceiraSelectedDreCodigos)]
    const normalizedRevisao = Number.parseInt(apuracaoFinanceiraRevisao.trim(), 10)
    const editingKey = editingApuracaoFinanceiraKey
    let hasError = false

    setApuracaoFinanceiraMesAnoError('')
    setApuracaoFinanceiraDreCodigoError('')
    setApuracaoFinanceiraSelectedDresError('')
    setApuracaoFinanceiraRevisaoError('')
    setApuracaoFinanceiraTipoPessoaError('')

    if (!isValidMonthYear(normalizedMesAno)) {
      setApuracaoFinanceiraMesAnoError('Mes/ano invalido. Use o formato mm/aaaa.')
      hasError = true
    }

    if (normalizedSelectedDreCodigos.length === 0) {
      setApuracaoFinanceiraSelectedDresError('DRE devera ser selecionada.')
      hasError = true
    }

    if (!Number.isInteger(normalizedRevisao) || normalizedRevisao < 0) {
      setApuracaoFinanceiraRevisaoError('Revisao deve ser um numero inteiro maior ou igual a zero.')
      hasError = true
    }

    if (!APURACAO_FINANCEIRA_TIPO_PESSOA_FORM_OPTIONS.some((item) => item.value === apuracaoFinanceiraTipoPessoa)) {
      setApuracaoFinanceiraTipoPessoaError('Tipo pessoa invalido.')
      hasError = true
    }

    if (editingKey && apuracaoFinanceiraTipoPessoa === 'TODOS' && !allowTodosInEdit) {
      setApuracaoFinanceiraTipoPessoaError('Selecione PF ou PJ/Cooperativa para alterar um registro existente.')
      hasError = true
    }

    if (!APURACAO_FINANCEIRA_STATUS_OPTIONS.includes(apuracaoFinanceiraSituacao)) {
      hasError = true
    }

    if (hasError) {
      setApuracaoFinanceiraStatusTone('error')
      setApuracaoFinanceiraStatusMessage('Corrija os campos da apuracao financeira para continuar.')
      return null
    }

    return {
      editingKey,
      normalizedMesAno,
      normalizedDreCodigo: editingKey
        ? (normalizedSelectedDreCodigos.includes(editingKey.dreCodigo) ? editingKey.dreCodigo : normalizedSelectedDreCodigos[0] ?? '')
        : '',
      normalizedSelectedDreCodigos,
      normalizedRevisao,
      normalizedTipoPessoas: apuracaoFinanceiraTipoPessoa === 'TODOS'
        ? APURACAO_TIPO_PESSOA_OPTIONS.map((item) => item.value)
        : [apuracaoFinanceiraTipoPessoa],
    }
  }

  const validateApuracaoFinanceiraBatchStatusSubmission = () => {
    if (apuracaoFinanceiraFormMode === 'view') {
      setApuracaoFinanceiraStatusTone('idle')
      setApuracaoFinanceiraStatusMessage('Consulta em modo somente leitura.')
      return null
    }

    const normalizedMesAno = normalizeMonthYearInput(apuracaoFinanceiraMesAno)
    const normalizedSelectedDreCodigos = [...new Set(apuracaoFinanceiraSelectedDreCodigos)]
    let hasError = false

    setApuracaoFinanceiraMesAnoError('')
    setApuracaoFinanceiraDreCodigoError('')
    setApuracaoFinanceiraSelectedDresError('')
    setApuracaoFinanceiraRevisaoError('')
    setApuracaoFinanceiraTipoPessoaError('')

    if (!isValidMonthYear(normalizedMesAno)) {
      setApuracaoFinanceiraMesAnoError('Mes/ano invalido. Use o formato mm/aaaa.')
      hasError = true
    }

    if (normalizedSelectedDreCodigos.length === 0) {
      setApuracaoFinanceiraSelectedDresError('DRE devera ser selecionada.')
      hasError = true
    }

    if (!APURACAO_FINANCEIRA_TIPO_PESSOA_FORM_OPTIONS.some((item) => item.value === apuracaoFinanceiraTipoPessoa)) {
      setApuracaoFinanceiraTipoPessoaError('Tipo pessoa invalido.')
      hasError = true
    }

    if (!APURACAO_FINANCEIRA_STATUS_OPTIONS.includes(apuracaoFinanceiraSituacao)) {
      hasError = true
    }

    if (hasError) {
      setApuracaoFinanceiraStatusTone('error')
      setApuracaoFinanceiraStatusMessage('Corrija os campos da apuracao financeira para continuar.')
      return null
    }

    return {
      normalizedMesAno,
      normalizedSelectedDreCodigos,
      normalizedTipoPessoas: apuracaoFinanceiraTipoPessoa === 'TODOS'
        ? APURACAO_TIPO_PESSOA_OPTIONS.map((item) => item.value)
        : [apuracaoFinanceiraTipoPessoa],
      situacao: apuracaoFinanceiraSituacao,
    }
  }

  const validateApuracaoFinanceiraPreviousRevision = useCallback(async (options: {
    mesAno: string
    revisao: number
    dreCodigos: string[]
    tipoPessoas: ApuracaoTipoPessoa[]
  }) => {
    if (options.revisao <= 0) {
      return true
    }

    const previousRevision = options.revisao - 1

    for (const tipoPessoa of options.tipoPessoas) {
      for (const dreCodigo of options.dreCodigos) {
        const result = await listApuracaoFinanceiraItemsPaginated({
          mesAno: options.mesAno,
          dreCodigo,
          revisao: previousRevision,
          tipoPessoa,
          page: 1,
          pageSize: 1,
        })

        const previousItem = result.items[0]

        if (!previousItem || previousItem.situacao !== 'Concluido') {
          const dreOption = apuracaoFinanceiraDreOptions.find((item) => item.codigo === dreCodigo)
          const dreLabel = dreOption ? formatApuracaoFinanceiraDreShortLabel(dreOption) : dreCodigo
          setApuracaoFinanceiraStatusTone('warning')
          setApuracaoFinanceiraStatusMessage(`A revisao anterior numero ${previousRevision} nao foi concluida para a DRE ${dreLabel}.`)
          return false
        }
      }
    }

    return true
  }, [apuracaoFinanceiraDreOptions])

  const handleProcessApuracaoFinanceira = async () => {
    const submission = validateApuracaoFinanceiraSubmission({ allowTodosInEdit: true })

    if (!submission) {
      return
    }

    const previousRevisionIsValid = await validateApuracaoFinanceiraPreviousRevision({
      mesAno: submission.normalizedMesAno,
      revisao: submission.normalizedRevisao,
      dreCodigos: submission.normalizedSelectedDreCodigos,
      tipoPessoas: submission.normalizedTipoPessoas,
    })

    if (!previousRevisionIsValid) {
      return
    }

    setIsProcessingApuracaoFinanceira(true)
    setApuracaoFinanceiraStatusTone('idle')
    setApuracaoFinanceiraStatusMessage(
      submission.editingKey
        ? 'Reprocessando dados da apuracao financeira...'
        : 'Processando dados da apuracao financeira...',
    )

    try {
      const summaries: ApuracaoFinanceiraProcessResult[] = []

      for (const tipoPessoa of submission.normalizedTipoPessoas) {
        const summary = await processApuracaoFinanceiraData({
          mesAno: submission.normalizedMesAno,
          revisao: submission.normalizedRevisao,
          tipoPessoa,
          situacao: apuracaoFinanceiraSituacao,
          dreCodigos: submission.normalizedSelectedDreCodigos,
          replaceExistingDreCodigos: submission.editingKey ? submission.normalizedSelectedDreCodigos : undefined,
          replaceExistingTipoPessoa: submission.editingKey ? tipoPessoa : undefined,
        }, {
          name: session?.displayName ?? null,
          email: session?.email ?? null,
        })

        summaries.push(summary)
      }

      const summary = summaries.reduce<ApuracaoFinanceiraProcessResult>((accumulator, current) => ({
        ...accumulator,
        totalTipoEscola: accumulator.totalTipoEscola + current.totalTipoEscola,
        totalActiveOrdemServicos: accumulator.totalActiveOrdemServicos + current.totalActiveOrdemServicos,
        totalCreatedApuracaoServicos: accumulator.totalCreatedApuracaoServicos + current.totalCreatedApuracaoServicos,
        totalExistingApuracaoServicos: accumulator.totalExistingApuracaoServicos + current.totalExistingApuracaoServicos,
        processedDres: [...accumulator.processedDres, ...current.processedDres],
      }), {
        ...summaries[0],
        totalProcessedDres: submission.normalizedSelectedDreCodigos.length,
        totalTipoEscola: 0,
        totalActiveOrdemServicos: 0,
        totalCreatedApuracaoServicos: 0,
        totalExistingApuracaoServicos: 0,
        processedDres: [],
      })
      const processedDresMessage = summary.processedDres
        .map((item) => `${item.dreSigla || item.dreCodigo} / ${formatApuracaoTipoPessoaLabel(item.tipoPessoa)}: ${item.createdApuracaoServicosCount}`)
        .join('; ')
      const successMessage = submission.editingKey
        ? `${summary.totalProcessedDres} DRE(s) reprocessadas, registros anteriores removidos e ${summary.totalCreatedApuracaoServicos} registro(s) recalculado(s) em Total Servicos. Inclusoes por DRE/pessoa: ${processedDresMessage || 'nenhuma'}.`
        : `${summary.totalProcessedDres} DRE(s) processadas, ${summary.totalActiveOrdemServicos} OS ativa(s) e ${summary.totalCreatedApuracaoServicos} registro(s) novo(s) em Total Servicos. Inclusoes por DRE/pessoa: ${processedDresMessage || 'nenhuma'}.`

      resetApuracaoFinanceiraForm()
      setIsApuracaoFinanceiraFormVisible(false)
      setApuracaoFinanceiraStatusTone('success')
      setApuracaoFinanceiraStatusMessage(successMessage)
      await loadApuracaoFinanceiraItems(1, { preserveStatusMessage: true })
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao processar dados da apuracao financeira.'
      const statusCode = error instanceof Error && typeof (error as Error & { statusCode?: number }).statusCode === 'number'
        ? (error as Error & { statusCode?: number }).statusCode
        : null

      setApuracaoFinanceiraStatusTone(statusCode === 409 ? 'warning' : 'error')
      setApuracaoFinanceiraStatusMessage(message)
    } finally {
      setIsProcessingApuracaoFinanceira(false)
    }
  }

  const handleBatchStatusUpdateApuracaoFinanceira = async () => {
    const submission = validateApuracaoFinanceiraBatchStatusSubmission()

    if (!submission) {
      return
    }

    const confirmed = window.confirm(
      `Alterar a situacao dos registros filtrados para ${submission.situacao}?`,
    )

    if (!confirmed) {
      return
    }

    setIsUpdatingApuracaoFinanceiraBatchStatus(true)
    setApuracaoFinanceiraStatusTone('idle')
    setApuracaoFinanceiraStatusMessage('Atualizando situacao da apuracao financeira em lote...')

    try {
      const pageSize = 50
      const allItems: ApuracaoFinanceiraItem[] = []

      for (const tipoPessoa of submission.normalizedTipoPessoas) {
        for (const dreCodigo of submission.normalizedSelectedDreCodigos) {
          let currentPage = 1
          let totalPages = 1

          do {
            const result = await listApuracaoFinanceiraItemsPaginated({
              mesAno: submission.normalizedMesAno,
              dreCodigo,
              tipoPessoa,
              page: currentPage,
              pageSize,
            })

            allItems.push(...result.items)
            totalPages = result.totalPages
            currentPage += 1
          } while (currentPage <= totalPages)
        }
      }

      const uniqueItems = Array.from(new Map(allItems.map((item) => [formatApuracaoFinanceiraKey(item), item])).values())

      if (uniqueItems.length === 0) {
        setApuracaoFinanceiraStatusTone('warning')
        setApuracaoFinanceiraStatusMessage('Nenhum registro de apuracao financeira foi encontrado para os filtros informados.')
        return
      }

      const itemsToUpdate = uniqueItems.filter((item) => item.situacao !== submission.situacao)

      const results = await Promise.allSettled(
        itemsToUpdate.map((item) => updateApuracaoFinanceiraItem(
          {
            mesAno: item.mesAno,
            dreCodigo: item.dreCodigo,
            revisao: item.revisao,
            tipoPessoa: item.tipoPessoa,
          },
          {
            mesAno: item.mesAno,
            dreCodigo: item.dreCodigo,
            revisao: item.revisao,
            tipoPessoa: item.tipoPessoa,
            situacao: submission.situacao,
          },
        )),
      )

      const fulfilledResults = results.filter((result): result is PromiseFulfilledResult<ApuracaoFinanceiraItem> => result.status === 'fulfilled')
      const rejectedResults = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      const totalMatched = uniqueItems.length
      const totalUpdated = fulfilledResults.length
      const unchangedCount = totalMatched - itemsToUpdate.length
      const rejectedMessage = rejectedResults
        .map((result) => (result.reason instanceof Error ? result.reason.message : 'Falha ao alterar uma parte dos registros selecionados.'))
        .join(' ')
      const statusTone: StatusTone = rejectedResults.length > 0 || totalUpdated === 0 ? 'warning' : 'success'
      const successMessage = [
        `${totalUpdated} registro(s) alterado(s) para ${submission.situacao}.`,
        `${totalMatched} registro(s) localizado(s) para os filtros informados.`,
        unchangedCount > 0 ? `${unchangedCount} registro(s) ja estava(m) com essa situacao.` : '',
        rejectedMessage,
      ].filter(Boolean).join(' ')

      resetApuracaoFinanceiraForm()
      setIsApuracaoFinanceiraFormVisible(false)
      setApuracaoFinanceiraStatusTone(statusTone)
      setApuracaoFinanceiraStatusMessage(successMessage)
      await loadApuracaoFinanceiraItems(apuracaoFinanceiraPage, { preserveStatusMessage: true })
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao alterar a situacao em lote da apuracao financeira.'
      const statusCode = error instanceof Error && typeof (error as Error & { statusCode?: number }).statusCode === 'number'
        ? (error as Error & { statusCode?: number }).statusCode
        : null

      setApuracaoFinanceiraStatusTone(statusCode === 404 ? 'warning' : 'error')
      setApuracaoFinanceiraStatusMessage(message)
    } finally {
      setIsUpdatingApuracaoFinanceiraBatchStatus(false)
    }
  }

  const handleDeleteDre = async (item: DreItem) => {
    if (!hasDeleteFormPermission(appFormEditAccessKeys.dre)) {
      setDreStatusTone('warning')
      setDreStatusMessage(getFormDeletePermissionMessage('DRE'))
      return
    }

    const confirmed = window.confirm(`Excluir o registro ${item.codigo} - ${item.descricao}?`)

    if (!confirmed) {
      return
    }

    setIsDeletingDre(true)
    setDreStatusTone('idle')
    setDreStatusMessage(`Excluindo registro ${item.codigo}...`)

    try {
      const deletedCodigo = await deleteDreItem(item.codigo)
      setDreItems((currentItems) => currentItems.filter((currentItem) => currentItem.codigo !== deletedCodigo))

      if (editingDreCodigo === item.codigo) {
        resetDreForm()
        setIsDreFormVisible(false)
      }

      setDreStatusTone('success')
      setDreStatusMessage('Registro da DRE excluido com sucesso.')
      const nextPage = dreItems.length === 1 && drePage > 1 ? drePage - 1 : drePage
      await loadDreItems(nextPage)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao excluir registro da DRE.'

      setDreStatusTone('error')
      setDreStatusMessage(message)
    } finally {
      setIsDeletingDre(false)
    }
  }

  const handleDeleteModalidade = async (item: ModalidadeItem) => {
    if (!hasDeleteFormPermission(appFormEditAccessKeys.modalidade)) {
      setModalidadeStatusTone('warning')
      setModalidadeStatusMessage(getFormDeletePermissionMessage('Modalidade'))
      return
    }

    const confirmed = window.confirm(`Excluir o registro ${item.codigo} - ${item.descricao}?`)

    if (!confirmed) {
      return
    }

    setIsDeletingModalidade(true)
    setModalidadeStatusTone('idle')
    setModalidadeStatusMessage(`Excluindo registro ${item.codigo}...`)

    try {
      const deletedCodigo = await deleteModalidadeItem(item.codigo)
      setModalidadeItems((currentItems) => currentItems.filter((currentItem) => currentItem.codigo !== deletedCodigo))

      if (editingModalidadeCodigo === item.codigo) {
        resetModalidadeForm()
        setIsModalidadeFormVisible(false)
      }

      setModalidadeStatusTone('success')
      setModalidadeStatusMessage('Registro da modalidade excluido com sucesso.')
      const nextPage = modalidadeItems.length === 1 && modalidadePage > 1 ? modalidadePage - 1 : modalidadePage
      await loadModalidadeItems(nextPage)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao excluir registro da modalidade.'

      setModalidadeStatusTone('error')
      setModalidadeStatusMessage(message)
    } finally {
      setIsDeletingModalidade(false)
    }
  }

  const handleDeleteCondicao = async (item: CondicaoItem) => {
    if (!hasDeleteFormPermission(appFormEditAccessKeys.condicao)) {
      setCondicaoStatusTone('warning')
      setCondicaoStatusMessage(getFormDeletePermissionMessage('Condicao'))
      return
    }

    const confirmed = window.confirm(`Excluir o registro ${item.codigo} - ${item.descricao}?`)

    if (!confirmed) {
      return
    }

    setIsDeletingCondicao(true)
    setCondicaoStatusTone('idle')
    setCondicaoStatusMessage(`Excluindo registro ${item.codigo}...`)

    try {
      const deletedCodigo = await deleteCondicaoItem(item.codigo)
      setCondicaoItems((currentItems) => currentItems.filter((currentItem) => currentItem.codigo !== deletedCodigo))

      if (editingCondicaoCodigo === item.codigo) {
        resetCondicaoForm()
        setIsCondicaoFormVisible(false)
      }

      setCondicaoStatusTone('success')
      setCondicaoStatusMessage('Registro da condicao excluido com sucesso.')
      const nextPage = condicaoItems.length === 1 && condicaoPage > 1 ? condicaoPage - 1 : condicaoPage
      await loadCondicaoItems(nextPage)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao excluir registro da condicao.'

      setCondicaoStatusTone('error')
      setCondicaoStatusMessage(message)
    } finally {
      setIsDeletingCondicao(false)
    }
  }

  const handleDeleteTipoBancada = async (item: TipoBancadaItem) => {
    if (!hasDeleteFormPermission(appFormEditAccessKeys.tipoBancada)) {
      setTipoBancadaStatusTone('warning')
      setTipoBancadaStatusMessage(getFormDeletePermissionMessage('Tipo de Bancada'))
      return
    }

    const confirmed = window.confirm(`Excluir o registro ${item.codigo} - ${item.descricao}?`)

    if (!confirmed) {
      return
    }

    setIsDeletingTipoBancada(true)
    setTipoBancadaStatusTone('idle')
    setTipoBancadaStatusMessage(`Excluindo registro ${item.codigo}...`)

    try {
      const deletedCodigo = await deleteTipoBancadaItem(item.codigo)
      setTipoBancadaItems((currentItems) => currentItems.filter((currentItem) => currentItem.codigo !== deletedCodigo))

      if (editingTipoBancadaCodigo === item.codigo) {
        resetTipoBancadaForm()
        setIsTipoBancadaFormVisible(false)
      }

      setTipoBancadaStatusTone('success')
      setTipoBancadaStatusMessage('Registro do tipo de bancada excluido com sucesso.')
      const nextPage = tipoBancadaItems.length === 1 && tipoBancadaPage > 1 ? tipoBancadaPage - 1 : tipoBancadaPage
      await loadTipoBancadaItems(nextPage)
      await Promise.all([
        loadAssociationOptions(),
        loadTipoBancadaAssociationItems(),
      ])
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao excluir registro do tipo de bancada.'

      setTipoBancadaStatusTone('error')
      setTipoBancadaStatusMessage(message)
    } finally {
      setIsDeletingTipoBancada(false)
    }
  }

  const handleDeleteTipoPgto = async (item: TipoPgtoItem) => {
    if (!hasDeleteFormPermission(appFormEditAccessKeys.tipoPgto)) {
      setTipoPgtoStatusTone('warning')
      setTipoPgtoStatusMessage(getFormDeletePermissionMessage('Tipo de Pagamento'))
      return
    }

    const confirmed = window.confirm(`Excluir o registro ${item.codigo} - ${item.descricao}?`)

    if (!confirmed) {
      return
    }

    setIsDeletingTipoPgto(true)
    setTipoPgtoStatusTone('idle')
    setTipoPgtoStatusMessage(`Excluindo registro ${item.codigo}...`)

    try {
      const deletedCodigo = await deleteTipoPgtoItem(item.codigo)
      setTipoPgtoItems((currentItems) => currentItems.filter((currentItem) => currentItem.codigo !== deletedCodigo))

      if (editingTipoPgtoCodigo === item.codigo) {
        resetTipoPgtoForm()
        setIsTipoPgtoFormVisible(false)
      }

      setTipoPgtoStatusTone('success')
      setTipoPgtoStatusMessage('Registro do tipo de pagamento excluido com sucesso.')
      const nextPage = tipoPgtoItems.length === 1 && tipoPgtoPage > 1 ? tipoPgtoPage - 1 : tipoPgtoPage
      await loadTipoPgtoItems(nextPage)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao excluir registro do tipo de pagamento.'

      setTipoPgtoStatusTone('error')
      setTipoPgtoStatusMessage(message)
    } finally {
      setIsDeletingTipoPgto(false)
    }
  }

  const handleDeleteTipoEscola = async (item: TipoEscolaItem) => {
    if (!hasDeleteFormPermission(appFormEditAccessKeys.tipoEscola)) {
      setTipoEscolaStatusTone('warning')
      setTipoEscolaStatusMessage(getFormDeletePermissionMessage('Tipo Escola'))
      return
    }

    const confirmed = window.confirm(`Excluir o registro ${item.codigo} - ${item.descricao}?`)

    if (!confirmed) {
      return
    }

    setIsDeletingTipoEscola(true)
    setTipoEscolaStatusTone('idle')
    setTipoEscolaStatusMessage(`Excluindo registro ${item.codigo}...`)

    try {
      const deletedCodigo = await deleteTipoEscolaItem(item.codigo)
      setTipoEscolaItems((currentItems) => currentItems.filter((currentItem) => currentItem.codigo !== deletedCodigo))

      if (editingTipoEscolaCodigo === item.codigo) {
        resetTipoEscolaForm()
        setIsTipoEscolaFormVisible(false)
      }

      setTipoEscolaStatusTone('success')
      setTipoEscolaStatusMessage('Registro do tipo de escola excluido com sucesso.')
      const nextPage = tipoEscolaItems.length === 1 && tipoEscolaPage > 1 ? tipoEscolaPage - 1 : tipoEscolaPage
      await loadTipoEscolaItems(nextPage)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao excluir registro do tipo de escola.'

      setTipoEscolaStatusTone('error')
      setTipoEscolaStatusMessage(message)
    } finally {
      setIsDeletingTipoEscola(false)
    }
  }

  const handleDeleteAliquotaOptante = async (item: AliquotaOptanteItem) => {
    if (!hasDeleteFormPermission(appFormEditAccessKeys.aliquotaOptante)) {
      setAliquotaOptanteStatusTone('warning')
      setAliquotaOptanteStatusMessage(getFormDeletePermissionMessage('Aliquota Optante'))
      return
    }

    const confirmed = window.confirm(`Excluir o registro ${item.data} / ${item.tipoEmpresa}?`)

    if (!confirmed) {
      return
    }

    setIsDeletingAliquotaOptante(true)
    setAliquotaOptanteStatusTone('idle')
    setAliquotaOptanteStatusMessage(`Excluindo registro ${item.data} / ${item.tipoEmpresa}...`)

    try {
      const deletedKey = await deleteAliquotaOptanteItem({ data: item.data, tipoEmpresa: item.tipoEmpresa })
      setAliquotaOptanteItems((currentItems) => currentItems.filter((currentItem) => formatAliquotaOptanteKey(currentItem) !== formatAliquotaOptanteKey(deletedKey)))

      if (editingAliquotaOptanteKey && formatAliquotaOptanteKey(editingAliquotaOptanteKey) === formatAliquotaOptanteKey(item)) {
        resetAliquotaOptanteForm()
        setIsAliquotaOptanteFormVisible(false)
      }

      setAliquotaOptanteStatusTone('success')
      setAliquotaOptanteStatusMessage('Registro de aliquota optante excluido com sucesso.')
      const nextPage = aliquotaOptanteItems.length === 1 && aliquotaOptantePage > 1 ? aliquotaOptantePage - 1 : aliquotaOptantePage
      await loadAliquotaOptanteItems(nextPage)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao excluir registro de aliquota optante.'

      setAliquotaOptanteStatusTone('error')
      setAliquotaOptanteStatusMessage(message)
    } finally {
      setIsDeletingAliquotaOptante(false)
    }
  }

  const handleDeleteDiasLetivos = async (item: DiasLetivosItem) => {
    if (!hasDeleteFormPermission(appFormEditAccessKeys.diasLetivos)) {
      setDiasLetivosStatusTone('warning')
      setDiasLetivosStatusMessage(getFormDeletePermissionMessage('Dias Letivos'))
      return
    }

    const confirmed = window.confirm(`Excluir o registro ${item.data}?`)

    if (!confirmed) {
      return
    }

    setIsDeletingDiasLetivos(true)
    setDiasLetivosStatusTone('idle')
    setDiasLetivosStatusMessage(`Excluindo registro ${item.data}...`)

    try {
      const deletedData = await deleteDiasLetivosItem(item.data)
      setDiasLetivosItems((currentItems) => currentItems.filter((currentItem) => currentItem.data !== deletedData))

      if (editingDiasLetivosData === item.data) {
        resetDiasLetivosForm()
        setIsDiasLetivosFormVisible(false)
      }

      setDiasLetivosStatusTone('success')
      setDiasLetivosStatusMessage('Registro de dias letivos excluido com sucesso.')
      const nextPage = diasLetivosItems.length === 1 && diasLetivosPage > 1 ? diasLetivosPage - 1 : diasLetivosPage
      await loadDiasLetivosItems(nextPage)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao excluir registro de dias letivos.'

      setDiasLetivosStatusTone('error')
      setDiasLetivosStatusMessage(message)
    } finally {
      setIsDeletingDiasLetivos(false)
    }
  }

  const handleDeleteApuracaoFinanceira = async (row: ApuracaoFinanceiraGridRow) => {
    if (!hasDeleteFormPermission(appFormEditAccessKeys.apuracaoFinanceira)) {
      setApuracaoFinanceiraStatusTone('warning')
      setApuracaoFinanceiraStatusMessage(getFormDeletePermissionMessage('Apuracao Financeira'))
      return
    }

    if (row.representativeItem.situacao !== APURACAO_FINANCEIRA_DELETE_STATUS) {
      setApuracaoFinanceiraStatusTone('error')
      setApuracaoFinanceiraStatusMessage(`A exclusao so e permitida quando a situacao estiver ${APURACAO_FINANCEIRA_DELETE_STATUS}.`)
      return
    }

    const confirmed = window.confirm(`Excluir ${row.items.length} registro(s) do grupo ${row.representativeItem.mesAno} / ${row.dreText} / ${row.tipoPessoaLabel} / ${row.representativeItem.revisao} / ${row.representativeItem.dataReferencia || 'Sem data referencia'}?`)

    if (!confirmed) {
      return
    }

    setIsDeletingApuracaoFinanceira(true)
    setApuracaoFinanceiraStatusTone('idle')
    setApuracaoFinanceiraStatusMessage(`Excluindo ${row.items.length} registro(s) da apuracao financeira...`)

    try {
      const deleteResults = await Promise.allSettled(
        row.items.map((item) => deleteApuracaoFinanceiraItem({
          mesAno: item.mesAno,
          dreCodigo: item.dreCodigo,
          revisao: item.revisao,
          tipoPessoa: item.tipoPessoa,
        })),
      )
      const deletedKeys = deleteResults
        .filter((result): result is PromiseFulfilledResult<ApuracaoFinanceiraKey> => result.status === 'fulfilled')
        .map((result) => result.value)

      if (deletedKeys.length === 0) {
        throw new Error('Falha ao excluir registro da apuracao financeira.')
      }

      const deletedKeySet = new Set(deletedKeys.map((item) => formatApuracaoFinanceiraKey(item)))
      setApuracaoFinanceiraItems((currentItems) => currentItems.filter((currentItem) => !deletedKeySet.has(formatApuracaoFinanceiraKey(currentItem))))

      if (editingApuracaoFinanceiraKey && row.items.some((item) => formatApuracaoFinanceiraKey(editingApuracaoFinanceiraKey) === formatApuracaoFinanceiraKey(item))) {
        resetApuracaoFinanceiraForm()
        setIsApuracaoFinanceiraFormVisible(false)
      }

      setApuracaoFinanceiraStatusTone('success')
      setApuracaoFinanceiraStatusMessage(
        deletedKeys.length === row.items.length
          ? 'Registro da apuracao financeira excluido com sucesso.'
          : `${deletedKeys.length} registro(s) da apuracao financeira excluido(s) com sucesso.`,
      )
      const nextPage = apuracaoFinanceiraItems.length === 1 && apuracaoFinanceiraPage > 1 ? apuracaoFinanceiraPage - 1 : apuracaoFinanceiraPage
      await loadApuracaoFinanceiraItems(nextPage)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao excluir registro da apuracao financeira.'

      setApuracaoFinanceiraStatusTone('error')
      setApuracaoFinanceiraStatusMessage(message)
    } finally {
      setIsDeletingApuracaoFinanceira(false)
    }
  }

  const resetTitularForm = useCallback(() => {
    setTitularCnpjCpf('')
    setTitularNome('')
    setTitularCnpjCpfError('')
    setTitularNomeError('')
    setEditingTitularCodigo(null)
    setTitularFormMode('create')
  }, [])

  const handleStartInsertTitular = () => {
    resetTitularForm()
    setTitularFormMode('create')
    setTitularStatusTone('idle')
    setTitularStatusMessage('')
    setIsTitularFormVisible(true)
  }

  const handleFilterTitularSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTitularPage(1)
    setTitularStatusMessage('Aplicando filtro de titular do CRM...')
    setTitularStatusTone('idle')
  }

  const handleClearTitularFilter = () => {
    setTitularSearch('')
    setTitularPage(1)
  }

  const handleSortTitular = (field: TitularSortField) => {
    setTitularPage(1)
    setTitularSortBy((currentField) => {
      if (currentField === field) {
        setTitularSortDirection((currentDirection) => currentDirection === 'asc' ? 'desc' : 'asc')
        return currentField
      }

      setTitularSortDirection('asc')
      return field
    })
  }

  const getTitularSortIndicator = (field: TitularSortField) => {
    if (titularSortBy !== field) {
      return '↕'
    }

    return titularSortDirection === 'asc' ? '↑' : '↓'
  }

  const handleStartEditTitular = (item: TitularItem) => {
    if (!hasTitularEditFormAccess) {
      setTitularStatusTone('warning')
      setTitularStatusMessage(getFormEditPermissionMessage('Titular do CRM'))
      return
    }

    setEditingTitularCodigo(item.codigo)
    setTitularFormMode('edit')
    setTitularCnpjCpf(formatCpfOrCnpj(item.cnpj_cpf))
    setTitularNome(item.titular)
    setTitularCnpjCpfError('')
    setTitularNomeError('')
    setTitularStatusTone('idle')
    setTitularStatusMessage(`Alterando registro ${item.codigo}.`)
    setIsTitularFormVisible(true)
  }

  const handleStartViewTitular = (item: TitularItem) => {
    setEditingTitularCodigo(item.codigo)
    setTitularFormMode('view')
    setTitularCnpjCpf(formatCpfOrCnpj(item.cnpj_cpf))
    setTitularNome(item.titular)
    setTitularCnpjCpfError('')
    setTitularNomeError('')
    setTitularStatusTone('idle')
    setTitularStatusMessage(`Consulta do registro ${item.codigo}.`)
    setIsTitularFormVisible(true)
  }

  const handleCancelTitularForm = useCallback(() => {
    resetTitularForm()
    setIsTitularFormVisible(false)
    setTitularStatusTone('idle')
    setTitularStatusMessage('')
  }, [resetTitularForm])

  const handleCreateTitular = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (titularFormMode === 'view') {
      setTitularStatusTone('idle')
      setTitularStatusMessage('Consulta em modo somente leitura.')
      return
    }

    const normalizedCnpjCpf = titularCnpjCpf.trim()
    const normalizedTitular = titularNome.trim()
    const editingCodigo = editingTitularCodigo
    let hasError = false

    setTitularCnpjCpfError('')
    setTitularNomeError('')

    if (!normalizedCnpjCpf) {
      setTitularCnpjCpfError('CNPJ/CPF e obrigatorio.')
      hasError = true
    }

    if (!normalizedTitular) {
      setTitularNomeError('Titular do CRM e obrigatorio.')
      hasError = true
    }

    if (hasError) {
      setTitularStatusTone('error')
      setTitularStatusMessage('Corrija os campos de titular do CRM para continuar.')
      return
    }

    setIsSavingTitular(true)
    setTitularStatusTone('idle')
    setTitularStatusMessage(editingCodigo ? 'Alterando registro de titular do CRM...' : 'Gravando registro de titular do CRM...')

    try {
      const savedItem = editingCodigo
        ? await updateTitularItem(editingCodigo, {
            cnpj_cpf: normalizedCnpjCpf,
            titular: normalizedTitular,
          })
        : await createTitularItem({
            cnpj_cpf: normalizedCnpjCpf,
            titular: normalizedTitular,
          })

      void savedItem
      resetTitularForm()
      setIsTitularFormVisible(false)
      setTitularStatusTone('success')
      setTitularStatusMessage(editingCodigo ? 'Registro de titular do CRM alterado com sucesso.' : 'Registro de titular do CRM cadastrado com sucesso.')
      await loadTitularItems(editingCodigo ? titularPage : 1)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao cadastrar titular do CRM.'

      setTitularStatusTone('error')
      setTitularStatusMessage(message)
    } finally {
      setIsSavingTitular(false)
    }
  }

  const handleDeleteTitular = async (item: TitularItem) => {
    if (!hasDeleteFormPermission(appFormEditAccessKeys.titular)) {
      setTitularStatusTone('warning')
      setTitularStatusMessage(getFormDeletePermissionMessage('Titular do CRM'))
      return
    }

    const confirmed = window.confirm(`Excluir o registro ${item.codigo} - ${item.titular}?`)

    if (!confirmed) {
      return
    }

    setIsDeletingTitular(true)
    setTitularStatusTone('idle')
    setTitularStatusMessage(`Excluindo registro ${item.codigo}...`)

    try {
      const deletedCodigo = await deleteTitularItem(item.codigo)
      setTitularItems((currentItems) => currentItems.filter((currentItem) => currentItem.codigo !== deletedCodigo))

      if (editingTitularCodigo === item.codigo) {
        resetTitularForm()
        setIsTitularFormVisible(false)
      }

      setTitularStatusTone('success')
      setTitularStatusMessage('Registro de titular do CRM excluido com sucesso.')
      const nextPage = titularItems.length === 1 && titularPage > 1 ? titularPage - 1 : titularPage
      await loadTitularItems(nextPage)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao excluir titular do CRM.'

      setTitularStatusTone('error')
      setTitularStatusMessage(message)
    } finally {
      setIsDeletingTitular(false)
    }
  }

  const resetMarcaModeloForm = useCallback(() => {
    setMarcaModeloDescricao('')
    setMarcaModeloDescricaoError('')
    setEditingMarcaModeloCodigo(null)
    setMarcaModeloFormMode('create')
  }, [])

  const handleStartInsertMarcaModelo = () => {
    resetMarcaModeloForm()
    setMarcaModeloFormMode('create')
    setMarcaModeloStatusTone('idle')
    setMarcaModeloStatusMessage('')
    setIsMarcaModeloFormVisible(true)
  }

  const handleFilterMarcaModeloSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMarcaModeloPage(1)
    setMarcaModeloStatusMessage('Aplicando filtro de marca/modelo...')
    setMarcaModeloStatusTone('idle')
  }

  const handleClearMarcaModeloFilter = () => {
    setMarcaModeloSearch('')
    setMarcaModeloPage(1)
  }

  const handleSortMarcaModelo = (field: MarcaModeloSortField) => {
    setMarcaModeloPage(1)
    setMarcaModeloSortBy((currentField) => {
      if (currentField === field) {
        setMarcaModeloSortDirection((currentDirection) => currentDirection === 'asc' ? 'desc' : 'asc')
        return currentField
      }

      setMarcaModeloSortDirection('asc')
      return field
    })
  }

  const getMarcaModeloSortIndicator = (field: MarcaModeloSortField) => {
    if (marcaModeloSortBy !== field) {
      return '↕'
    }

    return marcaModeloSortDirection === 'asc' ? '↑' : '↓'
  }

  const handleStartEditMarcaModelo = (item: MarcaModeloItem) => {
    if (!hasMarcaModeloEditFormAccess) {
      setMarcaModeloStatusTone('warning')
      setMarcaModeloStatusMessage(getFormEditPermissionMessage('Marca/Modelo'))
      return
    }

    setEditingMarcaModeloCodigo(item.codigo)
    setMarcaModeloFormMode('edit')
    setMarcaModeloDescricao(item.descricao)
    setMarcaModeloDescricaoError('')
    setMarcaModeloStatusTone('idle')
    setMarcaModeloStatusMessage(`Alterando registro ${item.codigo}.`)
    setIsMarcaModeloFormVisible(true)
  }

  const handleStartViewMarcaModelo = (item: MarcaModeloItem) => {
    setEditingMarcaModeloCodigo(item.codigo)
    setMarcaModeloFormMode('view')
    setMarcaModeloDescricao(item.descricao)
    setMarcaModeloDescricaoError('')
    setMarcaModeloStatusTone('idle')
    setMarcaModeloStatusMessage(`Consulta do registro ${item.codigo}.`)
    setIsMarcaModeloFormVisible(true)
  }

  const handleCancelMarcaModeloForm = useCallback(() => {
    resetMarcaModeloForm()
    setIsMarcaModeloFormVisible(false)
    setMarcaModeloStatusTone('idle')
    setMarcaModeloStatusMessage('')
  }, [resetMarcaModeloForm])

  const handleCreateMarcaModelo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (marcaModeloFormMode === 'view') {
      setMarcaModeloStatusTone('idle')
      setMarcaModeloStatusMessage('Consulta em modo somente leitura.')
      return
    }

    const normalizedDescricao = marcaModeloDescricao.trim()
    const editingCodigo = editingMarcaModeloCodigo
    let hasError = false

    setMarcaModeloDescricaoError('')

    if (!normalizedDescricao) {
      setMarcaModeloDescricaoError('Descricao e obrigatoria.')
      hasError = true
    }

    if (hasError) {
      setMarcaModeloStatusTone('error')
      setMarcaModeloStatusMessage('Corrija os campos de marca/modelo para continuar.')
      return
    }

    setIsSavingMarcaModelo(true)
    setMarcaModeloStatusTone('idle')
    setMarcaModeloStatusMessage(editingCodigo ? 'Alterando registro de marca/modelo...' : 'Gravando registro de marca/modelo...')

    try {
      const savedItem = editingCodigo
        ? await updateMarcaModeloItem(editingCodigo, {
            descricao: normalizedDescricao,
          })
        : await createMarcaModeloItem({
            descricao: normalizedDescricao,
          })

      void savedItem
      resetMarcaModeloForm()
      setIsMarcaModeloFormVisible(false)
      setMarcaModeloStatusTone('success')
      setMarcaModeloStatusMessage(editingCodigo ? 'Registro de marca/modelo alterado com sucesso.' : 'Registro de marca/modelo cadastrado com sucesso.')
      await loadMarcaModeloItems(editingCodigo ? marcaModeloPage : 1)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao cadastrar registro de marca/modelo.'

      setMarcaModeloStatusTone('error')
      setMarcaModeloStatusMessage(message)
    } finally {
      setIsSavingMarcaModelo(false)
    }
  }

  const handleDeleteMarcaModelo = async (item: MarcaModeloItem) => {
    if (!hasDeleteFormPermission(appFormEditAccessKeys.marcaModelo)) {
      setMarcaModeloStatusTone('warning')
      setMarcaModeloStatusMessage(getFormDeletePermissionMessage('Marca/Modelo'))
      return
    }

    const confirmed = window.confirm(`Excluir o registro ${item.codigo} - ${item.descricao}?`)

    if (!confirmed) {
      return
    }

    setIsDeletingMarcaModelo(true)
    setMarcaModeloStatusTone('idle')
    setMarcaModeloStatusMessage(`Excluindo registro ${item.codigo}...`)

    try {
      const deletedCodigo = await deleteMarcaModeloItem(item.codigo)
      setMarcaModeloItems((currentItems) => currentItems.filter((currentItem) => currentItem.codigo !== deletedCodigo))

      if (editingMarcaModeloCodigo === item.codigo) {
        resetMarcaModeloForm()
        setIsMarcaModeloFormVisible(false)
      }

      setMarcaModeloStatusTone('success')
      setMarcaModeloStatusMessage('Registro de marca/modelo excluido com sucesso.')
      const nextPage = marcaModeloItems.length === 1 && marcaModeloPage > 1 ? marcaModeloPage - 1 : marcaModeloPage
      await loadMarcaModeloItems(nextPage)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao excluir registro de marca/modelo.'

      setMarcaModeloStatusTone('error')
      setMarcaModeloStatusMessage(message)
    } finally {
      setIsDeletingMarcaModelo(false)
    }
  }

  const resetSeguradoraForm = useCallback(() => {
    setSeguradoraControle('')
    setSeguradoraLista('')
    setSeguradoraControleError('')
    setSeguradoraListaError('')
    setEditingSeguradoraCodigo(null)
    setSeguradoraFormMode('create')
  }, [])

  const handleStartInsertSeguradora = () => {
    resetSeguradoraForm()
    setSeguradoraFormMode('create')
    setSeguradoraStatusTone('idle')
    setSeguradoraStatusMessage('')
    setIsSeguradoraFormVisible(true)
  }

  const handleFilterSeguradoraSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSeguradoraPage(1)
    setSeguradoraStatusMessage('Aplicando filtro de seguradoras...')
    setSeguradoraStatusTone('idle')
  }

  const handleClearSeguradoraFilter = () => {
    setSeguradoraSearch('')
    setSeguradoraPage(1)
  }

  const handleSortSeguradora = (field: SeguradoraSortField) => {
    setSeguradoraPage(1)
    setSeguradoraSortBy((currentField) => {
      if (currentField === field) {
        setSeguradoraSortDirection((currentDirection) => currentDirection === 'asc' ? 'desc' : 'asc')
        return currentField
      }

      setSeguradoraSortDirection('asc')
      return field
    })
  }

  const getSeguradoraSortIndicator = (field: SeguradoraSortField) => {
    if (seguradoraSortBy !== field) {
      return '↕'
    }

    return seguradoraSortDirection === 'asc' ? '↑' : '↓'
  }

  const handleStartEditSeguradora = (item: SeguradoraItem) => {
    if (!hasSeguradoraEditFormAccess) {
      setSeguradoraStatusTone('warning')
      setSeguradoraStatusMessage(getFormEditPermissionMessage('Seguradoras'))
      return
    }

    setEditingSeguradoraCodigo(item.codigo)
    setSeguradoraFormMode('edit')
    setSeguradoraControle(item.controle)
    setSeguradoraLista(item.descricao)
    setSeguradoraControleError('')
    setSeguradoraListaError('')
    setSeguradoraStatusTone('idle')
    setSeguradoraStatusMessage(`Alterando registro ${item.codigo}.`)
    setIsSeguradoraFormVisible(true)
  }

  const handleStartViewSeguradora = (item: SeguradoraItem) => {
    setEditingSeguradoraCodigo(item.codigo)
    setSeguradoraFormMode('view')
    setSeguradoraControle(item.controle)
    setSeguradoraLista(item.descricao)
    setSeguradoraControleError('')
    setSeguradoraListaError('')
    setSeguradoraStatusTone('idle')
    setSeguradoraStatusMessage(`Consulta do registro ${item.codigo}.`)
    setIsSeguradoraFormVisible(true)
  }

  const handleCancelSeguradoraForm = useCallback(() => {
    resetSeguradoraForm()
    setIsSeguradoraFormVisible(false)
    setSeguradoraStatusTone('idle')
    setSeguradoraStatusMessage('')
  }, [resetSeguradoraForm])

  useEffect(() => {
    const hasOpenManagementModal = isDreFormVisible
      || isModalidadeFormVisible
      || isTipoBancadaFormVisible
      || isTitularFormVisible
      || isMarcaModeloFormVisible
      || isSeguradoraFormVisible
      || isDashboardDrillDownVisible
      || isDashboardOsPopupVisible

    if (!hasOpenManagementModal) {
      document.body.classList.remove('management-modal-open')
      return
    }

    document.body.classList.add('management-modal-open')

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return
      }

      if (isDreFormVisible && !isSavingDre) {
        handleCancelDreForm()
        return
      }

      if (isModalidadeFormVisible && !isSavingModalidade) {
        handleCancelModalidadeForm()
        return
      }

      if (isTipoBancadaFormVisible && !isSavingTipoBancada) {
        handleCancelTipoBancadaForm()
        return
      }

      if (isTitularFormVisible && !isSavingTitular) {
        handleCancelTitularForm()
        return
      }

      if (isMarcaModeloFormVisible && !isSavingMarcaModelo) {
        handleCancelMarcaModeloForm()
        return
      }

      if (isSeguradoraFormVisible && !isSavingSeguradora) {
        handleCancelSeguradoraForm()
        return
      }

      if (isDashboardDrillDownVisible) {
        handleCloseDashboardDrillDown()
        return
      }

      if (isDashboardOsPopupVisible) {
        handleCloseDashboardOsPopup()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.classList.remove('management-modal-open')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    handleCancelDreForm,
    handleCancelMarcaModeloForm,
    handleCancelModalidadeForm,
    handleCancelSeguradoraForm,
    handleCancelTipoBancadaForm,
    handleCancelTitularForm,
    handleCloseDashboardDrillDown,
    handleCloseDashboardOsPopup,
    isDashboardDrillDownVisible,
    isDashboardOsPopupVisible,
    isDreFormVisible,
    isMarcaModeloFormVisible,
    isModalidadeFormVisible,
    isTipoBancadaFormVisible,
    isSavingDre,
    isSavingMarcaModelo,
    isSavingModalidade,
    isSavingSeguradora,
    isSavingTipoBancada,
    isSavingTitular,
    isSeguradoraFormVisible,
    isTitularFormVisible,
  ])

  const handleCreateSeguradora = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (seguradoraFormMode === 'view') {
      setSeguradoraStatusTone('idle')
      setSeguradoraStatusMessage('Consulta em modo somente leitura.')
      return
    }

    const editingCodigo = editingSeguradoraCodigo
    const normalizedControle = seguradoraControle.trim()
    const normalizedLista = seguradoraLista.trim()
    let hasError = false

    setSeguradoraControleError('')
    setSeguradoraListaError('')

    if (!normalizedControle) {
      setSeguradoraControleError('Controle e obrigatorio.')
      hasError = true
    }

    if (!normalizedLista) {
      setSeguradoraListaError('Descricao e obrigatoria.')
      hasError = true
    }

    if (hasError) {
      setSeguradoraStatusTone('error')
      setSeguradoraStatusMessage('Corrija os campos de seguradora para continuar.')
      return
    }

    setIsSavingSeguradora(true)
    setSeguradoraStatusTone('idle')
    setSeguradoraStatusMessage(editingCodigo ? 'Alterando registro de seguradora...' : 'Gravando registro de seguradora...')

    try {
      const savedItem = editingCodigo
        ? await updateSeguradoraItem(editingCodigo, {
            controle: normalizedControle,
            descricao: normalizedLista,
          })
        : await createSeguradoraItem({
            controle: normalizedControle,
            descricao: normalizedLista,
          })

      void savedItem
      resetSeguradoraForm()
      setIsSeguradoraFormVisible(false)
      setSeguradoraStatusTone('success')
      setSeguradoraStatusMessage(editingCodigo ? 'Registro de seguradora alterado com sucesso.' : 'Registro de seguradora cadastrado com sucesso.')
      await loadSeguradoraItems(editingCodigo ? seguradoraPage : 1)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao cadastrar registro de seguradora.'

      setSeguradoraStatusTone('error')
      setSeguradoraStatusMessage(message)
    } finally {
      setIsSavingSeguradora(false)
    }
  }

  const handleDeleteSeguradora = async (item: SeguradoraItem) => {
    if (!hasDeleteFormPermission(appFormEditAccessKeys.seguradora)) {
      setSeguradoraStatusTone('warning')
      setSeguradoraStatusMessage(getFormDeletePermissionMessage('Seguradoras'))
      return
    }

    const confirmed = window.confirm(`Excluir o registro ${item.codigo} - ${item.descricao}?`)

    if (!confirmed) {
      return
    }

    setIsDeletingSeguradora(true)
    setSeguradoraStatusTone('idle')
    setSeguradoraStatusMessage(`Excluindo registro ${item.codigo}...`)

    try {
      const deletedCodigo = await deleteSeguradoraItem(item.codigo)
      setSeguradoraItems((currentItems) => currentItems.filter((currentItem) => currentItem.codigo !== deletedCodigo))

      if (editingSeguradoraCodigo === item.codigo) {
        resetSeguradoraForm()
        setIsSeguradoraFormVisible(false)
      }

      setSeguradoraStatusTone('success')
      setSeguradoraStatusMessage('Registro de seguradora excluido com sucesso.')
      const nextPage = seguradoraItems.length === 1 && seguradoraPage > 1 ? seguradoraPage - 1 : seguradoraPage
      await loadSeguradoraItems(nextPage)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao excluir registro de seguradora.'

      setSeguradoraStatusTone('error')
      setSeguradoraStatusMessage(message)
    } finally {
      setIsDeletingSeguradora(false)
    }
  }

  useEffect(() => {
    const nextState = getDefaultCollapsedMenuGroups()

    for (const groupName of getExpandedGroupsForView(activeView)) {
      nextState[groupName] = false
    }

    setCollapsedMenuGroups(nextState)
  }, [activeView])

  if (!session) {
    return (
      <main className="login-page">
        <section className="login-panel" aria-labelledby="login-title">
          <div className="login-copy">
            <p className="login-kicker">TEG Cursor</p>
            {environmentName ? <p className="environment-pill environment-pill-login">{environmentName}</p> : null}
            <h1 id="login-title">Acesse o painel administrativo</h1>
            <p className="login-description">
              Informe email e senha para validar o acesso. Quando a autenticacao
              for aprovada, a aplicacao abre esta area administrativa.
            </p>
          </div>

          <form className="login-card" onSubmit={handleSubmit} noValidate>
            <label className="field-group" htmlFor="email">
              <span>Email</span>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="nome@empresa.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isSubmitting}
                aria-invalid={Boolean(emailError)}
                aria-describedby={emailError ? 'email-error' : undefined}
              />
              {emailError ? (
                <strong id="email-error" className="field-error">
                  {emailError}
                </strong>
              ) : null}
            </label>

            <label className="field-group" htmlFor="password">
              <span>Senha</span>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Digite sua senha"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isSubmitting}
                aria-invalid={Boolean(passwordError)}
                aria-describedby={passwordError ? 'password-error' : undefined}
              />
              {passwordError ? (
                <strong id="password-error" className="field-error">
                  {passwordError}
                </strong>
              ) : null}
            </label>

            <div className="button-row">
              <button type="submit" className="primary-button" disabled={isSubmitting}>
                {isSubmitting ? 'Confirmando...' : 'Confirmar'}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={handleCancel}
              >
                Cancelar
              </button>
            </div>

            <p className={`status-message status-${statusTone}`} aria-live="polite">
              {statusMessage}
            </p>

            <p className="auth-hint">
              Endpoint configurado por <strong>VITE_AUTH_URL</strong>.
            </p>
          </form>
        </section>
      </main>
    )
  }

  const canGoToPreviousDrePage = drePage > 1
  const canGoToNextDrePage = drePage < dreTotalPages
  const canGoToPreviousModalidadePage = modalidadePage > 1
  const canGoToNextModalidadePage = modalidadePage < modalidadeTotalPages
  const canGoToPreviousCondicaoPage = condicaoPage > 1
  const canGoToNextCondicaoPage = condicaoPage < condicaoTotalPages
  const canGoToPreviousTipoBancadaPage = tipoBancadaPage > 1
  const canGoToNextTipoBancadaPage = tipoBancadaPage < tipoBancadaTotalPages
  const canGoToPreviousTipoPgtoPage = tipoPgtoPage > 1
  const canGoToNextTipoPgtoPage = tipoPgtoPage < tipoPgtoTotalPages
  const canGoToPreviousTipoEscolaPage = tipoEscolaPage > 1
  const canGoToNextTipoEscolaPage = tipoEscolaPage < tipoEscolaTotalPages
  const canGoToPreviousAliquotaOptantePage = aliquotaOptantePage > 1
  const canGoToNextAliquotaOptantePage = aliquotaOptantePage < aliquotaOptanteTotalPages
  const canGoToPreviousDiasLetivosPage = diasLetivosPage > 1
  const canGoToNextDiasLetivosPage = diasLetivosPage < diasLetivosTotalPages
  const canGoToPreviousApuracaoFinanceiraPage = apuracaoFinanceiraPage > 1
  const canGoToNextApuracaoFinanceiraPage = apuracaoFinanceiraPage < apuracaoFinanceiraTotalPages
  const apuracaoFinanceiraGridRows = apuracaoFinanceiraItems.map<ApuracaoFinanceiraGridRow>((item) => ({
    key: formatApuracaoFinanceiraGridKey(item),
    representativeItem: item,
    items: [item],
    dreCodigos: [item.dreCodigo],
    dreText: formatApuracaoFinanceiraDreLabel(item),
    tipoPessoaFormValue: item.tipoPessoa,
    tipoPessoaLabel: formatApuracaoTipoPessoaLabel(item.tipoPessoa),
  }))
  const apuracaoFinanceiraSelectedDreDisplayValue = (() => {
    if (apuracaoFinanceiraSelectedDreCodigos.length > 0) {
      const selectedOptions = apuracaoFinanceiraDreOptions.filter((item) => apuracaoFinanceiraSelectedDreCodigos.includes(item.codigo))
      const activeCount = apuracaoFinanceiraGridActiveDreCounts[apuracaoFinanceiraMesAno] ?? 0

      if (activeCount > 0 && selectedOptions.length === activeCount) {
        return 'Todas'
      }

      if (selectedOptions.length > 0) {
        return selectedOptions.map((item) => formatApuracaoFinanceiraDreOptionLabel(item)).join(' / ')
      }
    }

    return formatApuracaoFinanceiraDreLabel({
      dreCodigo: apuracaoFinanceiraDreCodigo,
      dreSigla: apuracaoFinanceiraDreOptions.find((item) => item.codigo === apuracaoFinanceiraDreCodigo)?.sigla ?? '',
      dreDescricao: apuracaoFinanceiraDreOptions.find((item) => item.codigo === apuracaoFinanceiraDreCodigo)?.descricao ?? '',
    })
  })()
  const canGoToPreviousModalBancadaTpPagtoCondicaoPage = modalBancadaTpPagtoCondicaoPage > 1
  const canGoToNextModalBancadaTpPagtoCondicaoPage = modalBancadaTpPagtoCondicaoPage < modalBancadaTpPagtoCondicaoTotalPages
  const canGoToPreviousModalBancadaTpPagtoCondicaoValorPage = modalBancadaTpPagtoCondicaoValorPage > 1
  const canGoToNextModalBancadaTpPagtoCondicaoValorPage = modalBancadaTpPagtoCondicaoValorPage < modalBancadaTpPagtoCondicaoValorTotalPages
  const canGoToPreviousKmValorPage = kmValorPage > 1
  const canGoToNextKmValorPage = kmValorPage < kmValorTotalPages
  const canGoToPreviousContinuaValorPage = continuaValorPage > 1
  const canGoToNextContinuaValorPage = continuaValorPage < continuaValorTotalPages
  const canGoToPreviousParametroVeiculoPage = parametroVeiculoPage > 1
  const canGoToNextParametroVeiculoPage = parametroVeiculoPage < parametroVeiculoTotalPages
  const canGoToPreviousTitularPage = titularPage > 1
  const canGoToNextTitularPage = titularPage < titularTotalPages
  const canGoToPreviousMarcaModeloPage = marcaModeloPage > 1
  const canGoToNextMarcaModeloPage = marcaModeloPage < marcaModeloTotalPages
  const canGoToPreviousSeguradoraPage = seguradoraPage > 1
  const canGoToNextSeguradoraPage = seguradoraPage < seguradoraTotalPages
  const dashboardModalidades = dashboardData?.modalidades ?? []
  const dashboardRows = dashboardData?.rows ?? []
  const dashboardBancadaRows = dashboardBancadaData?.rows ?? []
  const dashboardBancadaLayout = dashboardBancadaData ? getDashboardBancadaLayout(dashboardBancadaData) : null
  const dashboardBancadaModalidades = dashboardBancadaLayout?.modalidades ?? []
  const dashboardBancadaMatrixRows = dashboardBancadaLayout?.matrixRows ?? []
  const dashboardBancadaTotalsByModalidade = dashboardBancadaLayout?.totalsByModalidade ?? {}
  const dashboardBancadaVisibleTiposByModalidade = dashboardBancadaLayout?.visibleTiposByModalidade ?? {}
  const normalizedDashboardDrillDownSearch = normalizeDashboardDrillDownSearchValue(deferredDashboardDrillDownSearch)
  const filteredDashboardDrillDownItems = (dashboardDrillDownData?.items ?? []).filter((item) => {
    if (!normalizedDashboardDrillDownSearch) {
      return true
    }

    const searchableValue = normalizeDashboardDrillDownSearchValue([
      item.codigo,
      item.termoAdesao,
      item.numOs,
      item.revisao,
      item.osConcat,
      item.credenciado,
      item.cnpjCpf,
      item.tipoPessoa,
      item.condutor,
      item.cpfCondutor,
      item.crm,
      item.veiculoPlacas,
      item.veiculoTipoDeBancada,
      item.situacao,
      item.modalidadeDescricao,
    ].join(' '))

    return searchableValue.includes(normalizedDashboardDrillDownSearch)
  })

  const handleOpenDashboardDrillDown = async ({
    dreCodigo,
    dreDescricao,
    modalidadeDescricao,
    tipoDeBancada,
    total,
  }: DashboardDrillDownContext) => {
    const requestedMonth = dashboardData?.requestedMonth ?? dashboardBancadaData?.requestedMonth ?? dashboardMonth

    if (!requestedMonth || total <= 0) {
      return
    }

    setIsDashboardDrillDownVisible(true)
    setIsLoadingDashboardDrillDown(true)
    setDashboardDrillDownContext({ dreCodigo, dreDescricao, modalidadeDescricao, tipoDeBancada, total })
    setDashboardDrillDownData(null)
    setDashboardDrillDownSearch('')
    setDashboardDrillDownStatusMessage('Carregando Ordens de Servico da celula selecionada...')

    try {
      const result = await getOrdemServicoDashboardAtivosDetalhes({
        month: requestedMonth,
        dreCodigo,
        modalidade: modalidadeDescricao || undefined,
        tipoDeBancada: tipoDeBancada || undefined,
      })

      setDashboardDrillDownData(result)
      setDashboardDrillDownStatusMessage(result.items.length ? '' : 'Nenhuma OrdemServico encontrada para a celula selecionada.')
    } catch (error) {
      setDashboardDrillDownStatusMessage(error instanceof Error ? error.message : 'Falha ao carregar o detalhe do dashboard.')
    } finally {
      setIsLoadingDashboardDrillDown(false)
    }
  }

  const renderDashboardValueButton = ({
    total,
    dreCodigo,
    dreDescricao,
    modalidadeDescricao,
    tipoDeBancada,
  }: DashboardDrillDownContext) => (
    <button
      type="button"
      className="dashboard-cell-button"
      onClick={() => {
        void handleOpenDashboardDrillDown({ total, dreCodigo, dreDescricao, modalidadeDescricao, tipoDeBancada })
      }}
      disabled={total <= 0}
      aria-label={tipoDeBancada
        ? `Abrir detalhe de ${total} ordens de servico em ${dreCodigo} - ${modalidadeDescricao} - ${tipoDeBancada}`
        : modalidadeDescricao
          ? `Abrir detalhe de ${total} ordens de servico em ${dreCodigo} - ${modalidadeDescricao}`
          : `Abrir detalhe de ${total} ordens de servico em ${dreCodigo}`}
    >
      {total}
    </button>
  )

  const handleOpenDashboardOsPopup = (codigo: string) => {
    const normalizedCodigo = codigo.trim()

    if (!normalizedCodigo) {
      return
    }

    const params = new URLSearchParams({
      popupMode: 'dashboard-ordem-servico',
      codigo: normalizedCodigo,
      mode: 'view',
    })

    setDashboardOsPopupUrl(`/src/ordemServico.html?${params.toString()}`)
    setIsDashboardOsPopupVisible(true)
  }

  const handleDashboardSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void loadDashboardAtivos(dashboardMonth)
  }

  const handleExportDashboardResumoExcel = () => {
    if (!dashboardData) {
      return
    }

    downloadTextFile(
      buildDashboardReportMarkup(dashboardData),
      `dashboard-ordem-servico-${dashboardData.requestedMonth}.xls`,
      'application/vnd.ms-excel;charset=utf-8',
    )
  }

  const handlePrintDashboardResumo = () => {
    if (!dashboardData) {
      return
    }

    const printWindow = window.open('', '_blank')

    if (!printWindow) {
      setDashboardStatusTone('error')
      setDashboardStatusMessage('Nao foi possivel abrir a janela de impressao.')
      return
    }

    printWindow.document.open()
    printWindow.document.write(buildDashboardReportMarkup(dashboardData, { autoPrint: true }))
    printWindow.document.close()
  }

  const handleExportDashboardBancadaExcel = () => {
    if (!dashboardBancadaData) {
      return
    }

    downloadTextFile(
      buildDashboardBancadaReportMarkup(dashboardBancadaData),
      `dashboard-ordem-servico-bancada-${dashboardBancadaData.requestedMonth}.xls`,
      'application/vnd.ms-excel;charset=utf-8',
    )
  }

  const handlePrintDashboardBancada = () => {
    if (!dashboardBancadaData) {
      return
    }

    const printWindow = window.open('', '_blank')

    if (!printWindow) {
      setDashboardStatusTone('error')
      setDashboardStatusMessage('Nao foi possivel abrir a janela de impressao.')
      return
    }

    printWindow.document.open()
    printWindow.document.write(buildDashboardBancadaReportMarkup(dashboardBancadaData, { autoPrint: true }))
    printWindow.document.close()
  }

  const toggleMenuGroup = (groupName: CollapsedMenuGroup) => {
    setCollapsedMenuGroups((current) => ({
      ...current,
      [groupName]: !current[groupName],
    }))
  }

  return (
    <div className="app-layout">
      <header className="navbar">
        <h1 className="navbar-title">
          Sistema TEG Cursor
        </h1>
        <button
          type="button"
          className="navbar-sidebar-toggle"
          onClick={() => setIsSidebarVisible((current) => !current)}
          aria-label={isSidebarVisible ? 'Recolher menu lateral' : 'Expandir menu lateral'}
          aria-expanded={isSidebarVisible}
          aria-controls="app-sidebar-menu"
        >
          {isSidebarVisible ? '◀' : '☰'}
        </button>
      </header>
      
      <main className={`dashboard-page ${isSidebarVisible ? '' : 'dashboard-page--sidebar-hidden'}`}>
        {isSidebarVisible && (
          <aside
            id="app-sidebar-menu"
            className="sidebar-menu"
            aria-label="Menu principal"
          >
            <div>
              <p className="sidebar-brand">SISTEMA TEG CURSOR</p>
              {environmentName ? <p className="environment-pill environment-pill-sidebar">{environmentName}</p> : null}
              <h1 className="sidebar-title">Menu TEG Cursor</h1>
            </div>

        <nav>
          <ul className="menu-list">
            {hasDashboardAccess ? <li
              className={`menu-item ${activeView === 'inicio' ? 'menu-item-active' : ''}`}
              onClick={() => setActiveView('inicio')}
            >
              Dashboard
            </li> : null}
            {hasOperationalAccess ? <li className="menu-group">
              <button
                type="button"
                className="menu-item menu-item-static menu-item-toggle"
                onClick={() => toggleMenuGroup('operacional')}
                aria-expanded={!collapsedMenuGroups.operacional}
              >
                <span>Operacional</span>
                <span className="menu-toggle-indicator" aria-hidden="true">{collapsedMenuGroups.operacional ? '▸' : '▾'}</span>
              </button>
              <ul className={`menu-sublist ${collapsedMenuGroups.operacional ? 'menu-sublist-hidden' : ''}`}>
                {hasOperationalAdministrativeAccess ? <li className="menu-group menu-subgroup">
                  <div
                    className={`menu-subitem menu-subitem-toggle ${activeView === 'titular' || activeView === 'condutor' || activeView === 'vinculoCondutor' || activeView === 'monitor' || activeView === 'vinculoMonitor' || activeView === 'credenciada' || activeView === 'credenciamentoTermo' || activeView === 'termoHistorico' || activeView === 'ordemServico' || activeView === 'ordemServicoHistorico' || activeView === 'veiculo' || activeView === 'veiculoHistorico' ? 'menu-subitem-active' : ''}`}
                    onClick={() => toggleMenuGroup('operacionalAdministrativo')}
                    role="button"
                    aria-expanded={!collapsedMenuGroups.operacionalAdministrativo}
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        toggleMenuGroup('operacionalAdministrativo')
                      }
                    }}
                  >
                    <span className="menu-subitem-label">Administrativo</span>
                    <span className="menu-toggle-indicator" aria-hidden="true">{collapsedMenuGroups.operacionalAdministrativo ? '▸' : '▾'}</span>
                  </div>
                  <ul className={`menu-sublist menu-sublist-nested ${collapsedMenuGroups.operacionalAdministrativo ? 'menu-sublist-hidden' : ''}`}>
                    {isViewAllowed('titular', menuPermissionKeys) ? <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'titular' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('titular')}
                    >
                      Titular do CRM
                    </li> : null}
                    {isViewAllowed('condutor', menuPermissionKeys) ? <li className="menu-group menu-subgroup">
                  <div
                    className={`menu-subitem menu-subitem-toggle ${activeView === 'condutor' ? 'menu-subitem-active' : ''}`}
                    onClick={() => toggleMenuGroup('condutor')}
                    role="button"
                    aria-expanded={!collapsedMenuGroups.condutor}
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        toggleMenuGroup('condutor')
                      }
                    }}
                  >
                    <span
                      className="menu-subitem-label"
                      onClick={(event) => {
                        event.stopPropagation()
                        setActiveView('condutor')
                      }}
                    >
                      Condutor
                    </span>
                    <span className="menu-toggle-indicator" aria-hidden="true">{collapsedMenuGroups.condutor ? '▸' : '▾'}</span>
                  </div>
                  <ul className={`menu-sublist menu-sublist-nested ${collapsedMenuGroups.condutor ? 'menu-sublist-hidden' : ''}`}>
                    {isViewAllowed('vinculoCondutor', menuPermissionKeys) ? <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'vinculoCondutor' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('vinculoCondutor')}
                    >
                      Vinculo Condutor
                    </li> : null}
                  </ul>
                </li> : null}
                    {isViewAllowed('monitor', menuPermissionKeys) ? <li className="menu-group menu-subgroup">
                  <div
                    className={`menu-subitem menu-subitem-toggle ${activeView === 'monitor' ? 'menu-subitem-active' : ''}`}
                    onClick={() => toggleMenuGroup('monitor')}
                    role="button"
                    aria-expanded={!collapsedMenuGroups.monitor}
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        toggleMenuGroup('monitor')
                      }
                    }}
                  >
                    <span
                      className="menu-subitem-label"
                      onClick={(event) => {
                        event.stopPropagation()
                        setActiveView('monitor')
                      }}
                    >
                      Monitor
                    </span>
                    <span className="menu-toggle-indicator" aria-hidden="true">{collapsedMenuGroups.monitor ? '▸' : '▾'}</span>
                  </div>
                  <ul className={`menu-sublist menu-sublist-nested ${collapsedMenuGroups.monitor ? 'menu-sublist-hidden' : ''}`}>
                    {isViewAllowed('vinculoMonitor', menuPermissionKeys) ? <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'vinculoMonitor' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('vinculoMonitor')}
                    >
                      Vinculo Monitor
                    </li> : null}
                  </ul>
                </li> : null}
                    {isViewAllowed('credenciada', menuPermissionKeys) ? <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'credenciada' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('credenciada')}
                    >
                      Credenciada
                    </li> : null}
                    {isViewAllowed('credenciamentoTermo', menuPermissionKeys) ? <li className="menu-group menu-subgroup">
                  <div
                    className={`menu-subitem menu-subitem-toggle ${activeView === 'credenciamentoTermo' || activeView === 'termoHistorico' ? 'menu-subitem-active' : ''}`}
                    onClick={() => toggleMenuGroup('termo')}
                    role="button"
                    aria-expanded={!collapsedMenuGroups.termo}
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        toggleMenuGroup('termo')
                      }
                    }}
                  >
                    <span
                      className="menu-subitem-label"
                      onClick={(event) => {
                        event.stopPropagation()
                        setActiveView('credenciamentoTermo')
                      }}
                    >
                      Termo
                    </span>
                    <span className="menu-toggle-indicator" aria-hidden="true">{collapsedMenuGroups.termo ? '▸' : '▾'}</span>
                  </div>
                  <ul className={`menu-sublist menu-sublist-nested ${collapsedMenuGroups.termo ? 'menu-sublist-hidden' : ''}`}>
                    {isViewAllowed('termoHistorico', menuPermissionKeys) ? <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'termoHistorico' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('termoHistorico')}
                    >
                      Historico Termo
                    </li> : null}
                  </ul>
                </li> : null}
                    {isViewAllowed('ordemServico', menuPermissionKeys) ? <li className="menu-group menu-subgroup">
                  <div
                    className={`menu-subitem menu-subitem-toggle ${activeView === 'ordemServico' || activeView === 'ordemServicoHistorico' ? 'menu-subitem-active' : ''}`}
                    onClick={() => toggleMenuGroup('ordemServico')}
                    role="button"
                    aria-expanded={!collapsedMenuGroups.ordemServico}
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        toggleMenuGroup('ordemServico')
                      }
                    }}
                  >
                    <span
                      className="menu-subitem-label"
                      onClick={(event) => {
                        event.stopPropagation()
                        setActiveView('ordemServico')
                      }}
                    >
                      Ordem de Servico
                    </span>
                    <span className="menu-toggle-indicator" aria-hidden="true">{collapsedMenuGroups.ordemServico ? '▸' : '▾'}</span>
                  </div>
                  <ul className={`menu-sublist menu-sublist-nested ${collapsedMenuGroups.ordemServico ? 'menu-sublist-hidden' : ''}`}>
                    {isViewAllowed('ordemServicoHistorico', menuPermissionKeys) ? <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'ordemServicoHistorico' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('ordemServicoHistorico')}
                    >
                      Historico Ordem de Servico
                    </li> : null}
                  </ul>
                </li> : null}
                    {isViewAllowed('veiculo', menuPermissionKeys) ? <li className="menu-group menu-subgroup">
                  <div
                    className={`menu-subitem menu-subitem-toggle ${activeView === 'veiculo' ? 'menu-subitem-active' : ''}`}
                    onClick={() => toggleMenuGroup('veiculo')}
                    role="button"
                    aria-expanded={!collapsedMenuGroups.veiculo}
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        toggleMenuGroup('veiculo')
                      }
                    }}
                  >
                    <span
                      className="menu-subitem-label"
                      onClick={(event) => {
                        event.stopPropagation()
                        setActiveView('veiculo')
                      }}
                    >
                      Veiculo
                    </span>
                    <span className="menu-toggle-indicator" aria-hidden="true">{collapsedMenuGroups.veiculo ? '▸' : '▾'}</span>
                  </div>
                  <ul className={`menu-sublist menu-sublist-nested ${collapsedMenuGroups.veiculo ? 'menu-sublist-hidden' : ''}`}>
                    {isViewAllowed('veiculoHistorico', menuPermissionKeys) ? <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'veiculoHistorico' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('veiculoHistorico')}
                    >
                      Historico Veiculo
                    </li> : null}
                  </ul>
                </li> : null}
                  </ul>
                </li> : null}
                {hasOperationalFinanceiroAccess ? <li className="menu-group menu-subgroup">
                  <div
                    className={`menu-subitem menu-subitem-toggle ${activeView === 'resumoFinanceiro' || activeView === 'apuracaoFinanceira' || activeView === 'apuracaoServicos' || activeView === 'apontamentoServicos' || activeView === 'remuneracaoServicos' ? 'menu-subitem-active' : ''}`}
                    onClick={() => toggleMenuGroup('operacionalFinanceiro')}
                    role="button"
                    aria-expanded={!collapsedMenuGroups.operacionalFinanceiro}
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        toggleMenuGroup('operacionalFinanceiro')
                      }
                    }}
                  >
                    <span className="menu-subitem-label">Financeiro</span>
                    <span className="menu-toggle-indicator" aria-hidden="true">{collapsedMenuGroups.operacionalFinanceiro ? '▸' : '▾'}</span>
                  </div>
                  <ul className={`menu-sublist menu-sublist-nested ${collapsedMenuGroups.operacionalFinanceiro ? 'menu-sublist-hidden' : ''}`}>
                    {isViewAllowed('resumoFinanceiro', menuPermissionKeys) ? <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'resumoFinanceiro' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('resumoFinanceiro')}
                    >
                      Resumo Financeiro
                    </li> : null}
                    {isViewAllowed('apuracaoFinanceira', menuPermissionKeys) || isViewAllowed('apuracaoServicos', menuPermissionKeys) ? <li className="menu-group menu-subgroup">
                      <div
                        className={`menu-subitem menu-subitem-toggle menu-subitem-nested ${activeView === 'apuracaoFinanceira' || activeView === 'apuracaoServicos' || activeView === 'apontamentoServicos' ? 'menu-subitem-active' : ''}`}
                        onClick={() => {
                          if (isViewAllowed('apuracaoFinanceira', menuPermissionKeys)) {
                            setActiveView('apuracaoFinanceira')
                          }
                          toggleMenuGroup('apuracaoFinanceira')
                        }}
                        role="button"
                        aria-expanded={!collapsedMenuGroups.apuracaoFinanceira}
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            if (isViewAllowed('apuracaoFinanceira', menuPermissionKeys)) {
                              setActiveView('apuracaoFinanceira')
                            }
                            toggleMenuGroup('apuracaoFinanceira')
                          }
                        }}
                      >
                        <span className="menu-subitem-label">Apuracao Financeira</span>
                        <span className="menu-toggle-indicator" aria-hidden="true">{collapsedMenuGroups.apuracaoFinanceira ? '▸' : '▾'}</span>
                      </div>
                      <ul className={`menu-sublist menu-sublist-nested ${collapsedMenuGroups.apuracaoFinanceira ? 'menu-sublist-hidden' : ''}`}>
                        {isViewAllowed('apuracaoServicos', menuPermissionKeys) ? <li className="menu-group menu-subgroup">
                          <div
                            className={`menu-subitem menu-subitem-toggle menu-subitem-nested ${activeView === 'apuracaoServicos' || activeView === 'apontamentoServicos' || activeView === 'remuneracaoServicos' ? 'menu-subitem-active' : ''}`}
                            onClick={() => {
                              setActiveView('apuracaoServicos')
                              toggleMenuGroup('apuracaoServicos')
                            }}
                            role="button"
                            aria-expanded={!collapsedMenuGroups.apuracaoServicos}
                            tabIndex={0}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                setActiveView('apuracaoServicos')
                                toggleMenuGroup('apuracaoServicos')
                              }
                            }}
                          >
                            <span className="menu-subitem-label">Total Servicos</span>
                            <span className="menu-toggle-indicator" aria-hidden="true">{collapsedMenuGroups.apuracaoServicos ? '▸' : '▾'}</span>
                          </div>
                          <ul className={`menu-sublist menu-sublist-nested ${collapsedMenuGroups.apuracaoServicos ? 'menu-sublist-hidden' : ''}`}>
                            {isViewAllowed('apontamentoServicos', menuPermissionKeys) ? <li
                              className={`menu-subitem menu-subitem-nested ${activeView === 'apontamentoServicos' ? 'menu-subitem-active' : ''}`}
                              onClick={() => setActiveView('apontamentoServicos')}
                            >
                              Apontamento Servicos
                            </li> : null}
                            {isViewAllowed('remuneracaoServicos', menuPermissionKeys) ? <li
                              className={`menu-subitem menu-subitem-nested ${activeView === 'remuneracaoServicos' ? 'menu-subitem-active' : ''}`}
                              onClick={() => setActiveView('remuneracaoServicos')}
                            >
                              Remuneracao Servicos
                            </li> : null}
                          </ul>
                        </li> : null}
                      </ul>
                    </li> : null}
                  </ul>
                </li> : null}
              </ul>
            </li> : null}
            {hasCadastroAccess ? <li className="menu-group">
              <button
                type="button"
                className="menu-item menu-item-static menu-item-toggle"
                onClick={() => toggleMenuGroup('cadastros')}
                aria-expanded={!collapsedMenuGroups.cadastros}
              >
                <span>Cadastros</span>
                <span className="menu-toggle-indicator" aria-hidden="true">{collapsedMenuGroups.cadastros ? '▸' : '▾'}</span>
              </button>
              <ul className={`menu-sublist ${collapsedMenuGroups.cadastros ? 'menu-sublist-hidden' : ''}`}>
                {hasCadastroOperationalAccess ? <li className="menu-group menu-subgroup">
                  <button
                    type="button"
                    className="menu-subitem menu-item-static menu-item-toggle"
                    onClick={() => toggleMenuGroup('cadastrosOperacional')}
                    aria-expanded={!collapsedMenuGroups.cadastrosOperacional}
                  >
                    <span>Operacional</span>
                    <span className="menu-toggle-indicator" aria-hidden="true">{collapsedMenuGroups.cadastrosOperacional ? '▸' : '▾'}</span>
                  </button>
                  <ul className={`menu-sublist menu-sublist-nested ${collapsedMenuGroups.cadastrosOperacional ? 'menu-sublist-hidden' : ''}`}>
                    {isViewAllowed('dre', menuPermissionKeys) ? <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'dre' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('dre')}
                    >
                      DRE
                    </li> : null}
                    {isViewAllowed('modalidade', menuPermissionKeys) ? <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'modalidade' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('modalidade')}
                    >
                      Modalidade
                    </li> : null}
                    {isViewAllowed('tipoBancada', menuPermissionKeys) ? <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'tipoBancada' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('tipoBancada')}
                    >
                      Tipo de Bancada
                    </li> : null}
                    {isViewAllowed('marcaModelo', menuPermissionKeys) ? <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'marcaModelo' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('marcaModelo')}
                    >
                      Marca/Modelo
                    </li> : null}
                    {isViewAllowed('seguradora', menuPermissionKeys) ? <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'seguradora' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('seguradora')}
                    >
                      Seguradoras
                    </li> : null}
                    {isViewAllowed('troca', menuPermissionKeys) ? <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'troca' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('troca')}
                    >
                      Tipo de Troca
                    </li> : null}
                    {isViewAllowed('emissaoDocumentoParametro', menuPermissionKeys) ? <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'emissaoDocumentoParametro' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('emissaoDocumentoParametro')}
                    >
                      Param. Emissao
                    </li> : null}
                    {isViewAllowed('cep', menuPermissionKeys) ? <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'cep' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('cep')}
                    >
                      CEP
                    </li> : null}
                  </ul>
                </li> : null}
                {hasCadastroFinanceiroAccess ? <li className="menu-group menu-subgroup">
                  <button
                    type="button"
                    className="menu-subitem menu-item-static menu-item-toggle"
                    onClick={() => toggleMenuGroup('cadastrosFinanceiro')}
                    aria-expanded={!collapsedMenuGroups.cadastrosFinanceiro}
                  >
                    <span>Financeiro</span>
                    <span className="menu-toggle-indicator" aria-hidden="true">{collapsedMenuGroups.cadastrosFinanceiro ? '▸' : '▾'}</span>
                  </button>
                  <ul className={`menu-sublist menu-sublist-nested ${collapsedMenuGroups.cadastrosFinanceiro ? 'menu-sublist-hidden' : ''}`}>
                    {isViewAllowed('condicao', menuPermissionKeys) ? <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'condicao' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('condicao')}
                    >
                      Condicao
                    </li> : null}
                    {isViewAllowed('modalBancadaTpPagtoCondicao', menuPermissionKeys) ? <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'modalBancadaTpPagtoCondicao' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('modalBancadaTpPagtoCondicao')}
                    >
                      Modalidade x Bancada x Pagamento x Condicao
                    </li> : null}
                    {isViewAllowed('modalBancadaTpPagtoCondicaoValor', menuPermissionKeys) ? <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'modalBancadaTpPagtoCondicaoValor' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('modalBancadaTpPagtoCondicaoValor')}
                    >
                      Modalidade x Bancada x Pagamento x Condicao Valor
                    </li> : null}
                    {isViewAllowed('kmValor', menuPermissionKeys) ? <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'kmValor' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('kmValor')}
                    >
                      Km_Valor
                    </li> : null}
                    {isViewAllowed('continuaValor', menuPermissionKeys) ? <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'continuaValor' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('continuaValor')}
                    >
                      Continua_Valor
                    </li> : null}
                    {isViewAllowed('parametroVeiculo', menuPermissionKeys) ? <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'parametroVeiculo' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('parametroVeiculo')}
                    >
                      Parametro Pgto Veiculo
                    </li> : null}
                    {isViewAllowed('tipoPgto', menuPermissionKeys) ? <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'tipoPgto' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('tipoPgto')}
                    >
                      Tipo de Pagamento
                    </li> : null}
                    {isViewAllowed('tipoEscola', menuPermissionKeys) ? <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'tipoEscola' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('tipoEscola')}
                    >
                      Tipo Escola
                    </li> : null}
                    {isViewAllowed('aliquotaOptante', menuPermissionKeys) ? <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'aliquotaOptante' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('aliquotaOptante')}
                    >
                      Aliquota Optante
                    </li> : null}
                    {isViewAllowed('diasLetivos', menuPermissionKeys) ? <li
                      className={`menu-subitem menu-subitem-nested ${activeView === 'diasLetivos' ? 'menu-subitem-active' : ''}`}
                      onClick={() => setActiveView('diasLetivos')}
                    >
                      Dias Letivos
                    </li> : null}
                  </ul>
                </li> : null}
              </ul>
            </li> : null}
            {hasMonitoringAccess ? <li className="menu-group">
              <button
                type="button"
                className={`menu-item menu-item-static menu-item-toggle ${['monitoramentoAmbiente', 'batchProcessMonitor', 'xmlImportLote', 'financeiroReprocessamento', 'smoke'].includes(activeView) ? 'menu-item-active' : ''}`}
                onClick={() => toggleMenuGroup('monitoramento')}
                aria-expanded={!collapsedMenuGroups.monitoramento}
              >
                <span>Monitoramento</span>
                <span className="menu-toggle-indicator" aria-hidden="true">{collapsedMenuGroups.monitoramento ? '▸' : '▾'}</span>
              </button>
              <ul className={`menu-sublist ${collapsedMenuGroups.monitoramento ? 'menu-sublist-hidden' : ''}`}>
                {isViewAllowed('monitoramentoAmbiente', menuPermissionKeys) ? <li
                  className={`menu-subitem ${activeView === 'monitoramentoAmbiente' ? 'menu-subitem-active' : ''}`}
                  onClick={() => setActiveView('monitoramentoAmbiente')}
                >
                  Tempo de Resposta Web/API/DB
                </li> : null}
                {isViewAllowed('batchProcessMonitor', menuPermissionKeys) ? <li
                  className={`menu-subitem ${activeView === 'batchProcessMonitor' ? 'menu-subitem-active' : ''}`}
                  onClick={() => setActiveView('batchProcessMonitor')}
                >
                  Monitor de Lotes
                </li> : null}
                {isViewAllowed('xmlImportLote', menuPermissionKeys) ? <li
                  className={`menu-subitem ${activeView === 'xmlImportLote' ? 'menu-subitem-active' : ''}`}
                  onClick={() => setActiveView('xmlImportLote')}
                >
                  Importacao Xml/Access em lote
                </li> : null}
                {isViewAllowed('financeiroReprocessamento', menuPermissionKeys) ? <li
                  className={`menu-subitem ${activeView === 'financeiroReprocessamento' ? 'menu-subitem-active' : ''}`}
                  onClick={() => setActiveView('financeiroReprocessamento')}
                >
                  Reprocessamento Valores
                </li> : null}
                {isViewAllowed('smoke', menuPermissionKeys) ? <li
                  className={`menu-subitem ${activeView === 'smoke' ? 'menu-subitem-active' : ''}`}
                  onClick={() => setActiveView('smoke')}
                >
                  Smoke Test
                </li> : null}
              </ul>
            </li> : null}
            {hasAccessManagementAccess ? <li className="menu-group">
              <div
                className={`menu-item menu-item-toggle ${['acesso', 'acessoPagina', 'perfil', 'perfilAcesso', 'loginDre'].includes(activeView) ? 'menu-item-active' : ''}`}
                onClick={() => toggleMenuGroup('acesso')}
                role="button"
                aria-expanded={!collapsedMenuGroups.acesso}
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    toggleMenuGroup('acesso')
                  }
                }}
              >
                <span
                  className="menu-subitem-label"
                  onClick={(event) => {
                    event.stopPropagation()
                    setActiveView('acesso')
                  }}
                >
                  Controle de acesso
                </span>
                <span className="menu-toggle-indicator" aria-hidden="true">{collapsedMenuGroups.acesso ? '▸' : '▾'}</span>
              </div>
              <ul className={`menu-sublist ${collapsedMenuGroups.acesso ? 'menu-sublist-hidden' : ''}`}>
                {isViewAllowed('acessoPagina', menuPermissionKeys) ? <li
                  className={`menu-subitem ${activeView === 'acessoPagina' ? 'menu-subitem-active' : ''}`}
                  onClick={() => setActiveView('acessoPagina')}
                >
                  Acesso Pagina
                </li> : null}
                {isViewAllowed('perfil', menuPermissionKeys) ? <li
                  className={`menu-subitem ${activeView === 'perfil' ? 'menu-subitem-active' : ''}`}
                  onClick={() => setActiveView('perfil')}
                >
                  Perfil
                </li> : null}
                {isViewAllowed('perfilAcesso', menuPermissionKeys) ? <li
                  className={`menu-subitem ${activeView === 'perfilAcesso' ? 'menu-subitem-active' : ''}`}
                  onClick={() => setActiveView('perfilAcesso')}
                >
                  PerfilAcesso
                </li> : null}
                {isViewAllowed('loginDre', menuPermissionKeys) ? <li
                  className={`menu-subitem ${activeView === 'loginDre' ? 'menu-subitem-active' : ''}`}
                  onClick={() => setActiveView('loginDre')}
                >
                  Login x DRE
                </li> : null}
              </ul>
            </li> : null}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <p>Usuario autenticado</p>
          <strong>{session.displayName}</strong>
          <button type="button" className="logout-button" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </aside>
        )}

      <section className="content-panel" aria-labelledby="content-title">
        {activeView === 'inicio' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Dashboard operacional</p>
              <h2 id="content-title">Ordens de Servico Ativas por Mês</h2>
              <p className="content-description">
                Consulte a quantidade de Ordens de Servico que ficaram ativas ao menos um dia no mês selecionado,
                agrupadas por DRE e modalidade.
              </p>
            </div>

            <div className="management-layout dashboard-layout">
              <div className="management-card dashboard-controls-card">
                <form className="dashboard-filter-form" onSubmit={handleDashboardSubmit}>
                  <label className="field-group dashboard-month-group" htmlFor="dashboard-month">
                    <span>Mes de referência</span>
                    <input
                      id="dashboard-month"
                      type="month"
                      value={dashboardMonth}
                      onChange={(event) => setDashboardMonth(event.target.value)}
                      max={getCurrentMonthInputValue()}
                    />
                  </label>

                  <div className="dashboard-filter-actions">
                    <button type="submit" className="primary-button" disabled={isLoadingDashboard || !dashboardMonth}>
                      {isLoadingDashboard ? 'Atualizando...' : 'Atualizar painel'}
                    </button>
                  </div>
                </form>

                <p className={`status-message status-${dashboardStatusTone}`} aria-live="polite">
                  {dashboardStatusMessage}
                </p>
              </div>

              <div className="dashboard-summary-grid">
                <article
                  className="dashboard-summary-card clickable dashboard-summary-card--positive"
                  role="button"
                  tabIndex={0}
                  onClick={handleOpenTermosGrid}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      handleOpenTermosGrid()
                    }
                  }}
                >
                  <span className="dashboard-summary-label">Termos ativos</span>
                  <strong className="dashboard-summary-value dashboard-summary-value--positive">{termoAtivosCount}</strong>
                </article>
                <article
                  className="dashboard-summary-card clickable dashboard-summary-card--negative"
                  role="button"
                  tabIndex={0}
                  onClick={handleOpenTermosGrid}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      handleOpenTermosGrid()
                    }
                  }}
                >
                  <span className="dashboard-summary-label">Termos rescindidos</span>
                  <strong className="dashboard-summary-value dashboard-summary-value--negative">{termoRescindidosCount}</strong>
                </article>
                <article
                  className="dashboard-summary-card clickable dashboard-summary-card--positive"
                  role="button"
                  tabIndex={0}
                  onClick={handleOpenOrdemServicoGrid}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      handleOpenOrdemServicoGrid()
                    }
                  }}
                >
                  <span className="dashboard-summary-label">OS ativas</span>
                  <strong className="dashboard-summary-value dashboard-summary-value--positive">{dashboardData?.totals.totalOverall ?? 0}</strong>
                </article>
                <article
                  className="dashboard-summary-card clickable dashboard-summary-card--negative"
                  role="button"
                  tabIndex={0}
                  onClick={handleOpenOrdemServicoGrid}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      handleOpenOrdemServicoGrid()
                    }
                  }}
                >
                  <span className="dashboard-summary-label">OS canceladas</span>
                  <strong className="dashboard-summary-value dashboard-summary-value--negative">{osCanceladasCount}</strong>
                </article>
                <article className="dashboard-summary-card dashboard-summary-card--positive">
                  <span className="dashboard-summary-label">DREs com atividade</span>
                  <strong className="dashboard-summary-value dashboard-summary-value--positive">{dashboardData?.totals.totalDres ?? 0}</strong>
                </article>
                <article className="dashboard-summary-card dashboard-summary-card--positive">
                  <span className="dashboard-summary-label">Modalidades no mes</span>
                  <strong className="dashboard-summary-value dashboard-summary-value--positive">{dashboardData?.totals.totalModalidades ?? 0}</strong>
                </article>
              </div>

              <div className="management-card dashboard-table-card">
                <button
                  type="button"
                  className="management-grid-header dashboard-grid-header dashboard-section-toggle"
                  onClick={() => setIsDashboardResumoExpanded((current) => !current)}
                  aria-expanded={isDashboardResumoExpanded}
                >
                  <h2>Distribuicao por DRE x Modalidade</h2>
                  <span className="dashboard-section-toggle-indicator" aria-hidden="true">{isDashboardResumoExpanded ? '▾' : '▸'}</span>
                </button>

                {isDashboardResumoExpanded ? (
                  <div className="dashboard-section-actions">
                    <button type="button" className="secondary-button" onClick={handleExportDashboardResumoExcel} disabled={isLoadingDashboard || !dashboardData}>
                      Exportar Excel
                    </button>
                    <button type="button" className="secondary-button" onClick={handlePrintDashboardResumo} disabled={isLoadingDashboard || !dashboardData}>
                      Imprimir relatorio
                    </button>
                  </div>
                ) : null}

                {isDashboardResumoExpanded && dashboardData ? (
                  <div className="dashboard-table-wrapper">
                    <table className="dre-table dashboard-table">
                      <thead>
                        <tr>
                          <th>DRE</th>
                          {dashboardModalidades.map((modalidade) => (
                            <th key={modalidade.descricao}>{modalidade.descricao}</th>
                          ))}
                          <th>Total Geral</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardRows.map((row) => (
                          <tr key={row.dreCodigo}>
                            <td>
                              <div className="dashboard-dre-cell">
                                <strong>{row.dreCodigo}</strong>
                                <span>{row.dreDescricao}</span>
                              </div>
                            </td>
                            {dashboardModalidades.map((modalidade) => (
                              <td key={`${row.dreCodigo}-${modalidade.descricao}`} className="dashboard-numeric-cell">
                                {renderDashboardValueButton({
                                  total: row.countsByModalidade[modalidade.descricao] ?? 0,
                                  dreCodigo: row.dreCodigo,
                                  dreDescricao: row.dreDescricao,
                                  modalidadeDescricao: modalidade.descricao,
                                })}
                              </td>
                            ))}
                            <td className="dashboard-total-cell">
                              {renderDashboardValueButton({
                                total: row.totalGeral,
                                dreCodigo: row.dreCodigo,
                                dreDescricao: row.dreDescricao,
                                modalidadeDescricao: '',
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <th>Total</th>
                          {dashboardModalidades.map((modalidade) => (
                            <th key={`total-${modalidade.descricao}`} className="dashboard-numeric-cell">
                              {modalidade.total}
                            </th>
                          ))}
                          <th className="dashboard-total-cell">{dashboardData.totals.totalOverall}</th>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : null}

                {isDashboardResumoExpanded && !isLoadingDashboard && dashboardData && dashboardRows.length === 0 ? (
                  <p className="management-empty-state">Nenhuma OrdemServico ativa encontrada para o mes selecionado.</p>
                ) : null}

                {isDashboardResumoExpanded && dashboardData ? (
                  <div className="dashboard-person-summary">
                    <div className="dashboard-person-summary-table">
                      <div className="dashboard-person-summary-row">
                        <span>PESSOA FISICA</span>
                        <strong>{dashboardData.personTypeTotals.pessoaFisica}</strong>
                      </div>
                      <div className="dashboard-person-summary-row">
                        <span>PESSOA JURIDICA</span>
                        <strong>{dashboardData.personTypeTotals.pessoaJuridica}</strong>
                      </div>
                      <div className="dashboard-person-summary-row">
                        <span>COOPERATIVA</span>
                        <strong>{dashboardData.personTypeTotals.cooperativa}</strong>
                      </div>
                    </div>

                    <div className="dashboard-generated-at">
                      <span>Data da geracao</span>
                      <strong>{formatDashboardGeneratedAt(dashboardData.generatedAt)}</strong>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="management-card dashboard-table-card">
                <button
                  type="button"
                  className="management-grid-header dashboard-grid-header dashboard-section-toggle"
                  onClick={() => setIsDashboardBancadaExpanded((current) => !current)}
                  aria-expanded={isDashboardBancadaExpanded}
                >
                  <h2>DRE x Modalidade x Tipo de Bancada</h2>
                  <span className="dashboard-section-toggle-indicator" aria-hidden="true">{isDashboardBancadaExpanded ? '▾' : '▸'}</span>
                </button>

                {isDashboardBancadaExpanded ? (
                  <div className="dashboard-section-actions">
                    <button type="button" className="secondary-button" onClick={handleExportDashboardBancadaExcel} disabled={isLoadingDashboard || !dashboardBancadaData}>
                      Exportar Excel
                    </button>
                    <button type="button" className="secondary-button" onClick={handlePrintDashboardBancada} disabled={isLoadingDashboard || !dashboardBancadaData}>
                      Imprimir relatorio
                    </button>
                  </div>
                ) : null}

                {isDashboardBancadaExpanded && dashboardBancadaData ? (
                  <div className="dashboard-table-wrapper">
                    <table className="dre-table dashboard-table dashboard-bancada-table">
                      <thead>
                        <tr>
                          <th rowSpan={2}>DRE</th>
                          {dashboardBancadaModalidades.map((modalidadeDescricao) => (
                            <th
                              key={modalidadeDescricao}
                              colSpan={dashboardBancadaVisibleTiposByModalidade[modalidadeDescricao]?.length ?? 0}
                              className="dashboard-bancada-group-header dashboard-bancada-group-divider"
                            >
                              {modalidadeDescricao}
                            </th>
                          ))}
                          <th rowSpan={2}>Total Geral</th>
                        </tr>
                        <tr>
                          {dashboardBancadaModalidades.map((modalidadeDescricao) => (
                            (dashboardBancadaVisibleTiposByModalidade[modalidadeDescricao] ?? []).map((tipoBancadaDescricao) => (
                              <th
                                key={`${modalidadeDescricao}-${tipoBancadaDescricao}`}
                                className={`dashboard-bancada-subheader ${tipoBancadaDescricao === (dashboardBancadaVisibleTiposByModalidade[modalidadeDescricao] ?? []).at(-1) ? 'dashboard-bancada-group-divider' : ''}`}
                              >
                                {tipoBancadaDescricao}
                              </th>
                            ))
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardBancadaMatrixRows.map((row) => (
                          <tr key={row.dreCodigo}>
                            <td>
                              <div className="dashboard-bancada-main-cell">
                                <strong>{row.dreCodigo}</strong>
                                <span>{row.dreDescricao}</span>
                              </div>
                            </td>
                            {dashboardBancadaModalidades.map((modalidadeDescricao) => (
                              (dashboardBancadaVisibleTiposByModalidade[modalidadeDescricao] ?? []).map((tipoBancadaDescricao) => (
                                <td
                                  key={`${row.dreCodigo}-${modalidadeDescricao}-${tipoBancadaDescricao}`}
                                  className={`dashboard-numeric-cell ${tipoBancadaDescricao === (dashboardBancadaVisibleTiposByModalidade[modalidadeDescricao] ?? []).at(-1) ? 'dashboard-bancada-group-divider' : ''}`}
                                >
                                  {renderDashboardValueButton({
                                    total: row.countsByModalidadeAndTipo[modalidadeDescricao]?.[tipoBancadaDescricao] ?? 0,
                                    dreCodigo: row.dreCodigo,
                                    dreDescricao: row.dreDescricao,
                                    modalidadeDescricao,
                                    tipoDeBancada: tipoBancadaDescricao,
                                  })}
                                </td>
                              ))
                            ))}
                            <td className="dashboard-total-cell">
                              {renderDashboardValueButton({
                                total: row.totalGeral,
                                dreCodigo: row.dreCodigo,
                                dreDescricao: row.dreDescricao,
                                modalidadeDescricao: '',
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <th>Total</th>
                          {dashboardBancadaModalidades.map((modalidadeDescricao) => (
                            (dashboardBancadaVisibleTiposByModalidade[modalidadeDescricao] ?? []).map((tipoBancadaDescricao) => (
                              <th
                                key={`total-${modalidadeDescricao}-${tipoBancadaDescricao}`}
                                className={`dashboard-numeric-cell ${tipoBancadaDescricao === (dashboardBancadaVisibleTiposByModalidade[modalidadeDescricao] ?? []).at(-1) ? 'dashboard-bancada-group-divider' : ''}`}
                              >
                                {dashboardBancadaTotalsByModalidade[modalidadeDescricao]?.countsByTipoBancada[tipoBancadaDescricao] ?? 0}
                              </th>
                            ))
                          ))}
                          <th className="dashboard-total-cell">{dashboardBancadaData.totals.totalOverall}</th>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : null}

                {isDashboardBancadaExpanded && !isLoadingDashboard && dashboardBancadaData && dashboardBancadaRows.length === 0 ? (
                  <p className="management-empty-state">Nenhuma OrdemServico ativa com veiculo relacionado foi encontrada para o mes selecionado.</p>
                ) : null}

                {isDashboardBancadaExpanded && dashboardData ? (
                  <div className="dashboard-person-summary">
                    <div className="dashboard-person-summary-table">
                      <div className="dashboard-person-summary-row">
                        <span>PESSOA FISICA</span>
                        <strong>{dashboardData.personTypeTotals.pessoaFisica}</strong>
                      </div>
                      <div className="dashboard-person-summary-row">
                        <span>PESSOA JURIDICA</span>
                        <strong>{dashboardData.personTypeTotals.pessoaJuridica}</strong>
                      </div>
                      <div className="dashboard-person-summary-row">
                        <span>COOPERATIVA</span>
                        <strong>{dashboardData.personTypeTotals.cooperativa}</strong>
                      </div>
                    </div>

                    <div className="dashboard-generated-at">
                      <span>Data da geracao</span>
                      <strong>{formatDashboardGeneratedAt(dashboardData.generatedAt)}</strong>
                    </div>
                  </div>
                ) : null}
              </div>
              {isDashboardDrillDownVisible ? (
                <div
                  className="management-modal-overlay"
                  role="presentation"
                  onClick={(event) => {
                    if (event.target === event.currentTarget) {
                      handleCloseDashboardDrillDown()
                    }
                  }}
                >
                  <div
                    className="management-modal-shell dashboard-drilldown-shell"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="dashboard-drilldown-title"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="management-card management-modal-form-card dashboard-drilldown-card">
                      <div className="management-modal-header">
                        <div>
                          <p className="management-modal-kicker">Dashboard OrdemServico - DASHDET001</p>
                          <h2 id="dashboard-drilldown-title">
                            {dashboardDrillDownContext
                              ? [
                                dashboardDrillDownContext.modalidadeDescricao || 'TOTAL GERAL',
                                dashboardDrillDownContext.dreCodigo,
                                dashboardDrillDownContext.tipoDeBancada || '',
                              ].filter(Boolean).join(' x ')
                              : 'Tipo de TEG x DRE'}
                          </h2>
                        </div>
                        <button
                          type="button"
                          className="secondary-button management-modal-close-button"
                          onClick={handleCloseDashboardDrillDown}
                          aria-label="Fechar detalhe do dashboard"
                        >
                          X
                        </button>
                      </div>

                      <p className="management-modal-subtitle">
                        {dashboardDrillDownContext
                          ? `${dashboardDrillDownContext.dreCodigo} - ${dashboardDrillDownContext.dreDescricao}${dashboardDrillDownContext.modalidadeDescricao ? ` | ${dashboardDrillDownContext.modalidadeDescricao}` : ' | Total Geral'}${dashboardDrillDownContext.tipoDeBancada ? ` | Bancada ${dashboardDrillDownContext.tipoDeBancada}` : ''}`
                          : 'Detalhamento das Ordens de Servico ativas.'}
                      </p>

                      <div className="dashboard-drilldown-toolbar">
                        <label className="field-group dashboard-drilldown-filter" htmlFor="dashboard-drilldown-search">
                          <span>Filtrar OS</span>
                          <input
                            id="dashboard-drilldown-search"
                            type="text"
                            placeholder="Buscar por OS, credenciada, condutor, CPF, CRM ou placa"
                            value={dashboardDrillDownSearch}
                            onChange={(event) => setDashboardDrillDownSearch(event.target.value)}
                            disabled={isLoadingDashboardDrillDown}
                          />
                        </label>

                        <div className="dashboard-drilldown-summary">
                          <strong>{filteredDashboardDrillDownItems.length}</strong>
                          <span>{filteredDashboardDrillDownItems.length === 1 ? 'registro visivel' : 'registros visiveis'}</span>
                        </div>
                      </div>

                      <p className={`status-message status-${dashboardDrillDownStatusMessage ? 'idle' : 'idle'}`} aria-live="polite">
                        {isLoadingDashboardDrillDown ? 'Carregando detalhe...' : dashboardDrillDownStatusMessage}
                      </p>

                      {!isLoadingDashboardDrillDown && dashboardDrillDownData ? (
                        <div className="dashboard-drilldown-table-wrapper">
                          <table className="dre-table dashboard-drilldown-table">
                            <thead>
                              <tr>
                                <th>OS</th>
                                <th>Credenciada</th>
                                <th>CRM / Placa</th>
                                <th className="dashboard-drilldown-actions-column">Ações</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredDashboardDrillDownItems.map((item: OrdemServicoDashboardDetailItem) => (
                                <tr key={item.codigo}>
                                  <td>
                                    <div className="dashboard-drilldown-os-cell">
                                      <strong>{item.osConcat || `${item.termoAdesao}/${item.numOs}`}</strong>
                                      <span>Cod. {item.codigo}{item.revisao ? ` | Rev. ${item.revisao}` : ''}</span>
                                    </div>
                                  </td>
                                  <td>
                                    <div className="dashboard-drilldown-main-cell">
                                      <strong>{item.credenciado || 'Sem credenciada'}</strong>
                                      <span>{item.cnpjCpf || 'Sem CNPJ/CPF'}</span>
                                    </div>
                                  </td>
                                  <td>
                                    <div className="dashboard-drilldown-main-cell">
                                      <strong>{item.crm || '-'}</strong>
                                      <span>{item.veiculoPlacas || 'Sem placa'}</span>
                                    </div>
                                  </td>
                                  <td>
                                    <button
                                      type="button"
                                      className="secondary-button dashboard-open-os-button"
                                      onClick={() => handleOpenDashboardOsPopup(item.codigo)}
                                    >
                                      Abrir OS
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : null}

                      {!isLoadingDashboardDrillDown && dashboardDrillDownData && filteredDashboardDrillDownItems.length === 0 ? (
                        <p className="management-empty-state">Nenhuma OrdemServico corresponde ao filtro informado.</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}

              {isDashboardOsPopupVisible ? (
                <div
                  className="management-modal-overlay"
                  role="presentation"
                  onClick={(event) => {
                    if (event.target === event.currentTarget) {
                      handleCloseDashboardOsPopup()
                    }
                  }}
                >
                  <div
                    className="management-modal-shell dashboard-os-popup-shell"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="dashboard-os-popup-title"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="management-card management-modal-form-card dashboard-os-popup-card">
                      <div className="management-modal-header">
                        <div>
                          <p className="management-modal-kicker">Dashboard OrdemServico - OSPOPUP002</p>
                          <h2 id="dashboard-os-popup-title">Formulario de OS</h2>
                        </div>
                        <button
                          type="button"
                          className="secondary-button management-modal-close-button"
                          onClick={handleCloseDashboardOsPopup}
                          aria-label="Fechar formulario de OS"
                        >
                          X
                        </button>
                      </div>

                      {dashboardOsPopupUrl ? (
                        <div className="access-embed-card dashboard-os-popup-embed-card">
                          <iframe
                            className="access-embed-frame dashboard-os-popup-frame"
                            src={dashboardOsPopupUrl}
                            title="Formulario de OrdemServico"
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </>
        ) : activeView === 'dre' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro administrativo</p>
              <h2 id="content-title">Tabela DRE</h2>
              <p className="content-description">
                Cadastre e consulte os registros da tabela DRE. O codigo e gerado
                automaticamente, a sigla deve ter 2 letras maiusculas e a descricao nao pode se repetir.
              </p>
            </div>

            <div className="management-layout">
              <div className="management-toolbar">
                <button
                  type="button"
                  className="primary-button dre-insert-button"
                  onClick={handleStartInsertDre}
                  disabled={isSavingDre || isDeletingDre}
                >
                  Inserir registro
                </button>

                <form className="management-filter-form" onSubmit={handleFilterDreSubmit}>
                  <input
                    className="management-filter-input"
                    type="text"
                    placeholder="Filtrar por codigo, sigla ou descricao"
                    value={dreSearch}
                    onChange={(event) => setDreSearch(event.target.value)}
                  />
                  <button type="submit" className="secondary-button management-filter-button">
                    Filtrar
                  </button>
                  <button type="button" className="secondary-button management-filter-button" onClick={handleClearDreFilter}>
                    Limpar
                  </button>
                </form>
              </div>

              {isDreFormVisible ? (
                <div
                  className="management-modal-overlay"
                  role="presentation"
                  onClick={(event) => {
                    if (event.target === event.currentTarget && !isSavingDre) {
                      handleCancelDreForm()
                    }
                  }}
                >
                  <div
                    className="management-modal-shell"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="dre-modal-title"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <form className="management-card management-form dre-form management-modal-form-card" onSubmit={handleCreateDre} noValidate>
                      <div className="management-modal-header">
                        <div>
                          <p className="management-modal-kicker">Cadastro administrativo - DREFORM003</p>
                          <h2 id="dre-modal-title">DRE</h2>
                        </div>
                        <button
                          type="button"
                          className="secondary-button management-modal-close-button"
                          onClick={handleCancelDreForm}
                          disabled={isSavingDre}
                          aria-label="Fechar formulario de DRE"
                        >
                          X
                        </button>
                      </div>

                      <p className="management-modal-subtitle">
                        {dreFormMode === 'view' ? 'Consulta de registro' : editingDreCodigo ? 'Alterar registro' : 'Novo registro'}
                      </p>

                      <label className="field-group" htmlFor="dre-sigla">
                        <span>Sigla</span>
                        <input
                          id="dre-sigla"
                          name="sigla"
                          type="text"
                          value={dreSigla}
                          onChange={(event) => setDreSigla(normalizeDreSiglaInput(event.target.value))}
                          maxLength={2}
                          disabled={isSavingDre || dreFormMode === 'view'}
                          aria-invalid={Boolean(dreSiglaError)}
                        />
                        {dreSiglaError ? <strong className="field-error">{dreSiglaError}</strong> : null}
                      </label>

                      <label className="field-group" htmlFor="dre-descricao">
                        <span>Descricao</span>
                        <input
                          id="dre-descricao"
                          name="descricao"
                          type="text"
                          value={dreDescricao}
                          onChange={(event) => setDreDescricao(event.target.value)}
                          disabled={isSavingDre || dreFormMode === 'view'}
                          aria-invalid={Boolean(dreDescricaoError)}
                        />
                        {dreDescricaoError ? <strong className="field-error">{dreDescricaoError}</strong> : null}
                      </label>

                      <p className={`status-message status-${dreStatusTone}`} aria-live="polite">
                        {dreStatusMessage}
                      </p>

                      <div className="button-row dre-button-row management-modal-footer">
                        {dreFormMode !== 'view' ? (
                          <button type="submit" className="primary-button" disabled={isSavingDre}>
                            {isSavingDre ? 'Salvando...' : editingDreCodigo ? 'Salvar alteracao' : 'Salvar DRE'}
                          </button>
                        ) : null}
                        <button type="button" className="secondary-button" onClick={handleCancelDreForm} disabled={isSavingDre}>
                          {dreFormMode === 'view' ? 'Fechar' : 'Cancelar'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : null}

              <div className="management-card management-grid-card dre-list-card">
                <div className="management-grid-header">
                  <h2>Registros cadastrados</h2>
                  <span>
                    {isLoadingDre ? 'Atualizando...' : `${dreTotalItems} item(ns) encontrados`}
                  </span>
                </div>

                <div className="management-grid-wrapper">
                  <table className="dre-table">
                    <thead>
                      <tr>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortDre('codigo')}>
                            Codigo <span>{getSortIndicator('codigo')}</span>
                          </button>
                        </th>
                        <th>
                          Sigla
                        </th>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortDre('descricao')}>
                            Descricao <span>{getSortIndicator('descricao')}</span>
                          </button>
                        </th>
                        <th className="dre-actions-column">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dreItems.map((item) => (
                        <tr key={item.codigo}>
                          <td>{item.codigo}</td>
                          <td>{item.sigla}</td>
                          <td>{item.descricao}</td>
                          <td>
                            <div className="dre-row-actions">
                              <button type="button" className="row-action-button" onClick={() => handleStartViewDre(item)}>
                                Consulta
                              </button>
                              {hasDreEditFormAccess ? <button type="button" className="row-action-button row-action-edit" onClick={() => handleStartEditDre(item)}>
                                Alterar
                              </button> : null}
                              {hasDeleteFormPermission(appFormEditAccessKeys.dre) ? <button type="button" className="row-action-button row-action-delete" onClick={() => handleDeleteDre(item)}>
                                Excluir
                              </button> : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {!isLoadingDre && dreItems.length === 0 ? (
                    <p className="management-empty-state">Nenhum registro da DRE encontrado.</p>
                  ) : null}
                </div>

                <p className={`status-message status-${dreStatusTone}`} aria-live="polite">
                  {isDreFormVisible ? '' : dreStatusMessage}
                </p>

                <div className="management-pagination">
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setDrePage(1)}
                    disabled={!canGoToPreviousDrePage || isLoadingDre}
                    title="Primeiro registro"
                    aria-label="Primeiro registro"
                  >
                    |◀
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setDrePage((currentPage) => currentPage - 1)}
                    disabled={!canGoToPreviousDrePage || isLoadingDre}
                    title="Registro anterior"
                    aria-label="Registro anterior"
                  >
                    ◀
                  </button>
                  <span className="management-pagination-info">
                    Pagina {drePage} de {dreTotalPages}
                  </span>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setDrePage((currentPage) => currentPage + 1)}
                    disabled={!canGoToNextDrePage || isLoadingDre}
                    title="Proximo registro"
                    aria-label="Proximo registro"
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setDrePage(dreTotalPages)}
                    disabled={!canGoToNextDrePage || isLoadingDre}
                    title="Ultimo registro"
                    aria-label="Ultimo registro"
                  >
                    ▶|
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : activeView === 'modalidade' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro administrativo</p>
              <h2 id="content-title">Tabela Modalidade</h2>
              <p className="content-description">
                Cadastre e consulte os registros da tabela Modalidade. O codigo e gerado
                automaticamente e a descricao nao pode se repetir.
              </p>
            </div>

            <div className="management-layout">
              <div className="management-toolbar">
                <button
                  type="button"
                  className="primary-button dre-insert-button"
                  onClick={handleStartInsertModalidade}
                  disabled={isSavingModalidade || isDeletingModalidade}
                >
                  Inserir registro
                </button>

                <form className="management-filter-form" onSubmit={handleFilterModalidadeSubmit}>
                  <input
                    className="management-filter-input"
                    type="text"
                    placeholder="Filtrar por codigo ou descricao"
                    value={modalidadeSearch}
                    onChange={(event) => setModalidadeSearch(event.target.value)}
                  />
                  <button type="submit" className="secondary-button management-filter-button">
                    Filtrar
                  </button>
                  <button type="button" className="secondary-button management-filter-button" onClick={handleClearModalidadeFilter}>
                    Limpar
                  </button>
                </form>
              </div>

              {isModalidadeFormVisible ? (
                <div
                  className="management-modal-overlay"
                  role="presentation"
                  onClick={(event) => {
                    if (event.target === event.currentTarget && !isSavingModalidade) {
                      handleCancelModalidadeForm()
                    }
                  }}
                >
                  <div
                    className="management-modal-shell"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modalidade-modal-title"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <form className="management-card management-form dre-form management-modal-form-card" onSubmit={handleCreateModalidade} noValidate>
                      <div className="management-modal-header">
                        <div>
                          <p className="management-modal-kicker">Cadastro administrativo - MODALID004</p>
                          <h2 id="modalidade-modal-title">MODALIDADE</h2>
                        </div>
                        <button
                          type="button"
                          className="secondary-button management-modal-close-button"
                          onClick={handleCancelModalidadeForm}
                          disabled={isSavingModalidade}
                          aria-label="Fechar formulario de modalidade"
                        >
                          X
                        </button>
                      </div>

                      <p className="management-modal-subtitle">
                        {modalidadeFormMode === 'view' ? 'Consulta de registro' : editingModalidadeCodigo ? 'Alterar registro' : 'Novo registro'}
                      </p>

                      <label className="field-group" htmlFor="modalidade-descricao">
                        <span>Descricao</span>
                        <input
                          id="modalidade-descricao"
                          name="descricao"
                          type="text"
                          value={modalidadeDescricao}
                          onChange={(event) => setModalidadeDescricao(event.target.value)}
                          disabled={isSavingModalidade || modalidadeFormMode === 'view'}
                          aria-invalid={Boolean(modalidadeDescricaoError)}
                        />
                        {modalidadeDescricaoError ? <strong className="field-error">{modalidadeDescricaoError}</strong> : null}
                      </label>

                      <p className={`status-message status-${modalidadeStatusTone}`} aria-live="polite">
                        {modalidadeStatusMessage}
                      </p>

                      <div className="button-row dre-button-row management-modal-footer">
                        {modalidadeFormMode !== 'view' ? (
                          <button type="submit" className="primary-button" disabled={isSavingModalidade}>
                            {isSavingModalidade ? 'Salvando...' : editingModalidadeCodigo ? 'Salvar alteracao' : 'Salvar Modalidade'}
                          </button>
                        ) : null}
                        <button type="button" className="secondary-button" onClick={handleCancelModalidadeForm} disabled={isSavingModalidade}>
                          {modalidadeFormMode === 'view' ? 'Fechar' : 'Cancelar'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : null}

              <div className="management-card management-grid-card dre-list-card">
                <div className="management-grid-header">
                  <h2>Registros cadastrados</h2>
                  <span>
                    {isLoadingModalidade ? 'Atualizando...' : `${modalidadeTotalItems} item(ns) encontrados`}
                  </span>
                </div>

                <div className="management-grid-wrapper">
                  <table className="dre-table">
                    <thead>
                      <tr>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortModalidade('codigo')}>
                            Codigo <span>{getModalidadeSortIndicator('codigo')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortModalidade('descricao')}>
                            Descricao <span>{getModalidadeSortIndicator('descricao')}</span>
                          </button>
                        </th>
                        <th className="dre-actions-column">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalidadeItems.map((item) => (
                        <tr key={item.codigo}>
                          <td>{item.codigo}</td>
                          <td>{item.descricao}</td>
                          <td>
                            <div className="dre-row-actions">
                              <button type="button" className="row-action-button" onClick={() => handleStartViewModalidade(item)}>
                                Consulta
                              </button>
                                {hasModalidadeEditFormAccess ? <button type="button" className="row-action-button row-action-edit" onClick={() => handleStartEditModalidade(item)}>
                                  Alterar
                                </button> : null}
                              {hasDeleteFormPermission(appFormEditAccessKeys.modalidade) ? <button type="button" className="row-action-button row-action-delete" onClick={() => handleDeleteModalidade(item)}>
                                Excluir
                              </button> : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {!isLoadingModalidade && modalidadeItems.length === 0 ? (
                    <p className="management-empty-state">Nenhum registro de modalidade encontrado.</p>
                  ) : null}
                </div>

                <p className={`status-message status-${modalidadeStatusTone}`} aria-live="polite">
                  {isModalidadeFormVisible ? '' : modalidadeStatusMessage}
                </p>

                <div className="management-pagination">
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setModalidadePage(1)}
                    disabled={!canGoToPreviousModalidadePage || isLoadingModalidade}
                    title="Primeiro registro"
                    aria-label="Primeiro registro"
                  >
                    |◀
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setModalidadePage((currentPage) => currentPage - 1)}
                    disabled={!canGoToPreviousModalidadePage || isLoadingModalidade}
                    title="Registro anterior"
                    aria-label="Registro anterior"
                  >
                    ◀
                  </button>
                  <span className="management-pagination-info">
                    Pagina {modalidadePage} de {modalidadeTotalPages}
                  </span>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setModalidadePage((currentPage) => currentPage + 1)}
                    disabled={!canGoToNextModalidadePage || isLoadingModalidade}
                    title="Proximo registro"
                    aria-label="Proximo registro"
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setModalidadePage(modalidadeTotalPages)}
                    disabled={!canGoToNextModalidadePage || isLoadingModalidade}
                    title="Ultimo registro"
                    aria-label="Ultimo registro"
                  >
                    ▶|
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : activeView === 'condicao' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro administrativo</p>
              <h2 id="content-title">Tabela Condicao</h2>
              <p className="content-description">
                Cadastre e consulte os registros da tabela Condicao. O codigo e gerado
                automaticamente e os campos descricao, Qtde Ini e Qtde Fim sao obrigatorios.
              </p>
            </div>

            <div className="management-layout">
              <div className="management-toolbar">
                <button
                  type="button"
                  className="primary-button dre-insert-button"
                  onClick={handleStartInsertCondicao}
                  disabled={isSavingCondicao || isDeletingCondicao}
                >
                  Inserir registro
                </button>

                <form className="management-filter-form" onSubmit={handleFilterCondicaoSubmit}>
                  <input
                    className="management-filter-input"
                    type="text"
                    placeholder="Filtrar por codigo, descricao ou quantidade"
                    value={condicaoSearch}
                    onChange={(event) => setCondicaoSearch(event.target.value)}
                  />
                  <button type="submit" className="secondary-button management-filter-button">
                    Filtrar
                  </button>
                  <button type="button" className="secondary-button management-filter-button" onClick={handleClearCondicaoFilter}>
                    Limpar
                  </button>
                </form>
              </div>

              {isCondicaoFormVisible ? (
                <div
                  className="management-modal-overlay"
                  role="presentation"
                  onClick={(event) => {
                    if (event.target === event.currentTarget && !isSavingCondicao) {
                      handleCancelCondicaoForm()
                    }
                  }}
                >
                  <div
                    className="management-modal-shell"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="condicao-modal-title"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <form className="management-card management-form dre-form management-modal-form-card" onSubmit={handleCreateCondicao} noValidate>
                      <div className="management-modal-header">
                        <div>
                          <p className="management-modal-kicker">Cadastro administrativo - CONDICA005</p>
                          <h2 id="condicao-modal-title">CONDICAO</h2>
                        </div>
                        <button
                          type="button"
                          className="secondary-button management-modal-close-button"
                          onClick={handleCancelCondicaoForm}
                          disabled={isSavingCondicao}
                          aria-label="Fechar formulario de condicao"
                        >
                          X
                        </button>
                      </div>

                      <p className="management-modal-subtitle">
                        {condicaoFormMode === 'view' ? 'Consulta de registro' : editingCondicaoCodigo ? 'Alterar registro' : 'Novo registro'}
                      </p>

                      <label className="field-group" htmlFor="condicao-descricao">
                        <span>Descricao</span>
                        <input
                          id="condicao-descricao"
                          name="descricao"
                          type="text"
                          value={condicaoDescricao}
                          onChange={(event) => setCondicaoDescricao(event.target.value)}
                          disabled={isSavingCondicao || condicaoFormMode === 'view'}
                          aria-invalid={Boolean(condicaoDescricaoError)}
                        />
                        {condicaoDescricaoError ? <strong className="field-error">{condicaoDescricaoError}</strong> : null}
                      </label>

                      <label className="field-group" htmlFor="condicao-qtde-ini">
                        <span>Qtde Ini</span>
                        <input
                          id="condicao-qtde-ini"
                          name="qtdeIni"
                          type="number"
                          min={0}
                          step={1}
                          value={condicaoQtdeIni}
                          onChange={(event) => setCondicaoQtdeIni(event.target.value)}
                          disabled={isSavingCondicao || condicaoFormMode === 'view'}
                          aria-invalid={Boolean(condicaoQtdeIniError)}
                        />
                        {condicaoQtdeIniError ? <strong className="field-error">{condicaoQtdeIniError}</strong> : null}
                      </label>

                      <label className="field-group" htmlFor="condicao-qtde-fim">
                        <span>Qtde Fim</span>
                        <input
                          id="condicao-qtde-fim"
                          name="qtdeFim"
                          type="number"
                          min={0}
                          step={1}
                          value={condicaoQtdeFim}
                          onChange={(event) => setCondicaoQtdeFim(event.target.value)}
                          disabled={isSavingCondicao || condicaoFormMode === 'view'}
                          aria-invalid={Boolean(condicaoQtdeFimError)}
                        />
                        {condicaoQtdeFimError ? <strong className="field-error">{condicaoQtdeFimError}</strong> : null}
                      </label>

                      <p className={`status-message status-${condicaoStatusTone}`} aria-live="polite">
                        {condicaoStatusMessage}
                      </p>

                      <div className="button-row dre-button-row management-modal-footer">
                        {condicaoFormMode !== 'view' ? (
                          <button type="submit" className="primary-button" disabled={isSavingCondicao}>
                            {isSavingCondicao ? 'Salvando...' : editingCondicaoCodigo ? 'Salvar alteracao' : 'Salvar Condicao'}
                          </button>
                        ) : null}
                        <button type="button" className="secondary-button" onClick={handleCancelCondicaoForm} disabled={isSavingCondicao}>
                          {condicaoFormMode === 'view' ? 'Fechar' : 'Cancelar'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : null}

              <div className="management-card management-grid-card dre-list-card">
                <div className="management-grid-header">
                  <h2>Registros cadastrados</h2>
                  <span>
                    {isLoadingCondicao ? 'Atualizando...' : `${condicaoTotalItems} item(ns) encontrados`}
                  </span>
                </div>

                <div className="management-grid-wrapper">
                  <table className="dre-table">
                    <thead>
                      <tr>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortCondicao('codigo')}>
                            Codigo <span>{getCondicaoSortIndicator('codigo')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortCondicao('descricao')}>
                            Descricao <span>{getCondicaoSortIndicator('descricao')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortCondicao('qtdeIni')}>
                            Qtde Ini <span>{getCondicaoSortIndicator('qtdeIni')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortCondicao('qtdeFim')}>
                            Qtde Fim <span>{getCondicaoSortIndicator('qtdeFim')}</span>
                          </button>
                        </th>
                        <th className="dre-actions-column">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {condicaoItems.map((item) => (
                        <tr key={item.codigo}>
                          <td>{item.codigo}</td>
                          <td>{item.descricao}</td>
                          <td>{item.qtdeIni}</td>
                          <td>{item.qtdeFim}</td>
                          <td>
                            <div className="dre-row-actions">
                              <button type="button" className="row-action-button" onClick={() => handleStartViewCondicao(item)}>
                                Consulta
                              </button>
                                {hasCondicaoEditFormAccess ? <button type="button" className="row-action-button row-action-edit" onClick={() => handleStartEditCondicao(item)}>
                                  Alterar
                                </button> : null}
                              {hasDeleteFormPermission(appFormEditAccessKeys.condicao) ? <button type="button" className="row-action-button row-action-delete" onClick={() => handleDeleteCondicao(item)}>
                                Excluir
                              </button> : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {!isLoadingCondicao && condicaoItems.length === 0 ? (
                    <p className="management-empty-state">Nenhum registro de condicao encontrado.</p>
                  ) : null}
                </div>

                <p className={`status-message status-${condicaoStatusTone}`} aria-live="polite">
                  {isCondicaoFormVisible ? '' : condicaoStatusMessage}
                </p>

                <div className="management-pagination">
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setCondicaoPage(1)}
                    disabled={!canGoToPreviousCondicaoPage || isLoadingCondicao}
                    title="Primeiro registro"
                    aria-label="Primeiro registro"
                  >
                    |◀
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setCondicaoPage((currentPage) => currentPage - 1)}
                    disabled={!canGoToPreviousCondicaoPage || isLoadingCondicao}
                    title="Registro anterior"
                    aria-label="Registro anterior"
                  >
                    ◀
                  </button>
                  <span className="management-pagination-info">
                    Pagina {condicaoPage} de {condicaoTotalPages}
                  </span>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setCondicaoPage((currentPage) => currentPage + 1)}
                    disabled={!canGoToNextCondicaoPage || isLoadingCondicao}
                    title="Proximo registro"
                    aria-label="Proximo registro"
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setCondicaoPage(condicaoTotalPages)}
                    disabled={!canGoToNextCondicaoPage || isLoadingCondicao}
                    title="Ultimo registro"
                    aria-label="Ultimo registro"
                  >
                    ▶|
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : activeView === 'tipoPgto' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro financeiro</p>
              <h2 id="content-title">Tipo de Pagamento</h2>
              <p className="content-description">
                Cadastre e consulte os registros de Tipo de Pagamento no mesmo modelo da DRE.
                O codigo e gerado automaticamente e a descricao nao pode se repetir.
              </p>
            </div>

            <div className="management-layout">
              <div className="management-toolbar">
                <button
                  type="button"
                  className="primary-button dre-insert-button"
                  onClick={handleStartInsertTipoPgto}
                  disabled={isSavingTipoPgto || isDeletingTipoPgto}
                >
                  Inserir registro
                </button>

                <form className="management-filter-form" onSubmit={handleFilterTipoPgtoSubmit}>
                  <input
                    className="management-filter-input"
                    type="text"
                    placeholder="Filtrar por codigo ou descricao"
                    value={tipoPgtoSearch}
                    onChange={(event) => setTipoPgtoSearch(event.target.value)}
                  />
                  <button type="submit" className="secondary-button management-filter-button">
                    Filtrar
                  </button>
                  <button type="button" className="secondary-button management-filter-button" onClick={handleClearTipoPgtoFilter}>
                    Limpar
                  </button>
                </form>
              </div>

              {isTipoPgtoFormVisible ? (
                <div
                  className="management-modal-overlay"
                  role="presentation"
                  onClick={(event) => {
                    if (event.target === event.currentTarget && !isSavingTipoPgto) {
                      handleCancelTipoPgtoForm()
                    }
                  }}
                >
                  <div
                    className="management-modal-shell"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="tipo-pgto-modal-title"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <form className="management-card management-form dre-form management-modal-form-card" onSubmit={handleCreateTipoPgto} noValidate>
                      <div className="management-modal-header">
                        <div>
                          <p className="management-modal-kicker">Cadastro financeiro - TIPOPAG006</p>
                          <h2 id="tipo-pgto-modal-title">TIPO DE PAGAMENTO</h2>
                        </div>
                        <button
                          type="button"
                          className="secondary-button management-modal-close-button"
                          onClick={handleCancelTipoPgtoForm}
                          disabled={isSavingTipoPgto}
                          aria-label="Fechar formulario de tipo de pagamento"
                        >
                          X
                        </button>
                      </div>

                      <p className="management-modal-subtitle">
                        {tipoPgtoFormMode === 'view' ? 'Consulta de registro' : editingTipoPgtoCodigo ? 'Alterar registro' : 'Novo registro'}
                      </p>

                      <label className="field-group" htmlFor="tipo-pgto-descricao">
                        <span>Descricao</span>
                        <input
                          id="tipo-pgto-descricao"
                          name="descricao"
                          type="text"
                          value={tipoPgtoDescricao}
                          onChange={(event) => setTipoPgtoDescricao(event.target.value)}
                          disabled={isSavingTipoPgto || tipoPgtoFormMode === 'view'}
                          aria-invalid={Boolean(tipoPgtoDescricaoError)}
                        />
                        {tipoPgtoDescricaoError ? <strong className="field-error">{tipoPgtoDescricaoError}</strong> : null}
                      </label>

                      <p className={`status-message status-${tipoPgtoStatusTone}`} aria-live="polite">
                        {tipoPgtoStatusMessage}
                      </p>

                      <div className="button-row dre-button-row management-modal-footer">
                        {tipoPgtoFormMode !== 'view' ? (
                          <button type="submit" className="primary-button" disabled={isSavingTipoPgto}>
                            {isSavingTipoPgto ? 'Salvando...' : editingTipoPgtoCodigo ? 'Salvar alteracao' : 'Salvar Tipo de Pagamento'}
                          </button>
                        ) : null}
                        <button type="button" className="secondary-button" onClick={handleCancelTipoPgtoForm} disabled={isSavingTipoPgto}>
                          {tipoPgtoFormMode === 'view' ? 'Fechar' : 'Cancelar'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : null}

              <div className="management-card management-grid-card dre-list-card">
                <div className="management-grid-header">
                  <h2>Registros cadastrados</h2>
                  <span>
                    {isLoadingTipoPgto ? 'Atualizando...' : `${tipoPgtoTotalItems} item(ns) encontrados`}
                  </span>
                </div>

                <div className="management-grid-wrapper">
                  <table className="dre-table">
                    <thead>
                      <tr>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortTipoPgto('codigo')}>
                            Codigo <span>{getTipoPgtoSortIndicator('codigo')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortTipoPgto('descricao')}>
                            Descricao <span>{getTipoPgtoSortIndicator('descricao')}</span>
                          </button>
                        </th>
                        <th className="dre-actions-column">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tipoPgtoItems.map((item) => (
                        <tr key={item.codigo}>
                          <td>{item.codigo}</td>
                          <td>{item.descricao}</td>
                          <td>
                            <div className="dre-row-actions">
                              <button type="button" className="row-action-button" onClick={() => handleStartViewTipoPgto(item)}>
                                Consulta
                              </button>
                              {hasTipoPgtoEditFormAccess ? <button type="button" className="row-action-button row-action-edit" onClick={() => handleStartEditTipoPgto(item)}>
                                Alterar
                              </button> : null}
                              {hasDeleteFormPermission(appFormEditAccessKeys.tipoPgto) ? <button type="button" className="row-action-button row-action-delete" onClick={() => handleDeleteTipoPgto(item)}>
                                Excluir
                              </button> : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {!isLoadingTipoPgto && tipoPgtoItems.length === 0 ? (
                    <p className="management-empty-state">Nenhum registro de tipo de pagamento encontrado.</p>
                  ) : null}
                </div>

                <p className={`status-message status-${tipoPgtoStatusTone}`} aria-live="polite">
                  {isTipoPgtoFormVisible ? '' : tipoPgtoStatusMessage}
                </p>

                <div className="management-pagination">
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setTipoPgtoPage(1)}
                    disabled={!canGoToPreviousTipoPgtoPage || isLoadingTipoPgto}
                    title="Primeiro registro"
                    aria-label="Primeiro registro"
                  >
                    |◀
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setTipoPgtoPage((currentPage) => currentPage - 1)}
                    disabled={!canGoToPreviousTipoPgtoPage || isLoadingTipoPgto}
                    title="Registro anterior"
                    aria-label="Registro anterior"
                  >
                    ◀
                  </button>
                  <span className="management-pagination-info">
                    Pagina {tipoPgtoPage} de {tipoPgtoTotalPages}
                  </span>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setTipoPgtoPage((currentPage) => currentPage + 1)}
                    disabled={!canGoToNextTipoPgtoPage || isLoadingTipoPgto}
                    title="Proximo registro"
                    aria-label="Proximo registro"
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setTipoPgtoPage(tipoPgtoTotalPages)}
                    disabled={!canGoToNextTipoPgtoPage || isLoadingTipoPgto}
                    title="Ultimo registro"
                    aria-label="Ultimo registro"
                  >
                    ▶|
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : activeView === 'tipoEscola' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro financeiro</p>
              <h2 id="content-title">Tipo Escola</h2>
              <p className="content-description">
                Cadastre e consulte os registros de Tipo Escola no mesmo modelo da DRE.
                O codigo e gerado automaticamente, a sigla e obrigatoria e o nome do tipo de escola nao pode se repetir.
              </p>
            </div>

            <div className="management-layout">
              <div className="management-toolbar">
                <button
                  type="button"
                  className="primary-button dre-insert-button"
                  onClick={handleStartInsertTipoEscola}
                  disabled={isSavingTipoEscola || isDeletingTipoEscola}
                >
                  Inserir registro
                </button>

                <form className="management-filter-form" onSubmit={handleFilterTipoEscolaSubmit}>
                  <input
                    className="management-filter-input"
                    type="text"
                    placeholder="Filtrar por codigo, sigla ou nome"
                    value={tipoEscolaSearch}
                    onChange={(event) => setTipoEscolaSearch(event.target.value)}
                  />
                  <button type="submit" className="secondary-button management-filter-button">
                    Filtrar
                  </button>
                  <button type="button" className="secondary-button management-filter-button" onClick={handleClearTipoEscolaFilter}>
                    Limpar
                  </button>
                </form>
              </div>

              {isTipoEscolaFormVisible ? (
                <div
                  className="management-modal-overlay"
                  role="presentation"
                  onClick={(event) => {
                    if (event.target === event.currentTarget && !isSavingTipoEscola) {
                      handleCancelTipoEscolaForm()
                    }
                  }}
                >
                  <div
                    className="management-modal-shell"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="tipo-escola-modal-title"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <form className="management-card management-form dre-form management-modal-form-card" onSubmit={handleCreateTipoEscola} noValidate>
                      <div className="management-modal-header">
                        <div>
                          <p className="management-modal-kicker">Cadastro financeiro - TIPESCO007</p>
                          <h2 id="tipo-escola-modal-title">TIPO ESCOLA</h2>
                        </div>
                        <button
                          type="button"
                          className="secondary-button management-modal-close-button"
                          onClick={handleCancelTipoEscolaForm}
                          disabled={isSavingTipoEscola}
                          aria-label="Fechar formulario de tipo de escola"
                        >
                          X
                        </button>
                      </div>

                      <p className="management-modal-subtitle">
                        {tipoEscolaFormMode === 'view' ? 'Consulta de registro' : editingTipoEscolaCodigo ? 'Alterar registro' : 'Novo registro'}
                      </p>

                      <label className="field-group" htmlFor="tipo-escola-descricao">
                        <span>Sigla</span>
                        <input
                          id="tipo-escola-sigla"
                          name="sigla"
                          type="text"
                          value={tipoEscolaSigla}
                          onChange={(event) => setTipoEscolaSigla(event.target.value.toUpperCase().slice(0, 20))}
                          disabled={isSavingTipoEscola || tipoEscolaFormMode === 'view'}
                          aria-invalid={Boolean(tipoEscolaSiglaError)}
                        />
                        {tipoEscolaSiglaError ? <strong className="field-error">{tipoEscolaSiglaError}</strong> : null}
                      </label>

                      <label className="field-group" htmlFor="tipo-escola-descricao">
                        <span>Nome Tipo Escola</span>
                        <input
                          id="tipo-escola-descricao"
                          name="descricao"
                          type="text"
                          value={tipoEscolaDescricao}
                          onChange={(event) => setTipoEscolaDescricao(event.target.value)}
                          disabled={isSavingTipoEscola || tipoEscolaFormMode === 'view'}
                          aria-invalid={Boolean(tipoEscolaDescricaoError)}
                        />
                        {tipoEscolaDescricaoError ? <strong className="field-error">{tipoEscolaDescricaoError}</strong> : null}
                      </label>

                      <p className={`status-message status-${tipoEscolaStatusTone}`} aria-live="polite">
                        {tipoEscolaStatusMessage}
                      </p>

                      <div className="button-row dre-button-row management-modal-footer">
                        {tipoEscolaFormMode !== 'view' ? (
                          <button type="submit" className="primary-button" disabled={isSavingTipoEscola}>
                            {isSavingTipoEscola ? 'Salvando...' : editingTipoEscolaCodigo ? 'Salvar alteracao' : 'Salvar Tipo Escola'}
                          </button>
                        ) : null}
                        <button type="button" className="secondary-button" onClick={handleCancelTipoEscolaForm} disabled={isSavingTipoEscola}>
                          {tipoEscolaFormMode === 'view' ? 'Fechar' : 'Cancelar'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : null}

              <div className="management-card management-grid-card dre-list-card">
                <div className="management-grid-header">
                  <h2>Registros cadastrados</h2>
                  <span>
                    {isLoadingTipoEscola ? 'Atualizando...' : `${tipoEscolaTotalItems} item(ns) encontrados`}
                  </span>
                </div>

                <div className="management-grid-wrapper">
                  <table className="dre-table">
                    <thead>
                      <tr>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortTipoEscola('codigo')}>
                            Codigo <span>{getTipoEscolaSortIndicator('codigo')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortTipoEscola('sigla')}>
                            Sigla <span>{getTipoEscolaSortIndicator('sigla')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortTipoEscola('descricao')}>
                            Nome Tipo Escola <span>{getTipoEscolaSortIndicator('descricao')}</span>
                          </button>
                        </th>
                        <th className="dre-actions-column">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tipoEscolaItems.map((item) => (
                        <tr key={item.codigo}>
                          <td>{item.codigo}</td>
                          <td>{item.sigla}</td>
                          <td>{item.descricao}</td>
                          <td>
                            <div className="dre-row-actions">
                              <button type="button" className="row-action-button" onClick={() => handleStartViewTipoEscola(item)}>
                                Consulta
                              </button>
                              {hasTipoEscolaEditFormAccess ? <button type="button" className="row-action-button row-action-edit" onClick={() => handleStartEditTipoEscola(item)}>
                                Alterar
                              </button> : null}
                              {hasDeleteFormPermission(appFormEditAccessKeys.tipoEscola) ? <button type="button" className="row-action-button row-action-delete" onClick={() => handleDeleteTipoEscola(item)}>
                                Excluir
                              </button> : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {!isLoadingTipoEscola && tipoEscolaItems.length === 0 ? (
                    <p className="management-empty-state">Nenhum registro de tipo de escola encontrado.</p>
                  ) : null}
                </div>

                <p className={`status-message status-${tipoEscolaStatusTone}`} aria-live="polite">
                  {isTipoEscolaFormVisible ? '' : tipoEscolaStatusMessage}
                </p>

                <div className="management-pagination">
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setTipoEscolaPage(1)}
                    disabled={!canGoToPreviousTipoEscolaPage || isLoadingTipoEscola}
                    title="Primeiro registro"
                    aria-label="Primeiro registro"
                  >
                    |◀
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setTipoEscolaPage((currentPage) => currentPage - 1)}
                    disabled={!canGoToPreviousTipoEscolaPage || isLoadingTipoEscola}
                    title="Registro anterior"
                    aria-label="Registro anterior"
                  >
                    ◀
                  </button>
                  <span className="management-pagination-info">
                    Pagina {tipoEscolaPage} de {tipoEscolaTotalPages}
                  </span>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setTipoEscolaPage((currentPage) => currentPage + 1)}
                    disabled={!canGoToNextTipoEscolaPage || isLoadingTipoEscola}
                    title="Proximo registro"
                    aria-label="Proximo registro"
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setTipoEscolaPage(tipoEscolaTotalPages)}
                    disabled={!canGoToNextTipoEscolaPage || isLoadingTipoEscola}
                    title="Ultimo registro"
                    aria-label="Ultimo registro"
                  >
                    ▶|
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : activeView === 'aliquotaOptante' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro financeiro</p>
              <h2 id="content-title">Aliquota Optante</h2>
              <p className="content-description">
                Cadastre aliquotas por data com tipo de empresa obrigatorio e valor decimal com quatro casas.
              </p>
            </div>

            <div className="management-layout">
              <div className="management-toolbar">
                <button
                  type="button"
                  className="primary-button dre-insert-button"
                  onClick={handleStartInsertAliquotaOptante}
                  disabled={isSavingAliquotaOptante || isDeletingAliquotaOptante}
                >
                  Inserir registro
                </button>

                <form className="management-filter-form" onSubmit={handleFilterAliquotaOptanteSubmit}>
                  <input
                    className="management-filter-input"
                    type="text"
                    placeholder="Filtrar por data, tipo empresa ou aliquota"
                    value={aliquotaOptanteSearch}
                    onChange={(event) => setAliquotaOptanteSearch(event.target.value)}
                  />
                  <button type="submit" className="secondary-button management-filter-button">
                    Filtrar
                  </button>
                  <button type="button" className="secondary-button management-filter-button" onClick={handleClearAliquotaOptanteFilter}>
                    Limpar
                  </button>
                </form>
              </div>

              {isAliquotaOptanteFormVisible ? (
                <div
                  className="management-modal-overlay"
                  role="presentation"
                  onClick={(event) => {
                    if (event.target === event.currentTarget && !isSavingAliquotaOptante) {
                      handleCancelAliquotaOptanteForm()
                    }
                  }}
                >
                  <div
                    className="management-modal-shell"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="aliquota-optante-modal-title"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <form className="management-card management-form dre-form management-modal-form-card" onSubmit={handleCreateAliquotaOptante} noValidate>
                      <div className="management-modal-header">
                        <div>
                          <p className="management-modal-kicker">Cadastro financeiro - ALIQOPT008</p>
                          <h2 id="aliquota-optante-modal-title">ALIQUOTA OPTANTE</h2>
                        </div>
                        <button
                          type="button"
                          className="secondary-button management-modal-close-button"
                          onClick={handleCancelAliquotaOptanteForm}
                          disabled={isSavingAliquotaOptante}
                          aria-label="Fechar formulario de aliquota optante"
                        >
                          X
                        </button>
                      </div>

                      <p className="management-modal-subtitle">
                        {aliquotaOptanteFormMode === 'view' ? 'Consulta de registro' : editingAliquotaOptanteKey ? 'Alterar registro' : 'Novo registro'}
                      </p>

                      <label className="field-group" htmlFor="aliquota-optante-data">
                        <span>Data</span>
                        <input
                          id="aliquota-optante-data"
                          type="date"
                          value={aliquotaOptanteData}
                          onChange={(event) => setAliquotaOptanteData(event.target.value)}
                          disabled={isSavingAliquotaOptante || aliquotaOptanteFormMode === 'view'}
                          aria-invalid={Boolean(aliquotaOptanteDataError)}
                        />
                        {aliquotaOptanteDataError ? <strong className="field-error">{aliquotaOptanteDataError}</strong> : null}
                      </label>

                      <label className="field-group" htmlFor="aliquota-optante-tipo-empresa">
                        <span>Tipo Empresa</span>
                        <select
                          id="aliquota-optante-tipo-empresa"
                          value={aliquotaOptanteTipoEmpresa}
                          onChange={(event) => setAliquotaOptanteTipoEmpresa(event.target.value as AliquotaOptanteTipoEmpresa)}
                          disabled={isSavingAliquotaOptante || aliquotaOptanteFormMode === 'view'}
                        >
                          {ALIQUOTA_OPTANTE_TIPO_EMPRESA_OPTIONS.map((item) => (
                            <option key={item} value={item}>{item}</option>
                          ))}
                        </select>
                        {aliquotaOptanteTipoEmpresaError ? <strong className="field-error">{aliquotaOptanteTipoEmpresaError}</strong> : null}
                      </label>

                      <label className="field-group" htmlFor="aliquota-optante-valor">
                        <span>Aliquota</span>
                        <input
                          id="aliquota-optante-valor"
                          type="number"
                          min="0"
                          step="0.0001"
                          value={aliquotaOptanteValor}
                          onChange={(event) => setAliquotaOptanteValor(event.target.value)}
                          disabled={isSavingAliquotaOptante || aliquotaOptanteFormMode === 'view'}
                          aria-invalid={Boolean(aliquotaOptanteValorError)}
                        />
                        {aliquotaOptanteValorError ? <strong className="field-error">{aliquotaOptanteValorError}</strong> : null}
                      </label>

                      <p className={`status-message status-${aliquotaOptanteStatusTone}`} aria-live="polite">
                        {aliquotaOptanteStatusMessage}
                      </p>

                      <div className="button-row dre-button-row management-modal-footer">
                        {aliquotaOptanteFormMode !== 'view' ? (
                          <button type="submit" className="primary-button" disabled={isSavingAliquotaOptante}>
                            {isSavingAliquotaOptante ? 'Salvando...' : editingAliquotaOptanteKey ? 'Salvar alteracao' : 'Salvar Aliquota Optante'}
                          </button>
                        ) : null}
                        <button type="button" className="secondary-button" onClick={handleCancelAliquotaOptanteForm} disabled={isSavingAliquotaOptante}>
                          {aliquotaOptanteFormMode === 'view' ? 'Fechar' : 'Cancelar'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : null}

              <div className="management-card management-grid-card dre-list-card">
                <div className="management-grid-header">
                  <h2>Registros cadastrados</h2>
                  <span>
                    {isLoadingAliquotaOptante ? 'Atualizando...' : `${aliquotaOptanteTotalItems} item(ns) encontrados`}
                  </span>
                </div>

                <div className="management-grid-wrapper">
                  <table className="dre-table">
                    <thead>
                      <tr>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortAliquotaOptante('data')}>
                            Data <span>{getAliquotaOptanteSortIndicator('data')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortAliquotaOptante('tipoEmpresa')}>
                            Tipo Empresa <span>{getAliquotaOptanteSortIndicator('tipoEmpresa')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortAliquotaOptante('aliquota')}>
                            Aliquota <span>{getAliquotaOptanteSortIndicator('aliquota')}</span>
                          </button>
                        </th>
                        <th className="dre-actions-column">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aliquotaOptanteItems.map((item) => (
                        <tr key={formatAliquotaOptanteKey(item)}>
                          <td>{item.data}</td>
                          <td>{item.tipoEmpresa}</td>
                          <td>{formatAliquotaOptanteValue(item.aliquota)}</td>
                          <td>
                            <div className="dre-row-actions">
                              <button type="button" className="row-action-button" onClick={() => handleStartViewAliquotaOptante(item)}>
                                Consulta
                              </button>
                              {hasAliquotaOptanteEditFormAccess ? <button type="button" className="row-action-button row-action-edit" onClick={() => handleStartEditAliquotaOptante(item)}>
                                Alterar
                              </button> : null}
                              {hasDeleteFormPermission(appFormEditAccessKeys.aliquotaOptante) ? <button type="button" className="row-action-button row-action-delete" onClick={() => handleDeleteAliquotaOptante(item)}>
                                Excluir
                              </button> : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {!isLoadingAliquotaOptante && aliquotaOptanteItems.length === 0 ? (
                    <p className="management-empty-state">Nenhum registro de aliquota optante encontrado.</p>
                  ) : null}
                </div>

                <p className={`status-message status-${aliquotaOptanteStatusTone}`} aria-live="polite">
                  {isAliquotaOptanteFormVisible ? '' : aliquotaOptanteStatusMessage}
                </p>

                <div className="management-pagination">
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setAliquotaOptantePage(1)}
                    disabled={!canGoToPreviousAliquotaOptantePage || isLoadingAliquotaOptante}
                    title="Primeiro registro"
                    aria-label="Primeiro registro"
                  >
                    |◀
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setAliquotaOptantePage((currentPage) => currentPage - 1)}
                    disabled={!canGoToPreviousAliquotaOptantePage || isLoadingAliquotaOptante}
                    title="Registro anterior"
                    aria-label="Registro anterior"
                  >
                    ◀
                  </button>
                  <span className="management-pagination-info">
                    Pagina {aliquotaOptantePage} de {aliquotaOptanteTotalPages}
                  </span>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setAliquotaOptantePage((currentPage) => currentPage + 1)}
                    disabled={!canGoToNextAliquotaOptantePage || isLoadingAliquotaOptante}
                    title="Proximo registro"
                    aria-label="Proximo registro"
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setAliquotaOptantePage(aliquotaOptanteTotalPages)}
                    disabled={!canGoToNextAliquotaOptantePage || isLoadingAliquotaOptante}
                    title="Ultimo registro"
                    aria-label="Ultimo registro"
                  >
                    ▶|
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : activeView === 'resumoFinanceiro' ? (
          <ResumoFinanceiroView />
        ) : activeView === 'apuracaoServicos' ? (
          <ApuracaoServicosView />
        ) : activeView === 'apontamentoServicos' ? (
          <ApontamentoServicosView />
        ) : activeView === 'remuneracaoServicos' ? (
          <RemuneracaoServicosView />
        ) : activeView === 'monitoramentoAmbiente' ? (
          <EnvironmentMonitoringView />
        ) : activeView === 'batchProcessMonitor' ? (
          <BatchProcessMonitorView />
        ) : activeView === 'modalBancadaTpPagtoCondicao' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro financeiro</p>
              <h2 id="content-title">Tabela Modalidade x Bancada x Pagamento x Condicao</h2>
              <p className="content-description">
                Relacione os registros de Modalidade x Tipo de Bancada com Tipo de Pagamento e Condicao.
                Os tres campos sao obrigatorios e a associacao nao pode se repetir.
              </p>
            </div>

            <div className="management-layout">
              <div className="management-toolbar">
                <button
                  type="button"
                  className="primary-button dre-insert-button"
                  onClick={handleStartInsertModalBancadaTpPagtoCondicao}
                  disabled={isSavingModalBancadaTpPagtoCondicao || isDeletingModalBancadaTpPagtoCondicao || isLoadingModalBancadaTpPagtoCondicaoOptions}
                >
                  Inserir registro
                </button>

                <form className="management-filter-form" onSubmit={handleFilterModalBancadaTpPagtoCondicaoSubmit}>
                  <label className="field-group" htmlFor="modal-bancada-tp-pagto-condicao-filter-associacao">
                    <span>Modalidade x Tipo de Bancada</span>
                    <select
                      id="modal-bancada-tp-pagto-condicao-filter-associacao"
                      value={modalBancadaTpPagtoCondicaoFilterAssociationCodigo}
                      onChange={(event) => setModalBancadaTpPagtoCondicaoFilterAssociationCodigo(event.target.value)}
                      disabled={isLoadingModalBancadaTpPagtoCondicaoItems || isLoadingModalBancadaTpPagtoCondicaoOptions}
                    >
                      <option value="">Todas</option>
                      {modalBancadaTpPagtoCondicaoAssociationOptions.map((item) => (
                        <option key={item.codigo} value={item.codigo}>
                          {item.modalidadeDescricao} / {item.tipoBancadaDescricao}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field-group" htmlFor="modal-bancada-tp-pagto-condicao-filter-tipo-pgto">
                    <span>Tipo de Pagamento</span>
                    <select
                      id="modal-bancada-tp-pagto-condicao-filter-tipo-pgto"
                      value={modalBancadaTpPagtoCondicaoFilterTipoPgtoCodigo}
                      onChange={(event) => setModalBancadaTpPagtoCondicaoFilterTipoPgtoCodigo(event.target.value)}
                      disabled={isLoadingModalBancadaTpPagtoCondicaoItems || isLoadingModalBancadaTpPagtoCondicaoOptions}
                    >
                      <option value="">Todos</option>
                      {modalBancadaTpPagtoCondicaoTipoPgtoOptions.map((item) => (
                        <option key={item.codigo} value={item.codigo}>
                          {item.descricao}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field-group" htmlFor="modal-bancada-tp-pagto-condicao-filter-condicao">
                    <span>Condicao</span>
                    <select
                      id="modal-bancada-tp-pagto-condicao-filter-condicao"
                      value={modalBancadaTpPagtoCondicaoFilterCondicaoCodigo}
                      onChange={(event) => setModalBancadaTpPagtoCondicaoFilterCondicaoCodigo(event.target.value)}
                      disabled={isLoadingModalBancadaTpPagtoCondicaoItems || isLoadingModalBancadaTpPagtoCondicaoOptions}
                    >
                      <option value="">Todas</option>
                      {modalBancadaTpPagtoCondicaoCondicaoOptions.map((item) => (
                        <option key={item.codigo} value={item.codigo}>
                          {item.descricao}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="submit" className="secondary-button management-filter-button">
                    Filtrar
                  </button>
                  <button type="button" className="secondary-button management-filter-button" onClick={handleClearModalBancadaTpPagtoCondicaoFilter}>
                    Limpar
                  </button>
                </form>
              </div>

              {isModalBancadaTpPagtoCondicaoFormVisible ? (
                <div
                  className="management-modal-overlay"
                  role="presentation"
                  onClick={(event) => {
                    if (event.target === event.currentTarget && !isSavingModalBancadaTpPagtoCondicao) {
                      handleCancelModalBancadaTpPagtoCondicaoForm()
                    }
                  }}
                >
                  <div
                    className="management-modal-shell"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-bancada-tp-pagto-condicao-modal-title"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <form className="management-card management-form dre-form management-modal-form-card" onSubmit={handleCreateModalBancadaTpPagtoCondicao} noValidate>
                      <div className="management-modal-header">
                        <div>
                          <p className="management-modal-kicker">Cadastro financeiro - MBTPCON009</p>
                          <h2 id="modal-bancada-tp-pagto-condicao-modal-title">MODALIDADE X BANCADA X PAGAMENTO X CONDICAO</h2>
                        </div>
                        <button
                          type="button"
                          className="secondary-button management-modal-close-button"
                          onClick={handleCancelModalBancadaTpPagtoCondicaoForm}
                          disabled={isSavingModalBancadaTpPagtoCondicao}
                          aria-label="Fechar formulario da associacao de modalidade, bancada, pagamento e condicao"
                        >
                          X
                        </button>
                      </div>

                      <p className="management-modal-subtitle">
                        {modalBancadaTpPagtoCondicaoFormMode === 'view' ? 'Consulta de registro' : editingModalBancadaTpPagtoCondicaoCodigo ? 'Alterar registro' : 'Novo registro'}
                      </p>

                      <label className="field-group" htmlFor="modal-bancada-tp-pagto-condicao-associacao">
                        <span>Modalidade x Tipo de Bancada</span>
                        <select
                          id="modal-bancada-tp-pagto-condicao-associacao"
                          value={modalBancadaTpPagtoCondicaoAssociationCodigo}
                          onChange={(event) => setModalBancadaTpPagtoCondicaoAssociationCodigo(event.target.value)}
                          disabled={isLoadingModalBancadaTpPagtoCondicaoOptions || isSavingModalBancadaTpPagtoCondicao || modalBancadaTpPagtoCondicaoFormMode === 'view'}
                        >
                          <option value="">Selecione a associacao</option>
                          {modalBancadaTpPagtoCondicaoAssociationOptions.map((item) => (
                            <option key={item.codigo} value={item.codigo}>
                                {item.modalidadeDescricao} / {item.tipoBancadaDescricao}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="field-group" htmlFor="modal-bancada-tp-pagto-condicao-tipo-pgto">
                        <span>Tipo de Pagamento</span>
                        <select
                          id="modal-bancada-tp-pagto-condicao-tipo-pgto"
                          value={modalBancadaTpPagtoCondicaoTipoPgtoCodigo}
                          onChange={(event) => setModalBancadaTpPagtoCondicaoTipoPgtoCodigo(event.target.value)}
                          disabled={isLoadingModalBancadaTpPagtoCondicaoOptions || isSavingModalBancadaTpPagtoCondicao || modalBancadaTpPagtoCondicaoFormMode === 'view'}
                        >
                          <option value="">Selecione o tipo de pagamento</option>
                          {modalBancadaTpPagtoCondicaoTipoPgtoOptions.map((item) => (
                            <option key={item.codigo} value={item.codigo}>
                                {item.descricao}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="field-group" htmlFor="modal-bancada-tp-pagto-condicao-condicao">
                        <span>Condicao</span>
                        <select
                          id="modal-bancada-tp-pagto-condicao-condicao"
                          value={modalBancadaTpPagtoCondicaoCondicaoCodigo}
                          onChange={(event) => setModalBancadaTpPagtoCondicaoCondicaoCodigo(event.target.value)}
                          disabled={isLoadingModalBancadaTpPagtoCondicaoOptions || isSavingModalBancadaTpPagtoCondicao || modalBancadaTpPagtoCondicaoFormMode === 'view'}
                        >
                          <option value="">Selecione a condicao</option>
                          {modalBancadaTpPagtoCondicaoCondicaoOptions.map((item) => (
                            <option key={item.codigo} value={item.codigo}>
                                {item.descricao}
                            </option>
                          ))}
                        </select>
                      </label>

                      <p className={`status-message status-${modalBancadaTpPagtoCondicaoStatusTone}`} aria-live="polite">
                        {modalBancadaTpPagtoCondicaoStatusMessage}
                      </p>

                      <div className="button-row dre-button-row management-modal-footer">
                        {modalBancadaTpPagtoCondicaoFormMode !== 'view' ? (
                          <button type="submit" className="primary-button" disabled={isSavingModalBancadaTpPagtoCondicao || isLoadingModalBancadaTpPagtoCondicaoOptions}>
                            {isSavingModalBancadaTpPagtoCondicao ? 'Salvando...' : editingModalBancadaTpPagtoCondicaoCodigo ? 'Salvar alteracao' : 'Salvar registro'}
                          </button>
                        ) : null}
                        <button type="button" className="secondary-button" onClick={handleCancelModalBancadaTpPagtoCondicaoForm} disabled={isSavingModalBancadaTpPagtoCondicao}>
                          {modalBancadaTpPagtoCondicaoFormMode === 'view' ? 'Fechar' : 'Cancelar'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : null}

              <div className="management-card management-grid-card dre-list-card">
                <div className="management-grid-header">
                  <h2>Registros cadastrados</h2>
                  <span>
                    {isLoadingModalBancadaTpPagtoCondicaoItems ? 'Atualizando...' : `${modalBancadaTpPagtoCondicaoTotalItems} item(ns) encontrados`}
                  </span>
                </div>

                <div className="management-grid-wrapper">
                  <table className="dre-table">
                    <thead>
                      <tr>
                        <th>Modalidade</th>
                        <th>Tipo de Bancada</th>
                        <th>Tipo de Pagamento</th>
                        <th>Condicao</th>
                        <th>Faixa</th>
                        <th className="dre-actions-column">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalBancadaTpPagtoCondicaoItems.map((item) => (
                        <tr key={item.codigo}>
                          <td>{item.modalidadeDescricao}</td>
                          <td>{item.tipoBancadaDescricao}</td>
                          <td>{item.tipoPgtoDescricao}</td>
                          <td>{item.condicaoDescricao}</td>
                          <td>{item.condicaoQtdeIni} a {item.condicaoQtdeFim}</td>
                          <td>
                            <div className="dre-row-actions">
                              <button
                                type="button"
                                className="row-action-button"
                                onClick={() => handleStartViewModalBancadaTpPagtoCondicao(item)}
                              >
                                Consulta
                              </button>
                              <button
                                type="button"
                                className="row-action-button row-action-edit"
                                onClick={() => handleStartEditModalBancadaTpPagtoCondicao(item)}
                                disabled={isDeletingModalBancadaTpPagtoCondicao}
                              >
                                Alterar
                              </button>
                              {hasDeleteFormPermission(appFormEditAccessKeys.modalBancadaTpPagtoCondicao) ? <button
                                type="button"
                                className="row-action-button row-action-delete"
                                onClick={() => handleDeleteModalBancadaTpPagtoCondicao(item)}
                                disabled={isDeletingModalBancadaTpPagtoCondicao}
                              >
                                Excluir
                              </button> : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {isLoadingModalBancadaTpPagtoCondicaoItems ? (
                    <p className="management-empty-state">Carregando registros...</p>
                  ) : null}

                  {!isLoadingModalBancadaTpPagtoCondicaoItems && !modalBancadaTpPagtoCondicaoItems.length ? (
                    <p className="management-empty-state">Nenhum registro encontrado na associacao de modalidade, bancada, pagamento e condicao.</p>
                  ) : null}
                </div>

                <p className={`status-message status-${modalBancadaTpPagtoCondicaoStatusTone}`} aria-live="polite">
                  {isModalBancadaTpPagtoCondicaoFormVisible ? '' : modalBancadaTpPagtoCondicaoStatusMessage}
                </p>

                <div className="management-pagination">
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setModalBancadaTpPagtoCondicaoPage(1)}
                    disabled={!canGoToPreviousModalBancadaTpPagtoCondicaoPage || isLoadingModalBancadaTpPagtoCondicaoItems}
                    title="Primeiro registro"
                    aria-label="Primeiro registro"
                  >
                    |◀
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setModalBancadaTpPagtoCondicaoPage((currentPage) => currentPage - 1)}
                    disabled={!canGoToPreviousModalBancadaTpPagtoCondicaoPage || isLoadingModalBancadaTpPagtoCondicaoItems}
                    title="Registro anterior"
                    aria-label="Registro anterior"
                  >
                    ◀
                  </button>
                  <span className="management-pagination-info">
                    Pagina {modalBancadaTpPagtoCondicaoPage} de {modalBancadaTpPagtoCondicaoTotalPages}
                  </span>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setModalBancadaTpPagtoCondicaoPage((currentPage) => currentPage + 1)}
                    disabled={!canGoToNextModalBancadaTpPagtoCondicaoPage || isLoadingModalBancadaTpPagtoCondicaoItems}
                    title="Proximo registro"
                    aria-label="Proximo registro"
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setModalBancadaTpPagtoCondicaoPage(modalBancadaTpPagtoCondicaoTotalPages)}
                    disabled={!canGoToNextModalBancadaTpPagtoCondicaoPage || isLoadingModalBancadaTpPagtoCondicaoItems}
                    title="Ultimo registro"
                    aria-label="Ultimo registro"
                  >
                    ▶|
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : activeView === 'modalBancadaTpPagtoCondicaoValor' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro financeiro</p>
              <h2 id="content-title">Tabela Modalidade x Bancada x Pagamento x Condicao Valor</h2>
              <p className="content-description">
                Cadastre os valores por data para a associacao de Modalidade x Bancada x Pagamento x Condicao.
                A combinacao entre associacao e data nao pode se repetir e o valor aceita zero.
              </p>
            </div>

            <div className="management-layout">
              <div className="management-toolbar">
                <button
                  type="button"
                  className="primary-button dre-insert-button"
                  onClick={handleStartInsertModalBancadaTpPagtoCondicaoValor}
                  disabled={isSavingModalBancadaTpPagtoCondicaoValor || isDeletingModalBancadaTpPagtoCondicaoValor || isLoadingModalBancadaTpPagtoCondicaoValorOptions}
                >
                  Inserir registro
                </button>

                <form className="management-filter-form" onSubmit={handleFilterModalBancadaTpPagtoCondicaoValorSubmit}>
                  <label className="field-group" htmlFor="modal-bancada-tp-pagto-condicao-valor-filter-associacao">
                    <span>Associacao</span>
                    <select
                      id="modal-bancada-tp-pagto-condicao-valor-filter-associacao"
                      value={modalBancadaTpPagtoCondicaoValorFilterAssociationCodigo}
                      onChange={(event) => setModalBancadaTpPagtoCondicaoValorFilterAssociationCodigo(event.target.value)}
                      disabled={isLoadingModalBancadaTpPagtoCondicaoValorItems || isLoadingModalBancadaTpPagtoCondicaoValorOptions}
                    >
                      <option value="">Todas</option>
                      {modalBancadaTpPagtoCondicaoValorOptions.map((item) => (
                        <option key={item.codigo} value={item.codigo}>
                          {formatModalBancadaTpPagtoCondicaoLabel(item)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field-group" htmlFor="modal-bancada-tp-pagto-condicao-valor-filter-data">
                    <span>Data</span>
                    <input
                      id="modal-bancada-tp-pagto-condicao-valor-filter-data"
                      type="date"
                      value={modalBancadaTpPagtoCondicaoValorFilterData}
                      onChange={(event) => setModalBancadaTpPagtoCondicaoValorFilterData(event.target.value)}
                      disabled={isLoadingModalBancadaTpPagtoCondicaoValorItems}
                    />
                  </label>
                  <button type="submit" className="secondary-button management-filter-button">
                    Filtrar
                  </button>
                  <button type="button" className="secondary-button management-filter-button" onClick={handleClearModalBancadaTpPagtoCondicaoValorFilter}>
                    Limpar
                  </button>
                </form>
              </div>

              {isModalBancadaTpPagtoCondicaoValorFormVisible ? (
                <div
                  className="management-modal-overlay"
                  role="presentation"
                  onClick={(event) => {
                    if (event.target === event.currentTarget && !isSavingModalBancadaTpPagtoCondicaoValor) {
                      handleCancelModalBancadaTpPagtoCondicaoValorForm()
                    }
                  }}
                >
                  <div
                    className="management-modal-shell"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-bancada-tp-pagto-condicao-valor-modal-title"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <form className="management-card management-form dre-form management-modal-form-card" onSubmit={handleCreateModalBancadaTpPagtoCondicaoValor} noValidate>
                      <div className="management-modal-header">
                        <div>
                          <p className="management-modal-kicker">Cadastro financeiro - MBTPVAL010</p>
                          <h2 id="modal-bancada-tp-pagto-condicao-valor-modal-title">MODALIDADE X BANCADA X PAGAMENTO X CONDICAO VALOR</h2>
                        </div>
                        <button
                          type="button"
                          className="secondary-button management-modal-close-button"
                          onClick={handleCancelModalBancadaTpPagtoCondicaoValorForm}
                          disabled={isSavingModalBancadaTpPagtoCondicaoValor}
                          aria-label="Fechar formulario da associacao de modalidade, bancada, pagamento e condicao valor"
                        >
                          X
                        </button>
                      </div>

                      <p className="management-modal-subtitle">
                        {modalBancadaTpPagtoCondicaoValorFormMode === 'view' ? 'Consulta de registro' : editingModalBancadaTpPagtoCondicaoValorCodigo ? 'Alterar registro' : 'Novo registro'}
                      </p>

                      <label className="field-group" htmlFor="modal-bancada-tp-pagto-condicao-valor-associacao">
                        <span>Associacao</span>
                        <select
                          id="modal-bancada-tp-pagto-condicao-valor-associacao"
                          value={modalBancadaTpPagtoCondicaoValorAssociationCodigo}
                          onChange={(event) => setModalBancadaTpPagtoCondicaoValorAssociationCodigo(event.target.value)}
                          disabled={isLoadingModalBancadaTpPagtoCondicaoValorOptions || isSavingModalBancadaTpPagtoCondicaoValor || modalBancadaTpPagtoCondicaoValorFormMode === 'view'}
                        >
                          <option value="">Selecione a associacao</option>
                          {modalBancadaTpPagtoCondicaoValorOptions.map((item) => (
                            <option key={item.codigo} value={item.codigo}>
                              {formatModalBancadaTpPagtoCondicaoLabel(item)}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="field-group" htmlFor="modal-bancada-tp-pagto-condicao-valor-data">
                        <span>Data</span>
                        <input
                          id="modal-bancada-tp-pagto-condicao-valor-data"
                          type="date"
                          value={modalBancadaTpPagtoCondicaoValorData}
                          onChange={(event) => setModalBancadaTpPagtoCondicaoValorData(event.target.value)}
                          disabled={isSavingModalBancadaTpPagtoCondicaoValor || modalBancadaTpPagtoCondicaoValorFormMode === 'view'}
                        />
                      </label>

                      <label className="field-group" htmlFor="modal-bancada-tp-pagto-condicao-valor-valor">
                        <span>Valor</span>
                        <input
                          id="modal-bancada-tp-pagto-condicao-valor-valor"
                          type="number"
                          min="0"
                          step="0.01"
                          value={modalBancadaTpPagtoCondicaoValorValor}
                          onChange={(event) => setModalBancadaTpPagtoCondicaoValorValor(event.target.value)}
                          disabled={isSavingModalBancadaTpPagtoCondicaoValor || modalBancadaTpPagtoCondicaoValorFormMode === 'view'}
                        />
                      </label>

                      <p className={`status-message status-${modalBancadaTpPagtoCondicaoValorStatusTone}`} aria-live="polite">
                        {modalBancadaTpPagtoCondicaoValorStatusMessage}
                      </p>

                      <div className="button-row dre-button-row management-modal-footer">
                        {modalBancadaTpPagtoCondicaoValorFormMode !== 'view' ? (
                          <button type="submit" className="primary-button" disabled={isSavingModalBancadaTpPagtoCondicaoValor || isLoadingModalBancadaTpPagtoCondicaoValorOptions}>
                            {isSavingModalBancadaTpPagtoCondicaoValor ? 'Salvando...' : editingModalBancadaTpPagtoCondicaoValorCodigo ? 'Salvar alteracao' : 'Salvar registro'}
                          </button>
                        ) : null}
                        <button type="button" className="secondary-button" onClick={handleCancelModalBancadaTpPagtoCondicaoValorForm} disabled={isSavingModalBancadaTpPagtoCondicaoValor}>
                          {modalBancadaTpPagtoCondicaoValorFormMode === 'view' ? 'Fechar' : 'Cancelar'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : null}

              <div className="management-card management-grid-card dre-list-card">
                <div className="management-grid-header">
                  <h2>Registros cadastrados</h2>
                  <span>
                    {isLoadingModalBancadaTpPagtoCondicaoValorItems ? 'Atualizando...' : `${modalBancadaTpPagtoCondicaoValorTotalItems} item(ns) encontrados`}
                  </span>
                </div>

                <div className="management-grid-wrapper">
                  <table className="dre-table">
                    <thead>
                      <tr>
                        <th>Modalidade</th>
                        <th>Tipo de Bancada</th>
                        <th>Tipo de Pagamento</th>
                        <th>Condicao</th>
                        <th>Data</th>
                        <th>Valor</th>
                        <th className="dre-actions-column">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalBancadaTpPagtoCondicaoValorItems.map((item) => (
                        <tr key={item.codigo}>
                          <td>{item.modalidadeDescricao}</td>
                          <td>{item.tipoBancadaDescricao}</td>
                          <td>{item.tipoPgtoDescricao}</td>
                          <td>{item.condicaoDescricao}</td>
                          <td>{item.data}</td>
                          <td>{new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.valor)}</td>
                          <td>
                            <div className="dre-row-actions">
                              <button
                                type="button"
                                className="row-action-button"
                                onClick={() => handleStartViewModalBancadaTpPagtoCondicaoValor(item)}
                              >
                                Consulta
                              </button>
                              <button
                                type="button"
                                className="row-action-button row-action-edit"
                                onClick={() => handleStartEditModalBancadaTpPagtoCondicaoValor(item)}
                                disabled={isDeletingModalBancadaTpPagtoCondicaoValor}
                              >
                                Alterar
                              </button>
                              {hasDeleteFormPermission(appFormEditAccessKeys.modalBancadaTpPagtoCondicaoValor) ? <button
                                type="button"
                                className="row-action-button row-action-delete"
                                onClick={() => handleDeleteModalBancadaTpPagtoCondicaoValor(item)}
                                disabled={isDeletingModalBancadaTpPagtoCondicaoValor}
                              >
                                Excluir
                              </button> : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {isLoadingModalBancadaTpPagtoCondicaoValorItems ? (
                    <p className="management-empty-state">Carregando registros...</p>
                  ) : null}

                  {!isLoadingModalBancadaTpPagtoCondicaoValorItems && !modalBancadaTpPagtoCondicaoValorItems.length ? (
                    <p className="management-empty-state">Nenhum registro de valor encontrado.</p>
                  ) : null}
                </div>

                <p className={`status-message status-${modalBancadaTpPagtoCondicaoValorStatusTone}`} aria-live="polite">
                  {isModalBancadaTpPagtoCondicaoValorFormVisible ? '' : modalBancadaTpPagtoCondicaoValorStatusMessage}
                </p>

                <div className="management-pagination">
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setModalBancadaTpPagtoCondicaoValorPage(1)}
                    disabled={!canGoToPreviousModalBancadaTpPagtoCondicaoValorPage || isLoadingModalBancadaTpPagtoCondicaoValorItems}
                    title="Primeiro registro"
                    aria-label="Primeiro registro"
                  >
                    |◀
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setModalBancadaTpPagtoCondicaoValorPage((currentPage) => currentPage - 1)}
                    disabled={!canGoToPreviousModalBancadaTpPagtoCondicaoValorPage || isLoadingModalBancadaTpPagtoCondicaoValorItems}
                    title="Registro anterior"
                    aria-label="Registro anterior"
                  >
                    ◀
                  </button>
                  <span className="management-pagination-info">
                    Pagina {modalBancadaTpPagtoCondicaoValorPage} de {modalBancadaTpPagtoCondicaoValorTotalPages}
                  </span>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setModalBancadaTpPagtoCondicaoValorPage((currentPage) => currentPage + 1)}
                    disabled={!canGoToNextModalBancadaTpPagtoCondicaoValorPage || isLoadingModalBancadaTpPagtoCondicaoValorItems}
                    title="Proximo registro"
                    aria-label="Proximo registro"
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setModalBancadaTpPagtoCondicaoValorPage(modalBancadaTpPagtoCondicaoValorTotalPages)}
                    disabled={!canGoToNextModalBancadaTpPagtoCondicaoValorPage || isLoadingModalBancadaTpPagtoCondicaoValorItems}
                    title="Ultimo registro"
                    aria-label="Ultimo registro"
                  >
                    ▶|
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : activeView === 'diasLetivos' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro financeiro</p>
              <h2 id="content-title">Dias Letivos</h2>
              <p className="content-description">
                Cadastre a quantidade de dias letivos por data de referencia. A tabela ja inicia com os dados mensais informados para 2025.
              </p>
            </div>

            <div className="management-layout">
              <div className="management-toolbar">
                <button
                  type="button"
                  className="primary-button dre-insert-button"
                  onClick={handleStartInsertDiasLetivos}
                  disabled={isSavingDiasLetivos || isDeletingDiasLetivos}
                >
                  Inserir registro
                </button>

                <form className="management-filter-form" onSubmit={handleFilterDiasLetivosSubmit}>
                  <input
                    className="management-filter-input"
                    type="text"
                    placeholder="Filtrar por competencia ou dias letivos"
                    value={diasLetivosSearch}
                    onChange={(event) => setDiasLetivosSearch(event.target.value)}
                  />
                  <button type="submit" className="secondary-button management-filter-button">
                    Filtrar
                  </button>
                  <button type="button" className="secondary-button management-filter-button" onClick={handleClearDiasLetivosFilter}>
                    Limpar
                  </button>
                </form>
              </div>

              {isDiasLetivosFormVisible ? (
                <div
                  className="management-modal-overlay"
                  role="presentation"
                  onClick={(event) => {
                    if (event.target === event.currentTarget && !isSavingDiasLetivos) {
                      handleCancelDiasLetivosForm()
                    }
                  }}
                >
                  <div
                    className="management-modal-shell"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="dias-letivos-modal-title"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <form className="management-card management-form dre-form management-modal-form-card" onSubmit={handleCreateDiasLetivos} noValidate>
                      <div className="management-modal-header">
                        <div>
                          <p className="management-modal-kicker">Cadastro financeiro - DIALETV011</p>
                          <h2 id="dias-letivos-modal-title">DIAS LETIVOS</h2>
                        </div>
                        <button
                          type="button"
                          className="secondary-button management-modal-close-button"
                          onClick={handleCancelDiasLetivosForm}
                          disabled={isSavingDiasLetivos}
                          aria-label="Fechar formulario de dias letivos"
                        >
                          X
                        </button>
                      </div>

                      <p className="management-modal-subtitle">
                        {diasLetivosFormMode === 'view' ? 'Consulta de registro' : editingDiasLetivosData ? 'Alterar registro' : 'Novo registro'}
                      </p>

                      <label className="field-group" htmlFor="dias-letivos-data">
                        <span>Competencia (MM/AAAA)</span>
                        <input
                          id="dias-letivos-data"
                          type="text"
                          inputMode="numeric"
                          placeholder="MM/AAAA"
                          maxLength={7}
                          autoComplete="off"
                          value={diasLetivosData}
                          onChange={(event) => setDiasLetivosData(normalizeMonthYearInput(event.target.value))}
                          disabled={isSavingDiasLetivos || diasLetivosFormMode === 'view'}
                          aria-invalid={Boolean(diasLetivosDataError)}
                        />
                        {diasLetivosDataError ? <strong className="field-error">{diasLetivosDataError}</strong> : null}
                      </label>

                      <label className="field-group" htmlFor="dias-letivos-quantidade">
                        <span>Dias Letivos</span>
                        <input
                          id="dias-letivos-quantidade"
                          type="number"
                          min="0"
                          step="1"
                          value={diasLetivosQuantidade}
                          onChange={(event) => setDiasLetivosQuantidade(event.target.value)}
                          disabled={isSavingDiasLetivos || diasLetivosFormMode === 'view'}
                          aria-invalid={Boolean(diasLetivosQuantidadeError)}
                        />
                        {diasLetivosQuantidadeError ? <strong className="field-error">{diasLetivosQuantidadeError}</strong> : null}
                      </label>

                      <p className={`status-message status-${diasLetivosStatusTone}`} aria-live="polite">
                        {diasLetivosStatusMessage}
                      </p>

                      <div className="button-row dre-button-row management-modal-footer">
                        {diasLetivosFormMode !== 'view' ? (
                          <button type="submit" className="primary-button" disabled={isSavingDiasLetivos}>
                            {isSavingDiasLetivos ? 'Salvando...' : editingDiasLetivosData ? 'Salvar alteracao' : 'Salvar Dias Letivos'}
                          </button>
                        ) : null}
                        <button type="button" className="secondary-button" onClick={handleCancelDiasLetivosForm} disabled={isSavingDiasLetivos}>
                          {diasLetivosFormMode === 'view' ? 'Fechar' : 'Cancelar'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : null}

              <div className="management-card management-grid-card dre-list-card">
                <div className="management-grid-header">
                  <h2>Registros cadastrados</h2>
                  <span>
                    {isLoadingDiasLetivos ? 'Atualizando...' : `${diasLetivosTotalItems} item(ns) encontrados`}
                  </span>
                </div>

                <div className="management-grid-wrapper">
                  <table className="dre-table">
                    <thead>
                      <tr>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortDiasLetivos('data')}>
                                    Competencia <span>{getDiasLetivosSortIndicator('data')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortDiasLetivos('diasLetivos')}>
                            Dias Letivos <span>{getDiasLetivosSortIndicator('diasLetivos')}</span>
                          </button>
                        </th>
                        <th className="dre-actions-column">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diasLetivosItems.map((item) => (
                        <tr key={item.data}>
                          <td>{item.data}</td>
                          <td>{item.diasLetivos}</td>
                          <td>
                            <div className="dre-row-actions">
                              <button type="button" className="row-action-button" onClick={() => handleStartViewDiasLetivos(item)}>
                                Consulta
                              </button>
                              {hasDiasLetivosEditFormAccess ? <button type="button" className="row-action-button row-action-edit" onClick={() => handleStartEditDiasLetivos(item)}>
                                Alterar
                              </button> : null}
                              {hasDeleteFormPermission(appFormEditAccessKeys.diasLetivos) ? <button type="button" className="row-action-button row-action-delete" onClick={() => handleDeleteDiasLetivos(item)}>
                                Excluir
                              </button> : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {!isLoadingDiasLetivos && diasLetivosItems.length === 0 ? (
                    <p className="management-empty-state">Nenhum registro de dias letivos encontrado.</p>
                  ) : null}
                </div>

                <p className={`status-message status-${diasLetivosStatusTone}`} aria-live="polite">
                  {isDiasLetivosFormVisible ? '' : diasLetivosStatusMessage}
                </p>

                <div className="management-pagination">
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setDiasLetivosPage(1)}
                    disabled={!canGoToPreviousDiasLetivosPage || isLoadingDiasLetivos}
                    title="Primeiro registro"
                    aria-label="Primeiro registro"
                  >
                    |◀
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setDiasLetivosPage((currentPage) => currentPage - 1)}
                    disabled={!canGoToPreviousDiasLetivosPage || isLoadingDiasLetivos}
                    title="Registro anterior"
                    aria-label="Registro anterior"
                  >
                    ◀
                  </button>
                  <span className="management-pagination-info">
                    Pagina {diasLetivosPage} de {diasLetivosTotalPages}
                  </span>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setDiasLetivosPage((currentPage) => currentPage + 1)}
                    disabled={!canGoToNextDiasLetivosPage || isLoadingDiasLetivos}
                    title="Proximo registro"
                    aria-label="Proximo registro"
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setDiasLetivosPage(diasLetivosTotalPages)}
                    disabled={!canGoToNextDiasLetivosPage || isLoadingDiasLetivos}
                    title="Ultimo registro"
                    aria-label="Ultimo registro"
                  >
                    ▶|
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : activeView === 'kmValor' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro financeiro</p>
              <h2 id="content-title">Tabela Km_Valor</h2>
              <p className="content-description">
                Cadastre os valores por data vinculados a Condicao. A combinacao entre condicao e data nao pode se repetir e o valor aceita zero.
              </p>
            </div>

            <div className="management-layout">
              <div className="management-toolbar">
                <button
                  type="button"
                  className="primary-button dre-insert-button"
                  onClick={handleStartInsertKmValor}
                  disabled={isSavingKmValor || isDeletingKmValor || isLoadingKmValorOptions}
                >
                  Inserir registro
                </button>

                <form className="management-filter-form" onSubmit={handleFilterKmValorSubmit}>
                  <label className="field-group" htmlFor="km-valor-filter-condicao">
                    <span>Condicao</span>
                    <select
                      id="km-valor-filter-condicao"
                      value={kmValorFilterCondicaoCodigo}
                      onChange={(event) => setKmValorFilterCondicaoCodigo(event.target.value)}
                      disabled={isLoadingKmValorItems || isLoadingKmValorOptions}
                    >
                      <option value="">Todas</option>
                      {kmValorCondicaoOptions.map((item) => (
                        <option key={item.codigo} value={item.codigo}>
                          {item.descricao} ({item.qtdeIni} a {item.qtdeFim})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field-group" htmlFor="km-valor-filter-data">
                    <span>Data</span>
                    <input
                      id="km-valor-filter-data"
                      type="date"
                      value={kmValorFilterData}
                      onChange={(event) => setKmValorFilterData(event.target.value)}
                      disabled={isLoadingKmValorItems}
                    />
                  </label>
                  <button type="submit" className="secondary-button management-filter-button">
                    Filtrar
                  </button>
                  <button type="button" className="secondary-button management-filter-button" onClick={handleClearKmValorFilter}>
                    Limpar
                  </button>
                </form>
              </div>

              {isKmValorFormVisible ? (
                <div
                  className="management-modal-overlay"
                  role="presentation"
                  onClick={(event) => {
                    if (event.target === event.currentTarget && !isSavingKmValor) {
                      handleCancelKmValorForm()
                    }
                  }}
                >
                  <div
                    className="management-modal-shell"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="km-valor-modal-title"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <form className="management-card management-form dre-form management-modal-form-card" onSubmit={handleCreateKmValor} noValidate>
                      <div className="management-modal-header">
                        <div>
                          <p className="management-modal-kicker">Cadastro financeiro - KMVALOR012</p>
                          <h2 id="km-valor-modal-title">KM_VALOR</h2>
                        </div>
                        <button
                          type="button"
                          className="secondary-button management-modal-close-button"
                          onClick={handleCancelKmValorForm}
                          disabled={isSavingKmValor}
                          aria-label="Fechar formulario de km valor"
                        >
                          X
                        </button>
                      </div>

                      <p className="management-modal-subtitle">
                        {kmValorFormMode === 'view' ? 'Consulta de registro' : editingKmValorCodigo ? 'Alterar registro' : 'Novo registro'}
                      </p>

                      <label className="field-group" htmlFor="km-valor-condicao">
                        <span>Condicao</span>
                        <select
                          id="km-valor-condicao"
                          value={kmValorCondicaoCodigo}
                          onChange={(event) => setKmValorCondicaoCodigo(event.target.value)}
                          disabled={isLoadingKmValorOptions || isSavingKmValor || kmValorFormMode === 'view'}
                        >
                          <option value="">Selecione a condicao</option>
                          {kmValorCondicaoOptions.map((item) => (
                            <option key={item.codigo} value={item.codigo}>
                              {item.descricao} ({item.qtdeIni} a {item.qtdeFim})
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="field-group" htmlFor="km-valor-data">
                        <span>Data</span>
                        <input
                          id="km-valor-data"
                          type="date"
                          value={kmValorData}
                          onChange={(event) => setKmValorData(event.target.value)}
                          disabled={isSavingKmValor || kmValorFormMode === 'view'}
                        />
                      </label>

                      <label className="field-group" htmlFor="km-valor-valor">
                        <span>Valor</span>
                        <input
                          id="km-valor-valor"
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          value={kmValorValor}
                          onChange={(event) => setKmValorValor(formatCurrencyInput(event.target.value))}
                          disabled={isSavingKmValor || kmValorFormMode === 'view'}
                        />
                      </label>

                      <p className={`status-message status-${kmValorStatusTone}`} aria-live="polite">
                        {kmValorStatusMessage}
                      </p>

                      <div className="button-row dre-button-row management-modal-footer">
                        {kmValorFormMode !== 'view' ? (
                          <button type="submit" className="primary-button" disabled={isSavingKmValor || isLoadingKmValorOptions}>
                            {isSavingKmValor ? 'Salvando...' : editingKmValorCodigo ? 'Salvar alteracao' : 'Salvar registro'}
                          </button>
                        ) : null}
                        <button type="button" className="secondary-button" onClick={handleCancelKmValorForm} disabled={isSavingKmValor}>
                          {kmValorFormMode === 'view' ? 'Fechar' : 'Cancelar'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : null}

              <div className="management-card management-grid-card dre-list-card">
                <div className="management-grid-header">
                  <h2>Registros cadastrados</h2>
                  <span>
                    {isLoadingKmValorItems ? 'Atualizando...' : `${kmValorTotalItems} item(ns) encontrados`}
                  </span>
                </div>

                <div className="management-grid-wrapper">
                  <table className="dre-table">
                    <thead>
                      <tr>
                        <th>Condicao</th>
                        <th>Data</th>
                        <th>Valor</th>
                        <th className="dre-actions-column">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kmValorItems.map((item) => (
                        <tr key={item.codigo}>
                          <td>{item.condicaoDescricao}</td>
                          <td>{item.data}</td>
                          <td>{new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.valor)}</td>
                          <td>
                            <div className="dre-row-actions">
                              <button
                                type="button"
                                className="row-action-button"
                                onClick={() => handleStartViewKmValor(item)}
                              >
                                Consulta
                              </button>
                              <button
                                type="button"
                                className="row-action-button row-action-edit"
                                onClick={() => handleStartEditKmValor(item)}
                                disabled={isDeletingKmValor}
                              >
                                Alterar
                              </button>
                              {hasDeleteFormPermission(appFormEditAccessKeys.kmValor) ? <button
                                type="button"
                                className="row-action-button row-action-delete"
                                onClick={() => handleDeleteKmValor(item)}
                                disabled={isDeletingKmValor}
                              >
                                Excluir
                              </button> : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {isLoadingKmValorItems ? (
                    <p className="management-empty-state">Carregando registros...</p>
                  ) : null}

                  {!isLoadingKmValorItems && !kmValorItems.length ? (
                    <p className="management-empty-state">Nenhum registro de km valor encontrado.</p>
                  ) : null}
                </div>

                <p className={`status-message status-${kmValorStatusTone}`} aria-live="polite">
                  {isKmValorFormVisible ? '' : kmValorStatusMessage}
                </p>

                <div className="management-pagination">
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setKmValorPage(1)}
                    disabled={!canGoToPreviousKmValorPage || isLoadingKmValorItems}
                    title="Primeiro registro"
                    aria-label="Primeiro registro"
                  >
                    |◀
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setKmValorPage((currentPage) => currentPage - 1)}
                    disabled={!canGoToPreviousKmValorPage || isLoadingKmValorItems}
                    title="Registro anterior"
                    aria-label="Registro anterior"
                  >
                    ◀
                  </button>
                  <span className="management-pagination-info">
                    Pagina {kmValorPage} de {kmValorTotalPages}
                  </span>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setKmValorPage((currentPage) => currentPage + 1)}
                    disabled={!canGoToNextKmValorPage || isLoadingKmValorItems}
                    title="Proximo registro"
                    aria-label="Proximo registro"
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setKmValorPage(kmValorTotalPages)}
                    disabled={!canGoToNextKmValorPage || isLoadingKmValorItems}
                    title="Ultimo registro"
                    aria-label="Ultimo registro"
                  >
                    ▶|
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : activeView === 'continuaValor' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro financeiro</p>
              <h2 id="content-title">Tabela Continua_Valor</h2>
              <p className="content-description">
                Cadastre os valores por data para o tipo Continua. O tipo continua usa combobox com as opcoes Regular e Cadeirante, e a combinacao entre tipo e data nao pode se repetir.
              </p>
            </div>

            <div className="management-layout">
              <div className="management-toolbar">
                <button
                  type="button"
                  className="primary-button dre-insert-button"
                  onClick={handleStartInsertContinuaValor}
                  disabled={isSavingContinuaValor || isDeletingContinuaValor}
                >
                  Inserir registro
                </button>

                <form className="management-filter-form" onSubmit={handleFilterContinuaValorSubmit}>
                  <label className="field-group" htmlFor="continua-valor-filter-tipo">
                    <span>Tipo Continua</span>
                    <select
                      id="continua-valor-filter-tipo"
                      value={continuaValorFilterTipo}
                      onChange={(event) => setContinuaValorFilterTipo(event.target.value as ContinuaValorTipo | '')}
                      disabled={isLoadingContinuaValorItems}
                    >
                      <option value="">Todos</option>
                      {CONTINUA_TIPO_OPTIONS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field-group" htmlFor="continua-valor-filter-data">
                    <span>Data</span>
                    <input
                      id="continua-valor-filter-data"
                      type="date"
                      value={continuaValorFilterData}
                      onChange={(event) => setContinuaValorFilterData(event.target.value)}
                      disabled={isLoadingContinuaValorItems}
                    />
                  </label>
                  <button type="submit" className="secondary-button management-filter-button">
                    Filtrar
                  </button>
                  <button type="button" className="secondary-button management-filter-button" onClick={handleClearContinuaValorFilter}>
                    Limpar
                  </button>
                </form>
              </div>

              {isContinuaValorFormVisible ? (
                <div
                  className="management-modal-overlay"
                  role="presentation"
                  onClick={(event) => {
                    if (event.target === event.currentTarget && !isSavingContinuaValor) {
                      handleCancelContinuaValorForm()
                    }
                  }}
                >
                  <div
                    className="management-modal-shell"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="continua-valor-modal-title"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <form className="management-card management-form dre-form management-modal-form-card" onSubmit={handleCreateContinuaValor} noValidate>
                      <div className="management-modal-header">
                        <div>
                          <p className="management-modal-kicker">Cadastro financeiro - CNTVALR013</p>
                          <h2 id="continua-valor-modal-title">CONTINUA_VALOR</h2>
                        </div>
                        <button
                          type="button"
                          className="secondary-button management-modal-close-button"
                          onClick={handleCancelContinuaValorForm}
                          disabled={isSavingContinuaValor}
                          aria-label="Fechar formulario de continua valor"
                        >
                          X
                        </button>
                      </div>

                      <p className="management-modal-subtitle">
                        {continuaValorFormMode === 'view' ? 'Consulta de registro' : editingContinuaValorCodigo ? 'Alterar registro' : 'Novo registro'}
                      </p>

                      <label className="field-group" htmlFor="continua-valor-tipo">
                        <span>Tipo Continua</span>
                        <select
                          id="continua-valor-tipo"
                          value={continuaValorTipo}
                          onChange={(event) => setContinuaValorTipo(event.target.value as ContinuaValorTipo | '')}
                          disabled={isSavingContinuaValor || continuaValorFormMode === 'view'}
                        >
                          <option value="">Selecione o tipo continua</option>
                          {CONTINUA_TIPO_OPTIONS.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="field-group" htmlFor="continua-valor-data">
                        <span>Data</span>
                        <input
                          id="continua-valor-data"
                          type="date"
                          value={continuaValorData}
                          onChange={(event) => setContinuaValorData(event.target.value)}
                          disabled={isSavingContinuaValor || continuaValorFormMode === 'view'}
                        />
                      </label>

                      <label className="field-group" htmlFor="continua-valor-valor">
                        <span>Valor</span>
                        <input
                          id="continua-valor-valor"
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          value={continuaValorValor}
                          onChange={(event) => setContinuaValorValor(formatCurrencyInput(event.target.value))}
                          disabled={isSavingContinuaValor || continuaValorFormMode === 'view'}
                        />
                      </label>

                      <p className={`status-message status-${continuaValorStatusTone}`} aria-live="polite">
                        {continuaValorStatusMessage}
                      </p>

                      <div className="button-row dre-button-row management-modal-footer">
                        {continuaValorFormMode !== 'view' ? (
                          <button type="submit" className="primary-button" disabled={isSavingContinuaValor}>
                            {isSavingContinuaValor ? 'Salvando...' : editingContinuaValorCodigo ? 'Salvar alteracao' : 'Salvar registro'}
                          </button>
                        ) : null}
                        <button type="button" className="secondary-button" onClick={handleCancelContinuaValorForm} disabled={isSavingContinuaValor}>
                          {continuaValorFormMode === 'view' ? 'Fechar' : 'Cancelar'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : null}

              <div className="management-card management-grid-card dre-list-card">
                <div className="management-grid-header">
                  <h2>Registros cadastrados</h2>
                  <span>
                    {isLoadingContinuaValorItems ? 'Atualizando...' : `${continuaValorTotalItems} item(ns) encontrados`}
                  </span>
                </div>

                <div className="management-grid-wrapper">
                  <table className="dre-table">
                    <thead>
                      <tr>
                        <th>Tipo Continua</th>
                        <th>Data</th>
                        <th>Valor</th>
                        <th className="dre-actions-column">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {continuaValorItems.map((item) => (
                        <tr key={item.codigo}>
                          <td>{item.tipoContinua}</td>
                          <td>{item.data}</td>
                          <td>{new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.valor)}</td>
                          <td>
                            <div className="dre-row-actions">
                              <button
                                type="button"
                                className="row-action-button"
                                onClick={() => handleStartViewContinuaValor(item)}
                              >
                                Consulta
                              </button>
                              <button
                                type="button"
                                className="row-action-button row-action-edit"
                                onClick={() => handleStartEditContinuaValor(item)}
                                disabled={isDeletingContinuaValor}
                              >
                                Alterar
                              </button>
                              {hasDeleteFormPermission(appFormEditAccessKeys.continuaValor) ? <button
                                type="button"
                                className="row-action-button row-action-delete"
                                onClick={() => handleDeleteContinuaValor(item)}
                                disabled={isDeletingContinuaValor}
                              >
                                Excluir
                              </button> : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {isLoadingContinuaValorItems ? (
                    <p className="management-empty-state">Carregando registros...</p>
                  ) : null}

                  {!isLoadingContinuaValorItems && !continuaValorItems.length ? (
                    <p className="management-empty-state">Nenhum registro de continua valor encontrado.</p>
                  ) : null}
                </div>

                <p className={`status-message status-${continuaValorStatusTone}`} aria-live="polite">
                  {isContinuaValorFormVisible ? '' : continuaValorStatusMessage}
                </p>

                <div className="management-pagination">
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setContinuaValorPage(1)}
                    disabled={!canGoToPreviousContinuaValorPage || isLoadingContinuaValorItems}
                    title="Primeiro registro"
                    aria-label="Primeiro registro"
                  >
                    |◀
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setContinuaValorPage((currentPage) => currentPage - 1)}
                    disabled={!canGoToPreviousContinuaValorPage || isLoadingContinuaValorItems}
                    title="Registro anterior"
                    aria-label="Registro anterior"
                  >
                    ◀
                  </button>
                  <span className="management-pagination-info">
                    Pagina {continuaValorPage} de {continuaValorTotalPages}
                  </span>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setContinuaValorPage((currentPage) => currentPage + 1)}
                    disabled={!canGoToNextContinuaValorPage || isLoadingContinuaValorItems}
                    title="Proximo registro"
                    aria-label="Proximo registro"
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setContinuaValorPage(continuaValorTotalPages)}
                    disabled={!canGoToNextContinuaValorPage || isLoadingContinuaValorItems}
                    title="Ultimo registro"
                    aria-label="Ultimo registro"
                  >
                    ▶|
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : activeView === 'tipoBancada' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro administrativo</p>
              <h2 id="content-title">Tabela Tipo de Bancada</h2>
              <p className="content-description">
                Cadastre e consulte os registros da tabela Tipo de Bancada. O codigo e gerado
                automaticamente e a descricao nao pode se repetir.
              </p>
            </div>

            <div className="management-layout">
              <div className="management-toolbar">
                <button
                  type="button"
                  className="primary-button dre-insert-button"
                  onClick={handleStartInsertTipoBancada}
                  disabled={isSavingTipoBancada || isDeletingTipoBancada}
                >
                  Inserir registro
                </button>

                <form className="management-filter-form" onSubmit={handleFilterTipoBancadaSubmit}>
                  <input
                    className="management-filter-input"
                    type="text"
                    placeholder="Filtrar por codigo ou descricao"
                    value={tipoBancadaSearch}
                    onChange={(event) => setTipoBancadaSearch(event.target.value)}
                  />
                  <button type="submit" className="secondary-button management-filter-button">
                    Filtrar
                  </button>
                  <button type="button" className="secondary-button management-filter-button" onClick={handleClearTipoBancadaFilter}>
                    Limpar
                  </button>
                </form>
              </div>

              {isTipoBancadaFormVisible ? (
                <div
                  className="management-modal-overlay"
                  role="presentation"
                  onClick={(event) => {
                    if (event.target === event.currentTarget && !isSavingTipoBancada) {
                      handleCancelTipoBancadaForm()
                    }
                  }}
                >
                  <div
                    className="management-modal-shell"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="tipo-bancada-modal-title"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <form className="management-card management-form dre-form management-modal-form-card" onSubmit={handleCreateTipoBancada} noValidate>
                      <div className="management-modal-header">
                        <div>
                          <p className="management-modal-kicker">Cadastro administrativo - TIPBANC014</p>
                          <h2 id="tipo-bancada-modal-title">TIPO DE BANCADA</h2>
                        </div>
                        <button
                          type="button"
                          className="secondary-button management-modal-close-button"
                          onClick={handleCancelTipoBancadaForm}
                          disabled={isSavingTipoBancada}
                          aria-label="Fechar formulario de tipo de bancada"
                        >
                          X
                        </button>
                      </div>

                      <p className="management-modal-subtitle">
                        {tipoBancadaFormMode === 'view' ? 'Consulta de registro' : editingTipoBancadaCodigo ? 'Alterar registro' : 'Novo registro'}
                      </p>

                      <label className="field-group" htmlFor="tipo-bancada-descricao">
                        <span>Descricao</span>
                        <input
                          id="tipo-bancada-descricao"
                          name="descricao"
                          type="text"
                          value={tipoBancadaDescricao}
                          onChange={(event) => setTipoBancadaDescricao(event.target.value)}
                          disabled={isSavingTipoBancada || tipoBancadaFormMode === 'view'}
                          aria-invalid={Boolean(tipoBancadaDescricaoError)}
                        />
                        {tipoBancadaDescricaoError ? <strong className="field-error">{tipoBancadaDescricaoError}</strong> : null}
                      </label>

                      <p className={`status-message status-${tipoBancadaStatusTone}`} aria-live="polite">
                        {tipoBancadaStatusMessage}
                      </p>

                      <div className="button-row dre-button-row management-modal-footer">
                        {tipoBancadaFormMode !== 'view' ? (
                          <button type="submit" className="primary-button" disabled={isSavingTipoBancada}>
                            {isSavingTipoBancada ? 'Salvando...' : editingTipoBancadaCodigo ? 'Salvar alteracao' : 'Salvar Tipo de Bancada'}
                          </button>
                        ) : null}
                        <button type="button" className="secondary-button" onClick={handleCancelTipoBancadaForm} disabled={isSavingTipoBancada}>
                          {tipoBancadaFormMode === 'view' ? 'Fechar' : 'Cancelar'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : null}

              <div className="management-card management-grid-card dre-list-card">
                <div className="management-grid-header">
                  <h2>Registros cadastrados</h2>
                  <span>
                    {isLoadingTipoBancada ? 'Atualizando...' : `${tipoBancadaTotalItems} item(ns) encontrados`}
                  </span>
                </div>

                <div className="management-grid-wrapper">
                  <table className="dre-table">
                    <thead>
                      <tr>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortTipoBancada('codigo')}>
                            Codigo <span>{getTipoBancadaSortIndicator('codigo')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortTipoBancada('descricao')}>
                            Descricao <span>{getTipoBancadaSortIndicator('descricao')}</span>
                          </button>
                        </th>
                        <th className="dre-actions-column">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tipoBancadaItems.map((item) => (
                        <tr key={item.codigo}>
                          <td>{item.codigo}</td>
                          <td>{item.descricao}</td>
                          <td>
                            <div className="dre-row-actions">
                              <button type="button" className="row-action-button" onClick={() => handleStartViewTipoBancada(item)}>
                                Consulta
                              </button>
                              {hasTipoBancadaEditFormAccess ? <button type="button" className="row-action-button row-action-edit" onClick={() => handleStartEditTipoBancada(item)}>
                                Alterar
                              </button> : null}
                              {hasDeleteFormPermission(appFormEditAccessKeys.tipoBancada) ? <button type="button" className="row-action-button row-action-delete" onClick={() => handleDeleteTipoBancada(item)}>
                                Excluir
                              </button> : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {!isLoadingTipoBancada && tipoBancadaItems.length === 0 ? (
                    <p className="management-empty-state">Nenhum registro de tipo de bancada encontrado.</p>
                  ) : null}
                </div>

                <p className={`status-message status-${tipoBancadaStatusTone}`} aria-live="polite">
                  {isTipoBancadaFormVisible ? '' : tipoBancadaStatusMessage}
                </p>

                <div className="management-pagination">
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setTipoBancadaPage(1)}
                    disabled={!canGoToPreviousTipoBancadaPage || isLoadingTipoBancada}
                    title="Primeiro registro"
                    aria-label="Primeiro registro"
                  >
                    |◀
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setTipoBancadaPage((currentPage) => currentPage - 1)}
                    disabled={!canGoToPreviousTipoBancadaPage || isLoadingTipoBancada}
                    title="Registro anterior"
                    aria-label="Registro anterior"
                  >
                    ◀
                  </button>
                  <span className="management-pagination-info">
                    Pagina {tipoBancadaPage} de {tipoBancadaTotalPages}
                  </span>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setTipoBancadaPage((currentPage) => currentPage + 1)}
                    disabled={!canGoToNextTipoBancadaPage || isLoadingTipoBancada}
                    title="Proximo registro"
                    aria-label="Proximo registro"
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setTipoBancadaPage(tipoBancadaTotalPages)}
                    disabled={!canGoToNextTipoBancadaPage || isLoadingTipoBancada}
                    title="Ultimo registro"
                    aria-label="Ultimo registro"
                  >
                    ▶|
                  </button>
                </div>
              </div>
            </div>

            <div className="management-card management-grid-card dre-list-card">
              <div className="management-grid-header">
                <h2>Associações Modalidade x Tipo de Bancada</h2>
                <span>{tipoBancadaAssociationItems.length} associação(ões) cadastrada(s)</span>
              </div>

              <div className="management-toolbar">
                <form className="management-filter-form" onSubmit={handleAddTipoBancadaAssociation}>
                  <label className="field-group" htmlFor="association-modalidade">
                    <span>Modalidade</span>
                    <select
                      id="association-modalidade"
                      value={associationModalidadeCodigo}
                      onChange={(event) => setAssociationModalidadeCodigo(event.target.value)}
                      disabled={isLoadingAssociationOptions || isSavingTipoBancadaAssociation}
                    >
                      <option value="">Selecione a modalidade</option>
                      {associationModalidadeOptions.map((item) => (
                        <option key={item.codigo} value={item.codigo}>
                          {item.codigo} - {item.descricao}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field-group" htmlFor="association-tipo-bancada">
                    <span>Tipo de Bancada</span>
                    <select
                      id="association-tipo-bancada"
                      value={associationTipoBancadaCodigo}
                      onChange={(event) => setAssociationTipoBancadaCodigo(event.target.value)}
                      disabled={isLoadingAssociationOptions || isSavingTipoBancadaAssociation}
                    >
                      <option value="">Selecione o tipo de bancada</option>
                      {associationTipoBancadaOptions.map((item) => (
                        <option key={item.codigo} value={item.codigo}>
                          {item.codigo} - {item.descricao}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button type="submit" className="primary-button" disabled={isLoadingAssociationOptions || isSavingTipoBancadaAssociation}>
                    {isLoadingAssociationOptions ? 'Carregando...' : isSavingTipoBancadaAssociation ? 'Criando...' : 'Criar associação'}
                  </button>
                </form>
              </div>

              <p className={`status-message status-${associationStatusTone}`} aria-live="polite">
                {associationStatusMessage}
              </p>

              <div className="management-grid-wrapper">
                <table className="dre-table">
                  <thead>
                    <tr>
                      <th>Modalidade</th>
                      <th>Tipo de Bancada</th>
                      <th className="dre-actions-column">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tipoBancadaAssociationItems.map((item) => (
                      <tr key={item.codigo}>
                        <td>{item.modalidadeCodigo} - {item.modalidadeDescricao}</td>
                        <td>{item.tipoBancadaCodigo} - {item.tipoBancadaDescricao}</td>
                        <td>
                          <div className="dre-row-actions">
                            {hasDeleteFormPermission(appFormEditAccessKeys.tipoBancada) ? <button
                              type="button"
                              className="row-action-button row-action-delete"
                              onClick={() => handleDeleteTipoBancadaAssociation(item)}
                              disabled={isDeletingTipoBancadaAssociation}
                            >
                              Excluir
                            </button> : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {isLoadingTipoBancadaAssociations ? (
                  <p className="management-empty-state">Carregando associações...</p>
                ) : null}

                {!tipoBancadaAssociationItems.length ? (
                  <p className="management-empty-state">Nenhuma associação cadastrada.</p>
                ) : null}
              </div>
            </div>
          </>
        ) : activeView === 'titular' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro administrativo</p>
              <h2 id="content-title">Tabela Titular do CRM</h2>
              <p className="content-description">
                Cadastre e consulte os registros de titulares do CRM carregados inicialmente a partir do XML. O codigo e gerado automaticamente, com filtro, ordenacao, paginacao e CRUD completo.
              </p>
            </div>

            <div className="management-layout">
              <div className="management-toolbar">
                <button
                  type="button"
                  className="primary-button dre-insert-button"
                  onClick={handleStartInsertTitular}
                  disabled={isSavingTitular || isDeletingTitular}
                >
                  Inserir registro
                </button>

                <form className="management-filter-form" onSubmit={handleFilterTitularSubmit}>
                  <input
                    className="management-filter-input"
                    type="text"
                    placeholder="Filtrar por codigo, CNPJ/CPF ou titular do CRM"
                    value={titularSearch}
                    onChange={(event) => setTitularSearch(event.target.value)}
                  />
                  <button type="submit" className="secondary-button management-filter-button">
                    Filtrar
                  </button>
                  <button type="button" className="secondary-button management-filter-button" onClick={handleClearTitularFilter}>
                    Limpar
                  </button>
                </form>
              </div>

              {isTitularFormVisible ? (
                <div
                  className="management-modal-overlay"
                  role="presentation"
                  onClick={(event) => {
                    if (event.target === event.currentTarget && !isSavingTitular) {
                      handleCancelTitularForm()
                    }
                  }}
                >
                  <div
                    className="management-modal-shell"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="titular-modal-title"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <form className="management-card management-form dre-form management-modal-form-card" onSubmit={handleCreateTitular} noValidate>
                      <div className="management-modal-header">
                        <div>
                          <p className="management-modal-kicker">Cadastro administrativo - TITUCRM015</p>
                          <h2 id="titular-modal-title">TITULAR DO CRM</h2>
                        </div>
                        <button
                          type="button"
                          className="secondary-button management-modal-close-button"
                          onClick={handleCancelTitularForm}
                          disabled={isSavingTitular}
                          aria-label="Fechar formulario de titular do CRM"
                        >
                          X
                        </button>
                      </div>

                      <p className="management-modal-subtitle">
                        {titularFormMode === 'view' ? 'Consulta de registro' : editingTitularCodigo ? 'Alterar registro' : 'Novo registro'}
                      </p>

                      <label className="field-group" htmlFor="titular-cnpj-cpf">
                        <span>CNPJ/CPF</span>
                        <input
                          id="titular-cnpj-cpf"
                          name="cnpj-cpf"
                          type="text"
                          inputMode="numeric"
                          placeholder="000.000.000-00 ou 00.000.000/0000-00"
                          maxLength={18}
                          value={titularCnpjCpf}
                          onChange={(event) => setTitularCnpjCpf(formatCpfOrCnpj(event.target.value))}
                          disabled={isSavingTitular || titularFormMode === 'view'}
                          aria-invalid={Boolean(titularCnpjCpfError)}
                        />
                        {titularCnpjCpfError ? <strong className="field-error">{titularCnpjCpfError}</strong> : null}
                      </label>

                      <label className="field-group" htmlFor="titular-nome">
                        <span>Titular do CRM</span>
                        <input
                          id="titular-nome"
                          name="titular"
                          type="text"
                          value={titularNome}
                          onChange={(event) => setTitularNome(event.target.value)}
                          disabled={isSavingTitular || titularFormMode === 'view'}
                          aria-invalid={Boolean(titularNomeError)}
                        />
                        {titularNomeError ? <strong className="field-error">{titularNomeError}</strong> : null}
                      </label>

                      <p className={`status-message status-${titularStatusTone}`} aria-live="polite">
                        {titularStatusMessage}
                      </p>

                      <div className="button-row dre-button-row management-modal-footer">
                        {titularFormMode !== 'view' ? (
                          <button type="submit" className="primary-button" disabled={isSavingTitular}>
                            {isSavingTitular ? 'Salvando...' : editingTitularCodigo ? 'Salvar alteracao' : 'Salvar titular do CRM'}
                          </button>
                        ) : null}
                        <button type="button" className="secondary-button" onClick={handleCancelTitularForm} disabled={isSavingTitular}>
                          {titularFormMode === 'view' ? 'Fechar' : 'Cancelar'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : null}

              <div className="management-card management-grid-card dre-list-card">
                <div className="management-grid-header">
                  <h2>Registros cadastrados</h2>
                  <span>
                    {isLoadingTitular ? 'Atualizando...' : `${titularTotalItems} item(ns) encontrados`}
                  </span>
                </div>

                <div className="management-grid-wrapper">
                  <table className="dre-table">
                    <thead>
                      <tr>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortTitular('codigo')}>
                            Codigo <span>{getTitularSortIndicator('codigo')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortTitular('cnpj_cpf')}>
                            CNPJ/CPF <span>{getTitularSortIndicator('cnpj_cpf')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortTitular('titular')}>
                            Titular do CRM <span>{getTitularSortIndicator('titular')}</span>
                          </button>
                        </th>
                        <th className="dre-actions-column">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {titularItems.map((item) => (
                        <tr key={item.codigo}>
                          <td>{item.codigo}</td>
                          <td>{item.cnpj_cpf}</td>
                          <td>{item.titular}</td>
                          <td>
                            <div className="dre-row-actions dre-row-actions-icons">
                              <button type="button" className="row-action-button row-action-view" onClick={() => handleStartViewTitular(item)} title="Consulta" aria-label="Consulta">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><line x1="16.65" y1="16.65" x2="21" y2="21"/></svg>
                              </button>
                              {hasTitularEditFormAccess ? <button type="button" className="row-action-button row-action-edit" onClick={() => handleStartEditTitular(item)} title="Alterar" aria-label="Alterar">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5 20.5 7.5 7 21H3v-4L16.5 3.5Z"/></svg>
                              </button> : null}
                              {hasDeleteFormPermission(appFormEditAccessKeys.titular) ? <button type="button" className="row-action-button row-action-delete" onClick={() => handleDeleteTitular(item)} title="Excluir" aria-label="Excluir">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                              </button> : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {!isLoadingTitular && titularItems.length === 0 ? (
                    <p className="management-empty-state">Nenhum registro de titular do CRM encontrado.</p>
                  ) : null}
                </div>

                <p className={`status-message status-${titularStatusTone}`} aria-live="polite">
                  {isTitularFormVisible ? '' : titularStatusMessage}
                </p>

                <div className="management-pagination">
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setTitularPage(1)}
                    disabled={!canGoToPreviousTitularPage || isLoadingTitular}
                    title="Primeiro registro"
                    aria-label="Primeiro registro"
                  >
                    |◀
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setTitularPage((currentPage) => currentPage - 1)}
                    disabled={!canGoToPreviousTitularPage || isLoadingTitular}
                    title="Registro anterior"
                    aria-label="Registro anterior"
                  >
                    ◀
                  </button>
                  <span className="management-pagination-info">
                    Pagina {titularPage} de {titularTotalPages}
                  </span>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setTitularPage((currentPage) => currentPage + 1)}
                    disabled={!canGoToNextTitularPage || isLoadingTitular}
                    title="Proximo registro"
                    aria-label="Proximo registro"
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setTitularPage(titularTotalPages)}
                    disabled={!canGoToNextTitularPage || isLoadingTitular}
                    title="Ultimo registro"
                    aria-label="Ultimo registro"
                  >
                    ▶|
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : activeView === 'marcaModelo' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro administrativo</p>
              <h2 id="content-title">Tabela Marca/Modelo</h2>
              <p className="content-description">
                Cadastre e consulte os registros da tabela de marca/modelo importada do XML. O codigo e gerado automaticamente e a descricao permanece obrigatoria e unica.
              </p>
            </div>

            <div className="management-layout">
              <div className="management-toolbar">
                <button
                  type="button"
                  className="primary-button dre-insert-button"
                  onClick={handleStartInsertMarcaModelo}
                  disabled={isSavingMarcaModelo || isDeletingMarcaModelo}
                >
                  Inserir registro
                </button>

                <form className="management-filter-form" onSubmit={handleFilterMarcaModeloSubmit}>
                  <input
                    className="management-filter-input"
                    type="text"
                    placeholder="Filtrar por codigo ou descricao"
                    value={marcaModeloSearch}
                    onChange={(event) => setMarcaModeloSearch(event.target.value)}
                  />
                  <button type="submit" className="secondary-button management-filter-button">
                    Filtrar
                  </button>
                  <button type="button" className="secondary-button management-filter-button" onClick={handleClearMarcaModeloFilter}>
                    Limpar
                  </button>
                </form>
              </div>

              {isMarcaModeloFormVisible ? (
                <div
                  className="management-modal-overlay"
                  role="presentation"
                  onClick={(event) => {
                    if (event.target === event.currentTarget && !isSavingMarcaModelo) {
                      handleCancelMarcaModeloForm()
                    }
                  }}
                >
                  <div
                    className="management-modal-shell"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="marca-modelo-modal-title"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <form className="management-card management-form dre-form management-modal-form-card" onSubmit={handleCreateMarcaModelo} noValidate>
                      <div className="management-modal-header">
                        <div>
                          <p className="management-modal-kicker">Cadastro administrativo - MARCMOD016</p>
                          <h2 id="marca-modelo-modal-title">MARCA/MODELO</h2>
                        </div>
                        <button
                          type="button"
                          className="secondary-button management-modal-close-button"
                          onClick={handleCancelMarcaModeloForm}
                          disabled={isSavingMarcaModelo}
                          aria-label="Fechar formulario de marca/modelo"
                        >
                          X
                        </button>
                      </div>

                      <p className="management-modal-subtitle">
                        {marcaModeloFormMode === 'view' ? 'Consulta de registro' : editingMarcaModeloCodigo ? 'Alterar registro' : 'Novo registro'}
                      </p>

                      <label className="field-group" htmlFor="marca-modelo-descricao">
                        <span>Descricao</span>
                        <input
                          id="marca-modelo-descricao"
                          name="descricao"
                          type="text"
                          value={marcaModeloDescricao}
                          onChange={(event) => setMarcaModeloDescricao(event.target.value)}
                          disabled={isSavingMarcaModelo || marcaModeloFormMode === 'view'}
                          aria-invalid={Boolean(marcaModeloDescricaoError)}
                        />
                        {marcaModeloDescricaoError ? <strong className="field-error">{marcaModeloDescricaoError}</strong> : null}
                      </label>

                      <p className={`status-message status-${marcaModeloStatusTone}`} aria-live="polite">
                        {marcaModeloStatusMessage}
                      </p>

                      <div className="button-row dre-button-row management-modal-footer">
                        {marcaModeloFormMode !== 'view' ? (
                          <button type="submit" className="primary-button" disabled={isSavingMarcaModelo}>
                            {isSavingMarcaModelo ? 'Salvando...' : editingMarcaModeloCodigo ? 'Salvar alteracao' : 'Salvar marca/modelo'}
                          </button>
                        ) : null}
                        <button type="button" className="secondary-button" onClick={handleCancelMarcaModeloForm} disabled={isSavingMarcaModelo}>
                          {marcaModeloFormMode === 'view' ? 'Fechar' : 'Cancelar'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : null}

              <div className="management-card management-grid-card dre-list-card">
                <div className="management-grid-header">
                  <h2>Registros cadastrados</h2>
                  <span>
                    {isLoadingMarcaModelo ? 'Atualizando...' : `${marcaModeloTotalItems} item(ns) encontrados`}
                  </span>
                </div>

                <div className="management-grid-wrapper">
                  <table className="dre-table">
                    <thead>
                      <tr>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortMarcaModelo('codigo')}>
                            Codigo <span>{getMarcaModeloSortIndicator('codigo')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortMarcaModelo('descricao')}>
                            Descricao <span>{getMarcaModeloSortIndicator('descricao')}</span>
                          </button>
                        </th>
                        <th className="dre-actions-column">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marcaModeloItems.map((item) => (
                        <tr key={item.codigo}>
                          <td>{item.codigo}</td>
                          <td>{item.descricao}</td>
                          <td>
                            <div className="dre-row-actions">
                              <button type="button" className="row-action-button" onClick={() => handleStartViewMarcaModelo(item)}>
                                Consulta
                              </button>
                              {hasMarcaModeloEditFormAccess ? <button type="button" className="row-action-button row-action-edit" onClick={() => handleStartEditMarcaModelo(item)}>
                                Alterar
                              </button> : null}
                              {hasDeleteFormPermission(appFormEditAccessKeys.marcaModelo) ? <button type="button" className="row-action-button row-action-delete" onClick={() => handleDeleteMarcaModelo(item)}>
                                Excluir
                              </button> : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {!isLoadingMarcaModelo && marcaModeloItems.length === 0 ? (
                    <p className="management-empty-state">Nenhum registro de marca/modelo encontrado.</p>
                  ) : null}
                </div>

                <p className={`status-message status-${marcaModeloStatusTone}`} aria-live="polite">
                  {isMarcaModeloFormVisible ? '' : marcaModeloStatusMessage}
                </p>

                <div className="management-pagination">
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setMarcaModeloPage(1)}
                    disabled={!canGoToPreviousMarcaModeloPage || isLoadingMarcaModelo}
                    title="Primeiro registro"
                    aria-label="Primeiro registro"
                  >
                    |◀
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setMarcaModeloPage((currentPage) => currentPage - 1)}
                    disabled={!canGoToPreviousMarcaModeloPage || isLoadingMarcaModelo}
                    title="Registro anterior"
                    aria-label="Registro anterior"
                  >
                    ◀
                  </button>
                  <span className="management-pagination-info">
                    Pagina {marcaModeloPage} de {marcaModeloTotalPages}
                  </span>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setMarcaModeloPage((currentPage) => currentPage + 1)}
                    disabled={!canGoToNextMarcaModeloPage || isLoadingMarcaModelo}
                    title="Proximo registro"
                    aria-label="Proximo registro"
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setMarcaModeloPage(marcaModeloTotalPages)}
                    disabled={!canGoToNextMarcaModeloPage || isLoadingMarcaModelo}
                    title="Ultimo registro"
                    aria-label="Ultimo registro"
                  >
                    ▶|
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : activeView === 'parametroVeiculo' ? (
          <>
            <div className="content-copy">
              <div className="management-toolbar">
                <button
                  type="button"
                  className="primary-button dre-insert-button"
                  onClick={handleStartInsertParametroVeiculo}
                  disabled={isSavingParametroVeiculo || isDeletingParametroVeiculo || isLoadingParametroVeiculoOptions}
                >
                  Inserir registro
                </button>

                <form className="management-filter-form" onSubmit={handleFilterParametroVeiculoSubmit}>
                  <label className="field-group" htmlFor="parametro-veiculo-filter-associacao">
                    <span>Modalidade x Tipo de Bancada</span>
                    <select
                      id="parametro-veiculo-filter-associacao"
                      value={parametroVeiculoFilterModalidadeTipoBancadaCodigo}
                      onChange={(event) => setParametroVeiculoFilterModalidadeTipoBancadaCodigo(event.target.value)}
                      disabled={isLoadingParametroVeiculoItems || isLoadingParametroVeiculoOptions}
                    >
                      <option value="">Todas</option>
                      {parametroVeiculoAssociationOptions.map((item) => (
                        <option key={item.codigo} value={item.codigo}>
                          {formatModalidadeTipoBancadaLabel(item)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field-group" htmlFor="parametro-veiculo-filter-condicao">
                    <span>Condicao</span>
                    <input
                      id="parametro-veiculo-filter-condicao"
                      type="text"
                      value={parametroVeiculoFilterCondicao}
                      onChange={(event) => setParametroVeiculoFilterCondicao(event.target.value)}
                      disabled={isLoadingParametroVeiculoItems}
                    />
                  </label>
                  <label className="field-group" htmlFor="parametro-veiculo-filter-data">
                    <span>Data</span>
                    <input
                      id="parametro-veiculo-filter-data"
                      type="date"
                      value={parametroVeiculoFilterData}
                      onChange={(event) => setParametroVeiculoFilterData(event.target.value)}
                      disabled={isLoadingParametroVeiculoItems}
                    />
                  </label>
                  <button type="submit" className="secondary-button management-filter-button">
                    Filtrar
                  </button>
                  <button type="button" className="secondary-button management-filter-button" onClick={handleClearParametroVeiculoFilter}>
                    Limpar
                  </button>
                </form>
              </div>

              {isParametroVeiculoFormVisible ? (
                <div
                  className="management-modal-overlay"
                  role="presentation"
                  onClick={(event) => {
                    if (event.target === event.currentTarget && !isSavingParametroVeiculo) {
                      handleCancelParametroVeiculoForm()
                    }
                  }}
                >
                  <div
                    className="management-modal-shell"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="parametro-veiculo-modal-title"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <form className="management-card management-form dre-form management-modal-form-card" onSubmit={handleCreateParametroVeiculo} noValidate>
                      <div className="management-modal-header">
                        <div>
                          <p className="management-modal-kicker">Cadastro financeiro - PARVEIC017</p>
                          <h2 id="parametro-veiculo-modal-title">PARAMETRO PGTO VEICULO</h2>
                        </div>
                        <button
                          type="button"
                          className="secondary-button management-modal-close-button"
                          onClick={handleCancelParametroVeiculoForm}
                          disabled={isSavingParametroVeiculo}
                          aria-label="Fechar formulario de parametro do veiculo"
                        >
                          X
                        </button>
                      </div>

                      <p className="management-modal-subtitle">
                        {parametroVeiculoFormMode === 'view' ? 'Consulta de registro' : editingParametroVeiculoCodigo ? 'Alterar registro' : 'Novo registro'}
                      </p>

                      <label className="field-group" htmlFor="parametro-veiculo-data">
                        <span>Data</span>
                        <input
                          id="parametro-veiculo-data"
                          type="date"
                          value={parametroVeiculoData}
                          onChange={(event) => setParametroVeiculoData(event.target.value)}
                          disabled={isSavingParametroVeiculo || parametroVeiculoFormMode === 'view'}
                        />
                      </label>

                      <label className="field-group" htmlFor="parametro-veiculo-associacao">
                        <span>Modalidade x Tipo de Bancada</span>
                        <select
                          id="parametro-veiculo-associacao"
                          value={parametroVeiculoModalidadeTipoBancadaCodigo}
                          onChange={(event) => setParametroVeiculoModalidadeTipoBancadaCodigo(event.target.value)}
                          disabled={isLoadingParametroVeiculoOptions || isSavingParametroVeiculo || parametroVeiculoFormMode === 'view'}
                        >
                          <option value="">Selecione a associacao</option>
                          {parametroVeiculoAssociationOptions.map((item) => (
                            <option key={item.codigo} value={item.codigo}>
                              {formatModalidadeTipoBancadaLabel(item)}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="field-group" htmlFor="parametro-veiculo-condicao">
                        <span>Condicao</span>
                        <select
                          id="parametro-veiculo-condicao"
                          value={parametroVeiculoCondicao}
                          onChange={(event) => setParametroVeiculoCondicao(event.target.value)}
                          disabled={isSavingParametroVeiculo || parametroVeiculoFormMode === 'view'}
                        >
                          <option value="">Selecione a condicao</option>
                          {PARAMETRO_VEICULO_CONDICAO_OPTIONS.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="field-group" htmlFor="parametro-veiculo-qtde-condicao">
                        <span>Qtde da condicao</span>
                        <input
                          id="parametro-veiculo-qtde-condicao"
                          type="number"
                          min="0"
                          step="1"
                          value={parametroVeiculoQtdeCondicao}
                          onChange={(event) => setParametroVeiculoQtdeCondicao(event.target.value)}
                          disabled={isSavingParametroVeiculo || parametroVeiculoFormMode === 'view'}
                        />
                      </label>

                      <p className={`status-message status-${parametroVeiculoStatusTone}`} aria-live="polite">
                        {parametroVeiculoStatusMessage}
                      </p>

                      <div className="button-row dre-button-row management-modal-footer">
                        {parametroVeiculoFormMode !== 'view' ? (
                          <button type="submit" className="primary-button" disabled={isSavingParametroVeiculo || isLoadingParametroVeiculoOptions}>
                            {isSavingParametroVeiculo ? 'Salvando...' : editingParametroVeiculoCodigo ? 'Salvar alteracao' : 'Salvar registro'}
                          </button>
                        ) : null}
                        <button type="button" className="secondary-button" onClick={handleCancelParametroVeiculoForm} disabled={isSavingParametroVeiculo}>
                          {parametroVeiculoFormMode === 'view' ? 'Fechar' : 'Cancelar'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : null}

              <div className="management-card management-grid-card dre-list-card">
                <div className="management-grid-header">
                  <h2>Registros cadastrados</h2>
                  <span>
                    {isLoadingParametroVeiculoItems ? 'Atualizando...' : `${parametroVeiculoTotalItems} item(ns) encontrados`}
                  </span>
                </div>

                <div className="management-grid-wrapper">
                  <table className="dre-table">
                    <thead>
                      <tr>
                        <th>Modalidade</th>
                        <th>Tipo de Bancada</th>
                        <th>Condicao</th>
                        <th>Qtde da Condicao</th>
                        <th>Data</th>
                        <th className="dre-actions-column">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parametroVeiculoItems.map((item) => (
                        <tr key={item.codigo}>
                          <td>{item.modalidadeDescricao}</td>
                          <td>{item.tipoBancadaDescricao}</td>
                          <td>{item.condicao}</td>
                          <td>{item.qtdeCondicao}</td>
                          <td>{item.data}</td>
                          <td>
                            <div className="dre-row-actions">
                              <button
                                type="button"
                                className="row-action-button"
                                onClick={() => handleStartViewParametroVeiculo(item)}
                              >
                                Consulta
                              </button>
                              {hasParametroVeiculoEditFormAccess ? <button
                                type="button"
                                className="row-action-button row-action-edit"
                                onClick={() => handleStartEditParametroVeiculo(item)}
                                disabled={isDeletingParametroVeiculo}
                              >
                                Alterar
                              </button> : null}
                              {hasDeleteFormPermission(appFormEditAccessKeys.parametroVeiculo) ? <button
                                type="button"
                                className="row-action-button row-action-delete"
                                onClick={() => handleDeleteParametroVeiculo(item)}
                                disabled={isDeletingParametroVeiculo}
                              >
                                Excluir
                              </button> : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {isLoadingParametroVeiculoItems ? (
                    <p className="management-empty-state">Carregando registros...</p>
                  ) : null}

                  {!isLoadingParametroVeiculoItems && !parametroVeiculoItems.length ? (
                    <p className="management-empty-state">Nenhum registro de parametro veiculo encontrado.</p>
                  ) : null}
                </div>

                <p className={`status-message status-${parametroVeiculoStatusTone}`} aria-live="polite">
                  {isParametroVeiculoFormVisible ? '' : parametroVeiculoStatusMessage}
                </p>

                <div className="management-pagination">
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setParametroVeiculoPage(1)}
                    disabled={!canGoToPreviousParametroVeiculoPage || isLoadingParametroVeiculoItems}
                    title="Primeiro registro"
                    aria-label="Primeiro registro"
                  >
                    |◀
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setParametroVeiculoPage((currentPage) => currentPage - 1)}
                    disabled={!canGoToPreviousParametroVeiculoPage || isLoadingParametroVeiculoItems}
                    title="Registro anterior"
                    aria-label="Registro anterior"
                  >
                    ◀
                  </button>
                  <span className="management-pagination-info">
                    Pagina {parametroVeiculoPage} de {parametroVeiculoTotalPages}
                  </span>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setParametroVeiculoPage((currentPage) => currentPage + 1)}
                    disabled={!canGoToNextParametroVeiculoPage || isLoadingParametroVeiculoItems}
                    title="Proximo registro"
                    aria-label="Proximo registro"
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setParametroVeiculoPage(parametroVeiculoTotalPages)}
                    disabled={!canGoToNextParametroVeiculoPage || isLoadingParametroVeiculoItems}
                    title="Ultimo registro"
                    aria-label="Ultimo registro"
                  >
                    ▶|
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : activeView === 'seguradora' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro administrativo</p>
              <h2 id="content-title">Tabela Seguradoras</h2>
              <p className="content-description">
                Cadastre e consulte os registros da tabela de seguradoras carregada inicialmente a partir do XML. O codigo e gerado automaticamente, enquanto controle e descricao permanecem obrigatorios.
              </p>
            </div>

            <div className="management-layout">
              <div className="management-toolbar">
                <button
                  type="button"
                  className="primary-button dre-insert-button"
                  onClick={handleStartInsertSeguradora}
                  disabled={isSavingSeguradora || isDeletingSeguradora}
                >
                  Inserir registro
                </button>

                <form className="management-filter-form" onSubmit={handleFilterSeguradoraSubmit}>
                  <input
                    className="management-filter-input"
                    type="text"
                    placeholder="Filtrar por codigo, controle ou descricao"
                    value={seguradoraSearch}
                    onChange={(event) => setSeguradoraSearch(event.target.value)}
                  />
                  <button type="submit" className="secondary-button management-filter-button">
                    Filtrar
                  </button>
                  <button type="button" className="secondary-button management-filter-button" onClick={handleClearSeguradoraFilter}>
                    Limpar
                  </button>
                </form>
              </div>

              {isSeguradoraFormVisible ? (
                <div
                  className="management-modal-overlay"
                  role="presentation"
                  onClick={(event) => {
                    if (event.target === event.currentTarget && !isSavingSeguradora) {
                      handleCancelSeguradoraForm()
                    }
                  }}
                >
                  <div
                    className="management-modal-shell"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="seguradora-modal-title"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <form className="management-card management-form dre-form management-modal-form-card" onSubmit={handleCreateSeguradora} noValidate>
                      <div className="management-modal-header">
                        <div>
                          <p className="management-modal-kicker">Cadastro administrativo - SEGURAD018</p>
                          <h2 id="seguradora-modal-title">SEGURADORAS</h2>
                        </div>
                        <button
                          type="button"
                          className="secondary-button management-modal-close-button"
                          onClick={handleCancelSeguradoraForm}
                          disabled={isSavingSeguradora}
                          aria-label="Fechar formulario de seguradoras"
                        >
                          X
                        </button>
                      </div>

                      <p className="management-modal-subtitle">
                        {seguradoraFormMode === 'view' ? 'Consulta de registro' : editingSeguradoraCodigo ? 'Alterar registro' : 'Novo registro'}
                      </p>

                      <label className="field-group" htmlFor="seguradora-controle">
                        <span>Controle</span>
                        <input
                          id="seguradora-controle"
                          name="controle"
                          type="text"
                          value={seguradoraControle}
                          onChange={(event) => setSeguradoraControle(event.target.value)}
                          disabled={isSavingSeguradora || seguradoraFormMode === 'view'}
                          aria-invalid={Boolean(seguradoraControleError)}
                        />
                        {seguradoraControleError ? <strong className="field-error">{seguradoraControleError}</strong> : null}
                      </label>

                      <label className="field-group" htmlFor="seguradora-lista">
                        <span>Descricao</span>
                        <input
                          id="seguradora-lista"
                          name="lista"
                          type="text"
                          value={seguradoraLista}
                          onChange={(event) => setSeguradoraLista(event.target.value)}
                          disabled={isSavingSeguradora || seguradoraFormMode === 'view'}
                          aria-invalid={Boolean(seguradoraListaError)}
                        />
                        {seguradoraListaError ? <strong className="field-error">{seguradoraListaError}</strong> : null}
                      </label>

                      <p className={`status-message status-${seguradoraStatusTone}`} aria-live="polite">
                        {seguradoraStatusMessage}
                      </p>

                      <div className="button-row dre-button-row management-modal-footer">
                        {seguradoraFormMode !== 'view' ? (
                          <button type="submit" className="primary-button" disabled={isSavingSeguradora}>
                            {isSavingSeguradora ? 'Salvando...' : editingSeguradoraCodigo ? 'Salvar alteracao' : 'Salvar seguradora'}
                          </button>
                        ) : null}
                        <button type="button" className="secondary-button" onClick={handleCancelSeguradoraForm} disabled={isSavingSeguradora}>
                          {seguradoraFormMode === 'view' ? 'Fechar' : 'Cancelar'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : null}

              <div className="management-card management-grid-card dre-list-card">
                <div className="management-grid-header">
                  <h2>Registros cadastrados</h2>
                  <span>
                    {isLoadingSeguradora ? 'Atualizando...' : `${seguradoraTotalItems} item(ns) encontrados`}
                  </span>
                </div>

                <div className="management-grid-wrapper">
                  <table className="dre-table">
                    <thead>
                      <tr>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortSeguradora('codigo')}>
                            Codigo <span>{getSeguradoraSortIndicator('codigo')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortSeguradora('controle')}>
                            Controle <span>{getSeguradoraSortIndicator('controle')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortSeguradora('descricao')}>
                            Descricao <span>{getSeguradoraSortIndicator('descricao')}</span>
                          </button>
                        </th>
                        <th className="dre-actions-column">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {seguradoraItems.map((item) => (
                        <tr key={item.codigo}>
                          <td>{item.codigo}</td>
                          <td>{item.controle}</td>
                          <td>{item.descricao}</td>
                          <td>
                            <div className="dre-row-actions">
                              <button type="button" className="row-action-button" onClick={() => handleStartViewSeguradora(item)}>
                                Consulta
                              </button>
                              {hasSeguradoraEditFormAccess ? <button type="button" className="row-action-button row-action-edit" onClick={() => handleStartEditSeguradora(item)}>
                                Alterar
                              </button> : null}
                              {hasDeleteFormPermission(appFormEditAccessKeys.seguradora) ? <button type="button" className="row-action-button row-action-delete" onClick={() => handleDeleteSeguradora(item)}>
                                Excluir
                              </button> : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {!isLoadingSeguradora && seguradoraItems.length === 0 ? (
                    <p className="management-empty-state">Nenhum registro de seguradora encontrado.</p>
                  ) : null}
                </div>

                <p className={`status-message status-${seguradoraStatusTone}`} aria-live="polite">
                  {isSeguradoraFormVisible ? '' : seguradoraStatusMessage}
                </p>

                <div className="management-pagination">
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setSeguradoraPage(1)}
                    disabled={!canGoToPreviousSeguradoraPage || isLoadingSeguradora}
                    title="Primeiro registro"
                    aria-label="Primeiro registro"
                  >
                    |◀
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setSeguradoraPage((currentPage) => currentPage - 1)}
                    disabled={!canGoToPreviousSeguradoraPage || isLoadingSeguradora}
                    title="Registro anterior"
                    aria-label="Registro anterior"
                  >
                    ◀
                  </button>
                  <span className="management-pagination-info">
                    Pagina {seguradoraPage} de {seguradoraTotalPages}
                  </span>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setSeguradoraPage((currentPage) => currentPage + 1)}
                    disabled={!canGoToNextSeguradoraPage || isLoadingSeguradora}
                    title="Proximo registro"
                    aria-label="Proximo registro"
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setSeguradoraPage(seguradoraTotalPages)}
                    disabled={!canGoToNextSeguradoraPage || isLoadingSeguradora}
                    title="Ultimo registro"
                    aria-label="Ultimo registro"
                  >
                    ▶|
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : activeView === 'troca' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro operacional</p>
              <h2 id="content-title">Tabela Tipo de Troca</h2>
              <p className="content-description">
                Consulte, inclua, altere e exclua os tipos de troca carregados inicialmente a partir do XML operacional.
              </p>
            </div>

            <div className="access-embed-card">
              <iframe
                className="access-embed-frame"
                src="/src/troca.html"
                title="Cadastro de tipo de troca"
              />
            </div>
          </>
        ) : activeView === 'acesso' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Seguranca administrativa</p>
              <h2 id="content-title">Controle de acesso</h2>
              <p className="content-description">
                Acesse o grid de cadastro, consulta, alteracao e exclusao de usuarios
                diretamente pelo menu lateral da tela administrativa.
              </p>
            </div>

            <div className="access-embed-card">
              <iframe
                className="access-embed-frame"
                src="/src/cadastroAcesso.html"
                title="Controle de acesso"
              />
            </div>
          </>
        ) : activeView === 'perfil' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Seguranca administrativa</p>
              <h2 id="content-title">Tabela Perfil</h2>
              <p className="content-description">
                Consulte, inclua, altere e exclua os perfis operacionais no mesmo layout aplicado ao cadastro de DRE.
              </p>
            </div>

            <PerfilView />
          </>
        ) : activeView === 'acessoPagina' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Seguranca administrativa</p>
              <h2 id="content-title">Acesso Pagina</h2>
              <p className="content-description">
                Consulte, inclua, altere e exclua acessos de pagina com classificacao entre menu e formulario no mesmo layout aplicado ao cadastro de Perfil.
              </p>
            </div>

            <AcessoPaginaView />
          </>
        ) : activeView === 'perfilAcesso' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Seguranca administrativa</p>
              <h2 id="content-title">PerfilAcesso</h2>
              <p className="content-description">
                Consulte, inclua, altere e exclua o cruzamento entre Perfil e Acesso Pagina com nivel de permissao por consulta, alteracao, exclusao ou todos.
              </p>
            </div>

            <PerfilAcessoView />
          </>
        ) : activeView === 'loginDre' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Relacionamento administrativo</p>
              <h2 id="content-title">Login x DRE</h2>
              <p className="content-description">
                Consulte e mantenha os relacionamentos entre usuarios e DRE com selecao por codigo.
              </p>
            </div>

            <div className="access-embed-card">
              <iframe
                className="access-embed-frame"
                src="/src/loginDre.html"
                title="Login x DRE"
              />
            </div>
          </>
        ) : activeView === 'condutor' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro operacional</p>
              <h2 id="content-title">Tabela Condutor</h2>
              <p className="content-description">
                Consulte, inclua e altere os registros de condutores no mesmo padrao do controle de acesso.
              </p>
            </div>

            <div className="access-embed-card">
              <iframe
                className="access-embed-frame"
                src="/src/condutor.html"
                title="Cadastro de condutor"
              />
            </div>
          </>
        ) : activeView === 'monitor' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro operacional</p>
              <h2 id="content-title">Tabela Monitor</h2>
              <p className="content-description">
                Consulte, inclua, altere e importe os registros de monitores no mesmo padrao operacional da tela de condutor.
              </p>
            </div>

            <div className="access-embed-card">
              <iframe
                className="access-embed-frame"
                src="/src/monitor.html"
                title="Cadastro de monitor"
              />
            </div>
          </>
        ) : activeView === 'credenciamentoTermo' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro operacional</p>
              <h2 id="content-title">Tabela Credenciamento Termo</h2>
              <p className="content-description">
                Consulte, inclua, altere e importe credenciamentos termo a partir do XML com relacao automatica da credenciada e desdobramento por aditivo.
              </p>
            </div>

            <div className="access-embed-card">
              <iframe
                className="access-embed-frame"
                src="/src/credenciamentoTermo.html"
                title="Cadastro de credenciamento termo"
              />
            </div>
          </>
        ) : activeView === 'emissaoDocumentoParametro' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Parametros legais</p>
              <h2 id="content-title">Parametros de Emissao</h2>
              <p className="content-description">
                Mantenha os textos formais da emissao por data de referencia, sem depender apenas do seed inicial do banco.
              </p>
            </div>

            <div className="access-embed-card">
              <iframe
                className="access-embed-frame"
                src="/src/emissaoDocumentoParametro.html"
                title="Parametros de emissao"
              />
            </div>
          </>
        ) : activeView === 'veiculo' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro operacional</p>
              <h2 id="content-title">Tabela Veiculo</h2>
              <p className="content-description">
                Consulte, inclua, altere e importe os registros de veiculos a partir do XML no mesmo padrao operacional da tela de monitor.
              </p>
            </div>

            <div className="access-embed-card">
              <iframe
                className="access-embed-frame"
                src="/src/veiculo.html"
                title="Cadastro de veiculo"
              />
            </div>
          </>
        ) : activeView === 'veiculoHistorico' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Consulta operacional</p>
              <h2 id="content-title">Historico de Veiculo</h2>
              <p className="content-description">
                Consulte o historico de alteracoes dos veiculos, incluindo acao executada, usuario responsavel e dados completos gravados em cada evento.
              </p>
            </div>

            <div className="access-embed-card">
              <iframe
                className="access-embed-frame"
                src="/src/veiculoHistorico.html"
                title="Historico de veiculo"
              />
            </div>
          </>
        ) : activeView === 'termoHistorico' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Consulta operacional</p>
              <h2 id="content-title">Historico de Termo</h2>
              <p className="content-description">
                Consulte todas as alteracoes gravadas antes de cada ajuste no termo, inclusive mudancas de contrato, importacao, exclusao e edicao manual.
              </p>
            </div>

            <div className="access-embed-card">
              <iframe
                className="access-embed-frame"
                src="/src/termoHistorico.html"
                title="Historico de termo"
              />
            </div>
          </>
        ) : activeView === 'ordemServicoHistorico' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Consulta operacional</p>
              <h2 id="content-title">Historico de OrdemServico</h2>
              <p className="content-description">
                Consulte todas as alteracoes gravadas antes de cada ajuste da OrdemServico, incluindo importacao, substituicao, cancelamento, exclusao e reequilibrio de revisoes.
              </p>
            </div>

            <div className="access-embed-card">
              <iframe
                className="access-embed-frame"
                src="/src/ordemServicoHistorico.html"
                title="Historico de OrdemServico"
              />
            </div>
          </>
        ) : activeView === 'apuracaoFinanceira' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Operacional financeiro</p>
              <h2 id="content-title">Apuracao Financeira</h2>
              <p className="content-description">
                Realiza a apuracao das Ordem de Servicos ativas no mes/ano registrando todos os contratos existentes no período.
              </p>
            </div>

            <div className="management-layout">
              <div className="management-toolbar">
                <button
                  type="button"
                  className="primary-button dre-insert-button"
                  onClick={handleStartInsertApuracaoFinanceira}
                  disabled={isSavingApuracaoFinanceira || isDeletingApuracaoFinanceira || isLoadingApuracaoFinanceiraOptions}
                >
                  Processamento do apontamento
                </button>
                <button
                  type="button"
                  className="secondary-button dre-insert-button"
                  onClick={handleStartBatchUpdateApuracaoFinanceira}
                  disabled={isSavingApuracaoFinanceira || isDeletingApuracaoFinanceira || isLoadingApuracaoFinanceiraOptions}
                >
                  Alterar situacao em bloco
                </button>

                <form className="management-filter-form" onSubmit={handleFilterApuracaoFinanceiraSubmit}>
                  <input
                    className="management-filter-input"
                    type="text"
                    placeholder="Filtrar por mes/ano, DRE, situacao ou data referencia"
                    value={apuracaoFinanceiraSearch}
                    onChange={(event) => setApuracaoFinanceiraSearch(event.target.value)}
                  />
                  <button type="submit" className="secondary-button management-filter-button">
                    Filtrar
                  </button>
                  <button type="button" className="secondary-button management-filter-button" onClick={handleClearApuracaoFinanceiraFilter}>
                    Limpar
                  </button>
                </form>
              </div>

              {isApuracaoFinanceiraFormVisible ? (
                <div
                  className="management-modal-overlay"
                  role="presentation"
                  onClick={(event) => {
                    if (event.target === event.currentTarget && !(isSavingApuracaoFinanceira || isProcessingApuracaoFinanceira || isUpdatingApuracaoFinanceiraBatchStatus)) {
                      handleCancelApuracaoFinanceiraForm()
                    }
                  }}
                >
                  <div
                    className="management-modal-shell"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="apuracao-financeira-modal-title"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <form
                      className={`management-card management-form dre-form management-modal-form-card${apuracaoFinanceiraStatusTone === 'warning' ? ' apuracao-financeira-lock-warning' : ''}`}
                      onSubmit={(event) => event.preventDefault()}
                      noValidate
                    >
                      <div className="management-modal-header">
                        <div>
                          <p className="management-modal-kicker">Operacional financeiro - APURFIN019</p>
                          <h2 id="apuracao-financeira-modal-title">APURACAO FINANCEIRA</h2>
                        </div>
                        <button
                          type="button"
                          className="secondary-button management-modal-close-button"
                          onClick={handleCancelApuracaoFinanceiraForm}
                          disabled={isSavingApuracaoFinanceira || isProcessingApuracaoFinanceira}
                          aria-label="Fechar formulario de apuracao financeira"
                        >
                          X
                        </button>
                      </div>

                      <p className="management-modal-subtitle">
                        {apuracaoFinanceiraFormMode === 'batch-status'
                          ? 'Alterar situacao em bloco'
                          : apuracaoFinanceiraFormMode === 'view'
                            ? 'Consulta de registro'
                            : editingApuracaoFinanceiraKey
                              ? 'Alterar registro'
                              : 'Novo registro'}
                      </p>

                      <div className="apuracao-financeira-inline-fields">
                        <label className="field-group" htmlFor="apuracao-financeira-mes-ano">
                          <span>Mes/Ano</span>
                          <input
                            id="apuracao-financeira-mes-ano"
                            type="text"
                            inputMode="numeric"
                            placeholder="mm/aaaa"
                            value={apuracaoFinanceiraMesAno}
                            onChange={(event) => setApuracaoFinanceiraMesAno(normalizeMonthYearInput(event.target.value))}
                            disabled={isSavingApuracaoFinanceira || isProcessingApuracaoFinanceira || isUpdatingApuracaoFinanceiraBatchStatus || apuracaoFinanceiraFormMode === 'view'}
                            aria-invalid={Boolean(apuracaoFinanceiraMesAnoError)}
                          />
                          {apuracaoFinanceiraMesAnoError ? <strong className="field-error">{apuracaoFinanceiraMesAnoError}</strong> : null}
                        </label>

                        {apuracaoFinanceiraFormMode === 'create' ? (
                          <label className="field-group" htmlFor="apuracao-financeira-revisao">
                            <span>Revisao</span>
                            <input
                              id="apuracao-financeira-revisao"
                              type="number"
                              min="0"
                              step="1"
                              value={apuracaoFinanceiraRevisao}
                              onChange={(event) => setApuracaoFinanceiraRevisao(event.target.value)}
                              disabled={isSavingApuracaoFinanceira || isProcessingApuracaoFinanceira || isUpdatingApuracaoFinanceiraBatchStatus || apuracaoFinanceiraFormMode !== 'create'}
                              aria-invalid={Boolean(apuracaoFinanceiraRevisaoError)}
                            />
                            {apuracaoFinanceiraRevisaoError ? <strong className="field-error">{apuracaoFinanceiraRevisaoError}</strong> : null}
                          </label>
                        ) : null}
                      </div>

                      <label className="field-group" htmlFor="apuracao-financeira-dre">
                        {apuracaoFinanceiraFormMode !== 'view' ? (
                          <>
                            <span>DREs ativas</span>
                            <div className="apuracao-financeira-dre-toolbar">
                              <button
                                type="button"
                                className="secondary-button apuracao-financeira-dre-toggle"
                                onClick={handleToggleAllApuracaoFinanceiraDres}
                                disabled={isSavingApuracaoFinanceira || isProcessingApuracaoFinanceira || isUpdatingApuracaoFinanceiraBatchStatus || isLoadingApuracaoFinanceiraActiveDres || apuracaoFinanceiraActiveDreOptions.length === 0}
                              >
                                {apuracaoFinanceiraActiveDreOptions.length > 0 && apuracaoFinanceiraSelectedDreCodigos.length === apuracaoFinanceiraActiveDreOptions.length
                                  ? 'Desselecionar todas'
                                  : 'Selecionar todas'}
                              </button>
                            </div>
                            <div className="apuracao-financeira-dre-selector" aria-live="polite">
                              {isValidMonthYear(apuracaoFinanceiraMesAno) && isLoadingApuracaoFinanceiraActiveDres ? (
                                <p className="apuracao-financeira-dre-hint">Carregando DREs ativas...</p>
                              ) : isValidMonthYear(apuracaoFinanceiraMesAno) && apuracaoFinanceiraActiveDreOptions.length === 0 ? (
                                <p className="apuracao-financeira-dre-hint">Nenhuma DRE ativa encontrada para o mes/ano informado.</p>
                              ) : isValidMonthYear(apuracaoFinanceiraMesAno) ? (
                                apuracaoFinanceiraActiveDreOptions.map((item) => (
                                  <label key={item.codigo} className="apuracao-financeira-dre-option">
                                    <input
                                      type="checkbox"
                                      checked={apuracaoFinanceiraSelectedDreCodigos.includes(item.codigo)}
                                      onChange={() => handleToggleApuracaoFinanceiraSelectedDre(item.codigo)}
                                      disabled={isSavingApuracaoFinanceira || isProcessingApuracaoFinanceira || isUpdatingApuracaoFinanceiraBatchStatus}
                                    />
                                    <span>{formatApuracaoFinanceiraDreOptionLabel(item)}</span>
                                  </label>
                                ))
                              ) : null}
                            </div>
                            {apuracaoFinanceiraSelectedDresError ? <strong className="field-error">{apuracaoFinanceiraSelectedDresError}</strong> : null}
                          </>
                        ) : (
                          <>
                            <span>DRE</span>
                            <input
                              id="apuracao-financeira-dre"
                              type="text"
                              value={apuracaoFinanceiraSelectedDreDisplayValue}
                              readOnly
                              disabled
                            />
                            {apuracaoFinanceiraDreCodigoError ? <strong className="field-error">{apuracaoFinanceiraDreCodigoError}</strong> : null}
                          </>
                        )}
                      </label>

                      <label className="field-group" htmlFor="apuracao-financeira-tipo-pessoa">
                        <span>Tipo Pessoa</span>
                        <select
                          id="apuracao-financeira-tipo-pessoa"
                          value={apuracaoFinanceiraTipoPessoa}
                          onChange={(event) => setApuracaoFinanceiraTipoPessoa(event.target.value as ApuracaoFinanceiraTipoPessoaFormValue)}
                          disabled={isSavingApuracaoFinanceira || isProcessingApuracaoFinanceira || isUpdatingApuracaoFinanceiraBatchStatus || apuracaoFinanceiraFormMode === 'view'}
                        >
                          {APURACAO_FINANCEIRA_TIPO_PESSOA_FORM_OPTIONS.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                        {apuracaoFinanceiraTipoPessoaError ? <strong className="field-error">{apuracaoFinanceiraTipoPessoaError}</strong> : null}
                      </label>

                      {apuracaoFinanceiraFormMode === 'batch-status' ? (
                        <label className="field-group" htmlFor="apuracao-financeira-situacao-lote">
                          <span>Situacao destino</span>
                          <select
                            id="apuracao-financeira-situacao-lote"
                            value={apuracaoFinanceiraSituacao}
                            onChange={(event) => setApuracaoFinanceiraSituacao(event.target.value as ApuracaoFinanceiraStatus)}
                            disabled={isSavingApuracaoFinanceira || isProcessingApuracaoFinanceira || isUpdatingApuracaoFinanceiraBatchStatus}
                          >
                            {APURACAO_FINANCEIRA_STATUS_OPTIONS.map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}

                      <p className={`status-message status-${apuracaoFinanceiraStatusTone}`} aria-live="polite">
                        {apuracaoFinanceiraStatusMessage}
                      </p>

                      <div className="button-row dre-button-row management-modal-footer">
                        {apuracaoFinanceiraFormMode === 'batch-status' ? (
                          <button
                            type="button"
                            className="primary-button"
                            onClick={handleBatchStatusUpdateApuracaoFinanceira}
                            disabled={isSavingApuracaoFinanceira || isProcessingApuracaoFinanceira || isUpdatingApuracaoFinanceiraBatchStatus}
                          >
                            {isUpdatingApuracaoFinanceiraBatchStatus ? 'Alterando...' : 'Alterar situacao'}
                          </button>
                        ) : null}
                        {apuracaoFinanceiraFormMode !== 'view' && apuracaoFinanceiraFormMode !== 'batch-status' && ['A processar', 'Processado'].includes(apuracaoFinanceiraSituacao) ? (
                          <button
                            type="button"
                            className="primary-button"
                            onClick={handleProcessApuracaoFinanceira}
                            disabled={isSavingApuracaoFinanceira || isProcessingApuracaoFinanceira || isUpdatingApuracaoFinanceiraBatchStatus}
                          >
                            {isProcessingApuracaoFinanceira ? 'Processando...' : 'Processamento'}
                          </button>
                        ) : null}
                        <button type="button" className="secondary-button" onClick={handleCancelApuracaoFinanceiraForm} disabled={isSavingApuracaoFinanceira || isProcessingApuracaoFinanceira || isUpdatingApuracaoFinanceiraBatchStatus}>
                          {apuracaoFinanceiraFormMode === 'view' ? 'Fechar' : 'Cancelar'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : null}

              {isApuracaoFinanceiraChildTotalsVisible ? (
                <div
                  className="management-modal-overlay"
                  role="presentation"
                  onClick={(event) => {
                    if (event.target === event.currentTarget && !isLoadingApuracaoFinanceiraChildTotals) {
                      handleCloseApuracaoFinanceiraChildTotals()
                    }
                  }}
                >
                  <div
                    className="management-modal-shell"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="apuracao-financeira-child-totals-modal-title"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="management-card management-form dre-form management-modal-form-card">
                      <div className="management-modal-header">
                        <div>
                          <p className="management-modal-kicker">Operacional financeiro - APURFIN019</p>
                          <h2 id="apuracao-financeira-child-totals-modal-title">VALORES AGLUTINADOS DOS FILHOS</h2>
                        </div>
                        <button
                          type="button"
                          className="secondary-button management-modal-close-button"
                          onClick={handleCloseApuracaoFinanceiraChildTotals}
                          disabled={isLoadingApuracaoFinanceiraChildTotals}
                          aria-label="Fechar resumo de valores aglutinados"
                        >
                          X
                        </button>
                      </div>

                      <p className="management-modal-subtitle">
                        Resumo obtido em Total Servicos, consolidando os apontamentos por Mes/Ano, Revisao, DRE e Tipo Pessoa.
                      </p>

                      {apuracaoFinanceiraChildTotals ? (
                        <>
                          <div className="management-grid-wrapper">
                            <table className="dre-table">
                              <tbody>
                                <tr>
                                  <th>Mes/Ano</th>
                                  <td>{apuracaoFinanceiraChildTotals.mesAno}</td>
                                  <th>Revisao</th>
                                  <td>{apuracaoFinanceiraChildTotals.revisao}</td>
                                </tr>
                                <tr>
                                  <th>DRE</th>
                                  <td colSpan={3}>{formatApuracaoFinanceiraDreLabel(apuracaoFinanceiraChildTotals)}</td>
                                </tr>
                                <tr>
                                  <th>Tipo Pessoa</th>
                                  <td>{formatApuracaoTipoPessoaLabel(apuracaoFinanceiraChildTotals.tipoPessoa)}</td>
                                  <th>Registros filhos</th>
                                  <td>{formatIntegerValue(apuracaoFinanceiraChildTotals.totalRegistros)}</td>
                                </tr>
                                <tr>
                                  <th>Ordens de servico</th>
                                  <td>{formatIntegerValue(apuracaoFinanceiraChildTotals.totalOrdensServico)}</td>
                                  <th>Tipos de escola</th>
                                  <td>{formatIntegerValue(apuracaoFinanceiraChildTotals.totalTiposEscola)}</td>
                                </tr>
                                <tr>
                                  <th>Datas referencia</th>
                                  <td>{formatIntegerValue(apuracaoFinanceiraChildTotals.totalDatasReferencia)}</td>
                                  <th>KM adicional</th>
                                  <td>{formatFourDecimalValue(apuracaoFinanceiraChildTotals.kilometragem)}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          <div className="management-grid-wrapper">
                            <table className="dre-table">
                              <thead>
                                <tr>
                                  <th>NC pres.</th>
                                  <th>Cad.</th>
                                  <th>AC NC</th>
                                  <th>AC Cad.</th>
                                  <th>Cont NC</th>
                                  <th>Cont Cad.</th>
                                  <th>KM adicional</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td>{formatIntegerValue(apuracaoFinanceiraChildTotals.naoCadeirantePresencial)}</td>
                                  <td>{formatIntegerValue(apuracaoFinanceiraChildTotals.cadeirante)}</td>
                                  <td>{formatIntegerValue(apuracaoFinanceiraChildTotals.atendimentoComplementarNaoCadeirante)}</td>
                                  <td>{formatIntegerValue(apuracaoFinanceiraChildTotals.atendimentoComplementarCadeirante)}</td>
                                  <td>{formatIntegerValue(apuracaoFinanceiraChildTotals.continuaNaoCadeirante)}</td>
                                  <td>{formatIntegerValue(apuracaoFinanceiraChildTotals.continuaCadeirante)}</td>
                                  <td>{formatFourDecimalValue(apuracaoFinanceiraChildTotals.kilometragem)}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </>
                      ) : null}

                      <p className={`status-message status-${apuracaoFinanceiraChildTotalsStatusTone}`} aria-live="polite">
                        {apuracaoFinanceiraChildTotalsStatusMessage}
                      </p>

                      <div className="button-row dre-button-row management-modal-footer">
                        <button type="button" className="secondary-button" onClick={handleCloseApuracaoFinanceiraChildTotals} disabled={isLoadingApuracaoFinanceiraChildTotals}>
                          Fechar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="management-card management-grid-card dre-list-card">
                <div className="management-grid-header">
                  <h2>Registros cadastrados</h2>
                  <span>
                    {isLoadingApuracaoFinanceira ? 'Atualizando...' : `${apuracaoFinanceiraGridRows.length} item(ns) encontrados`}
                  </span>
                </div>

                <div className="management-grid-wrapper">
                  <table className="dre-table">
                    <thead>
                      <tr>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortApuracaoFinanceira('mesAno')}>
                            Mes/Ano <span>{getApuracaoFinanceiraSortIndicator('mesAno')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortApuracaoFinanceira('dreCodigo')}>
                            DRE <span>{getApuracaoFinanceiraSortIndicator('dreCodigo')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortApuracaoFinanceira('tipoPessoa')}>
                            Tipo Pessoa <span>{getApuracaoFinanceiraSortIndicator('tipoPessoa')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortApuracaoFinanceira('revisao')}>
                            Revisao <span>{getApuracaoFinanceiraSortIndicator('revisao')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortApuracaoFinanceira('dataReferencia')}>
                            Data referencia <span>{getApuracaoFinanceiraSortIndicator('dataReferencia')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="dre-sort-button" onClick={() => handleSortApuracaoFinanceira('situacao')}>
                            Situacao <span>{getApuracaoFinanceiraSortIndicator('situacao')}</span>
                          </button>
                        </th>
                        <th className="dre-actions-column">Acoes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apuracaoFinanceiraGridRows.map((row) => (
                        <tr key={row.key}>
                          <td>{row.representativeItem.mesAno}</td>
                          <td>{row.dreText}</td>
                          <td>{row.tipoPessoaLabel}</td>
                          <td>{row.representativeItem.revisao}</td>
                          <td>{row.representativeItem.dataReferencia || '-'}</td>
                          <td>{row.representativeItem.situacao}</td>
                          <td>
                            <div className="dre-row-actions">
                              <button type="button" className="row-action-button" onClick={() => handleStartViewApuracaoFinanceira(row)}>
                                Consulta
                              </button>
                              <button type="button" className="row-action-button" onClick={() => handleOpenApuracaoFinanceiraChildTotals(row)}>
                                Valores ACM
                              </button>
                              {hasDeleteFormPermission(appFormEditAccessKeys.apuracaoFinanceira) ? <button
                                type="button"
                                className="row-action-button row-action-delete"
                                onClick={() => handleDeleteApuracaoFinanceira(row)}
                                disabled={row.representativeItem.situacao !== APURACAO_FINANCEIRA_DELETE_STATUS || isDeletingApuracaoFinanceira}
                                title={row.representativeItem.situacao === APURACAO_FINANCEIRA_DELETE_STATUS ? 'Excluir registro' : `Exclusao disponivel apenas em ${APURACAO_FINANCEIRA_DELETE_STATUS}`}
                              >
                                Excluir
                              </button> : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {!isLoadingApuracaoFinanceira && apuracaoFinanceiraGridRows.length === 0 ? (
                    <p className="management-empty-state">Nenhum registro de apuracao financeira encontrado.</p>
                  ) : null}
                </div>

                <p className={`status-message status-${apuracaoFinanceiraStatusTone}`} aria-live="polite">
                  {isApuracaoFinanceiraFormVisible ? '' : apuracaoFinanceiraStatusMessage}
                </p>

                <div className="management-pagination">
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setApuracaoFinanceiraPage(1)}
                    disabled={!canGoToPreviousApuracaoFinanceiraPage || isLoadingApuracaoFinanceira}
                    title="Primeiro registro"
                    aria-label="Primeiro registro"
                  >
                    |◀
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setApuracaoFinanceiraPage((currentPage) => currentPage - 1)}
                    disabled={!canGoToPreviousApuracaoFinanceiraPage || isLoadingApuracaoFinanceira}
                    title="Registro anterior"
                    aria-label="Registro anterior"
                  >
                    ◀
                  </button>
                  <span className="management-pagination-info">
                    Pagina {apuracaoFinanceiraPage} de {apuracaoFinanceiraTotalPages}
                  </span>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setApuracaoFinanceiraPage((currentPage) => currentPage + 1)}
                    disabled={!canGoToNextApuracaoFinanceiraPage || isLoadingApuracaoFinanceira}
                    title="Proximo registro"
                    aria-label="Proximo registro"
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    className="secondary-button management-pagination-button management-pagination-button-icon"
                    onClick={() => setApuracaoFinanceiraPage(apuracaoFinanceiraTotalPages)}
                    disabled={!canGoToNextApuracaoFinanceiraPage || isLoadingApuracaoFinanceira}
                    title="Ultimo registro"
                    aria-label="Ultimo registro"
                  >
                    ▶|
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : activeView === 'financeiroReprocessamento' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Operacional financeiro</p>
              <h2 id="content-title">Reprocessamento Financeiro</h2>
              <p className="content-description">
                Recalcule todos os valores dos veiculos e atualize os respectivos contratos dos termos a partir do menu operacional, com previa e confirmacao antes da execucao.
              </p>
            </div>

            <div className="access-embed-card">
              <iframe
                className="access-embed-frame"
                src="/src/financeiroReprocessamento.html"
                title="Reprocessamento financeiro"
              />
            </div>
          </>
        ) : activeView === 'vinculoCondutor' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro operacional</p>
              <h2 id="content-title">Tabela Vinculo de Condutor</h2>
              <p className="content-description">
                Consulte, inclua, altere e importe os vinculos de condutor a partir do XML no mesmo padrao operacional da tela de veiculo.
              </p>
            </div>

            <div className="access-embed-card">
              <iframe
                className="access-embed-frame"
                src="/src/vinculoCondutor.html"
                title="Cadastro de vinculo do condutor"
              />
            </div>
          </>
        ) : activeView === 'vinculoMonitor' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro operacional</p>
              <h2 id="content-title">Tabela Vinculo de Monitor</h2>
              <p className="content-description">
                Consulte, inclua, altere e importe os vinculos de monitor a partir do XML no mesmo padrao operacional da tela de vinculo do condutor.
              </p>
            </div>

            <div className="access-embed-card">
              <iframe
                className="access-embed-frame"
                src="/src/vinculoMonitor.html"
                title="Cadastro de vinculo do monitor"
              />
            </div>
          </>
        ) : activeView === 'cep' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Tabela de enderecamento</p>
              <h2 id="content-title">CEP</h2>
              <p className="content-description">
                Consulte, inclua, altere e importe os registros de CEP com auto-preenchimento de endereco via ViaCEP.
              </p>
            </div>

            <div className="access-embed-card">
              <iframe
                className="access-embed-frame"
                src="/src/cep.html"
                title="Cadastro de CEP"
              />
            </div>
          </>
        ) : activeView === 'ordemServico' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro operacional</p>
              <h2 id="content-title">OrdemServico</h2>
              <p className="content-description">
                Consulte, inclua, altere e importe Ordens de Servico com busca relacional de credenciada, DRE, condutor, preposto, veiculo, monitor e tipo de troca.
              </p>
            </div>

            <div className="access-embed-card">
              <iframe
                className="access-embed-frame"
                src="/src/ordemServico.html"
                title="OrdemServico"
              />
            </div>
          </>
        ) : activeView === 'smoke' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Validacao operacional</p>
              <h2 id="content-title">Smoke Test da Aplicacao</h2>
              <p className="content-description">
                Execute a suite completa ou uma suite especifica da API local e acompanhe erros,
                resumo detalhado por suite, importacoes exercitadas e o trecho final do log.
              </p>
            </div>

            <div className="management-layout">
              <div className="management-toolbar">
                <div className="smoke-suite-selector" role="group" aria-label="Selecionar suite de smoke">
                  {smokeSuiteOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`secondary-button smoke-suite-button ${selectedSmokeSuite === option.value ? 'smoke-suite-button-active' : ''}`}
                      onClick={() => setSelectedSmokeSuite(option.value)}
                      disabled={isRunningSmoke}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="primary-button dre-insert-button"
                  onClick={handleRunFullSmoke}
                  disabled={isRunningSmoke}
                >
                  {isRunningSmoke ? 'Executando smoke...' : 'Executar smoke selecionado'}
                </button>
              </div>

              <div className="management-card smoke-card">
                <h2>Resultado da execucao</h2>
                <p className={`status-message status-${smokeStatusTone}`} aria-live="polite">
                  {smokeStatusMessage}
                </p>

                {smokeResult ? (
                  <div className="smoke-summary-grid">
                    <article className="smoke-summary-card">
                      <span className="smoke-card-label">Suite solicitada</span>
                      <strong>{smokeResult.suite}</strong>
                    </article>
                    <article className="smoke-summary-card">
                      <span className="smoke-card-label">Status</span>
                      <strong>{smokeResult.status}</strong>
                    </article>
                    <article className="smoke-summary-card">
                      <span className="smoke-card-label">Exit code</span>
                      <strong>{smokeResult.exitCode}</strong>
                    </article>
                    {smokeResult.invalidFixtureStatus !== 'not-run' ? (
                      <article className="smoke-summary-card">
                        <span className="smoke-card-label">Fixtures invalidos</span>
                        <strong>{smokeResult.invalidFixtureStatus}</strong>
                      </article>
                    ) : null}
                    <article className="smoke-summary-card smoke-summary-card-wide">
                      <span className="smoke-card-label">Script</span>
                      <strong>{smokeResult.scriptName}</strong>
                    </article>
                    {smokeResult.reportPath ? (
                      <article className="smoke-summary-card smoke-summary-card-wide">
                        <span className="smoke-card-label">Relatorio JSON</span>
                        <strong>{smokeResult.reportPath}</strong>
                        <div className="smoke-report-actions">
                          <button type="button" className="secondary-button smoke-report-action-button" onClick={handleCopySmokeReportPath}>
                            Copiar caminho
                          </button>
                          <button type="button" className="secondary-button smoke-report-action-button" onClick={handleOpenSmokeReport}>
                            Abrir relatorio
                          </button>
                          <button type="button" className="secondary-button smoke-report-action-button" onClick={handleDownloadSmokeReport}>
                            Baixar JSON
                          </button>
                        </div>
                      </article>
                    ) : null}
                    {smokeResult.invalidFixtureReportPath ? (
                      <article className="smoke-summary-card smoke-summary-card-wide">
                        <span className="smoke-card-label">Relatorio fixtures invalidos</span>
                        <strong>{smokeResult.invalidFixtureReportPath}</strong>
                      </article>
                    ) : null}
                  </div>
                ) : null}

                {smokeReportActionMessage ? (
                  <p className="smoke-report-action-message">{smokeReportActionMessage}</p>
                ) : null}

                {smokeResult?.status === 'failed' || smokeResult?.report?.failureMessage ? (
                  <div className="smoke-error-card" role="alert">
                    <h3>Erro detectado</h3>
                    <p>{smokeResult.report?.failureMessage || smokeResult.message}</p>
                    {smokeResult.stderrTail ? (
                      <pre className="smoke-error-output">{smokeResult.stderrTail}</pre>
                    ) : null}
                  </div>
                ) : null}

                {smokeResult?.report?.executedSuites?.length ? (
                  <div className="smoke-suite-grid">
                    {smokeResult.report.executedSuites.map((suiteReport) => (
                      <article className="smoke-suite-card" key={`${suiteReport.name}-${suiteReport.startedAt ?? suiteReport.status}`}>
                        <div className="smoke-suite-card-header">
                          <div>
                            <span className="smoke-card-label">Suite</span>
                            <h3>{suiteReport.name}</h3>
                          </div>
                          <span className={`smoke-suite-badge smoke-suite-badge-${suiteReport.status}`}>{suiteReport.status}</span>
                        </div>

                        {suiteReport.failureMessage ? (
                          <p className="smoke-suite-error">{suiteReport.failureMessage}</p>
                        ) : null}

                        {suiteReport.imports?.length ? (
                          <div className="smoke-import-grid">
                            {suiteReport.imports.map((importItem) => (
                              <article className="smoke-import-card" key={`${suiteReport.name}-${importItem.label}-${importItem.fileName}`}>
                                <div className="smoke-import-card-header">
                                  <div>
                                    <span className="smoke-card-label">Importacao</span>
                                    <strong>{importItem.label}</strong>
                                  </div>
                                  <span>{importItem.fileName}</span>
                                </div>

                                <div className="smoke-import-metrics">
                                  <span>Total: {importItem.total}</span>
                                  <span>Processados: {importItem.processed}</span>
                                  <span>Incluidos: {importItem.inserted}</span>
                                  <span>Alterados: {importItem.updated}</span>
                                  <span>Recusados: {importItem.skipped}</span>
                                </div>

                                {importItem.skippedRecords.length ? (
                                  <div className="smoke-skipped-list">
                                    <span className="smoke-card-label">Recusas registradas</span>
                                    <ul>
                                      {importItem.skippedRecords.map((record) => (
                                        <li key={`${importItem.label}-${record.index}-${record.codigoXml ?? 'sem-codigo'}`}>
                                          Linha {record.index}
                                          {record.codigoXml ? `, codigo ${record.codigoXml}` : ''}
                                          : {record.message}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ) : null}
                              </article>
                            ))}
                          </div>
                        ) : (
                          <p className="smoke-suite-empty">Nenhuma importacao registrada para esta suite.</p>
                        )}
                      </article>
                    ))}
                  </div>
                ) : null}

                {smokeResult?.invalidFixtureReport?.executedSuites?.length ? (
                  <>
                    <h3>Verificacao de fixtures invalidos</h3>
                    <div className="smoke-suite-grid">
                      {smokeResult.invalidFixtureReport.executedSuites.map((suiteReport) => (
                        <article className="smoke-suite-card" key={`${suiteReport.suite}-${suiteReport.fileName}-${suiteReport.startedAt}`}>
                          <div className="smoke-suite-card-header">
                            <div>
                              <span className="smoke-card-label">Suite</span>
                              <h3>{suiteReport.suite}</h3>
                            </div>
                            <span className={`smoke-suite-badge smoke-suite-badge-${suiteReport.status}`}>{suiteReport.status}</span>
                          </div>

                          {suiteReport.failureMessage ? (
                            <p className="smoke-suite-error">{suiteReport.failureMessage}</p>
                          ) : null}

                          {suiteReport.importSummary ? (
                            <article className="smoke-import-card">
                              <div className="smoke-import-card-header">
                                <div>
                                  <span className="smoke-card-label">Fixture</span>
                                  <strong>{suiteReport.fileName}</strong>
                                </div>
                              </div>

                              <div className="smoke-import-metrics">
                                <span>Total: {suiteReport.importSummary.total}</span>
                                <span>Processados: {suiteReport.importSummary.processed}</span>
                                <span>Incluidos: {suiteReport.importSummary.inserted}</span>
                                <span>Alterados: {suiteReport.importSummary.updated}</span>
                                <span>Recusados: {suiteReport.importSummary.skipped}</span>
                              </div>

                              {suiteReport.importSummary.skippedRecords.length ? (
                                <div className="smoke-skipped-list">
                                  <span className="smoke-card-label">Recusas no payload</span>
                                  <ul>
                                    {suiteReport.importSummary.skippedRecords.map((record) => (
                                      <li key={`${suiteReport.fileName}-${record.index}-${record.codigoXml ?? 'sem-codigo'}`}>
                                        Linha {record.index}
                                        {record.codigoXml ? `, codigo ${record.codigoXml}` : ''}
                                        : {record.message}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}

                              {suiteReport.rejectionReasons.length ? (
                                <div className="smoke-skipped-list">
                                  <span className="smoke-card-label">Recusas persistidas</span>
                                  <ul>
                                    {suiteReport.rejectionReasons.map((reason) => (
                                      <li key={`${suiteReport.fileName}-${reason}`}>{reason}</li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}
                            </article>
                          ) : (
                            <p className="smoke-suite-empty">Nenhum resultado estruturado foi retornado para esta verificacao.</p>
                          )}
                        </article>
                      ))}
                    </div>
                  </>
                ) : null}

                <div className="smoke-log-card">
                  <h3>Log final</h3>
                  <div className="smoke-log-filter" role="group" aria-label="Selecionar stream do log">
                    <button
                      type="button"
                      className={`secondary-button smoke-log-filter-button ${selectedSmokeLogStream === 'stdout' ? 'smoke-log-filter-button-active' : ''} ${smokeResult?.status === 'passed' ? 'smoke-log-filter-button-recommended' : ''}`}
                      onClick={() => setSelectedSmokeLogStream('stdout')}
                    >
                      stdout
                      {smokeResult?.status === 'passed' ? <span className="smoke-log-filter-badge">principal</span> : null}
                    </button>
                    <button
                      type="button"
                      className={`secondary-button smoke-log-filter-button ${selectedSmokeLogStream === 'stderr' ? 'smoke-log-filter-button-active' : ''} ${smokeResult?.status === 'failed' ? 'smoke-log-filter-button-recommended-error' : ''}`}
                      onClick={() => setSelectedSmokeLogStream('stderr')}
                    >
                      stderr
                      {smokeResult?.status === 'failed' ? <span className="smoke-log-filter-badge smoke-log-filter-badge-error">erro</span> : null}
                    </button>
                  </div>
                  <pre className="smoke-log-output">
                    {selectedSmokeLogStream === 'stdout'
                      ? (smokeStdout || 'Nenhum stdout retornado para esta execucao.')
                      : (smokeStderr || 'Nenhum stderr retornado para esta execucao.')}
                  </pre>
                </div>
              </div>
            </div>
          </>
        ) : activeView === 'xmlImportLote' ? (
          <>
            <div className="content-copy">
              <p className="content-kicker">Importacao administrativa</p>
              <h2 id="content-title">Importacao Xml/Access em lote</h2>
              <p className="content-description">
                Execute a carga consolidada via XML gerado a partir do Access, acompanhe tabela atual no formato 1/x e veja em tempo real se houve zeragem inicial.
              </p>
            </div>

            <div className="management-layout">
              <div className="management-toolbar">
                <button
                  type="button"
                  className="primary-button dre-insert-button"
                  onClick={handleRunXmlImportAll}
                  disabled={isRunningXmlImportAll}
                >
                  {isRunningXmlImportAll
                    ? 'Executando importacao...'
                    : 'Executar importacao Xml/Access em lote'}
                </button>
                <div className="xml-import-all-path-field" aria-live="polite">
                  <div className="xml-import-all-path-field-header">
                    <label className="smoke-card-label" htmlFor="xml-import-all-access-db-path-input">Arquivo Access (local e nome)</label>
                    <div className="xml-import-all-path-field-actions">
                      <span className="xml-import-all-path-field-badge">Editavel</span>
                      <button
                        type="button"
                        className="secondary-button xml-import-all-path-clear-button"
                        onClick={handleClearXmlImportAllAccessDbPath}
                        disabled={isRunningXmlImportAll || !xmlImportAllAccessDbPathInput}
                      >
                        Limpar
                      </button>
                    </div>
                  </div>
                  <input
                    id="xml-import-all-access-db-path-input"
                    className="form-input xml-import-all-path-input"
                    type="text"
                    value={xmlImportAllAccessDbPathInput}
                    onChange={(event) => setXmlImportAllAccessDbPathInput(event.target.value)}
                    placeholder={xmlImportAllAccessDbPath || 'Informe o caminho completo do arquivo .accdb'}
                  />
                  <p className="xml-import-all-path-help">
                    Altere este campo para processar outro arquivo .accdb no proximo clique de execucao.
                  </p>
                </div>
              </div>

              <div className="management-card smoke-card">
                <h2>Resultado da execucao</h2>
                <p className={`status-message status-${xmlImportAllStatusTone}`} aria-live="polite">
                  {xmlImportAllStatusMessage}
                </p>
                <p className="smoke-suite-empty">Atualizacao automatica do log: a cada 1s (ultima leitura: {xmlImportAllLastUpdatedLabel})</p>

                {xmlImportAllResult?.isRunning || xmlImportAllResult?.currentFileName || xmlImportAllResult?.currentProgressText ? (
                  <div className="smoke-summary-grid">
                    <article className="smoke-summary-card smoke-summary-card-wide">
                      <span className="smoke-card-label">Tabela/arquivo atual</span>
                      <strong>{xmlImportAllResult?.currentFileName || 'Aguardando inicio da etapa...'}</strong>
                    </article>
                    <article className="smoke-summary-card">
                      <span className="smoke-card-label">Etapa atual</span>
                      <strong>{xmlImportAllResult?.currentStepLabel || '-'}</strong>
                    </article>
                    <article className="smoke-summary-card">
                      <span className="smoke-card-label">Tabela atual</span>
                      <strong>{xmlImportAllStepProgressText}</strong>
                    </article>
                    <article className="smoke-summary-card">
                      <span className="smoke-card-label">Progresso</span>
                      <strong>{xmlImportAllResult?.currentProgressText || '-'}</strong>
                    </article>
                    {xmlImportAllResult?.progressDetail ? (
                      <article className="smoke-summary-card smoke-summary-card-wide">
                        <span className="smoke-card-label">Detalhe do registro</span>
                        <strong>{xmlImportAllResult.progressDetail}</strong>
                      </article>
                    ) : null}
                  </div>
                ) : null}

                {xmlImportAllResult ? (
                  <div className="smoke-summary-grid">
                    <article className="smoke-summary-card">
                      <span className="smoke-card-label">Status</span>
                      <strong>{xmlImportAllResult.status}</strong>
                    </article>
                    <article className="smoke-summary-card">
                      <span className="smoke-card-label">Exit code</span>
                      <strong>{xmlImportAllResult.exitCode}</strong>
                    </article>
                    <article className="smoke-summary-card">
                      <span className="smoke-card-label">Etapas</span>
                      <strong>{xmlImportAllTotalSteps}</strong>
                    </article>
                    <article className="smoke-summary-card">
                      <span className="smoke-card-label">Fonte em uso</span>
                      <strong>{xmlImportAllSourceLabel}</strong>
                    </article>
                    <article className="smoke-summary-card">
                      <span className="smoke-card-label">Gerando XML antes</span>
                      <strong>{xmlImportAllResult?.generateFromAccess ? 'Sim' : 'Nao'}</strong>
                    </article>
                    <article className="smoke-summary-card">
                      <span className="smoke-card-label">Falhas</span>
                      <strong>{xmlImportAllResult.report?.failedSteps.length ?? 0}</strong>
                    </article>
                    <article className="smoke-summary-card">
                      <span className="smoke-card-label">Ignoradas</span>
                      <strong>{xmlImportAllResult.report?.skippedSteps.length ?? 0}</strong>
                    </article>
                    <article className="smoke-summary-card">
                      <span className="smoke-card-label">Excluir ausentes</span>
                      <strong>{xmlImportAllResult.report?.deleteMissing === false ? 'Nao' : 'Sim'}</strong>
                    </article>
                    <article className="smoke-summary-card">
                      <span className="smoke-card-label">Zerou tabelas no inicio</span>
                      <strong>{xmlImportAllResult?.truncateBeforeImport === false ? 'Nao' : 'Sim'}</strong>
                    </article>
                    <article className="smoke-summary-card smoke-summary-card-wide">
                      <span className="smoke-card-label">Script</span>
                      <strong>{xmlImportAllResult.scriptName}</strong>
                    </article>
                    {xmlImportAllAccessDbPath ? (
                      <article className="smoke-summary-card smoke-summary-card-wide">
                        <span className="smoke-card-label">Arquivo Access usado</span>
                        <strong>{xmlImportAllAccessDbPath}</strong>
                      </article>
                    ) : null}
                    {xmlImportAllResult.reportPath ? (
                      <article className="smoke-summary-card smoke-summary-card-wide">
                        <span className="smoke-card-label">Relatorio JSON</span>
                        <strong>{xmlImportAllResult.reportPath}</strong>
                      </article>
                    ) : null}
                    {xmlImportAllResult.report?.logPath || xmlImportAllResult.logPath ? (
                      <article className="smoke-summary-card smoke-summary-card-wide">
                        <span className="smoke-card-label">Log detalhado</span>
                        <strong>{xmlImportAllResult.report?.logPath || xmlImportAllResult.logPath}</strong>
                      </article>
                    ) : null}
                  </div>
                ) : null}

                {xmlImportAllResult?.status === 'failed' ? (
                  <div className="smoke-error-card" role="alert">
                    <h3>Erro detectado</h3>
                    <p>{xmlImportAllResult.message}</p>
                    {xmlImportAllStderr ? (
                      <pre className="smoke-error-output">{xmlImportAllStderr}</pre>
                    ) : null}
                  </div>
                ) : null}

                {xmlImportAllResult?.report?.results.length ? (
                  <div className="xml-import-all-detail-layout">
                    <div className="xml-import-all-tab-list" role="tablist" aria-label="Arquivos importados">
                      {xmlImportAllResult.report.results.map((stepResult) => {
                        const isSelected = selectedXmlImportAllStep?.key === stepResult.key

                        return (
                          <button
                            key={`${stepResult.key}-${stepResult.startedAt}`}
                            type="button"
                            role="tab"
                            aria-selected={isSelected}
                            className={`secondary-button xml-import-all-tab-button ${isSelected ? 'xml-import-all-tab-button-active' : ''}`}
                            onClick={() => setSelectedXmlImportAllStepKey(stepResult.key)}
                          >
                            <span>{stepResult.label}</span>
                            <span className={`smoke-suite-badge smoke-suite-badge-${stepResult.ok ? 'passed' : 'failed'}`}>
                              {getXmlImportAllStepStatusLabel(stepResult)}
                            </span>
                          </button>
                        )
                      })}
                    </div>

                    {selectedXmlImportAllStep ? (
                      <article className="smoke-suite-card xml-import-all-step-panel" role="tabpanel">
                        <div className="smoke-suite-card-header">
                          <div>
                            <span className="smoke-card-label">Arquivo</span>
                            <h3>{selectedXmlImportAllStep.fileName}</h3>
                          </div>
                          <span className={`smoke-suite-badge smoke-suite-badge-${selectedXmlImportAllStep.ok ? 'passed' : 'failed'}`}>
                            {getXmlImportAllStepStatusLabel(selectedXmlImportAllStep)}
                          </span>
                        </div>

                        <div className="smoke-import-metrics">
                          <span>Total: {selectedXmlImportAllStep.summary?.total ?? 0}</span>
                          <span>Processados: {selectedXmlImportAllStep.summary?.processed ?? 0}</span>
                          <span>Incluidos: {selectedXmlImportAllStep.summary?.inserted ?? 0}</span>
                          <span>Alterados: {selectedXmlImportAllStep.summary?.updated ?? 0}</span>
                          <span>Excluidos: {selectedXmlImportAllStep.summary?.deleted ?? 0}</span>
                          <span>Recusados: {selectedXmlImportAllStep.summary?.skipped ?? selectedXmlImportAllSkippedRecords.length}</span>
                        </div>

                        <div className="xml-import-all-meta-grid">
                          <p className="smoke-suite-empty">Endpoint: {selectedXmlImportAllStep.endpoint}</p>
                          {selectedXmlImportAllStep.logPath ? (
                            <p className="smoke-suite-empty">Log: {selectedXmlImportAllStep.logPath}</p>
                          ) : null}
                          {typeof selectedXmlImportAllStep.status === 'number' ? (
                            <p className="smoke-suite-empty">HTTP {selectedXmlImportAllStep.status}{selectedXmlImportAllStep.statusText ? ` - ${selectedXmlImportAllStep.statusText}` : ''}</p>
                          ) : null}
                        </div>

                        {selectedXmlImportAllReason ? (
                          <div className="xml-import-all-reason-card">
                            <span className="smoke-card-label">Motivo da ausencia ou falha de importacao</span>
                            <p>{selectedXmlImportAllReason}</p>
                          </div>
                        ) : null}

                        {selectedXmlImportAllSkippedRecords.length ? (
                          <div className="smoke-skipped-list">
                            <span className="smoke-card-label">Recusas registradas</span>
                            <ul>
                              {selectedXmlImportAllSkippedRecords.map((record, recordIndex) => {
                                const recordContext = formatXmlImportAllSkippedRecordContext(record)
                                return (
                                  <li key={`${selectedXmlImportAllStep.key}-${record.index ?? recordIndex}`}>
                                    {record.message || 'Registro recusado.'}
                                    {recordContext ? ` (${recordContext})` : ''}
                                  </li>
                                )
                              })}
                            </ul>
                          </div>
                        ) : (
                          <p className="smoke-suite-empty">Nenhuma recusa detalhada foi retornada para este arquivo.</p>
                        )}
                      </article>
                    ) : null}
                  </div>
                ) : null}

                <div className="smoke-log-card">
                  <h3>Log final</h3>
                  <div className="smoke-log-filter" role="group" aria-label="Selecionar stream do log da importacao">
                    <button
                      type="button"
                      className={`secondary-button smoke-log-filter-button ${selectedXmlImportAllLogStream === 'stdout' ? 'smoke-log-filter-button-active' : ''} ${xmlImportAllResult?.status === 'passed' ? 'smoke-log-filter-button-recommended' : ''}`}
                      onClick={() => setSelectedXmlImportAllLogStream('stdout')}
                    >
                      stdout
                      {xmlImportAllResult?.status === 'passed' ? <span className="smoke-log-filter-badge">principal</span> : null}
                    </button>
                    <button
                      type="button"
                      className={`secondary-button smoke-log-filter-button ${selectedXmlImportAllLogStream === 'stderr' ? 'smoke-log-filter-button-active' : ''} ${xmlImportAllResult?.status === 'failed' ? 'smoke-log-filter-button-recommended-error' : ''}`}
                      onClick={() => setSelectedXmlImportAllLogStream('stderr')}
                    >
                      stderr
                      {xmlImportAllResult?.status === 'failed' ? <span className="smoke-log-filter-badge smoke-log-filter-badge-error">erro</span> : null}
                    </button>
                  </div>
                  <pre className="smoke-log-output">
                    {selectedXmlImportAllLogStream === 'stdout'
                      ? (xmlImportAllStdout || 'Nenhum stdout retornado para esta execucao.')
                      : (xmlImportAllStderr || 'Nenhum stderr retornado para esta execucao.')}
                  </pre>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="content-copy">
              <p className="content-kicker">Cadastro operacional</p>
              <h2 id="content-title">Tabela Credenciada</h2>
              <p className="content-description">
                Consulte, inclua, altere e importe os registros de credenciadas a partir do XML no mesmo padrao operacional da tela de condutor.
              </p>
            </div>

            <div className="access-embed-card">
              <iframe
                className="access-embed-frame"
                src="/src/credenciada.html"
                title="Cadastro de credenciada"
              />
            </div>
          </>
        )}
      </section>
    </main>
    </div>
  )
}

export default App
