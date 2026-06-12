import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { listDreItemsPaginated } from './services/dre'
import type { DreItem } from './services/dre'
import {
  getRemuneracaoServicosBatchStatus,
  listRemuneracaoServicosItems,
  saveRemuneracaoServicosItems,
  startRemuneracaoServicosBatch,
  type RemuneracaoServicosBatchStatus,
  type RemuneracaoServicosItem,
  type RemuneracaoServicosSaveItem,
} from './services/remuneracaoServicos'
import { listApontamentoServicosItems } from './services/apontamentoServicos'
import { listDigitacaoFaltasConsultaItems } from './services/digitacaoFaltas'
import {
  APURACAO_TIPO_PESSOA_FILTER_OPTIONS,
} from './services/apuracaoTipoPessoa'
import type { ApuracaoTipoPessoa } from './services/apuracaoTipoPessoa'
import type { ApuracaoTipoPessoaFilter } from './services/apuracaoTipoPessoa'
import { getEditPermissionDeniedMessage, hasEditableFormPermission } from './utils/formAccess'
import { formatVeiculoOsEspecialDisplay } from './utils/veiculoDisplay'

type StatusTone = 'idle' | 'error' | 'success' | 'warning'
type MonetaryColumnVisibilityMode = 'all' | 'continua-only' | 'km-valor-only' | 'valor-total-only'

type RemuneracaoServicosFilters = {
  mesAno: string
  dataReferencia: string
  dreCodigo: string
  crmcCondutor: string
  placa: string
  revisao: string
  tipoPessoa: ApuracaoTipoPessoaFilter
}

type RemuneracaoServicosQuantities = {
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
}

type RemuneracaoServicosItemWithQuantities = RemuneracaoServicosItem & {
  _quantities?: RemuneracaoServicosQuantities
  _quantityDiscounts?: RemuneracaoServicosQuantities
  _faltaTipoLabels?: string[]
}

const FORM_ACCESS_KEY = 'form_apntsvc024'
const LEGACY_FORM_ACCESS_KEY = 'form_apursvc021'
const APURACAO_SERVICOS_EDITABLE_STATUS = 'Em digitacao'
const PAGE_SIZE_OPTIONS = [5, 10, 15, 20, 30]
const DEFAULT_PAGE_SIZE = 10

const normalizeMonthYearInput = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 6)

  if (digits.length <= 2) {
    return digits
  }

  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

const isValidMonthYear = (value: string) => /^(0[1-9]|1[0-2])\/\d{4}$/.test(value)
const normalizeIntegerInput = (value: string) => value.replace(/[^\d]/g, '')

const getCurrentMonthYear = () => {
  const currentDate = new Date()
  currentDate.setMonth(currentDate.getMonth() - 1)
  const month = String(currentDate.getMonth() + 1).padStart(2, '0')
  return `${month}/${currentDate.getFullYear()}`
}

const getCurrentIsoDate = () => {
  return new Date().toISOString().slice(0, 10)
}

const formatIsoDateToDisplay = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }

  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

const normalizeDisplayDateInput = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 8)

  if (digits.length <= 2) {
    return digits
  }

  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`
  }

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

const parseDisplayDateToIso = (value: string) => {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    return null
  }

  const [day, month, year] = value.split('/')
  const isoValue = `${year}-${month}-${day}`
  const parsedDate = new Date(`${isoValue}T00:00:00`)

  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }

  return parsedDate.toISOString().slice(0, 10) === isoValue ? isoValue : null
}

const getFirstDateOfMonthYear = (value: string) => {
  if (!isValidMonthYear(value)) {
    return ''
  }

  const [month, year] = value.split('/')
  return `${year}-${month}-01`
}

const doesDateBelongToMonthYear = (dateValue: string, monthYear: string) => {
  if (!dateValue || !isValidMonthYear(monthYear)) {
    return false
  }

  const [month, year] = monthYear.split('/')
  return dateValue.startsWith(`${year}-${month}`)
}

const parseApuracaoRevisao = (value: string) => {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return 0
  }

  const parsedRevisao = Number.parseInt(trimmedValue, 10)

  if (!Number.isInteger(parsedRevisao) || parsedRevisao < 0) {
    return null
  }

  return parsedRevisao
}

const formatDateLabel = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }

  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

const REMUNERACAO_BATCH_ALL_DATES_LABEL = 'Todos os dias do mes (exceto dia 31)'

const formatPeriodLabel = (item: Pick<RemuneracaoServicosItem, 'periodoInicio' | 'periodoFim'>) => {
  return [formatDateLabel(item.periodoInicio), formatDateLabel(item.periodoFim)].filter(Boolean).join(' a ')
}

const formatBatchTimestamp = (value: string) => {
  if (!value) {
    return '-'
  }

  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  return parsedDate.toLocaleString('pt-BR')
}

const formatBatchStatusLabel = (value: RemuneracaoServicosBatchStatus['status']) => {
  if (value === 'running') {
    return 'Executando'
  }

  if (value === 'passed') {
    return 'Concluido'
  }

  if (value === 'failed') {
    return 'Falhou'
  }

  return 'Sem execucao'
}

const formatCrmcDisplay = (value: string) => {
  const normalizedValue = value.trim()
  const digits = normalizedValue.replace(/\D/g, '').slice(0, 8)

  if (!digits) {
    return '-'
  }

  if (digits.length === 8) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}-${digits.slice(6, 8)}`
  }

  return normalizedValue || '-'
}

const formatTipoVeiculoDisplay = (value: string) => {
  const normalizedValue = value.trim()

  if (!normalizedValue) {
    return 'NORMAL'
  }

  const normalizedKey = normalizedValue
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  if (normalizedKey === 'convencional' || normalizedKey === 'normal') {
    return 'NORMAL'
  }

  if (normalizedKey === 'adaptado' || normalizedKey === 'acessivel') {
    return 'ACESSIVEL'
  }

  if (normalizedKey === 'creche') {
    return 'CRECHE'
  }

  return normalizedValue.toUpperCase()
}

const formatDreOptionLabel = (item: DreItem) => `${item.codigo} - ${item.sigla} - ${item.descricao}`

const buildRowKey = (item: Pick<RemuneracaoServicosItem, 'mesAno' | 'dreCodigo' | 'ordemServicoCodigo' | 'revisao' | 'tipoPessoa'>) => {
  return `${item.mesAno}|${item.dreCodigo}|${item.ordemServicoCodigo}|${item.revisao}|${item.tipoPessoa}`
}

const buildOrdemServicoGroupKey = (item: Pick<RemuneracaoServicosItem, 'mesAno' | 'dreCodigo' | 'ordemServicoCodigo' | 'revisao' | 'tipoPessoa'>) => {
  return `${item.mesAno}|${item.dreCodigo}|${item.ordemServicoCodigo}|${item.revisao}|${item.tipoPessoa}`
}

const normalizeMoneyInput = (value: string) => {
  return value.replace(/[^\d,.-]/g, '')
}

const parseMoneyValue = (value: string) => {
  const normalizedValue = value.trim()

  if (!normalizedValue) {
    return Number.NaN
  }

  const parsedValue = /^-?\d+(?:\.\d+)?$/.test(normalizedValue)
    ? Number(normalizedValue)
    : Number(normalizedValue.replace(/\./g, '').replace(',', '.'))

  return Number.isFinite(parsedValue) ? parsedValue : Number.NaN
}

const formatMoneyValue = (value: number) => {
  if (!Number.isFinite(value)) {
    return '0,00'
  }

  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const buildSavePayloadItem = (item: RemuneracaoServicosItem): RemuneracaoServicosSaveItem => ({
  dreCodigo: item.dreCodigo,
  ordemServicoCodigo: item.ordemServicoCodigo,
  revisao: item.revisao,
  tipoPessoa: item.tipoPessoa,
  tegRegularFixo: item.tegRegularFixo,
  tegRegularPercapita: item.tegRegularPercapita,
  tegAcessivelFixo: item.tegAcessivelFixo,
  tegAcessivelPercapita: item.tegAcessivelPercapita,
  tegEspecialRegularFixo: item.tegEspecialRegularFixo,
  tegEspecialRegularPercapita: item.tegEspecialRegularPercapita,
  tegEspecialAcessivelFixo: item.tegEspecialAcessivelFixo,
  tegEspecialAcessivelPercapita: item.tegEspecialAcessivelPercapita,
  tegCrecheFixo: item.tegCrecheFixo,
  tegCrechePercapita: item.tegCrechePercapita,
  kmValor: item.kmValor,
  continuaRegular: item.continuaRegular,
  continuaCadeirante: item.continuaCadeirante,
  ccaValor: item.ccaValor,
})

const areSavePayloadItemsEqual = (left: RemuneracaoServicosSaveItem, right: RemuneracaoServicosSaveItem) => {
  return left.dreCodigo === right.dreCodigo
    && left.ordemServicoCodigo === right.ordemServicoCodigo
    && left.revisao === right.revisao
    && left.tipoPessoa === right.tipoPessoa
    && left.tegRegularFixo === right.tegRegularFixo
    && left.tegRegularPercapita === right.tegRegularPercapita
    && left.tegAcessivelFixo === right.tegAcessivelFixo
    && left.tegAcessivelPercapita === right.tegAcessivelPercapita
    && left.tegEspecialRegularFixo === right.tegEspecialRegularFixo
    && left.tegEspecialRegularPercapita === right.tegEspecialRegularPercapita
    && left.tegEspecialAcessivelFixo === right.tegEspecialAcessivelFixo
    && left.tegEspecialAcessivelPercapita === right.tegEspecialAcessivelPercapita
    && left.tegCrecheFixo === right.tegCrecheFixo
    && left.tegCrechePercapita === right.tegCrechePercapita
    && left.kmValor === right.kmValor
    && left.continuaRegular === right.continuaRegular
    && left.continuaCadeirante === right.continuaCadeirante
    && left.ccaValor === right.ccaValor
}

const monetaryColumns = [
  { key: 'tegRegularFixo', groupTitle: 'TEG Regular', columnTitle: 'Fixo', headerClass: 'remuneracao-servicos-header-teg-regular' },
  { key: 'tegRegularPercapita', groupTitle: 'TEG Regular', columnTitle: 'Percapita', headerClass: 'remuneracao-servicos-header-teg-regular' },
  { key: 'tegAcessivelFixo', groupTitle: 'TEG Acessível', columnTitle: 'Fixo', headerClass: 'remuneracao-servicos-header-teg-acessivel' },
  { key: 'tegAcessivelPercapita', groupTitle: 'TEG Acessível', columnTitle: 'Percapita', headerClass: 'remuneracao-servicos-header-teg-acessivel' },
  { key: 'tegEspecialRegularFixo', groupTitle: 'TEG Especial', columnTitle: 'Reg. Fixo', headerClass: 'remuneracao-servicos-header-teg-especial' },
  { key: 'tegEspecialRegularPercapita', groupTitle: 'TEG Especial', columnTitle: 'Reg. Percapita', headerClass: 'remuneracao-servicos-header-teg-especial' },
  { key: 'tegEspecialAcessivelFixo', groupTitle: 'TEG Especial', columnTitle: 'Acess. Fixo', headerClass: 'remuneracao-servicos-header-teg-especial' },
  { key: 'tegEspecialAcessivelPercapita', groupTitle: 'TEG Especial', columnTitle: 'Acess. Percapita', headerClass: 'remuneracao-servicos-header-teg-especial' },
  { key: 'tegCrecheFixo', groupTitle: 'TEG Creche', columnTitle: 'Fixo', headerClass: 'remuneracao-servicos-header-teg-creche' },
  { key: 'tegCrechePercapita', groupTitle: 'TEG Creche', columnTitle: 'Percapita', headerClass: 'remuneracao-servicos-header-teg-creche' },
  { key: 'kmValor', groupTitle: 'KM', columnTitle: 'Valor', headerClass: 'remuneracao-servicos-header-km' },
  { key: 'continuaRegular', groupTitle: 'Continua', columnTitle: 'Reg.', headerClass: 'remuneracao-servicos-header-continua' },
  { key: 'continuaCadeirante', groupTitle: 'Continua', columnTitle: 'Cadeirante', headerClass: 'remuneracao-servicos-header-continua' },
  { key: 'ccaValor', groupTitle: 'CCA', columnTitle: 'Valor', headerClass: 'remuneracao-servicos-header-cca' },
] as const

type MonetaryColumnKey = (typeof monetaryColumns)[number]['key']

const CONTINUA_MONETARY_COLUMN_KEYS: ReadonlySet<MonetaryColumnKey> = new Set([
  'continuaRegular',
  'continuaCadeirante',
])
const KM_VALOR_MONETARY_COLUMN_KEYS: ReadonlySet<MonetaryColumnKey> = new Set([
  'kmValor',
])

const calculateValorTotal = (item: RemuneracaoServicosItem) => {
  return monetaryColumns.reduce((sum, column) => sum + (item[column.key] || 0), 0)
}

const getEmptyRemuneracaoQuantities = (): RemuneracaoServicosQuantities => ({
  tegRegularFixo: 0,
  tegRegularPercapita: 0,
  tegAcessivelFixo: 0,
  tegAcessivelPercapita: 0,
  tegEspecialRegularFixo: 0,
  tegEspecialRegularPercapita: 0,
  tegEspecialAcessivelFixo: 0,
  tegEspecialAcessivelPercapita: 0,
  tegCrecheFixo: 0,
  tegCrechePercapita: 0,
})

const calculateFaltaWeightedDiscount = (item: {
  quantidadeAlunosIntegral: number | null
  quantidadeAlunosMeioPeriodo: number | null
}) => {
  const quantidadeIntegral = Math.max(0, Number(item.quantidadeAlunosIntegral) || 0)
  const quantidadeMeioPeriodo = Math.max(0, Number(item.quantidadeAlunosMeioPeriodo) || 0)
  return quantidadeIntegral + (quantidadeMeioPeriodo * 0.5)
}

const subtractQuantity = (value: number, discount: number) => {
  return Math.max(0, Number((value - discount).toFixed(2)))
}

const formatQuantityValue = (value: number) => {
  if (Number.isInteger(value)) {
    return String(value)
  }

  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  })
}

const formatQuantityCalculation = (finalQuantity: number, discount: number) => {
  if (discount <= 0) {
    return formatQuantityValue(finalQuantity)
  }

  const originalQuantity = Number((finalQuantity + discount).toFixed(2))
  return `${formatQuantityValue(originalQuantity)} - ${formatQuantityValue(discount)} = ${formatQuantityValue(finalQuantity)}`
}

const formatQuantityLabel = (label: string, finalQuantity: number, discount: number) => {
  return `${label}: ${formatQuantityCalculation(finalQuantity, discount)}`
}

const getFaltaTipoLabels = (item: {
  ausenciaTotal: boolean
  quantidadeAlunosIntegral: number | null
  quantidadeAlunosMeioPeriodo: number | null
}) => {
  const labels: string[] = []

  if (item.ausenciaTotal) {
    labels.push('ausência total')
  }

  if ((Number(item.quantidadeAlunosIntegral) || 0) > 0) {
    labels.push('integral')
  }

  if ((Number(item.quantidadeAlunosMeioPeriodo) || 0) > 0) {
    labels.push('meio período')
  }

  return labels
}

const normalizeTipoEscolaLabel = (value: string) => value
  .trim()
  .toUpperCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')

const isExcludedTipoEscolaFromRegular = (item: {
  tipoEscolaCodigo?: string
  tipoEscolaSigla?: string
  tipoEscolaDescricao?: string
}) => {
  const tipoEscolaCodigo = String(item.tipoEscolaCodigo ?? '').trim()
  const tipoEscolaSigla = normalizeTipoEscolaLabel(item.tipoEscolaSigla ?? '')
  const tipoEscolaDescricao = normalizeTipoEscolaLabel(item.tipoEscolaDescricao ?? '')

  return tipoEscolaCodigo === '6'
    || tipoEscolaCodigo === '7'
    || tipoEscolaSigla === 'CEI'
    || tipoEscolaSigla === 'CCA'
    || tipoEscolaDescricao.includes('CENTRO DE EDUCACAO INFANTIL')
    || tipoEscolaDescricao.includes('CENTRO PARA CRIANCAS E ADOLESCENTES')
}

const isIncludedTipoEscolaForAcessivel = (item: {
  tipoEscolaCodigo?: string
  tipoEscolaSigla?: string
  tipoEscolaDescricao?: string
}) => {
  const tipoEscolaCodigo = String(item.tipoEscolaCodigo ?? '').trim()
  const tipoEscolaSigla = normalizeTipoEscolaLabel(item.tipoEscolaSigla ?? '')
  const tipoEscolaDescricao = normalizeTipoEscolaLabel(item.tipoEscolaDescricao ?? '')

  if (tipoEscolaCodigo === '7' || tipoEscolaSigla === 'CCA' || tipoEscolaDescricao.includes('CENTRO PARA CRIANCAS E ADOLESCENTES')) {
    return false
  }

  return tipoEscolaCodigo === '6'
    || tipoEscolaSigla === 'CEI'
    || tipoEscolaSigla === 'EMEI'
    || tipoEscolaSigla === 'EMEF'
    || tipoEscolaSigla === 'EMEE'
    || tipoEscolaDescricao.includes('CENTRO DE EDUCACAO INFANTIL')
    || tipoEscolaDescricao.includes('ESCOLA MUNICIPAL DE EDUCACAO INFANTIL')
    || tipoEscolaDescricao.includes('ESCOLA MUNICIPAL DE ENSINO FUNDAMENTAL')
    || tipoEscolaDescricao.includes('ESCOLA MUNICIPAL DE EDUCACAO ESPECIAL')
}

const isIncludedTipoEscolaForCreche = (item: {
  tipoEscolaCodigo?: string
  tipoEscolaSigla?: string
  tipoEscolaDescricao?: string
}) => {
  const tipoEscolaCodigo = String(item.tipoEscolaCodigo ?? '').trim()
  const tipoEscolaSigla = normalizeTipoEscolaLabel(item.tipoEscolaSigla ?? '')
  const tipoEscolaDescricao = normalizeTipoEscolaLabel(item.tipoEscolaDescricao ?? '')

  return tipoEscolaCodigo === '6'
    || tipoEscolaSigla === 'CEI'
    || tipoEscolaDescricao.includes('CENTRO DE EDUCACAO INFANTIL')
}

const isIncludedTipoEscolaForEspecialRegular = (item: {
  tipoEscolaSigla?: string
  tipoEscolaDescricao?: string
}) => {
  const tipoEscolaSigla = normalizeTipoEscolaLabel(item.tipoEscolaSigla ?? '')
  const tipoEscolaDescricao = normalizeTipoEscolaLabel(item.tipoEscolaDescricao ?? '')

  return tipoEscolaSigla === 'EMEI'
    || tipoEscolaSigla === 'EMEF'
    || tipoEscolaSigla === 'EMEE'
    || tipoEscolaDescricao.includes('ESCOLA MUNICIPAL DE EDUCACAO INFANTIL')
    || tipoEscolaDescricao.includes('ESCOLA MUNICIPAL DE ENSINO FUNDAMENTAL')
    || tipoEscolaDescricao.includes('ESCOLA MUNICIPAL DE EDUCACAO ESPECIAL')
}

const getQuantityForMonetaryGroup = (
  item: RemuneracaoServicosItemWithQuantities,
  groupTitle: string,
) => {
  const normalizedGroupTitle = normalizeTipoEscolaLabel(groupTitle)
  const groupHasValue = (columnKeys: MonetaryColumnKey[]) => {
    return columnKeys.some((columnKey) => (Number(item[columnKey]) || 0) !== 0)
  }
  const regularGroupHasSameQuantity = (regularQuantity: number) => {
    return regularQuantity > 0
      && groupHasValue(['tegRegularFixo', 'tegRegularPercapita'])
      && regularQuantity === (item._quantities?.tegRegularFixo ?? 0)
  }

  if (normalizedGroupTitle.includes('TEG REGULAR')) {
    const quantity = item._quantities?.tegRegularFixo ?? 0
    const discount = item._quantityDiscounts?.tegRegularFixo ?? 0

    return groupHasValue(['tegRegularFixo', 'tegRegularPercapita'])
      ? `Qtd: ${formatQuantityCalculation(quantity, discount)}`
      : 0
  }

  if (normalizedGroupTitle.includes('TEG ACESSIVEL')) {
    if (!groupHasValue(['tegAcessivelFixo', 'tegAcessivelPercapita'])) {
      return 0
    }

    const regularQuantity = item._quantities?.tegRegularFixo ?? 0
    const acessivelQuantity = item._quantities?.tegAcessivelFixo ?? 0
    const regularDiscount = item._quantityDiscounts?.tegRegularFixo ?? 0
    const acessivelDiscount = item._quantityDiscounts?.tegAcessivelFixo ?? 0

    if (regularQuantity > 0 && !regularGroupHasSameQuantity(regularQuantity)) {
      return `${formatQuantityLabel('Reg', regularQuantity, regularDiscount)} / ${formatQuantityLabel('Acess', acessivelQuantity, acessivelDiscount)}`
    }

    return formatQuantityLabel('Acess', acessivelQuantity, acessivelDiscount)
  }

  if (normalizedGroupTitle.includes('TEG ESPECIAL')) {
    if (!groupHasValue([
      'tegEspecialRegularFixo',
      'tegEspecialRegularPercapita',
      'tegEspecialAcessivelFixo',
      'tegEspecialAcessivelPercapita',
    ])) {
      return 0
    }

    const regularQuantity = item._quantities?.tegEspecialRegularFixo ?? 0
    const acessivelQuantity = item._quantities?.tegEspecialAcessivelFixo ?? 0
    const regularDiscount = item._quantityDiscounts?.tegEspecialRegularFixo ?? 0
    const acessivelDiscount = item._quantityDiscounts?.tegEspecialAcessivelFixo ?? 0
    const shouldShowRegularQuantity = regularQuantity > 0 && !regularGroupHasSameQuantity(regularQuantity)

    if (shouldShowRegularQuantity && acessivelQuantity > 0) {
      return `${formatQuantityLabel('Reg', regularQuantity, regularDiscount)} / ${formatQuantityLabel('Acess', acessivelQuantity, acessivelDiscount)}`
    }

    if (shouldShowRegularQuantity) {
      return formatQuantityLabel('Reg', regularQuantity, regularDiscount)
    }

    if (acessivelQuantity > 0) {
      return formatQuantityLabel('Acess', acessivelQuantity, acessivelDiscount)
    }

    return 'Qtd: 0'
  }

  if (normalizedGroupTitle.includes('TEG CRECHE')) {
    if (!groupHasValue(['tegCrecheFixo', 'tegCrechePercapita'])) {
      return 0
    }

    const regularQuantity = item._quantities?.tegRegularFixo ?? 0
    const crecheQuantity = item._quantities?.tegCrecheFixo ?? 0
    const regularDiscount = item._quantityDiscounts?.tegRegularFixo ?? 0
    const crecheDiscount = item._quantityDiscounts?.tegCrecheFixo ?? 0

    if (regularQuantity > 0 && !regularGroupHasSameQuantity(regularQuantity)) {
      return `${formatQuantityLabel('Reg', regularQuantity, regularDiscount)} / ${formatQuantityLabel('Creche', crecheQuantity, crecheDiscount)}`
    }

    return formatQuantityLabel('Creche', crecheQuantity, crecheDiscount)
  }

  return null
}

export default function RemuneracaoServicosView() {
  const hasEditPermission = hasEditableFormPermission(FORM_ACCESS_KEY) || hasEditableFormPermission(LEGACY_FORM_ACCESS_KEY)
  const initialMesAno = getCurrentMonthYear()
  const initialDataReferencia = getFirstDateOfMonthYear(initialMesAno) || getCurrentIsoDate()
  const [dreOptions, setDreOptions] = useState<DreItem[]>([])
  const [mesAno, setMesAno] = useState(initialMesAno)
  const [dataOperacaoInput, setDataOperacaoInput] = useState(formatIsoDateToDisplay(initialDataReferencia))
  const [dreCodigo, setDreCodigo] = useState('')
  const [crmcCondutor, setCrmcCondutor] = useState('')
  const [placa, setPlaca] = useState('')
  const [revisao, setRevisao] = useState('0')
  const [tipoPessoa, setTipoPessoa] = useState<ApuracaoTipoPessoaFilter>('')
  const [appliedFilters, setAppliedFilters] = useState<RemuneracaoServicosFilters>({
    mesAno: initialMesAno,
    dataReferencia: initialDataReferencia,
    dreCodigo: '',
    crmcCondutor: '',
    placa: '',
    revisao: '0',
    tipoPessoa: '',
  })
  const [items, setItems] = useState<RemuneracaoServicosItemWithQuantities[]>([])
  const [loadedItemsSnapshot, setLoadedItemsSnapshot] = useState<RemuneracaoServicosItem[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusTone, setStatusTone] = useState<StatusTone>('idle')
  const [validationDialogMessage, setValidationDialogMessage] = useState('')
  const [isValidationDialogVisible, setIsValidationDialogVisible] = useState(false)
  const [isLoadingOptions, setIsLoadingOptions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)
  const [isBatchStatusDialogVisible, setIsBatchStatusDialogVisible] = useState(false)
  const [isLoadingBatchStatus, setIsLoadingBatchStatus] = useState(false)
  const [remuneracaoBatchStatus, setRemuneracaoBatchStatus] = useState<RemuneracaoServicosBatchStatus | null>(null)
  const [monetaryColumnVisibilityMode, setMonetaryColumnVisibilityMode] = useState<MonetaryColumnVisibilityMode>('all')
  const shouldFocusFirstGridRecordRef = useRef(false)
  const topScrollWrapperRef = useRef<HTMLDivElement | null>(null)
  const topScrollContentRef = useRef<HTMLDivElement | null>(null)
  const tableWrapperRef = useRef<HTMLDivElement | null>(null)
  const monthYearMismatchMessage = 'A data de operacao deve pertencer ao mes/ano informado.'
  const canGoToPreviousPage = page > 1
  const canGoToNextPage = page < totalPages
  const isProcessingBatch = isCalculating || isLoadingBatchStatus || Boolean(remuneracaoBatchStatus?.isRunning)
  const showValorTotalColumn = monetaryColumnVisibilityMode === 'all' || monetaryColumnVisibilityMode === 'valor-total-only'
  const visibleMonetaryColumns = useMemo(() => {
    if (monetaryColumnVisibilityMode === 'valor-total-only') {
      return []
    }

    if (monetaryColumnVisibilityMode === 'continua-only') {
      return monetaryColumns.filter((column) => CONTINUA_MONETARY_COLUMN_KEYS.has(column.key))
    }

    if (monetaryColumnVisibilityMode === 'km-valor-only') {
      return monetaryColumns.filter((column) => KM_VALOR_MONETARY_COLUMN_KEYS.has(column.key))
    }

    return monetaryColumns
  }, [monetaryColumnVisibilityMode])
  const loadedItemsByRowKey = useMemo(() => {
    return new Map(loadedItemsSnapshot.map((item) => [buildRowKey(item), buildSavePayloadItem(item)]))
  }, [loadedItemsSnapshot])
  const rowGroupInfoByIndex = useMemo(() => {
    const groupInfoByIndex = new Map<number, { rowGroupIndex: number; isFirstRowOfGroup: boolean }>()
    let previousGroupKey = ''
    let currentRowGroupIndex = 0

    for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
      const currentGroupKey = buildOrdemServicoGroupKey(items[itemIndex])
      const isFirstRow = itemIndex === 0
      const isFirstRowOfGroup = isFirstRow || currentGroupKey !== previousGroupKey

      if (isFirstRowOfGroup) {
        currentRowGroupIndex = 0
      } else {
        currentRowGroupIndex += 1
      }

      groupInfoByIndex.set(itemIndex, { rowGroupIndex: currentRowGroupIndex, isFirstRowOfGroup })
      previousGroupKey = currentGroupKey
    }

    return groupInfoByIndex
  }, [items])
  const tableColumnCount = 1 + visibleMonetaryColumns.length + (showValorTotalColumn ? 1 : 0)
  const tableVisibilityClassName = monetaryColumnVisibilityMode === 'valor-total-only'
    ? 'total-remuneracao-servicos-table-valor-total-only'
    : monetaryColumnVisibilityMode !== 'all'
      ? 'remuneracao-servicos-table-only-continua'
      : ''
  const mergedHeaderGroups = useMemo(() => {
    const groups: Array<{
      title: string
      headerClass: string
      colSpan: number
    }> = []

    for (const column of visibleMonetaryColumns) {
      const lastGroup = groups[groups.length - 1]

      if (lastGroup && lastGroup.title === column.groupTitle && lastGroup.headerClass === column.headerClass) {
        lastGroup.colSpan += 1
        continue
      }

      groups.push({
        title: column.groupTitle,
        headerClass: column.headerClass,
        colSpan: 1,
      })
    }

    return groups
  }, [visibleMonetaryColumns])

  const openValidationDialog = useCallback((message: string) => {
    setValidationDialogMessage(message)
    setIsValidationDialogVisible(true)
  }, [])

  const closeValidationDialog = useCallback(() => {
    setIsValidationDialogVisible(false)
    setValidationDialogMessage('')
  }, [])

  const closeBatchStatusDialog = useCallback(() => {
    setIsBatchStatusDialogVisible(false)
  }, [])

  const handleMesAnoChange = (value: string) => {
    const normalizedMesAno = normalizeMonthYearInput(value)
    setMesAno(normalizedMesAno)

    if (!isValidMonthYear(normalizedMesAno)) {
      return
    }

    const firstDate = getFirstDateOfMonthYear(normalizedMesAno)

    if (firstDate) {
      setDataOperacaoInput(formatIsoDateToDisplay(firstDate))
    }
  }

  const handleDataOperacaoInputChange = (value: string) => {
    setDataOperacaoInput(normalizeDisplayDateInput(value))
  }

  const buildCurrentFilters = useCallback((): RemuneracaoServicosFilters => {
    const parsedDate = parseDisplayDateToIso(dataOperacaoInput)

    return {
      mesAno,
      dataReferencia: parsedDate ?? '',
      dreCodigo,
      crmcCondutor: crmcCondutor.trim(),
      placa: placa.trim(),
      revisao: revisao.trim(),
      tipoPessoa,
    }
  }, [crmcCondutor, dataOperacaoInput, dreCodigo, mesAno, placa, revisao, tipoPessoa])

  const loadDreOptions = useCallback(async () => {
    setIsLoadingOptions(true)

    try {
      const dreResult = await listDreItemsPaginated({
        page: 1,
        pageSize: 500,
        sortBy: 'codigo',
        sortDirection: 'asc',
      })

      setDreOptions(dreResult.items)
    } catch {
      setStatusTone('error')
      setStatusMessage('Falha ao carregar as opcoes de DRE.')
    } finally {
      setIsLoadingOptions(false)
    }
  }, [])

  const syncBatchStatus = useCallback(async (options: { openDialog?: boolean } = {}) => {
    setIsLoadingBatchStatus(true)

    try {
      const result = await getRemuneracaoServicosBatchStatus()
      setRemuneracaoBatchStatus(result)
      setStatusTone(result.status === 'failed' ? 'error' : result.status === 'passed' ? 'success' : 'idle')
      setStatusMessage(result.message)

      if (options.openDialog) {
        setIsBatchStatusDialogVisible(true)
      }

      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao consultar o status do processamento em lote.'
      setStatusTone('error')
      setStatusMessage(message)

      if (options.openDialog) {
        setIsBatchStatusDialogVisible(true)
      }

      return null
    } finally {
      setIsLoadingBatchStatus(false)
    }
  }, [])

  const openBatchStatusDialog = useCallback(async () => {
    await syncBatchStatus({ openDialog: true })
  }, [syncBatchStatus])

  const loadItems = useCallback(async (
    filters: RemuneracaoServicosFilters,
    pageToLoad: number,
    pageSizeToLoad: number,
    options: { silent?: boolean } = {},
  ) => {
    if (!isValidMonthYear(filters.mesAno)) {
      openValidationDialog('Informe um mes/ano valido para consultar o ateste.')
      return
    }

    if (!filters.dataReferencia) {
      setItems([])
      setLoadedItemsSnapshot([])
      setTotalItems(0)
      setTotalPages(1)
      if (!options.silent) {
        setStatusTone('idle')
        setStatusMessage('')
      }
      return
    }

    if (!doesDateBelongToMonthYear(filters.dataReferencia, filters.mesAno)) {
      openValidationDialog(monthYearMismatchMessage)
      return
    }

    if (!options.silent) {
      setIsLoading(true)
      setStatusTone('idle')
      setStatusMessage('Carregando ateste de servicos...')
    }

    const parsedRevisao = parseApuracaoRevisao(filters.revisao)

    if (parsedRevisao === null) {
      openValidationDialog('Informe uma revisao valida.')
      return
    }

    try {
      const result = await listRemuneracaoServicosItems({
        mesAno: filters.mesAno,
        dataReferencia: filters.dataReferencia,
        dreCodigo: filters.dreCodigo,
        crmcCondutor: filters.crmcCondutor,
        placa: filters.placa,
        revisao: parsedRevisao,
        tipoPessoa: filters.tipoPessoa || undefined,
        page: pageToLoad,
        pageSize: pageSizeToLoad,
      })
      // Also load apontamento servicos to compute summed quantities per OS
      const apontResult = await listApontamentoServicosItems({
        mesAno: filters.mesAno,
        dataReferencia: filters.dataReferencia,
        dreCodigo: filters.dreCodigo,
        crmcCondutor: filters.crmcCondutor,
        placa: filters.placa,
        revisao: parsedRevisao,
        tipoPessoa: filters.tipoPessoa || undefined,
        page: 1,
        pageSize: 1000,
      })

      // Map quantities by ordemServicoCodigo|revisao|tipoPessoa, matching calculation columns.
      // Fixo uses the total quantity; Percapita shows the complementary quantity that drives the extra value.
      const qMap = new Map<string, RemuneracaoServicosQuantities>()
      const discountMap = new Map<string, RemuneracaoServicosQuantities>()
      const faltaLabelsMap = new Map<string, Set<string>>()
      for (const a of apontResult.items) {
        const key = `${a.ordemServicoCodigo}|${a.revisao}|${a.tipoPessoa}`
        const prev = qMap.get(key) ?? getEmptyRemuneracaoQuantities()
        const ncPresAcm = Number(a.naoCadeirantePresencialAcm || 0)
        const atComplNcAcm = Number(a.atendimentoComplementarNaoCadeiranteAcm || 0)
        const cadAcm = Number(a.cadeiranteAcm || 0)
        const atComplCadAcm = Number(a.atendimentoComplementarCadeiranteAcm || 0)

        if (!isExcludedTipoEscolaFromRegular(a)) {
          prev.tegRegularFixo += ncPresAcm + atComplNcAcm
          prev.tegRegularPercapita += atComplNcAcm
        }

        if (isIncludedTipoEscolaForAcessivel(a)) {
          prev.tegAcessivelFixo += cadAcm + atComplCadAcm
          prev.tegAcessivelPercapita += atComplCadAcm
        }

        if (isIncludedTipoEscolaForEspecialRegular(a)) {
          prev.tegEspecialRegularFixo += ncPresAcm + atComplNcAcm
          prev.tegEspecialRegularPercapita += atComplNcAcm
        }

        if (isIncludedTipoEscolaForAcessivel(a)) {
          prev.tegEspecialAcessivelFixo += cadAcm + atComplCadAcm
          prev.tegEspecialAcessivelPercapita += atComplCadAcm
        }

        if (isIncludedTipoEscolaForCreche(a)) {
          prev.tegCrecheFixo += ncPresAcm + atComplNcAcm
          prev.tegCrechePercapita += atComplNcAcm
        }

        qMap.set(key, prev)
      }

      const dreCodesForFaltas = Array.from(new Set(
        [...result.items.map((item) => item.dreCodigo), ...apontResult.items.map((item) => item.dreCodigo)]
          .map((value) => String(value || '').trim())
          .filter(Boolean),
      ))
      const tipoPessoasForFaltas = filters.tipoPessoa
        ? [filters.tipoPessoa as ApuracaoTipoPessoa]
        : Array.from(new Set(
          [...result.items.map((item) => item.tipoPessoa), ...apontResult.items.map((item) => item.tipoPessoa)]
            .filter((value): value is ApuracaoTipoPessoa => value === 'PF' || value === 'PJ'),
        ))
      const faltasItems = (await Promise.all(dreCodesForFaltas.flatMap((currentDreCodigo) => (
        tipoPessoasForFaltas.map((currentTipoPessoa) => listDigitacaoFaltasConsultaItems({
          mesAno: filters.mesAno,
          dataReferencia: filters.dataReferencia,
          dreCodigo: currentDreCodigo,
          tipoPessoa: currentTipoPessoa,
          revisao: parsedRevisao,
          crmcCondutor: filters.crmcCondutor,
          placa: filters.placa,
        }))
      )))).flat()

      for (const falta of faltasItems) {
        const discount = calculateFaltaWeightedDiscount(falta)
        const key = `${falta.ordemServicoCodigo}|${falta.revisao}|${falta.tipoPessoa}`
        const currentFaltaLabels = faltaLabelsMap.get(key) ?? new Set<string>()
        for (const label of getFaltaTipoLabels(falta)) {
          currentFaltaLabels.add(label)
        }
        faltaLabelsMap.set(key, currentFaltaLabels)

        if (discount <= 0) {
          continue
        }

        const currentQuantities = qMap.get(key)
        const currentDiscounts = discountMap.get(key) ?? getEmptyRemuneracaoQuantities()

        if (!currentQuantities) {
          continue
        }

        if (falta.tegRegular) {
          currentQuantities.tegRegularFixo = subtractQuantity(currentQuantities.tegRegularFixo, discount)
          currentDiscounts.tegRegularFixo += discount
        }

        if (falta.tegAcessivel) {
          currentQuantities.tegAcessivelFixo = subtractQuantity(currentQuantities.tegAcessivelFixo, discount)
          currentDiscounts.tegAcessivelFixo += discount
        }

        if (falta.tegCreche) {
          currentQuantities.tegCrecheFixo = subtractQuantity(currentQuantities.tegCrecheFixo, discount)
          currentDiscounts.tegCrecheFixo += discount
        }

        if (falta.tegEspecial) {
          currentQuantities.tegEspecialRegularFixo = subtractQuantity(currentQuantities.tegEspecialRegularFixo, discount)
          currentQuantities.tegEspecialAcessivelFixo = subtractQuantity(currentQuantities.tegEspecialAcessivelFixo, discount)
          currentDiscounts.tegEspecialRegularFixo += discount
          currentDiscounts.tegEspecialAcessivelFixo += discount
        }

        qMap.set(key, currentQuantities)
        discountMap.set(key, currentDiscounts)
      }

      // attach _quantities to remuneracao items
      const itemsWithQuantities = result.items.map((it) => {
        const key = `${it.ordemServicoCodigo}|${it.revisao}|${it.tipoPessoa}`
        const q = qMap.get(key) ?? getEmptyRemuneracaoQuantities()
        const discounts = discountMap.get(key) ?? getEmptyRemuneracaoQuantities()
        const faltaTipoLabels = Array.from(faltaLabelsMap.get(key) ?? [])
        return { ...it, _quantities: q, _quantityDiscounts: discounts, _faltaTipoLabels: faltaTipoLabels }
      })

      setItems(itemsWithQuantities)
      setLoadedItemsSnapshot(result.items)
      setTotalItems(result.total)
      setTotalPages(result.totalPages)
      setPage(result.page)
      setPageSize(result.pageSize)
      if (!options.silent) {
        setStatusTone('idle')
        setStatusMessage(result.items.length ? '' : 'Nenhum registro de ateste encontrado para os filtros informados.')
      }

      if (result.items.length) {
        shouldFocusFirstGridRecordRef.current = true
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao carregar os registros de ateste de servicos.'
      setStatusTone('error')
      setStatusMessage(message)
      setItems([])
      setLoadedItemsSnapshot([])
      setTotalItems(0)
      setTotalPages(1)
    } finally {
      if (!options.silent) {
        setIsLoading(false)
      }
    }
  }, [monthYearMismatchMessage, openValidationDialog])

  useEffect(() => {
    void loadDreOptions()
  }, [loadDreOptions])

  useEffect(() => {
    void loadItems(appliedFilters, page, pageSize)
  }, [appliedFilters, loadItems, page, pageSize])

  useEffect(() => {
    if (!shouldFocusFirstGridRecordRef.current || !items.length) {
      return
    }

    const firstInput = document.querySelector<HTMLInputElement>('input[data-remuneracao-grid-input="true"]')

    if (firstInput) {
      firstInput.focus()
    }

    shouldFocusFirstGridRecordRef.current = false
  }, [items])

  useEffect(() => {
    const tableWrapper = tableWrapperRef.current
    const topScrollWrapper = topScrollWrapperRef.current
    const topScrollContent = topScrollContentRef.current

    if (!tableWrapper || !topScrollWrapper || !topScrollContent) {
      return
    }

    let isSyncingFromTop = false
    let isSyncingFromBottom = false
    const tableElement = tableWrapper.querySelector('table')

    const syncScrollMetrics = () => {
      const nextWidth = Math.max(tableWrapper.scrollWidth, tableElement?.scrollWidth ?? 0, tableWrapper.clientWidth)
      topScrollContent.style.width = `${nextWidth}px`
      topScrollWrapper.scrollLeft = tableWrapper.scrollLeft
    }

    const handleBottomScroll = () => {
      if (isSyncingFromTop) {
        return
      }

      isSyncingFromBottom = true
      topScrollWrapper.scrollLeft = tableWrapper.scrollLeft
      isSyncingFromBottom = false
    }

    const handleTopScroll = () => {
      if (isSyncingFromBottom) {
        return
      }

      isSyncingFromTop = true
      tableWrapper.scrollLeft = topScrollWrapper.scrollLeft
      isSyncingFromTop = false
    }

    syncScrollMetrics()

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => syncScrollMetrics())
      : null

    if (resizeObserver) {
      resizeObserver.observe(tableWrapper)

      if (tableElement) {
        resizeObserver.observe(tableElement)
      }
    } else {
      window.addEventListener('resize', syncScrollMetrics)
    }

    tableWrapper.addEventListener('scroll', handleBottomScroll)
    topScrollWrapper.addEventListener('scroll', handleTopScroll)

    return () => {
      tableWrapper.removeEventListener('scroll', handleBottomScroll)
      topScrollWrapper.removeEventListener('scroll', handleTopScroll)

      if (resizeObserver) {
        resizeObserver.disconnect()
      } else {
        window.removeEventListener('resize', syncScrollMetrics)
      }
    }
  }, [items, pageSize, tableColumnCount])

  const handleFilterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextFilters = buildCurrentFilters()

    if (!isValidMonthYear(nextFilters.mesAno)) {
      openValidationDialog('Informe um mes/ano valido para consultar o ateste.')
      return
    }

    if (!nextFilters.dataReferencia) {
      openValidationDialog('Informe uma data de operacao valida no formato dd/mm/yyyy.')
      return
    }

    if (!doesDateBelongToMonthYear(nextFilters.dataReferencia, nextFilters.mesAno)) {
      openValidationDialog(monthYearMismatchMessage)
      return
    }

    const parsedRevisao = parseApuracaoRevisao(nextFilters.revisao)

    if (parsedRevisao === null) {
      openValidationDialog('Informe uma revisao valida.')
      return
    }

    setAppliedFilters(nextFilters)
    setPage(1)
  }

  const handleClearFilters = () => {
    const defaultMesAno = getCurrentMonthYear()
    const defaultDataReferencia = getFirstDateOfMonthYear(defaultMesAno) || getCurrentIsoDate()

    setMesAno(defaultMesAno)
    setDataOperacaoInput(formatIsoDateToDisplay(defaultDataReferencia))
    setDreCodigo('')
    setCrmcCondutor('')
    setPlaca('')
    setRevisao('0')
    setTipoPessoa('')
    setAppliedFilters({
      mesAno: defaultMesAno,
      dataReferencia: defaultDataReferencia,
      dreCodigo: '',
      crmcCondutor: '',
      placa: '',
      revisao: '0',
      tipoPessoa: '',
    })
    setPage(1)
    setStatusTone('idle')
    setStatusMessage('')
  }

  const hasPendingChanges = useMemo(() => {
    if (items.length !== loadedItemsSnapshot.length) {
      return true
    }

    const currentByKey = new Map(items.map((item) => [buildRowKey(item), buildSavePayloadItem(item)]))

    return loadedItemsSnapshot.some((item) => {
      const rowKey = buildRowKey(item)
      const currentItem = currentByKey.get(rowKey)
      const originalItem = loadedItemsByRowKey.get(rowKey)

      if (!currentItem || !originalItem) {
        return true
      }

      return !areSavePayloadItemsEqual(currentItem, originalItem)
    })
  }, [items, loadedItemsByRowKey, loadedItemsSnapshot])

  const handleMoneyFieldChange = useCallback((rowKey: string, field: MonetaryColumnKey, value: string) => {
    const normalizedInput = normalizeMoneyInput(value)
    const parsedValue = parseMoneyValue(normalizedInput)

    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      return
    }

    setItems((currentItems) => currentItems.map((item) => (
      buildRowKey(item) === rowKey
        ? { ...item, [field]: parsedValue }
        : item
    )))
  }, [])

  const handleSave = useCallback(async () => {
    if (!hasEditPermission) {
      setStatusTone('error')
      setStatusMessage(getEditPermissionDeniedMessage('Ateste Servicos'))
      return
    }

    if (!hasPendingChanges) {
      setStatusTone('warning')
      setStatusMessage('Nao ha alteracoes para salvar.')
      return
    }

    setIsSaving(true)
    setStatusTone('idle')
    setStatusMessage('Salvando ateste de servicos...')

    try {
      const payloadItems = items
        .map((item) => ({
          rowKey: buildRowKey(item),
          current: buildSavePayloadItem(item),
          original: loadedItemsByRowKey.get(buildRowKey(item)),
        }))
        .filter(({ original, current }) => !original || !areSavePayloadItemsEqual(current, original))
        .map(({ current }) => current)

      if (!payloadItems.length) {
        setStatusTone('warning')
        setStatusMessage('Nao ha alteracoes para salvar.')
        return
      }

      const blockedItem = items.find((item) => item.apuracaoFinanceiraSituacao !== APURACAO_SERVICOS_EDITABLE_STATUS)

      if (blockedItem) {
        setStatusTone('warning')
        setStatusMessage('Existe registro nao liberado para digitacao. Ajuste os filtros e tente novamente.')
        return
      }

      const message = await saveRemuneracaoServicosItems({
        mesAno: appliedFilters.mesAno,
        dataReferencia: appliedFilters.dataReferencia,
        items: payloadItems,
      })

      setStatusTone('success')
      setStatusMessage(message || 'Ateste de servicos gravado com sucesso.')
      await loadItems(appliedFilters, page, pageSize, { silent: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao salvar o ateste de servicos.'
      setStatusTone('error')
      setStatusMessage(message)
    } finally {
      setIsSaving(false)
    }
  }, [appliedFilters, hasEditPermission, hasPendingChanges, items, loadItems, loadedItemsByRowKey, page, pageSize])

  const handleCalculate = useCallback(async () => {
    if (!isValidMonthYear(mesAno)) {
      openValidationDialog('Informe um mes/ano valido antes de calcular o ateste.')
      return
    }

    const parsedRevisao = parseApuracaoRevisao(revisao)

    if (parsedRevisao === null) {
      openValidationDialog('Informe uma revisao valida antes de calcular o ateste.')
      return
    }

    setDataOperacaoInput('')
    setCrmcCondutor('')
    setPlaca('')

    const calculateFilters: RemuneracaoServicosFilters = {
      mesAno,
      dataReferencia: '',
      dreCodigo,
      crmcCondutor: '',
      placa: '',
      revisao: String(parsedRevisao),
      tipoPessoa,
    }

    setAppliedFilters(calculateFilters)
    setPage(1)

    if (!window.confirm('Autoriza a execucao do processamento de ateste em lote?')) {
      return
    }

    setIsCalculating(true)
    setStatusTone('idle')
    setStatusMessage('Iniciando processamento em lote do ateste de servicos...')

    try {
      const result = await startRemuneracaoServicosBatch({
        mesAno: calculateFilters.mesAno,
        dataReferencia: '',
        dreCodigo: calculateFilters.dreCodigo,
        crmcCondutor: '',
        placa: '',
        revisao: parsedRevisao,
        tipoPessoa: calculateFilters.tipoPessoa,
      })

      setRemuneracaoBatchStatus(result)
      setStatusTone(result.status === 'failed' ? 'error' : 'idle')
      setStatusMessage(result.message)
      setIsBatchStatusDialogVisible(true)

      if (result.isRunning) {
        void syncBatchStatus()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao iniciar o processamento em lote do ateste de servicos.'
      setStatusTone('error')
      setStatusMessage(message)
    } finally {
      setIsCalculating(false)
    }
  }, [dreCodigo, mesAno, openValidationDialog, revisao, syncBatchStatus, tipoPessoa])

  useEffect(() => {
    if (!isBatchStatusDialogVisible || !remuneracaoBatchStatus?.isRunning) {
      return undefined
    }

    const timerId = window.setInterval(() => {
      void syncBatchStatus()
    }, 3000)

    return () => window.clearInterval(timerId)
  }, [isBatchStatusDialogVisible, remuneracaoBatchStatus?.isRunning, syncBatchStatus])

  const handlePageSizeChange = (value: string) => {
    const parsedValue = Number.parseInt(value, 10)

    if (!Number.isInteger(parsedValue) || !PAGE_SIZE_OPTIONS.includes(parsedValue)) {
      return
    }

    setPageSize(parsedValue)
    setPage(1)
  }

  return (
    <>
      <div className="content-copy">
        <p className="content-kicker">Operacional financeiro</p>
        <h2 id="content-title">Ateste Servicos</h2>
        <p className="content-description">
          Informe os valores monetarios do ateste por OS ativa, DRE e tipo pessoa na data de referencia.
          O acesso segue o mesmo perfil de Apontamento Servicos.
        </p>
      </div>

      <div className="management-layout">
        <div className="management-toolbar apontamento-servicos-toolbar">
          <form className="management-filter-form apontamento-servicos-filter-form" onSubmit={handleFilterSubmit}>
            <label className="field-group apontamento-servicos-filter-field" htmlFor="remuneracao-servicos-mes-ano">
              <span className="apontamento-servicos-filter-label">Mes/Ano</span>
              <input
                id="remuneracao-servicos-mes-ano"
                className="management-filter-input apontamento-servicos-filter-input"
                type="text"
                inputMode="numeric"
                placeholder="mm/aaaa"
                value={mesAno}
                onChange={(event) => handleMesAnoChange(event.target.value)}
                disabled={isLoading || isSaving || isProcessingBatch}
              />
            </label>
            <label className="field-group apontamento-servicos-filter-field" htmlFor="remuneracao-servicos-dre">
              <span className="apontamento-servicos-filter-label">DRE</span>
              <select
                id="remuneracao-servicos-dre"
                className="management-filter-select apontamento-servicos-filter-input"
                value={dreCodigo}
                onChange={(event) => setDreCodigo(event.target.value)}
                disabled={isLoading || isSaving || isLoadingOptions || isProcessingBatch}
              >
                <option value="">Todas</option>
                {dreOptions.map((item) => (
                  <option key={item.codigo} value={item.codigo}>
                    {formatDreOptionLabel(item)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-group apontamento-servicos-filter-field" htmlFor="remuneracao-servicos-tipo-pessoa">
              <span className="apontamento-servicos-filter-label">Tipo pessoa</span>
              <select
                id="remuneracao-servicos-tipo-pessoa"
                className="management-filter-select apontamento-servicos-filter-input"
                value={tipoPessoa}
                onChange={(event) => setTipoPessoa(event.target.value as ApuracaoTipoPessoaFilter)}
                disabled={isLoading || isSaving || isProcessingBatch}
              >
                {APURACAO_TIPO_PESSOA_FILTER_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-group apontamento-servicos-filter-field" htmlFor="remuneracao-servicos-revisao">
              <span className="apontamento-servicos-filter-label">Revisao</span>
              <input
                id="remuneracao-servicos-revisao"
                className="management-filter-input apontamento-servicos-filter-input"
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={revisao}
                onChange={(event) => setRevisao(normalizeIntegerInput(event.target.value))}
                disabled={isLoading || isSaving || isProcessingBatch}
              />
            </label>
            <label className="field-group apontamento-servicos-filter-field" htmlFor="remuneracao-servicos-data-operacao">
              <span className="apontamento-servicos-filter-label">Data referencia</span>
              <input
                id="remuneracao-servicos-data-operacao"
                className="management-filter-input apontamento-servicos-filter-input"
                type="text"
                inputMode="numeric"
                placeholder="dd/mm/aaaa"
                value={dataOperacaoInput}
                onChange={(event) => handleDataOperacaoInputChange(event.target.value)}
                disabled={isLoading || isSaving || isProcessingBatch}
              />
            </label>
            <label className="field-group apontamento-servicos-filter-field" htmlFor="remuneracao-servicos-crmc">
              <span className="apontamento-servicos-filter-label">CRMC condutor</span>
              <input
                id="remuneracao-servicos-crmc"
                className="management-filter-input apontamento-servicos-filter-input"
                type="text"
                value={crmcCondutor}
                onChange={(event) => setCrmcCondutor(event.target.value)}
                disabled={isLoading || isSaving || isProcessingBatch}
              />
            </label>
            <label className="field-group apontamento-servicos-filter-field" htmlFor="remuneracao-servicos-placa">
              <span className="apontamento-servicos-filter-label">Placa</span>
              <input
                id="remuneracao-servicos-placa"
                className="management-filter-input apontamento-servicos-filter-input"
                type="text"
                value={placa}
                onChange={(event) => setPlaca(event.target.value)}
                disabled={isLoading || isSaving || isProcessingBatch}
              />
            </label>
            <div className="apontamento-servicos-filter-actions">
              <button type="submit" className="secondary-button management-filter-button" disabled={isLoading || isSaving || isProcessingBatch}>
                Filtrar
              </button>
              <button type="button" className="secondary-button management-filter-button" onClick={handleClearFilters} disabled={isLoading || isSaving || isProcessingBatch}>
                Limpar
              </button>
            </div>
          </form>
          <div className="apontamento-servicos-toolbar-actions remuneracao-servicos-toolbar-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => void handleSave()}
              disabled={isLoading || isSaving || isProcessingBatch || !hasPendingChanges}
            >
              {isSaving ? 'Salvando...' : 'Salvar ateste'}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => void handleCalculate()}
              disabled={isLoading || isSaving || isProcessingBatch}
            >
              {isCalculating ? 'Iniciando lote...' : 'Calcular ateste'}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => void openBatchStatusDialog()}
              disabled={isLoading || isSaving || isProcessingBatch}
            >
              {isLoadingBatchStatus ? 'Consultando...' : 'Consultar status do processamento'}
            </button>
          </div>
        </div>

        <div className="management-card apontamento-servicos-table-card">
          <div className="management-grid-header">
            <h2>Registros de ateste</h2>
            <span>{isLoading ? 'Atualizando...' : `${totalItems} item(ns) encontrados`}</span>
            <div className="remuneracao-servicos-visibility-toggles">
              <label className="apontamento-servicos-accumulated-toggle">
                <input
                  type="checkbox"
                  checked={monetaryColumnVisibilityMode === 'continua-only'}
                  onChange={(event) => setMonetaryColumnVisibilityMode(event.target.checked ? 'continua-only' : 'all')}
                  disabled={isLoading || isSaving || isProcessingBatch}
                />
                <span>Mostrar somente Continua</span>
              </label>
              <label className="apontamento-servicos-accumulated-toggle">
                <input
                  type="checkbox"
                  checked={monetaryColumnVisibilityMode === 'km-valor-only'}
                  onChange={(event) => setMonetaryColumnVisibilityMode(event.target.checked ? 'km-valor-only' : 'all')}
                  disabled={isLoading || isSaving || isProcessingBatch}
                />
                <span>Mostrar somente KM Valor</span>
              </label>
              <label className="apontamento-servicos-accumulated-toggle">
                <input
                  type="checkbox"
                  checked={monetaryColumnVisibilityMode === 'valor-total-only'}
                  onChange={(event) => setMonetaryColumnVisibilityMode(event.target.checked ? 'valor-total-only' : 'all')}
                  disabled={isLoading || isSaving || isProcessingBatch}
                />
                <span>Mostrar somente Valor Total</span>
              </label>
            </div>
          </div>

          <div className="remuneracao-servicos-grid-top-actions">
            <label className="apontamento-servicos-page-size-control" htmlFor="remuneracao-servicos-page-size">
              <span>OS por pagina</span>
              <select
                id="remuneracao-servicos-page-size"
                className="apontamento-servicos-page-size-select"
                value={pageSize}
                onChange={(event) => handlePageSizeChange(event.target.value)}
                disabled={isLoading || isSaving || isProcessingBatch}
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>

          <div ref={topScrollWrapperRef} className="apontamento-servicos-top-scrollbar" aria-label="Rolagem horizontal superior da tabela">
            <div ref={topScrollContentRef} className="apontamento-servicos-top-scrollbar-content" />
          </div>

          <div ref={tableWrapperRef} className="apontamento-servicos-table-wrapper remuneracao-servicos-table-wrapper">
            <table className={`apontamento-servicos-table apontamento-servicos-table-sem-acumulados remuneracao-servicos-table ${tableVisibilityClassName}`}>
              <thead>
                <tr>
                  <th rowSpan={2} className="apontamento-servicos-header-compact">DRE/CRMC/Tipo de Veiculo</th>
                  {mergedHeaderGroups.map((group, index) => (
                    <th key={`${group.title}-${index}`} colSpan={group.colSpan} className={`apontamento-servicos-header-detail remuneracao-servicos-header-detail ${group.headerClass}`}>
                      <span className="remuneracao-servicos-header-line">{group.title}</span>
                    </th>
                  ))}
                  {showValorTotalColumn ? (
                    <th rowSpan={2} className="apontamento-servicos-header-detail remuneracao-servicos-header-detail remuneracao-servicos-header-valor-total">
                      <span className="remuneracao-servicos-header-line">Valor Total</span>
                    </th>
                  ) : null}
                </tr>
                <tr>
                  {visibleMonetaryColumns.map((column) => (
                    <th key={column.key} className={`apontamento-servicos-header-detail remuneracao-servicos-header-detail ${column.headerClass}`}>
                      <span className="remuneracao-servicos-header-line">{column.columnTitle}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const rowKey = buildRowKey(item)
                  const groupInfo = rowGroupInfoByIndex.get(index) ?? { rowGroupIndex: 0, isFirstRowOfGroup: index === 0 }
                  const isFirstRowOfGroup = groupInfo.isFirstRowOfGroup
                  const isEditable = hasEditPermission
                    && item.isAtivoNaData
                    && item.apuracaoFinanceiraSituacao === APURACAO_SERVICOS_EDITABLE_STATUS

                  return (
                    <Fragment key={`${rowKey}|${index}`}>
                      {isFirstRowOfGroup ? (
                        <tr className="apontamento-servicos-subtitle-row" key={`${rowKey}-subtitle`}>
                          <td colSpan={tableColumnCount}>
                            <div className="apontamento-servicos-subtitle-band apontamento-servicos-subtitle-band-main remuneracao-servicos-subtitle-band-main">
                              <div className="remuneracao-servicos-subtitle-line-chips">
                                <span className="apontamento-servicos-subtitle-chip">Empresa: <strong>{item.empresa || 'Empresa nao informada'}</strong></span>
                                <span className="apontamento-servicos-subtitle-chip">OS: <strong>{item.ordemServicoOsConcat || item.ordemServicoTermoAdesao || item.ordemServicoCodigo}</strong></span>
                                <span className="apontamento-servicos-subtitle-chip">Placa: <strong>{item.placa || '-'}</strong></span>
                                <span className="apontamento-servicos-subtitle-chip">OS especial: <strong>{formatVeiculoOsEspecialDisplay(item.veiculoOsEspecial)}</strong></span>
                                <span className="apontamento-servicos-subtitle-chip">Periodo: <strong>{formatPeriodLabel(item) || '-'}</strong></span>
                              </div>
                              <div className="remuneracao-servicos-subtitle-line-chips">
                                <span className="apontamento-servicos-subtitle-chip">Empresa: <strong>{item.empresa || 'Empresa nao informada'}</strong></span>
                                <span className="apontamento-servicos-subtitle-chip">Condutor: <strong>{item.nomeCondutor || '-'}</strong></span>
                                {item._faltaTipoLabels?.length ? (
                                  <span className="apontamento-servicos-subtitle-chip remuneracao-servicos-falta-chip">
                                    Falta: <strong>{item._faltaTipoLabels.join(' / ')}</strong>
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                      <tr
                        key={rowKey}
                        className={`${!isEditable ? 'apontamento-servicos-row-inactive' : ''} ${isFirstRowOfGroup ? 'apontamento-servicos-row-group-start' : ''}`}
                      >
                        <td className="apontamento-servicos-primary-cell remuneracao-servicos-primary-cell">
                          <strong className="apontamento-servicos-primary-value">{item.dreSigla || item.dreDescricao || item.dreCodigo}</strong>
                          <span className="apontamento-servicos-primary-detail remuneracao-servicos-crmc-detail">
                            <strong>CRMC:</strong> {formatCrmcDisplay(item.crmcCondutor)}
                          </span>
                          <span className="apontamento-servicos-primary-detail remuneracao-servicos-crmc-detail">
                            <strong>Tipo de Veiculo:</strong> {formatTipoVeiculoDisplay(item.tipoVeiculo)}
                          </span>
                          <span className="apontamento-servicos-primary-detail remuneracao-servicos-crmc-detail">
                            <strong>OS especial:</strong> {formatVeiculoOsEspecialDisplay(item.veiculoOsEspecial)}
                          </span>
                        </td>
                        {visibleMonetaryColumns.map((column) => (
                          <td key={`${rowKey}-${column.key}`} className="apontamento-servicos-cell-compact">
                            <input
                              data-remuneracao-grid-input="true"
                              className="apontamento-servicos-grid-input"
                              type="text"
                              inputMode="decimal"
                              value={formatMoneyValue(item[column.key])}
                              onChange={(event) => handleMoneyFieldChange(rowKey, column.key, event.target.value)}
                              disabled={isLoading || isSaving || isProcessingBatch || !isEditable}
                              title={!isEditable ? getEditPermissionDeniedMessage('Ateste Servicos') : ''}
                            />
                          </td>
                        ))}
                        {showValorTotalColumn ? (
                          <td className="apontamento-servicos-cell-compact total-remuneracao-servicos-valor-total-cell">
                            <span className="apontamento-servicos-grid-readonly total-remuneracao-servicos-valor-total-value">
                              {formatMoneyValue(calculateValorTotal(item))}
                            </span>
                          </td>
                        ) : null}
                      </tr>
                      {/* Second line: display one summarized quantity per monetary group. */}
                      <tr className="apontamento-servicos-quantities-row" key={`${rowKey}-quantities`}>
                        <td className="apontamento-servicos-primary-cell remuneracao-servicos-primary-cell apontamento-servicos-quantity-row-title">
                          Qtde apontada:
                        </td>
                        {mergedHeaderGroups.map((group, groupIndex) => {
                          const quantity = getQuantityForMonetaryGroup(item, group.title)

                          return (
                            <td
                              key={`${rowKey}-quant-${group.title}-${groupIndex}`}
                              colSpan={group.colSpan}
                              className="apontamento-servicos-cell-compact apontamento-servicos-quantity-cell"
                            >
                              <span>{quantity === null ? '-' : quantity}</span>
                            </td>
                          )
                        })}
                        {showValorTotalColumn ? (
                          <td className="apontamento-servicos-cell-compact apontamento-servicos-quantity-cell">
                            <span>-</span>
                          </td>
                        ) : null}
                      </tr>
                    </Fragment>
                  )
                })}
              </tbody>
            </table>

            {!items.length && !isLoading ? <p className="management-empty-state">Nenhum registro encontrado.</p> : null}
          </div>

          <p className={`status-message status-${statusTone}`} aria-live="polite">{statusMessage}</p>

          <div className="management-pagination">
            <button
              type="button"
              className="secondary-button management-pagination-button management-pagination-button-icon"
              onClick={() => setPage(1)}
              disabled={!canGoToPreviousPage || isLoading || isSaving || isProcessingBatch}
              title="Primeiro registro"
              aria-label="Primeiro registro"
            >
              |◀
            </button>
            <button
              type="button"
              className="secondary-button management-pagination-button management-pagination-button-icon"
              onClick={() => setPage((currentPage) => currentPage - 1)}
              disabled={!canGoToPreviousPage || isLoading || isSaving || isProcessingBatch}
              title="Registro anterior"
              aria-label="Registro anterior"
            >
              ◀
            </button>
            <span className="management-pagination-info">Pagina {page} de {totalPages}</span>
            <button
              type="button"
              className="secondary-button management-pagination-button management-pagination-button-icon"
              onClick={() => setPage((currentPage) => currentPage + 1)}
              disabled={!canGoToNextPage || isLoading || isSaving || isProcessingBatch}
              title="Proximo registro"
              aria-label="Proximo registro"
            >
              ▶
            </button>
            <button
              type="button"
              className="secondary-button management-pagination-button management-pagination-button-icon"
              onClick={() => setPage(totalPages)}
              disabled={!canGoToNextPage || isLoading || isSaving || isProcessingBatch}
              title="Ultimo registro"
              aria-label="Ultimo registro"
            >
              ▶|
            </button>
          </div>
        </div>
      </div>

      {isValidationDialogVisible ? (
        <div className="management-modal-overlay" role="presentation" onClick={closeValidationDialog}>
          <div
            className="management-modal-shell"
            role="dialog"
            aria-modal="true"
            aria-labelledby="remuneracao-servicos-validation-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <section className="management-card management-form dre-form management-modal-form-card">
              <div className="management-modal-header">
                <div>
                  <p className="management-modal-kicker">Validacao dos filtros</p>
                  <h2 id="remuneracao-servicos-validation-modal-title">Ateste Servicos</h2>
                </div>
                <button
                  type="button"
                  className="secondary-button management-modal-close-button"
                  onClick={closeValidationDialog}
                  aria-label="Fechar validacao"
                >
                  X
                </button>
              </div>
              <p className="management-modal-subtitle">{validationDialogMessage}</p>
              <div className="button-row dre-button-row management-modal-footer">
                <button type="button" className="primary-button" onClick={closeValidationDialog}>
                  Entendi
                </button>
              </div>
            </section>
          </div>
        </div>
      ) : null}

      {isBatchStatusDialogVisible ? (
        <div className="management-modal-overlay" role="presentation" onClick={closeBatchStatusDialog}>
          <div
            className="management-modal-shell"
            role="dialog"
            aria-modal="true"
            aria-labelledby="remuneracao-servicos-batch-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <section className="management-card management-form dre-form management-modal-form-card">
              <div className="management-modal-header">
                <div>
                  <p className="management-modal-kicker">Processamento em lote</p>
                  <h2 id="remuneracao-servicos-batch-modal-title">Ateste Servicos</h2>
                </div>
                <button
                  type="button"
                  className="secondary-button management-modal-close-button"
                  onClick={closeBatchStatusDialog}
                  aria-label="Fechar status"
                >
                  X
                </button>
              </div>

              <p className="management-modal-subtitle">{remuneracaoBatchStatus?.message || 'Nenhum processamento em lote localizado.'}</p>

              <div className="management-form-grid">
                <div className="field-group">
                  <span className="apontamento-servicos-filter-label">Status</span>
                  <strong>{formatBatchStatusLabel(remuneracaoBatchStatus?.status ?? 'idle')}</strong>
                </div>
                <div className="field-group">
                  <span className="apontamento-servicos-filter-label">Inicio</span>
                  <strong>{formatBatchTimestamp(remuneracaoBatchStatus?.startedAt ?? '')}</strong>
                </div>
                <div className="field-group">
                  <span className="apontamento-servicos-filter-label">Fim</span>
                  <strong>{formatBatchTimestamp(remuneracaoBatchStatus?.finishedAt ?? '')}</strong>
                </div>
                <div className="field-group">
                  <span className="apontamento-servicos-filter-label">Erros</span>
                  <strong>{remuneracaoBatchStatus?.errorMessage || '-'}</strong>
                </div>
              </div>

              <div className="management-form-grid">
                <div className="field-group">
                  <span className="apontamento-servicos-filter-label">Total registros</span>
                  <strong>{remuneracaoBatchStatus?.totalRegistros ?? 0}</strong>
                </div>
                <div className="field-group">
                  <span className="apontamento-servicos-filter-label">Calculados</span>
                  <strong>{remuneracaoBatchStatus?.totalCalculados ?? 0}</strong>
                </div>
                <div className="field-group">
                  <span className="apontamento-servicos-filter-label">Atualizados</span>
                  <strong>{remuneracaoBatchStatus?.totalAtualizados ?? 0}</strong>
                </div>
                <div className="field-group">
                  <span className="apontamento-servicos-filter-label">Ignorados</span>
                  <strong>{remuneracaoBatchStatus?.totalIgnorados ?? 0}</strong>
                </div>
              </div>

              <div className="management-form-grid">
                <div className="field-group">
                  <span className="apontamento-servicos-filter-label">Mes/Ano</span>
                  <strong>{remuneracaoBatchStatus?.requestedFilters?.mesAno || appliedFilters.mesAno}</strong>
                </div>
                <div className="field-group">
                  <span className="apontamento-servicos-filter-label">Data referencia</span>
                  <strong>{remuneracaoBatchStatus?.requestedFilters
                    ? (remuneracaoBatchStatus.requestedFilters.dataReferencia || REMUNERACAO_BATCH_ALL_DATES_LABEL)
                    : (appliedFilters.dataReferencia || REMUNERACAO_BATCH_ALL_DATES_LABEL)}</strong>
                </div>
              </div>

              <div className="button-row dre-button-row management-modal-footer">
                <button type="button" className="secondary-button" onClick={() => void syncBatchStatus()} disabled={isLoadingBatchStatus}>
                  {isLoadingBatchStatus ? 'Atualizando...' : 'Atualizar status'}
                </button>
                <button type="button" className="primary-button" onClick={closeBatchStatusDialog}>
                  Fechar
                </button>
              </div>
            </section>
          </div>
        </div>
      ) : null}
    </>
  )
}
