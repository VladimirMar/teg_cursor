import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { listDreItemsPaginated } from './services/dre'
import type { DreItem } from './services/dre'
import {
  getApontamentoServicosImportStatus,
  importApontamentoServicosExcel,
  listApontamentoServicosItems,
  saveApontamentoServicosItems,
  type ApontamentoServicosImportStatus,
  type ApontamentoServicosImportSkippedRecord,
  type ApontamentoServicosItem,
  type ApontamentoServicosSaveItem,
} from './services/apontamentoServicos'
import {
  APURACAO_TIPO_PESSOA_OPTIONS,
} from './services/apuracaoTipoPessoa'
import type { ApuracaoTipoPessoa } from './services/apuracaoTipoPessoa'
import {
  lookupDigitacaoFaltasApontamento,
  saveDigitacaoFaltas,
  type DigitacaoFaltasApontamentoMatch,
  type DigitacaoFaltasItem,
} from './services/digitacaoFaltas'
import { getEditPermissionDeniedMessage, hasEditableFormPermission } from './utils/formAccess'
import { formatVeiculoOsEspecialDisplay } from './utils/veiculoDisplay'

type StatusTone = 'idle' | 'error' | 'success' | 'warning'
type ApontamentoServicosColumnVisibilityMode = 'all' | 'daily-only' | 'acum-only'

type ApontamentoServicosFilters = {
  mesAno: string
  dataReferencia: string
  dreCodigo: string
  crmcCondutor: string
  placa: string
  revisao: string
  tipoPessoa: ApuracaoTipoPessoa
}

const FORM_ACCESS_KEY = 'form_apntsvc024'
const LEGACY_FORM_ACCESS_KEY = 'form_apursvc021'
const APURACAO_SERVICOS_EDITABLE_STATUS = 'Em digitacao'
const PAGE_SIZE_OPTIONS = [5, 10, 15, 20, 30]
const DEFAULT_PAGE_SIZE = 10
const DEFAULT_APONTAMENTO_SERVICOS_IMPORT_DIRECTORY_PATH = 'C:\\Users\\m089383\\Aplicativos\\teg_cursor\\pgtos\\2026-04 Pgto'
const DEFAULT_APONTAMENTO_SERVICOS_IMPORT_FILE_NAME = '04 ATESTE BT PF ABR 26.xlsx'
const FALTA_QUANTIDADE_OPTIONS = Array.from({ length: 61 }, (_, index) => index)
type FaltaSimNao = 'SIM' | 'NAO' | ''
type FaltaTegTipo = 'REGULAR' | 'ACESSIVEL' | 'CRECHE' | 'ESPECIAL' | ''

const FALTA_TEG_TIPO_OPTIONS: Array<{ value: FaltaTegTipo; label: string }> = [
  { value: 'REGULAR', label: 'TEG Regular' },
  { value: 'ACESSIVEL', label: 'TEG Acessivel' },
  { value: 'CRECHE', label: 'TEG Creche' },
  { value: 'ESPECIAL', label: 'Especial' },
]

const faltaTegTipoFromItem = (item: DigitacaoFaltasItem): FaltaTegTipo => {
  if (item.tegRegular) {
    return 'REGULAR'
  }

  if (item.tegAcessivel) {
    return 'ACESSIVEL'
  }

  if (item.tegCreche) {
    return 'CRECHE'
  }

  if (item.tegEspecial) {
    return 'ESPECIAL'
  }

  return ''
}

const faltaTegFlagsFromTipo = (tipo: FaltaTegTipo) => ({
  tegRegular: tipo === 'REGULAR',
  tegAcessivel: tipo === 'ACESSIVEL',
  tegCreche: tipo === 'CRECHE',
  tegEspecial: tipo === 'ESPECIAL',
})

const applyDigitacaoFaltasItemToForm = (
  item: DigitacaoFaltasItem,
  setters: {
    setFaltaAusenciaTotal: (value: FaltaSimNao) => void
    setFaltaQuantidadeIntegral: (value: string) => void
    setFaltaQuantidadeMeioPeriodo: (value: string) => void
    setFaltaTegTipo: (value: FaltaTegTipo) => void
  },
) => {
  setters.setFaltaAusenciaTotal(item.ausenciaTotal ? 'SIM' : 'NAO')
  setters.setFaltaQuantidadeIntegral(String(item.quantidadeAlunosIntegral ?? 0))
  setters.setFaltaQuantidadeMeioPeriodo(String(item.quantidadeAlunosMeioPeriodo ?? 0))
  setters.setFaltaTegTipo(faltaTegTipoFromItem(item))
}

const formatDigitacaoFaltasOsDisplay = (match: DigitacaoFaltasApontamentoMatch) => {
  return match.ordemServicoOsConcat || match.ordemServicoNumOs || match.ordemServicoCodigo || '-'
}

const normalizeMonthYearInput = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 6)

  if (digits.length <= 2) {
    return digits
  }

  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

const isValidMonthYear = (value: string) => /^(0[1-9]|1[0-2])\/\d{4}$/.test(value)
const normalizeIntegerInput = (value: string) => value.replace(/[^\d]/g, '')
const normalizeSignedIntegerInput = (value: string) => {
  const normalizedValue = value.replace(/[^\d-]/g, '')

  if (!normalizedValue) {
    return ''
  }

  if (normalizedValue.startsWith('-')) {
    return `-${normalizedValue.slice(1).replace(/-/g, '')}`
  }

  return normalizedValue.replace(/-/g, '')
}
const normalizeKmInput = (value: string) => value.replace(/[^\d,.-]/g, '')

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

const formatDateLabel = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }

  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

const formatPeriodLabel = (item: Pick<ApontamentoServicosItem, 'periodoInicio' | 'periodoFim'>) => {
  return [formatDateLabel(item.periodoInicio), formatDateLabel(item.periodoFim)].filter(Boolean).join(' a ')
}

const formatDreOptionLabel = (item: DreItem) => `${item.codigo} - ${item.sigla} - ${item.descricao}`

const getApontamentoServicosImportDisplayName = (fileName?: string) => {
  const normalizedFileName = fileName?.trim()
  return normalizedFileName || 'todos os arquivos Excel do diretorio informado'
}

const buildImportRealtimeMessage = (progress: ApontamentoServicosImportStatus) => {
  if (progress.status === 'error') {
    return progress.errorMessage || progress.message || 'Falha ao importar a planilha.'
  }

  if (progress.status === 'completed') {
    return progress.message || 'Importacao concluida.'
  }

  const fileLabel = progress.currentFileName || 'planilha em processamento'
  const lineLabel = progress.currentRowNumber > 0 ? `linha ${progress.currentRowNumber}` : 'linha inicial'
  const recordLabel = progress.totalRecords > 0
    ? `registro ${progress.currentRecord} de ${progress.totalRecords}`
    : 'preparando registros'

  return `Processando ${fileLabel} em tempo real: ${lineLabel} (${recordLabel}).`
}

const buildRowKey = (item: Pick<ApontamentoServicosItem, 'mesAno' | 'dreCodigo' | 'ordemServicoCodigo' | 'revisao' | 'tipoEscolaCodigo' | 'tipoPessoa'>) => {
  return `${item.mesAno}|${item.dreCodigo}|${item.ordemServicoCodigo}|${item.revisao}|${item.tipoEscolaCodigo}|${item.tipoPessoa}`
}

const buildOrdemServicoGroupKey = (item: Pick<ApontamentoServicosItem, 'mesAno' | 'dreCodigo' | 'ordemServicoCodigo' | 'revisao' | 'tipoPessoa'>) => {
  return `${item.mesAno}|${item.dreCodigo}|${item.ordemServicoCodigo}|${item.revisao}|${item.tipoPessoa}`
}

const normalizeComparableKm = (value: string) => {
  const normalizedValue = value.trim()

  if (!normalizedValue) {
    return '0.0000'
  }

  const parsedValue = /^\d+(?:\.\d+)?$/.test(normalizedValue)
    ? Number(normalizedValue)
    : Number(normalizedValue.replace(/\./g, '').replace(',', '.'))

  return Number.isFinite(parsedValue) && parsedValue >= 0
    ? parsedValue.toFixed(4)
    : normalizedValue
}

const buildSavePayloadItem = (item: ApontamentoServicosItem): ApontamentoServicosSaveItem => ({
  dreCodigo: item.dreCodigo,
  ordemServicoCodigo: item.ordemServicoCodigo,
  revisao: item.revisao,
  tipoEscolaCodigo: item.tipoEscolaCodigo,
  tipoPessoa: item.tipoPessoa,
  naoCadeirantePresencial: item.naoCadeirantePresencial,
  cadeirante: item.cadeirante,
  atendimentoComplementarNaoCadeirante: item.atendimentoComplementarNaoCadeirante,
  atendimentoComplementarCadeirante: item.atendimentoComplementarCadeirante,
  continuaNaoCadeirante: item.continuaNaoCadeirante,
  continuaCadeirante: item.continuaCadeirante,
  kilometragem: item.kilometragem,
})

const areSavePayloadItemsEqual = (left: ApontamentoServicosSaveItem, right: ApontamentoServicosSaveItem) => {
  return left.dreCodigo === right.dreCodigo
    && left.ordemServicoCodigo === right.ordemServicoCodigo
    && left.revisao === right.revisao
    && left.tipoEscolaCodigo === right.tipoEscolaCodigo
    && left.tipoPessoa === right.tipoPessoa
    && left.naoCadeirantePresencial === right.naoCadeirantePresencial
    && left.cadeirante === right.cadeirante
    && left.atendimentoComplementarNaoCadeirante === right.atendimentoComplementarNaoCadeirante
    && left.atendimentoComplementarCadeirante === right.atendimentoComplementarCadeirante
    && left.continuaNaoCadeirante === right.continuaNaoCadeirante
    && left.continuaCadeirante === right.continuaCadeirante
    && normalizeComparableKm(left.kilometragem) === normalizeComparableKm(right.kilometragem)
}

export default function ApontamentoServicosView() {
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
  const [tipoPessoa, setTipoPessoa] = useState<ApuracaoTipoPessoa>('PF')
  const [appliedFilters, setAppliedFilters] = useState<ApontamentoServicosFilters>({
    mesAno: initialMesAno,
    dataReferencia: initialDataReferencia,
    dreCodigo: '',
    crmcCondutor: '',
    placa: '',
    revisao: '0',
    tipoPessoa: 'PF',
  })
  const [items, setItems] = useState<ApontamentoServicosItem[]>([])
  const [loadedItemsSnapshot, setLoadedItemsSnapshot] = useState<ApontamentoServicosItem[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusTone, setStatusTone] = useState<StatusTone>('idle')
  const [validationDialogMessage, setValidationDialogMessage] = useState('')
  const [isValidationDialogVisible, setIsValidationDialogVisible] = useState(false)
  const [importDirectoryPath, setImportDirectoryPath] = useState(DEFAULT_APONTAMENTO_SERVICOS_IMPORT_DIRECTORY_PATH)
  const [importFileName, setImportFileName] = useState(DEFAULT_APONTAMENTO_SERVICOS_IMPORT_FILE_NAME)
  const [importRequestErrorMessage, setImportRequestErrorMessage] = useState('')
  const [isImportRequestDialogVisible, setIsImportRequestDialogVisible] = useState(false)
  const [importDialogMessage, setImportDialogMessage] = useState('')
  const [importDialogSkippedRecords, setImportDialogSkippedRecords] = useState<ApontamentoServicosImportSkippedRecord[]>([])
  const [isImportDialogVisible, setIsImportDialogVisible] = useState(false)
  const [importProgress, setImportProgress] = useState<ApontamentoServicosImportStatus | null>(null)
  const [columnVisibilityMode, setColumnVisibilityMode] = useState<ApontamentoServicosColumnVisibilityMode>('all')
  const [isLoadingOptions, setIsLoadingOptions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isDigitacaoFaltasVisible, setIsDigitacaoFaltasVisible] = useState(false)
  const [faltaMesAno, setFaltaMesAno] = useState(initialMesAno)
  const [faltaDreCodigo, setFaltaDreCodigo] = useState('')
  const [faltaTipoPessoa, setFaltaTipoPessoa] = useState<ApuracaoTipoPessoa>('PF')
  const [faltaPlaca, setFaltaPlaca] = useState('')
  const [faltaDataReferenciaInput, setFaltaDataReferenciaInput] = useState(formatIsoDateToDisplay(initialDataReferencia))
  const [faltaRevisao, setFaltaRevisao] = useState('0')
  const [faltaTegTipo, setFaltaTegTipo] = useState<FaltaTegTipo>('')
  const [faltaAusenciaTotal, setFaltaAusenciaTotal] = useState<FaltaSimNao>('')
  const [faltaQuantidadeIntegral, setFaltaQuantidadeIntegral] = useState('0')
  const [faltaQuantidadeMeioPeriodo, setFaltaQuantidadeMeioPeriodo] = useState('0')
  const [faltaMatch, setFaltaMatch] = useState<DigitacaoFaltasApontamentoMatch | null>(null)
  const [faltaStatusMessage, setFaltaStatusMessage] = useState('')
  const [faltaStatusTone, setFaltaStatusTone] = useState<StatusTone>('idle')
  const [isFaltaLookupLoading, setIsFaltaLookupLoading] = useState(false)
  const [isFaltaSaving, setIsFaltaSaving] = useState(false)
  const topScrollWrapperRef = useRef<HTMLDivElement | null>(null)
  const topScrollContentRef = useRef<HTMLDivElement | null>(null)
  const tableWrapperRef = useRef<HTMLDivElement | null>(null)
  const importStatusPollTimerRef = useRef<number | null>(null)
  const faltaPlacaLookupTimerRef = useRef<number | null>(null)
  const shouldFocusFirstGridRecordRef = useRef(false)
  const shouldShowKmAdicionalColumn = appliedFilters.dataReferencia.endsWith('-01')
  const showDailyMetricColumns = columnVisibilityMode !== 'acum-only'
  const showAccumulatedColumns = columnVisibilityMode !== 'daily-only'
  const tableColumnCount = 3
    + (shouldShowKmAdicionalColumn && showDailyMetricColumns ? 1 : 0)
    + (showDailyMetricColumns ? 6 : 0)
    + (showAccumulatedColumns ? 6 : 0)
  const monthYearMismatchMessage = 'A data de operacao deve pertencer ao mes/ano informado.'
  const canGoToPreviousPage = page > 1
  const canGoToNextPage = page < totalPages
  const rowGroupInfoByIndex = useMemo(() => {
    const groupInfoByIndex = new Map<number, { groupRowIndex: number; isGroupStart: boolean }>()
    let previousGroupKey = ''
    let currentGroupRowIndex = 0

    for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
      const currentGroupKey = buildOrdemServicoGroupKey(items[itemIndex])
      const isFirstRow = itemIndex === 0
      const isGroupStart = !isFirstRow && currentGroupKey !== previousGroupKey

      if (isFirstRow || isGroupStart) {
        currentGroupRowIndex = 0
      } else {
        currentGroupRowIndex += 1
      }

      groupInfoByIndex.set(itemIndex, {
        groupRowIndex: currentGroupRowIndex,
        isGroupStart,
      })

      previousGroupKey = currentGroupKey
    }

    return groupInfoByIndex
  }, [items])

  const openValidationDialog = useCallback((message: string) => {
    setValidationDialogMessage(message)
    setIsValidationDialogVisible(true)
  }, [])

  const closeValidationDialog = useCallback(() => {
    setIsValidationDialogVisible(false)
    setValidationDialogMessage('')
  }, [])

  const openImportRequestDialog = useCallback(() => {
    setImportRequestErrorMessage('')
    setImportDirectoryPath(DEFAULT_APONTAMENTO_SERVICOS_IMPORT_DIRECTORY_PATH)
    setImportFileName(DEFAULT_APONTAMENTO_SERVICOS_IMPORT_FILE_NAME)
    setIsImportRequestDialogVisible(true)
  }, [])

  const closeImportRequestDialog = useCallback(() => {
    if (isImporting) {
      return
    }

    setIsImportRequestDialogVisible(false)
    setImportRequestErrorMessage('')
  }, [isImporting])

  const closeImportDialog = useCallback(() => {
    if (isImporting) {
      return
    }

    setIsImportDialogVisible(false)
    setImportDialogMessage('')
    setImportDialogSkippedRecords([])
    setImportProgress(null)
  }, [isImporting])

  const resetDigitacaoFaltasForm = useCallback(() => {
    setFaltaMesAno(appliedFilters.mesAno)
    setFaltaDreCodigo(appliedFilters.dreCodigo)
    setFaltaTipoPessoa(appliedFilters.tipoPessoa)
    setFaltaPlaca(appliedFilters.placa)
    setFaltaDataReferenciaInput(formatIsoDateToDisplay(appliedFilters.dataReferencia))
    setFaltaRevisao(appliedFilters.revisao)
    setFaltaTegTipo('')
    setFaltaAusenciaTotal('')
    setFaltaQuantidadeIntegral('0')
    setFaltaQuantidadeMeioPeriodo('0')
    setFaltaMatch(null)
    setFaltaStatusMessage('')
    setFaltaStatusTone('idle')
  }, [appliedFilters])

  const closeDigitacaoFaltasDialog = useCallback(() => {
    if (isFaltaSaving || isFaltaLookupLoading) {
      return
    }

    setIsDigitacaoFaltasVisible(false)
    resetDigitacaoFaltasForm()
  }, [isFaltaSaving, isFaltaLookupLoading, resetDigitacaoFaltasForm])

  const lookupFaltaApontamento = useCallback(async (options?: {
    showValidationErrors?: boolean
    overrides?: {
      mesAno?: string
      dreCodigo?: string
      tipoPessoa?: ApuracaoTipoPessoa
      placa?: string
      dataReferenciaInput?: string
      revisao?: string
    }
  }) => {
    const normalizedMesAno = (options?.overrides?.mesAno ?? faltaMesAno).trim()
    const normalizedDreCodigo = (options?.overrides?.dreCodigo ?? faltaDreCodigo).trim()
    const normalizedPlaca = (options?.overrides?.placa ?? faltaPlaca).trim()
    const normalizedDataReferencia = parseDisplayDateToIso(
      (options?.overrides?.dataReferenciaInput ?? faltaDataReferenciaInput).trim(),
    )
    const normalizedRevisao = (options?.overrides?.revisao ?? faltaRevisao).trim()
    const normalizedTipoPessoa = options?.overrides?.tipoPessoa ?? faltaTipoPessoa
    const showValidationErrors = Boolean(options?.showValidationErrors)

    if (!normalizedPlaca) {
      setFaltaMatch(null)
      setFaltaStatusMessage('')
      setFaltaStatusTone('idle')
      return
    }

    if (!isValidMonthYear(normalizedMesAno)) {
      setFaltaMatch(null)
      if (showValidationErrors) {
        setFaltaStatusTone('error')
        setFaltaStatusMessage('Mes/ano invalido. Use o formato mm/aaaa.')
      }
      return
    }

    if (!normalizedDreCodigo) {
      setFaltaMatch(null)
      if (showValidationErrors) {
        setFaltaStatusTone('error')
        setFaltaStatusMessage('Selecione a DRE.')
      }
      return
    }

    if (!normalizedDataReferencia) {
      setFaltaMatch(null)
      if (showValidationErrors) {
        setFaltaStatusTone('error')
        setFaltaStatusMessage('Data de referencia invalida. Use o formato dd/mm/aaaa.')
      }
      return
    }

    if (!doesDateBelongToMonthYear(normalizedDataReferencia, normalizedMesAno)) {
      setFaltaMatch(null)
      if (showValidationErrors) {
        setFaltaStatusTone('error')
        setFaltaStatusMessage(monthYearMismatchMessage)
      }
      return
    }

    setIsFaltaLookupLoading(true)
    setFaltaStatusTone('idle')
    setFaltaStatusMessage('Consultando ordem de servico...')

    try {
      const result = await lookupDigitacaoFaltasApontamento({
        mesAno: normalizedMesAno,
        dreCodigo: normalizedDreCodigo,
        tipoPessoa: normalizedTipoPessoa,
        placa: normalizedPlaca,
        dataReferencia: normalizedDataReferencia,
        revisao: normalizedRevisao,
      })

      if (!result.matched || !result.match) {
        setFaltaMatch(null)
        setFaltaStatusTone('error')
        setFaltaStatusMessage(
          result.message || `O veiculo da placa ${normalizedPlaca} nao existe no apontamento do mes ${normalizedMesAno}.`,
        )
        return
      }

      const match = result.match
      setFaltaMatch(match)
      setFaltaStatusTone('success')
      setFaltaStatusMessage(
        `Ordem de servico encontrada: ${formatDigitacaoFaltasOsDisplay(match)}, revisao ${match.revisao}, ${match.registrosApontamento} registro(s) de apontamento.`,
      )

      if (result.item) {
        applyDigitacaoFaltasItemToForm(result.item, {
          setFaltaAusenciaTotal,
          setFaltaQuantidadeIntegral,
          setFaltaQuantidadeMeioPeriodo,
          setFaltaTegTipo,
        })
      }
    } catch (error) {
      setFaltaMatch(null)
      setFaltaStatusTone('error')
      setFaltaStatusMessage(error instanceof Error ? error.message : 'Falha ao consultar ordem de servico.')
    } finally {
      setIsFaltaLookupLoading(false)
    }
  }, [
    faltaDataReferenciaInput,
    faltaDreCodigo,
    faltaMesAno,
    faltaPlaca,
    faltaRevisao,
    faltaTipoPessoa,
    monthYearMismatchMessage,
  ])

  const scheduleFaltaPlacaLookup = useCallback(() => {
    if (faltaPlacaLookupTimerRef.current !== null) {
      window.clearTimeout(faltaPlacaLookupTimerRef.current)
    }

    faltaPlacaLookupTimerRef.current = window.setTimeout(() => {
      faltaPlacaLookupTimerRef.current = null
      void lookupFaltaApontamento({ showValidationErrors: true })
    }, 450)
  }, [lookupFaltaApontamento])

  const handleFaltaPlacaBlur = useCallback(() => {
    if (faltaPlacaLookupTimerRef.current !== null) {
      window.clearTimeout(faltaPlacaLookupTimerRef.current)
      faltaPlacaLookupTimerRef.current = null
    }

    void lookupFaltaApontamento({ showValidationErrors: true })
  }, [lookupFaltaApontamento])

  const handleFaltaLookupFilterBlur = useCallback(() => {
    if (!faltaPlaca.trim()) {
      return
    }

    void lookupFaltaApontamento({ showValidationErrors: true })
  }, [faltaPlaca, lookupFaltaApontamento])

  const openDigitacaoFaltasDialog = useCallback(() => {
    const nextDataReferenciaInput = formatIsoDateToDisplay(appliedFilters.dataReferencia)
    setFaltaMesAno(appliedFilters.mesAno)
    setFaltaDreCodigo(appliedFilters.dreCodigo)
    setFaltaTipoPessoa(appliedFilters.tipoPessoa)
    setFaltaPlaca(appliedFilters.placa)
    setFaltaDataReferenciaInput(nextDataReferenciaInput)
    setFaltaRevisao(appliedFilters.revisao)
    setFaltaTegTipo('')
    setFaltaAusenciaTotal('')
    setFaltaQuantidadeIntegral('0')
    setFaltaQuantidadeMeioPeriodo('0')
    setFaltaMatch(null)
    setFaltaStatusMessage('')
    setFaltaStatusTone('idle')
    setIsDigitacaoFaltasVisible(true)

    if (appliedFilters.placa.trim()) {
      void lookupFaltaApontamento({
        showValidationErrors: true,
        overrides: {
          mesAno: appliedFilters.mesAno,
          dreCodigo: appliedFilters.dreCodigo,
          tipoPessoa: appliedFilters.tipoPessoa,
          placa: appliedFilters.placa,
          dataReferenciaInput: nextDataReferenciaInput,
          revisao: appliedFilters.revisao,
        },
      })
    }
  }, [appliedFilters, lookupFaltaApontamento])

  const handleDigitacaoFaltasSave = useCallback(async () => {
    if (!hasEditPermission) {
      setFaltaStatusTone('error')
      setFaltaStatusMessage(getEditPermissionDeniedMessage('Apontamento Servicos'))
      return
    }

    const normalizedMesAno = faltaMesAno.trim()
    const normalizedDreCodigo = faltaDreCodigo.trim()
    const normalizedPlaca = faltaPlaca.trim()
    const normalizedDataReferencia = parseDisplayDateToIso(faltaDataReferenciaInput.trim())
    const normalizedRevisao = Number.parseInt(faltaRevisao.trim(), 10)

    if (!isValidMonthYear(normalizedMesAno)) {
      setFaltaStatusTone('error')
      setFaltaStatusMessage('Mes/ano invalido. Use o formato mm/aaaa.')
      return
    }

    if (!normalizedDreCodigo) {
      setFaltaStatusTone('error')
      setFaltaStatusMessage('Selecione a DRE.')
      return
    }

    if (!normalizedPlaca) {
      setFaltaStatusTone('error')
      setFaltaStatusMessage('Informe a placa.')
      return
    }

    if (!normalizedDataReferencia) {
      setFaltaStatusTone('error')
      setFaltaStatusMessage('Data de referencia invalida. Use o formato dd/mm/aaaa.')
      return
    }

    if (!doesDateBelongToMonthYear(normalizedDataReferencia, normalizedMesAno)) {
      setFaltaStatusTone('error')
      setFaltaStatusMessage(monthYearMismatchMessage)
      return
    }

    if (!faltaAusenciaTotal) {
      setFaltaStatusTone('error')
      setFaltaStatusMessage('Selecione a ausencia total.')
      return
    }

    setIsFaltaSaving(true)
    setFaltaStatusTone('idle')
    setFaltaStatusMessage('Gravando digitacao de faltas...')

    try {
      const ausenciaTotal = faltaAusenciaTotal === 'SIM'
      const tegFlags = faltaTegFlagsFromTipo(faltaTegTipo)
      const result = await saveDigitacaoFaltas({
        mesAno: normalizedMesAno,
        dreCodigo: normalizedDreCodigo,
        tipoPessoa: faltaTipoPessoa,
        dataReferencia: normalizedDataReferencia,
        placa: normalizedPlaca,
        revisao: Number.isInteger(normalizedRevisao) ? normalizedRevisao : undefined,
        ordemServicoCodigo: faltaMatch?.ordemServicoCodigo,
        tegRegular: tegFlags.tegRegular,
        tegAcessivel: tegFlags.tegAcessivel,
        tegCreche: tegFlags.tegCreche,
        tegEspecial: tegFlags.tegEspecial,
        ausenciaTotal,
        quantidadeAlunosIntegral: ausenciaTotal ? undefined : Number.parseInt(faltaQuantidadeIntegral, 10),
        quantidadeAlunosMeioPeriodo: ausenciaTotal ? undefined : Number.parseInt(faltaQuantidadeMeioPeriodo, 10),
      })

      if (result.item) {
        applyDigitacaoFaltasItemToForm(result.item, {
          setFaltaAusenciaTotal,
          setFaltaQuantidadeIntegral,
          setFaltaQuantidadeMeioPeriodo,
          setFaltaTegTipo,
        })
      }

      setFaltaStatusTone('success')
      setFaltaStatusMessage(result.message)
      void lookupFaltaApontamento()
    } catch (error) {
      setFaltaStatusTone('error')
      setFaltaStatusMessage(error instanceof Error ? error.message : 'Falha ao gravar digitacao de faltas.')
    } finally {
      setIsFaltaSaving(false)
    }
  }, [
    faltaAusenciaTotal,
    faltaDataReferenciaInput,
    faltaDreCodigo,
    faltaMesAno,
    faltaPlaca,
    faltaQuantidadeIntegral,
    faltaQuantidadeMeioPeriodo,
    faltaRevisao,
    faltaTegTipo,
    faltaTipoPessoa,
    hasEditPermission,
    lookupFaltaApontamento,
    monthYearMismatchMessage,
  ])

  const stopImportStatusPolling = useCallback(() => {
    if (importStatusPollTimerRef.current !== null) {
      window.clearInterval(importStatusPollTimerRef.current)
      importStatusPollTimerRef.current = null
    }
  }, [])

  const refreshImportStatus = useCallback(async (importId: string) => {
    try {
      const nextStatus = await getApontamentoServicosImportStatus(importId)
      setImportProgress(nextStatus)
      setImportDialogMessage(buildImportRealtimeMessage(nextStatus))

      if (nextStatus.status === 'running') {
        setStatusTone('idle')
        setStatusMessage(buildImportRealtimeMessage(nextStatus))
      }

      if (nextStatus.status === 'completed' || nextStatus.status === 'error') {
        stopImportStatusPolling()
      }
    } catch {
      // Ignore transient polling failures while the import request is still being established.
    }
  }, [stopImportStatusPolling])

  const updateDraftDateConsistencyMessage = (nextMesAno: string, nextDataOperacaoInput: string) => {
    if (!isValidMonthYear(nextMesAno)) {
      return
    }

    const parsedDataOperacao = parseDisplayDateToIso(nextDataOperacaoInput)

    if (!parsedDataOperacao) {
      return
    }

    if (!doesDateBelongToMonthYear(parsedDataOperacao, nextMesAno)) {
      return
    }
  }

  const handleMesAnoChange = (value: string) => {
    const normalizedMesAno = normalizeMonthYearInput(value)
    setMesAno(normalizedMesAno)

    if (!isValidMonthYear(normalizedMesAno)) {
      updateDraftDateConsistencyMessage(normalizedMesAno, dataOperacaoInput)
      return
    }

    const firstDate = getFirstDateOfMonthYear(normalizedMesAno)

    if (firstDate) {
      const firstDateDisplay = formatIsoDateToDisplay(firstDate)
      setDataOperacaoInput(firstDateDisplay)
      updateDraftDateConsistencyMessage(normalizedMesAno, firstDateDisplay)
      return
    }

    updateDraftDateConsistencyMessage(normalizedMesAno, dataOperacaoInput)
  }

  const handleDataOperacaoInputChange = (value: string) => {
    const normalizedValue = normalizeDisplayDateInput(value)
    setDataOperacaoInput(normalizedValue)
    updateDraftDateConsistencyMessage(mesAno, normalizedValue)
  }

  const renderMergedPrimaryCell = (item: ApontamentoServicosItem, groupRowIndex: number) => {
    return (
      <div className="apontamento-servicos-primary-cell">
        {groupRowIndex === 0 ? <strong className="apontamento-servicos-primary-value">{item.crmcCondutor || '-'}</strong> : ''}
      </div>
    )
  }

  const loadDreOptions = useCallback(async () => {
    setIsLoadingOptions(true)
    try {
      const result = await listDreItemsPaginated({ page: 1, pageSize: 500, sortBy: 'codigo', sortDirection: 'asc' })
      setDreOptions(result.items)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao carregar as DREs.'
      setStatusTone('error')
      setStatusMessage(message)
    } finally {
      setIsLoadingOptions(false)
    }
  }, [])

  const loadItems = useCallback(async (filters: ApontamentoServicosFilters, targetPage = 1, targetPageSize = pageSize) => {
    const parsedDataOperacao = filters.dataReferencia

    if (!isValidMonthYear(filters.mesAno)) {
      openValidationDialog('Informe um mes/ano valido para consultar o apontamento.')
      return
    }

    if (!parsedDataOperacao) {
      openValidationDialog('Informe uma data de operacao valida no formato dd/mm/yyyy.')
      return
    }

    if (!doesDateBelongToMonthYear(parsedDataOperacao, filters.mesAno)) {
      openValidationDialog(monthYearMismatchMessage)
      return
    }

    setIsLoading(true)
    setStatusTone('idle')
    setStatusMessage('Carregando apontamento de servicos...')

    try {
      const parsedRevisao = Number.parseInt(filters.revisao, 10)
      const result = await listApontamentoServicosItems({
        mesAno: filters.mesAno,
        dataReferencia: parsedDataOperacao,
        dreCodigo: filters.dreCodigo,
        crmcCondutor: filters.crmcCondutor,
        placa: filters.placa,
        revisao: Number.isInteger(parsedRevisao) ? parsedRevisao : undefined,
        tipoPessoa: filters.tipoPessoa,
        page: targetPage,
        pageSize: targetPageSize,
      })
      const loadedItems = Array.isArray(result.items) ? [...result.items] : []

      setItems(loadedItems)
      setLoadedItemsSnapshot(loadedItems)
      setPage(result.page)
      setPageSize(result.pageSize)
      setTotalItems(result.total)
      setTotalPages(result.totalPages)
      setStatusTone('idle')
      setStatusMessage(loadedItems.length ? '' : 'Nenhum apontamento disponivel para os filtros informados.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao carregar o apontamento de servicos.'
      setItems([])
      setLoadedItemsSnapshot([])
      setTotalItems(0)
      setTotalPages(1)
      setStatusTone('error')
      setStatusMessage(message)
    } finally {
      setIsLoading(false)
    }
  }, [monthYearMismatchMessage, openValidationDialog, pageSize])

  useEffect(() => {
    void loadDreOptions()
  }, [loadDreOptions])

  useEffect(() => {
    void loadItems(appliedFilters, page, pageSize)
  }, [appliedFilters, loadItems, page, pageSize])

  useEffect(() => {
    if (!isValidationDialogVisible && !isImportDialogVisible && !isImportRequestDialogVisible && !isDigitacaoFaltasVisible) {
      return
    }

    document.body.classList.add('management-modal-open')

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isValidationDialogVisible) {
          closeValidationDialog()
        }

        if (isImportRequestDialogVisible) {
          closeImportRequestDialog()
        }

        if (isImportDialogVisible) {
          closeImportDialog()
        }

        if (isDigitacaoFaltasVisible) {
          closeDigitacaoFaltasDialog()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.classList.remove('management-modal-open')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    closeDigitacaoFaltasDialog,
    closeImportDialog,
    closeImportRequestDialog,
    closeValidationDialog,
    isDigitacaoFaltasVisible,
    isImportDialogVisible,
    isImportRequestDialogVisible,
    isValidationDialogVisible,
  ])

  useEffect(() => {
    if (!shouldFocusFirstGridRecordRef.current || isLoading) {
      return
    }

    if (!items.length) {
      shouldFocusFirstGridRecordRef.current = false
      return
    }

    const firstFocusableElement = tableWrapperRef.current?.querySelector<HTMLElement>(
      'tbody input:not([disabled]), tbody button:not([disabled]), tbody [data-grid-first-record="true"]',
    )

    if (firstFocusableElement) {
      firstFocusableElement.focus()
    }

    shouldFocusFirstGridRecordRef.current = false
  }, [isLoading, items])

  const loadImportedFilters = useCallback(async (result: Awaited<ReturnType<typeof importApontamentoServicosExcel>>) => {
    if (!result.mesAno || !result.dataReferencia || !result.dreCodigo || !result.tipoPessoa) {
      return null
    }

    const importedFilters = {
      mesAno: result.mesAno,
      dataReferencia: result.dataReferencia,
      dreCodigo: result.dreCodigo,
      crmcCondutor: '',
      placa: '',
      revisao: String(result.revisao),
      tipoPessoa: result.tipoPessoa,
    }

    setMesAno(result.mesAno)
    setDataOperacaoInput(formatIsoDateToDisplay(result.dataReferencia))
    setDreCodigo(result.dreCodigo)
    setCrmcCondutor('')
    setPlaca('')
    setRevisao(String(result.revisao))
    setTipoPessoa(result.tipoPessoa)
    setAppliedFilters(importedFilters)
    setPage(1)
    return importedFilters
  }, [])

  const handleFilterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsedDataOperacao = parseDisplayDateToIso(dataOperacaoInput)

    setAppliedFilters({
      mesAno,
      dataReferencia: parsedDataOperacao ?? '',
      dreCodigo,
      crmcCondutor,
      placa,
      revisao,
      tipoPessoa,
    })
    setPage(1)
  }

  const handleClearFilter = async () => {
    const currentMonthYear = getCurrentMonthYear()
    const currentIsoDate = getFirstDateOfMonthYear(currentMonthYear) || getCurrentIsoDate()
    setMesAno(currentMonthYear)
    setDataOperacaoInput(formatIsoDateToDisplay(doesDateBelongToMonthYear(currentIsoDate, currentMonthYear) ? currentIsoDate : getFirstDateOfMonthYear(currentMonthYear)))
    setDreCodigo('')
    setCrmcCondutor('')
    setPlaca('')
    setRevisao('0')
    setTipoPessoa('PF')
    setPage(1)
    setStatusTone('idle')
    setStatusMessage('')
    setAppliedFilters({
      mesAno: currentMonthYear,
      dataReferencia: formatIsoDateToDisplay(doesDateBelongToMonthYear(currentIsoDate, currentMonthYear) ? currentIsoDate : getFirstDateOfMonthYear(currentMonthYear)),
      dreCodigo: '',
      crmcCondutor: '',
      placa: '',
      revisao: '0',
      tipoPessoa: 'PF',
    })
  }

  const handlePageSizeChange = (value: string) => {
    const nextPageSize = Number.parseInt(value, 10)

    if (!PAGE_SIZE_OPTIONS.includes(nextPageSize)) {
      return
    }

    setPageSize(nextPageSize)
    setPage(1)
  }

  const handleNavigateToPage = (targetPage: number) => {
    shouldFocusFirstGridRecordRef.current = true
    setPage(targetPage)
  }

  const updateMetricField = (rowKey: string, field: keyof Pick<ApontamentoServicosItem, 'naoCadeirantePresencial' | 'cadeirante' | 'atendimentoComplementarNaoCadeirante' | 'atendimentoComplementarCadeirante' | 'continuaNaoCadeirante' | 'continuaCadeirante' | 'kilometragem'>, value: string) => {
    setItems((currentItems) => currentItems.map((item) => {
      if (buildRowKey(item) !== rowKey) {
        return item
      }

      if (field === 'kilometragem') {
        return {
          ...item,
          kilometragem: normalizeKmInput(value),
        }
      }

      return {
        ...item,
        [field]: Number(normalizeSignedIntegerInput(value) || '0'),
      }
    }))
  }

  const handleSave = async () => {
    if (!hasEditPermission) {
      setStatusTone('warning')
      setStatusMessage(getEditPermissionDeniedMessage('Apontamento de Servicos'))
      return
    }

    if (!items.length) {
      setStatusTone('warning')
      setStatusMessage('Nenhuma linha disponivel para gravacao.')
      return
    }

    const loadedItemsByRowKey = new Map(loadedItemsSnapshot.map((item) => [buildRowKey(item), buildSavePayloadItem(item)]))
    const changedItems = items
      .map((item) => ({
        current: buildSavePayloadItem(item),
        original: loadedItemsByRowKey.get(buildRowKey(item)),
      }))
      .filter(({ current, original }) => !original || !areSavePayloadItemsEqual(current, original))
      .map(({ current }) => current)

    if (!changedItems.length) {
      setStatusTone('warning')
      setStatusMessage('Nenhuma alteracao para gravacao.')
      return
    }

    setIsSaving(true)
    setStatusTone('idle')
    setStatusMessage('Gravando apontamento digitado...')

    try {
      const message = await saveApontamentoServicosItems({
        mesAno: appliedFilters.mesAno,
        dataReferencia: appliedFilters.dataReferencia,
        items: changedItems,
      })

      setStatusTone('success')
      setStatusMessage(message)
      await loadItems(appliedFilters, page)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao gravar o apontamento de servicos.'
      setStatusTone('error')
      setStatusMessage(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleImport = async (params: { directoryPath: string; fileName?: string }) => {
    if (!hasEditPermission) {
      setStatusTone('warning')
      setStatusMessage(getEditPermissionDeniedMessage('Apontamento de Servicos'))
      return
    }

    const importDisplayName = getApontamentoServicosImportDisplayName(params.fileName)
    const normalizedCrmcCondutor = crmcCondutor.trim() || 'todos'
    const importId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`

    setIsImporting(true)
    setStatusTone('idle')
    setStatusMessage(`Importando planilha ${importDisplayName}. CRMC em andamento: ${normalizedCrmcCondutor}.`)
    setImportDialogMessage(`Importacao iniciada para ${importDisplayName}.`)
    setImportDialogSkippedRecords([])
    setImportProgress({
      importId,
      status: 'pending',
      directoryPath: params.directoryPath,
      currentFileName: params.fileName ?? '',
      currentFilePath: '',
      currentFileIndex: 0,
      totalFiles: 0,
      currentRecord: 0,
      totalRecords: 0,
      currentRowNumber: 0,
      processedFiles: 0,
      processedItems: 0,
      processedDates: 0,
      skippedRecords: 0,
      oldDirectoryPath: '',
      movedFileName: '',
      message: `Aguardando inicio da importacao de ${importDisplayName}.`,
      errorMessage: '',
      updatedAt: '',
    })
    setIsImportDialogVisible(true)
    stopImportStatusPolling()
    importStatusPollTimerRef.current = window.setInterval(() => {
      void refreshImportStatus(importId)
    }, 700)
    void refreshImportStatus(importId)

    try {
      const result = await importApontamentoServicosExcel({
        ...params,
        importId,
      })
      await refreshImportStatus(importId)
      setStatusTone('success')
      setStatusMessage(`Importacao concluida para ${getApontamentoServicosImportDisplayName(result.fileName || params.fileName)}. ${result.message}`)
      setImportDialogMessage(`Importacao concluida para ${getApontamentoServicosImportDisplayName(result.fileName || params.fileName)}. ${result.message}`)

      if (result.skippedRecords.length > 0 || result.processedFiles > 1) {
        setImportDialogSkippedRecords(result.skippedRecords)
        setIsImportDialogVisible(true)
      }

      const importedFilters = await loadImportedFilters(result)

      if (importedFilters) {
        await loadItems(importedFilters, 1, pageSize)
      }
    } catch (error) {
      await refreshImportStatus(importId)
      const message = error instanceof Error ? error.message : 'Falha ao importar a planilha de apontamento de servicos.'
      setStatusTone('error')
      setStatusMessage(message)
      setImportDialogMessage(message)
      setIsImportDialogVisible(true)
    } finally {
      stopImportStatusPolling()
      setIsImporting(false)
    }
  }

  useEffect(() => {
    return () => {
      stopImportStatusPolling()
    }
  }, [stopImportStatusPolling])

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
  }, [items, pageSize, shouldShowKmAdicionalColumn, columnVisibilityMode])

  const handleImportRequestSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedDirectoryPath = importDirectoryPath.trim()
    const normalizedFileName = importFileName.trim()

    if (!normalizedDirectoryPath) {
      setImportRequestErrorMessage('Informe o diretorio da planilha.')
      return
    }

    setImportRequestErrorMessage('')
    setIsImportRequestDialogVisible(false)
    await handleImport({
      directoryPath: normalizedDirectoryPath,
      fileName: normalizedFileName || undefined,
    })
  }

  return (
    <>
      {isValidationDialogVisible ? (
        <div className="management-modal-overlay" onClick={closeValidationDialog}>
          <div
            className="management-modal-shell"
            role="dialog"
            aria-modal="true"
            aria-labelledby="apontamento-servicos-validation-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="management-card management-form dre-form management-modal-form-card">
              <div className="management-modal-header">
                <div>
                  <p className="management-modal-kicker">Operacional financeiro - APNTSVC024</p>
                  <h2 id="apontamento-servicos-validation-dialog-title">Validacao do filtro</h2>
                </div>
                <button
                  type="button"
                  className="secondary-button management-modal-close-button"
                  onClick={closeValidationDialog}
                >
                  Fechar
                </button>
              </div>

              <p className="management-modal-subtitle">{validationDialogMessage}</p>

              <div className="button-row dre-button-row management-modal-footer">
                <button type="button" className="primary-button" onClick={closeValidationDialog}>
                  Ok
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isImportRequestDialogVisible ? (
        <div className="management-modal-overlay" onClick={closeImportRequestDialog}>
          <div
            className="management-modal-shell"
            role="dialog"
            aria-modal="true"
            aria-labelledby="apontamento-servicos-import-request-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <form className="management-card management-form dre-form management-modal-form-card" onSubmit={handleImportRequestSubmit}>
              <div className="management-modal-header">
                <div>
                  <p className="management-modal-kicker">Operacional financeiro - APNTSVC024</p>
                  <h2 id="apontamento-servicos-import-request-dialog-title">Importar planilha</h2>
                </div>
                <button
                  type="button"
                  className="secondary-button management-modal-close-button"
                  onClick={closeImportRequestDialog}
                  disabled={isImporting}
                >
                  Fechar
                </button>
              </div>

              <p className="management-modal-subtitle">Informe o diretorio e, se desejar, o nome do arquivo. Sem nome do arquivo, todos os arquivos Excel do diretorio serao processados.</p>

              <div className="management-modal-form-grid">
                <label className="field-group">
                  <span>Diretorio</span>
                  <input
                    type="text"
                    value={importDirectoryPath}
                    onChange={(event) => setImportDirectoryPath(event.target.value)}
                    placeholder="C:/caminho/do/diretorio"
                    disabled={isImporting}
                  />
                </label>

                <label className="field-group">
                  <span>Nome do arquivo</span>
                  <input
                    type="text"
                    value={importFileName}
                    onChange={(event) => setImportFileName(event.target.value)}
                    placeholder="Deixe em branco para importar todos"
                    disabled={isImporting}
                  />
                </label>
              </div>

              {importRequestErrorMessage ? <p className="field-error">{importRequestErrorMessage}</p> : null}

              <div className="button-row dre-button-row management-modal-footer">
                <button type="submit" className="primary-button" disabled={isImporting}>
                  {isImporting ? 'Importando...' : 'Importar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isImportDialogVisible ? (
        <div className="management-modal-overlay" onClick={closeImportDialog}>
          <div
            className="management-modal-shell"
            role="dialog"
            aria-modal="true"
            aria-labelledby="apontamento-servicos-import-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="management-card management-form dre-form management-modal-form-card">
              <div className="management-modal-header">
                <div>
                  <p className="management-modal-kicker">Operacional financeiro - APNTSVC024</p>
                  <h2 id="apontamento-servicos-import-dialog-title">Importacao da planilha</h2>
                </div>
                <button
                  type="button"
                  className="secondary-button management-modal-close-button"
                  onClick={closeImportDialog}
                >
                  Fechar
                </button>
              </div>

              <p className="management-modal-subtitle">{importDialogMessage}</p>

              {importProgress ? (
                <div className="smoke-skipped-list">
                  <strong>Progresso da importacao</strong>
                  <ul>
                    <li>Status: {importProgress.status === 'completed' ? 'Concluida' : importProgress.status === 'error' ? 'Erro' : 'Em processamento'}</li>
                    <li>Linha em processamento: {importProgress.currentRowNumber > 0 ? importProgress.currentRowNumber : '-'}</li>
                    <li>Planilha atual: {importProgress.currentFileName || '-'}</li>
                    <li>Planilhas processadas: {importProgress.processedFiles} de {importProgress.totalFiles || '-'}</li>
                    <li>Registro atual: {importProgress.currentRecord} de {importProgress.totalRecords || '-'}</li>
                    <li>Linhas processadas no banco: {importProgress.processedItems}</li>
                    <li>Datas processadas: {importProgress.processedDates}</li>
                    <li>Movida para old: {importProgress.movedFileName ? `${importProgress.movedFileName} (${importProgress.oldDirectoryPath || 'old'})` : '-'}</li>
                    <li>Mensagem: {importProgress.errorMessage || importProgress.message || '-'}</li>
                  </ul>
                </div>
              ) : null}

              {importDialogSkippedRecords.length > 0 ? (
                <div className="smoke-skipped-list">
                  <strong>OS nao processadas</strong>
                  <ul>
                    {importDialogSkippedRecords.map((record) => (
                      <li key={`${record.fileName || 'arquivo'}-${record.rowNumber}-${record.ordemServico}-${record.reason}`}>
                        {record.fileName ? `${record.fileName} - ` : ''}Linha {record.rowNumber}: {record.ordemServico || '-'} - {record.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="button-row dre-button-row management-modal-footer">
                <button type="button" className="primary-button" onClick={closeImportDialog} disabled={isImporting}>
                  Ok
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isDigitacaoFaltasVisible ? (
        <div className="management-modal-overlay" onClick={closeDigitacaoFaltasDialog}>
          <div
            className="management-modal-shell"
            role="dialog"
            aria-modal="true"
            aria-labelledby="apontamento-servicos-digitacao-faltas-title"
            onClick={(event) => event.stopPropagation()}
          >
            <form
              className="management-card management-form dre-form management-modal-form-card digitacao-faltas-modal-form"
              onSubmit={(event) => {
                event.preventDefault()
                void handleDigitacaoFaltasSave()
              }}
              noValidate
            >
              <div className="management-modal-header">
                <div>
                  <p className="management-modal-kicker">Operacional financeiro - APNTSVC024</p>
                  <h2 id="apontamento-servicos-digitacao-faltas-title">DIGITACAO DE FALTAS</h2>
                </div>
                <button
                  type="button"
                  className="secondary-button management-modal-close-button"
                  onClick={closeDigitacaoFaltasDialog}
                  disabled={isFaltaSaving || isFaltaLookupLoading}
                  aria-label="Fechar digitacao de faltas"
                >
                  X
                </button>
              </div>

              <p className="management-modal-subtitle">
                Selecione um apontamento ou digitalize uma placa. Os dados da OS serao consultados automaticamente.
              </p>

              <div className="apontamento-servicos-grid-wrapper">
                <table className="apontamento-servicos-table">
                  <thead>
                    <tr>
                      <th>OS</th>
                      <th>Revisao</th>
                      <th>Empresa</th>
                      <th>Condutor</th>
                      <th>Placa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.slice(0, 10).map((item, idx) => (
                      <tr key={`${idx}-${item.ordem_servico_codigo}`}>
                        <td>{item.ordem_servico_os_concat || item.ordem_servico_codigo}</td>
                        <td>{item.revisao}</td>
                        <td>{item.empresa}</td>
                        <td>{item.nome_condutor}</td>
                        <td>{item.placa}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {items.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '12px', color: 'var(--text-soft)' }}>
                    Nenhum apontamento encontrado com os filtros atuais.
                  </p>
                ) : null}
              </div>

              <p className="management-modal-subtitle">
                Informe mes/ano, DRE, tipo pessoa, data de referencia e revisao. Ao sair do campo placa, a OS correspondente sera consultada no apontamento.
              </p>

              <div className="management-modal-form-grid digitacao-faltas-filter-grid">
                <label className="field-group" htmlFor="digitacao-faltas-mes-ano">
                  <span>Mes/Ano</span>
                  <input
                    id="digitacao-faltas-mes-ano"
                    type="text"
                    inputMode="numeric"
                    maxLength={7}
                    placeholder="mm/aaaa"
                    value={faltaMesAno}
                    onChange={(event) => setFaltaMesAno(normalizeMonthYearInput(event.target.value))}
                    disabled={isFaltaSaving || isFaltaLookupLoading}
                  />
                </label>

                <label className="field-group" htmlFor="digitacao-faltas-dre">
                  <span>DRE</span>
                  <select
                    id="digitacao-faltas-dre"
                    value={faltaDreCodigo}
                    onChange={(event) => setFaltaDreCodigo(event.target.value)}
                    disabled={isFaltaSaving || isFaltaLookupLoading || isLoadingOptions}
                  >
                    <option value="">Selecione</option>
                    {dreOptions.map((item) => (
                      <option key={item.codigo} value={item.codigo}>
                        {formatDreOptionLabel(item)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field-group" htmlFor="digitacao-faltas-tipo-pessoa">
                  <span>Tipo pessoa</span>
                  <select
                    id="digitacao-faltas-tipo-pessoa"
                    value={faltaTipoPessoa}
                    onChange={(event) => setFaltaTipoPessoa(event.target.value as ApuracaoTipoPessoa)}
                    disabled={isFaltaSaving || isFaltaLookupLoading}
                  >
                    {APURACAO_TIPO_PESSOA_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field-group" htmlFor="digitacao-faltas-data-referencia">
                  <span>Data referencia</span>
                  <input
                    id="digitacao-faltas-data-referencia"
                    type="text"
                    inputMode="numeric"
                    placeholder="dd/mm/aaaa"
                    value={faltaDataReferenciaInput}
                    onChange={(event) => setFaltaDataReferenciaInput(normalizeDisplayDateInput(event.target.value))}
                    onBlur={handleFaltaLookupFilterBlur}
                    disabled={isFaltaSaving || isFaltaLookupLoading}
                  />
                </label>

                <label className="field-group" htmlFor="digitacao-faltas-revisao">
                  <span>Revisao</span>
                  <input
                    id="digitacao-faltas-revisao"
                    type="number"
                    min={0}
                    step={1}
                    value={faltaRevisao}
                    onChange={(event) => setFaltaRevisao(normalizeIntegerInput(event.target.value))}
                    onBlur={handleFaltaLookupFilterBlur}
                    disabled={isFaltaSaving || isFaltaLookupLoading}
                  />
                </label>
              </div>

              <div className="digitacao-faltas-placa-row">
                <label className="field-group digitacao-faltas-placa-field" htmlFor="digitacao-faltas-placa">
                  <span>Placa</span>
                  <input
                    id="digitacao-faltas-placa"
                    type="text"
                    value={faltaPlaca}
                    onChange={(event) => {
                      const nextPlaca = event.target.value.toUpperCase()
                      setFaltaPlaca(nextPlaca)

                      if (faltaMatch) {
                        setFaltaMatch(null)
                      }

                      const trimmedPlaca = nextPlaca.trim()
                      if (!trimmedPlaca) {
                        setFaltaStatusMessage('')
                        setFaltaStatusTone('idle')
                        return
                      }

                      scheduleFaltaPlacaLookup()
                    }}
                    onBlur={handleFaltaPlacaBlur}
                    disabled={isFaltaSaving || isFaltaLookupLoading}
                    placeholder="Informe a placa"
                  />
                </label>

                <div className="digitacao-faltas-match-panel" aria-live="polite">
                  {isFaltaLookupLoading ? (
                    <p className="digitacao-faltas-match-placeholder">Consultando ordem de servico...</p>
                  ) : faltaMatch ? (
                    <div className="digitacao-faltas-match-details">
                      <div className="digitacao-faltas-match-item">
                        <span className="digitacao-faltas-match-label">Empresa</span>
                        <span className="digitacao-faltas-match-value">{faltaMatch.empresa || '-'}</span>
                      </div>
                      <div className="digitacao-faltas-match-item">
                        <span className="digitacao-faltas-match-label">Condutor</span>
                        <span className="digitacao-faltas-match-value">{faltaMatch.nomeCondutor || '-'}</span>
                      </div>
                      <div className="digitacao-faltas-match-item">
                        <span className="digitacao-faltas-match-label">CRMC</span>
                        <span className="digitacao-faltas-match-value">{faltaMatch.crmcCondutor || '-'}</span>
                      </div>
                      <div className="digitacao-faltas-match-item">
                        <span className="digitacao-faltas-match-label">Ordem de servico</span>
                        <span className="digitacao-faltas-match-value">{formatDigitacaoFaltasOsDisplay(faltaMatch)}</span>
                      </div>
                    </div>
                  ) : faltaStatusTone === 'error' && faltaStatusMessage ? (
                    <p className="digitacao-faltas-match-placeholder digitacao-faltas-match-error">
                      {faltaStatusMessage}
                    </p>
                  ) : (
                    <p className="digitacao-faltas-match-placeholder">
                      Os dados da OS serao exibidos ao lado apos a consulta da placa no apontamento.
                    </p>
                  )}
                </div>
              </div>

              <fieldset className="field-radio-group" disabled={isFaltaSaving || isFaltaLookupLoading}>
                <legend>Tipo TEG</legend>
                <div className="field-radio-options">
                  {FALTA_TEG_TIPO_OPTIONS.map((option) => (
                    <label key={option.value} className="field-radio-option" htmlFor={`digitacao-faltas-teg-${option.value}`}>
                      <input
                        id={`digitacao-faltas-teg-${option.value}`}
                        type="radio"
                        name="digitacao-faltas-teg-tipo"
                        value={option.value}
                        checked={faltaTegTipo === option.value}
                        onChange={() => setFaltaTegTipo(option.value)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="field-radio-group" disabled={isFaltaSaving || isFaltaLookupLoading}>
                <legend>Ausencia total</legend>
                <div className="field-radio-options">
                  <label className="field-radio-option" htmlFor="digitacao-faltas-ausencia-total-sim">
                    <input
                      id="digitacao-faltas-ausencia-total-sim"
                      type="radio"
                      name="digitacao-faltas-ausencia-total"
                      value="SIM"
                      checked={faltaAusenciaTotal === 'SIM'}
                      onChange={() => {
                        setFaltaAusenciaTotal('SIM')
                        setFaltaQuantidadeIntegral('0')
                        setFaltaQuantidadeMeioPeriodo('0')
                      }}
                    />
                    <span>Sim</span>
                  </label>
                  <label className="field-radio-option" htmlFor="digitacao-faltas-ausencia-total-nao">
                    <input
                      id="digitacao-faltas-ausencia-total-nao"
                      type="radio"
                      name="digitacao-faltas-ausencia-total"
                      value="NAO"
                      checked={faltaAusenciaTotal === 'NAO'}
                      onChange={() => setFaltaAusenciaTotal('NAO')}
                    />
                    <span>Nao</span>
                  </label>
                </div>
              </fieldset>

              <div className="management-modal-form-grid">
                {faltaAusenciaTotal !== 'SIM' ? (
                  <>
                    <label className="field-group" htmlFor="digitacao-faltas-qtd-integral">
                      <span>Quantidade de alunos integral</span>
                      <select
                        id="digitacao-faltas-qtd-integral"
                        value={faltaQuantidadeIntegral}
                        onChange={(event) => setFaltaQuantidadeIntegral(event.target.value)}
                        disabled={isFaltaSaving || isFaltaLookupLoading}
                      >
                        {FALTA_QUANTIDADE_OPTIONS.map((value) => (
                          <option key={`integral-${value}`} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field-group" htmlFor="digitacao-faltas-qtd-meio-periodo">
                      <span>Quantidade de alunos meio periodo</span>
                      <select
                        id="digitacao-faltas-qtd-meio-periodo"
                        value={faltaQuantidadeMeioPeriodo}
                        onChange={(event) => setFaltaQuantidadeMeioPeriodo(event.target.value)}
                        disabled={isFaltaSaving || isFaltaLookupLoading}
                      >
                        {FALTA_QUANTIDADE_OPTIONS.map((value) => (
                          <option key={`meio-${value}`} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                ) : null}
              </div>

              <div className="button-row dre-button-row management-modal-footer">
                <button
                  type="submit"
                  className="primary-button"
                  disabled={isFaltaSaving || isFaltaLookupLoading || !hasEditPermission}
                >
                  {isFaltaSaving ? 'Salvando...' : 'Salvar faltas'}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeDigitacaoFaltasDialog}
                  disabled={isFaltaSaving || isFaltaLookupLoading}
                >
                  Cancelar
                </button>
              </div>

              <p className={`status-message status-${faltaStatusTone}`} aria-live="polite">
                {faltaStatusMessage}
              </p>
            </form>
          </div>
        </div>
      ) : null}

      <div className="content-copy">
        <p className="content-description">
          Digite os quantitativos diarios do credenciamento com base nas OS ativas de Total Servicos, separados por DRE, revisao, tipo pessoa e tipo de atendimento.
        </p>
      </div>

      <div className="management-layout">
        <div className="management-toolbar apontamento-servicos-toolbar">
          <form className="management-filter-form apontamento-servicos-filter-form" onSubmit={handleFilterSubmit}>
            <label className="apontamento-servicos-filter-field">
              <span className="apontamento-servicos-filter-label">Mes/ano</span>
              <input
                className="management-filter-input apontamento-servicos-filter-input"
                type="text"
                inputMode="numeric"
                placeholder="MM/AAAA"
                value={mesAno}
                onChange={(event) => handleMesAnoChange(event.target.value)}
              />
            </label>
            <label className="apontamento-servicos-filter-field">
              <span className="apontamento-servicos-filter-label">DRE</span>
              <select
                className="management-filter-input apontamento-servicos-filter-input"
                value={dreCodigo}
                onChange={(event) => setDreCodigo(event.target.value)}
              >
                {isLoadingOptions ? <option value="">Carregando DREs...</option> : <option value="">Todas as DREs</option>}
                {dreOptions.map((item) => (
                  <option key={item.codigo} value={item.codigo}>
                    {formatDreOptionLabel(item)}
                  </option>
                ))}
              </select>
            </label>
            <label className="apontamento-servicos-filter-field">
              <span className="apontamento-servicos-filter-label">Tipo pessoa</span>
              <select
                className="management-filter-input apontamento-servicos-filter-input"
                value={tipoPessoa}
                onChange={(event) => setTipoPessoa(event.target.value as ApuracaoTipoPessoa)}
              >
                {APURACAO_TIPO_PESSOA_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="apontamento-servicos-filter-field">
              <span className="apontamento-servicos-filter-label">Revisao</span>
              <input
                className="management-filter-input apontamento-servicos-filter-input"
                type="number"
                step="1"
                placeholder="0"
                value={revisao}
                onChange={(event) => setRevisao(normalizeIntegerInput(event.target.value))}
              />
            </label>
            <label className="apontamento-servicos-filter-field">
              <span className="apontamento-servicos-filter-label">Data referencia</span>
              <input
                className="management-filter-input apontamento-servicos-filter-input"
                type="text"
                inputMode="numeric"
                placeholder="dd/mm/yyyy"
                value={dataOperacaoInput}
                onChange={(event) => handleDataOperacaoInputChange(event.target.value)}
              />
            </label>
            <label className="apontamento-servicos-filter-field">
              <span className="apontamento-servicos-filter-label">CRMC</span>
              <input
                className="management-filter-input apontamento-servicos-filter-input"
                type="text"
                value={crmcCondutor}
                onChange={(event) => setCrmcCondutor(event.target.value)}
                placeholder="Filtrar por CRMC"
              />
            </label>
            <label className="apontamento-servicos-filter-field">
              <span className="apontamento-servicos-filter-label">Placa</span>
              <input
                className="management-filter-input apontamento-servicos-filter-input"
                type="text"
                value={placa}
                onChange={(event) => setPlaca(event.target.value)}
                placeholder="Filtrar por placa"
              />
            </label>
            <div className="apontamento-servicos-filter-actions">
              <button type="submit" className="secondary-button management-filter-button" disabled={isLoading || isSaving}>
                Filtrar
              </button>
              <button type="button" className="secondary-button management-filter-button" onClick={handleClearFilter} disabled={isLoading || isSaving}>
                Limpar
              </button>
            </div>
          </form>

          <div className="apontamento-servicos-toolbar-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={openImportRequestDialog}
              disabled={isImporting || isSaving || isLoading}
            >
              {isImporting ? 'Importando...' : 'Importar dados digitados SME'}
            </button>
            <button type="button" className="primary-button" onClick={handleSave} disabled={isSaving || isLoading || isImporting || !items.length}>
              {isSaving ? 'Salvando...' : 'Salvar apontamento digitado'}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={openDigitacaoFaltasDialog}
              disabled={isSaving || isLoading || isImporting || isFaltaSaving || isFaltaLookupLoading}
            >
              Digitacao de faltas
            </button>
          </div>
        </div>

        <div className="management-card management-table-card apontamento-servicos-table-card">
          <div className="management-grid-header">
            <h2>Registros cadastrados</h2>
            <span>
              {isLoading ? 'Atualizando...' : `${totalItems} ordem(ns) de servico encontrada(s)`}
            </span>
            <div
              className="apontamento-servicos-column-visibility-toggles"
              role="radiogroup"
              aria-label="Exibicao das colunas"
            >
              <label className="apontamento-servicos-accumulated-toggle">
                <input
                  type="radio"
                  name="apontamento-servicos-column-visibility"
                  checked={columnVisibilityMode === 'all'}
                  onChange={() => setColumnVisibilityMode('all')}
                  disabled={isLoading || isSaving || isImporting}
                />
                <span>Todas</span>
              </label>
              <label className="apontamento-servicos-accumulated-toggle">
                <input
                  type="radio"
                  name="apontamento-servicos-column-visibility"
                  checked={columnVisibilityMode === 'daily-only'}
                  onChange={() => setColumnVisibilityMode('daily-only')}
                  disabled={isLoading || isSaving || isImporting}
                />
                <span>Sem acumulados</span>
              </label>
              <label className="apontamento-servicos-accumulated-toggle">
                <input
                  type="radio"
                  name="apontamento-servicos-column-visibility"
                  checked={columnVisibilityMode === 'acum-only'}
                  onChange={() => setColumnVisibilityMode('acum-only')}
                  disabled={isLoading || isSaving || isImporting}
                />
                <span>Somente acumulados</span>
              </label>
            </div>
          </div>

          <div className="apontamento-servicos-grid-top-actions">
            <label className="apontamento-servicos-page-size-control" htmlFor="apontamento-servicos-page-size">
              <span>OS por pagina</span>
              <select
                id="apontamento-servicos-page-size"
                className="apontamento-servicos-page-size-select"
                value={pageSize}
                onChange={(event) => handlePageSizeChange(event.target.value)}
                disabled={isLoading || isSaving || isImporting}
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div ref={topScrollWrapperRef} className="apontamento-servicos-top-scrollbar" aria-label="Rolagem horizontal superior da tabela">
            <div ref={topScrollContentRef} className="apontamento-servicos-top-scrollbar-content" />
          </div>

          <div ref={tableWrapperRef} className="apontamento-servicos-table-wrapper">
            <table className={`management-table apontamento-servicos-table${columnVisibilityMode === 'all' ? '' : ' apontamento-servicos-table-sem-acumulados'}${columnVisibilityMode === 'acum-only' ? ' apontamento-servicos-table-somente-acumulados' : ''}`}>
              <thead>
                <tr>
                  <th className="apontamento-servicos-header-detail apontamento-servicos-header-compact">CRMC</th>
                  <th className="apontamento-servicos-header-detail apontamento-servicos-header-compact">Tipo de<br />veiculo</th>
                  <th className="apontamento-servicos-header-detail apontamento-servicos-header-compact">Tipo<br />atendimento</th>
                  {shouldShowKmAdicionalColumn && showDailyMetricColumns ? <th className="apontamento-servicos-header-metric-km apontamento-servicos-header-compact">Km<br />adicional</th> : null}
                  {showDailyMetricColumns ? (
                    <>
                      <th className="apontamento-servicos-header-metric-input apontamento-servicos-header-compact">N CAD<br />presencial</th>
                      <th className="apontamento-servicos-header-metric-input apontamento-servicos-header-compact">CAD</th>
                      <th className="apontamento-servicos-header-metric-input apontamento-servicos-header-compact">AT. COMPL.<br />N CAD</th>
                      <th className="apontamento-servicos-header-metric-input apontamento-servicos-header-compact">AT. COMPL.<br />CAD</th>
                      <th className="apontamento-servicos-header-metric-continua apontamento-servicos-header-compact">Cont<br />N CAD</th>
                      <th className="apontamento-servicos-header-metric-continua apontamento-servicos-header-compact">Cont<br />CAD</th>
                    </>
                  ) : null}
                  {showAccumulatedColumns ? (
                    <>
                      <th className="apontamento-servicos-header-metric-acumulado apontamento-servicos-header-compact">Acum.<br />N CAD</th>
                      <th className="apontamento-servicos-header-metric-acumulado apontamento-servicos-header-compact">Acum.<br />CAD</th>
                      <th className="apontamento-servicos-header-metric-acumulado apontamento-servicos-header-compact">Acum. AT.<br />N CAD</th>
                      <th className="apontamento-servicos-header-metric-acumulado apontamento-servicos-header-compact">Acum. AT.<br />CAD</th>
                      <th className="apontamento-servicos-header-metric-acumulado apontamento-servicos-header-compact">Acum. Cont<br />N CAD</th>
                      <th className="apontamento-servicos-header-metric-acumulado apontamento-servicos-header-compact">Acum. Cont<br />CAD</th>
                    </>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {items.map((item, itemIndex) => {
                  const rowKey = buildRowKey(item)
                  const uiRowKey = `${rowKey}|${itemIndex}`
                  const groupInfo = rowGroupInfoByIndex.get(itemIndex) ?? { groupRowIndex: 0, isGroupStart: false }
                  const groupRowIndex = groupInfo.groupRowIndex
                  const isGroupStart = groupInfo.isGroupStart
                  const isEditableRow = hasEditPermission && item.isAtivoNaData && item.apuracaoFinanceiraSituacao === APURACAO_SERVICOS_EDITABLE_STATUS
                  const rowClassName = [
                    !item.isAtivoNaData ? 'apontamento-servicos-row-inactive' : '',
                    isGroupStart ? 'apontamento-servicos-row-group-start' : '',
                  ].filter(Boolean).join(' ')
                  const subtitleChips = [
                    { key: 'empresa', label: 'Empresa', value: item.empresa || '-' },
                    { key: 'os', label: 'OS', value: item.ordemServicoOsConcat || item.ordemServicoNumOs || item.ordemServicoCodigo },
                    { key: 'placa', label: 'Placa', value: item.placa || '-' },
                    { key: 'osEspecial', label: 'OS especial', value: formatVeiculoOsEspecialDisplay(item.veiculoOsEspecial) },
                    { key: 'periodo', label: 'Periodo', value: formatPeriodLabel(item) || '-' },
                  ]

                  return (
                    <Fragment key={uiRowKey}>
                      {groupRowIndex === 0 ? (
                        <tr key={`${uiRowKey}-subtitle`} className="apontamento-servicos-subtitle-row">
                          <td colSpan={tableColumnCount}>
                            <div className="apontamento-servicos-subtitle-band">
                              <div className="apontamento-servicos-subtitle-band-main">
                                {subtitleChips.map((chip) => (
                                  <span key={`${uiRowKey}-${chip.key}`} className="apontamento-servicos-subtitle-chip">
                                    <strong>{chip.label}:</strong> {chip.value}
                                  </span>
                                ))}
                              </div>
                              <div className="apontamento-servicos-subtitle-band-secondary">
                                <span className="apontamento-servicos-subtitle-inline-detail">
                                  <strong>Empresa:</strong> {item.empresa || '-'}
                                </span>
                                <span className="apontamento-servicos-subtitle-inline-detail">
                                  <strong>Condutor:</strong> {item.nomeCondutor || '-'}
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                      <tr key={`${uiRowKey}-row`} className={rowClassName}>
                        <td data-grid-first-record={itemIndex === 0 ? 'true' : undefined} tabIndex={itemIndex === 0 ? -1 : undefined}>{renderMergedPrimaryCell(item, groupRowIndex)}</td>
                        <td className="apontamento-servicos-cell-compact">{item.tipoVeiculo || '-'}</td>
                        <td className="apontamento-servicos-cell-compact">{item.tipoEscolaSigla || item.tipoEscolaDescricao || '-'}</td>
                        {shouldShowKmAdicionalColumn && showDailyMetricColumns ? (
                          <td className="apontamento-servicos-cell-compact">
                            <input
                              className="apontamento-servicos-grid-input apontamento-servicos-grid-input-km"
                              type="text"
                              inputMode="decimal"
                              value={item.kilometragem.replace('.', ',')}
                              onChange={(event) => updateMetricField(rowKey, 'kilometragem', event.target.value)}
                              disabled={!isEditableRow || isSaving}
                            />
                          </td>
                        ) : null}
                        {showDailyMetricColumns ? (
                          <>
                            <td className="apontamento-servicos-cell-compact">
                              <input
                                className="apontamento-servicos-grid-input"
                                type="number"
                                step="1"
                                value={item.naoCadeirantePresencial}
                                onChange={(event) => updateMetricField(rowKey, 'naoCadeirantePresencial', event.target.value)}
                                disabled={!isEditableRow || isSaving}
                              />
                            </td>
                            <td className="apontamento-servicos-cell-compact">
                              <input
                                className="apontamento-servicos-grid-input"
                                type="number"
                                step="1"
                                value={item.cadeirante}
                                onChange={(event) => updateMetricField(rowKey, 'cadeirante', event.target.value)}
                                disabled={!isEditableRow || isSaving}
                              />
                            </td>
                            <td className="apontamento-servicos-cell-compact">
                              <input
                                className="apontamento-servicos-grid-input"
                                type="number"
                                step="1"
                                value={item.atendimentoComplementarNaoCadeirante}
                                onChange={(event) => updateMetricField(rowKey, 'atendimentoComplementarNaoCadeirante', event.target.value)}
                                disabled={!isEditableRow || isSaving}
                              />
                            </td>
                            <td className="apontamento-servicos-cell-compact">
                              <input
                                className="apontamento-servicos-grid-input"
                                type="number"
                                step="1"
                                value={item.atendimentoComplementarCadeirante}
                                onChange={(event) => updateMetricField(rowKey, 'atendimentoComplementarCadeirante', event.target.value)}
                                disabled={!isEditableRow || isSaving}
                              />
                            </td>
                            <td className="apontamento-servicos-cell-compact">
                              <input
                                className="apontamento-servicos-grid-input"
                                type="number"
                                step="1"
                                value={item.continuaNaoCadeirante}
                                onChange={(event) => updateMetricField(rowKey, 'continuaNaoCadeirante', event.target.value)}
                                disabled={!isEditableRow || isSaving}
                              />
                            </td>
                            <td className="apontamento-servicos-cell-compact">
                              <input
                                className="apontamento-servicos-grid-input"
                                type="number"
                                step="1"
                                value={item.continuaCadeirante}
                                onChange={(event) => updateMetricField(rowKey, 'continuaCadeirante', event.target.value)}
                                disabled={!isEditableRow || isSaving}
                              />
                            </td>
                          </>
                        ) : null}
                        {showAccumulatedColumns ? (
                          <>
                            <td className="apontamento-servicos-cell-compact">
                              <span className="apontamento-servicos-grid-readonly">{item.naoCadeirantePresencialAcm}</span>
                            </td>
                            <td className="apontamento-servicos-cell-compact">
                              <span className="apontamento-servicos-grid-readonly">{item.cadeiranteAcm}</span>
                            </td>
                            <td className="apontamento-servicos-cell-compact">
                              <span className="apontamento-servicos-grid-readonly">{item.atendimentoComplementarNaoCadeiranteAcm}</span>
                            </td>
                            <td className="apontamento-servicos-cell-compact">
                              <span className="apontamento-servicos-grid-readonly">{item.atendimentoComplementarCadeiranteAcm}</span>
                            </td>
                            <td className="apontamento-servicos-cell-compact">
                              <span className="apontamento-servicos-grid-readonly">{item.continuaNaoCadeiranteAcm}</span>
                            </td>
                            <td className="apontamento-servicos-cell-compact">
                              <span className="apontamento-servicos-grid-readonly">{item.continuaCadeiranteAcm}</span>
                            </td>
                          </>
                        ) : null}
                      </tr>
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          {!isLoading && items.length === 0 ? (
            <p className="management-empty-state">Nenhuma linha encontrada para o apontamento informado.</p>
          ) : null}

          <div className="management-pagination">
            <button
              type="button"
              className="secondary-button management-pagination-button management-pagination-button-icon"
              onClick={() => handleNavigateToPage(1)}
              disabled={!canGoToPreviousPage || isLoading || isSaving || !items.length}
              title="Primeiro registro"
              aria-label="Primeiro registro"
            >
              |◀
            </button>
            <button
              type="button"
              className="secondary-button management-pagination-button management-pagination-button-icon"
              onClick={() => handleNavigateToPage(page - 1)}
              disabled={!canGoToPreviousPage || isLoading || isSaving || !items.length}
              title="Registro anterior"
              aria-label="Registro anterior"
            >
              ◀
            </button>
            <span className="management-pagination-info">
              Pagina {page} de {totalPages}
            </span>
            <button
              type="button"
              className="secondary-button management-pagination-button management-pagination-button-icon"
              onClick={() => handleNavigateToPage(page + 1)}
              disabled={!canGoToNextPage || isLoading || isSaving || !items.length}
              title="Proximo registro"
              aria-label="Proximo registro"
            >
              ▶
            </button>
            <button
              type="button"
              className="secondary-button management-pagination-button management-pagination-button-icon"
              onClick={() => handleNavigateToPage(totalPages)}
              disabled={!canGoToNextPage || isLoading || isSaving || !items.length}
              title="Ultimo registro"
              aria-label="Ultimo registro"
            >
              ▶|
            </button>
          </div>
        </div>

        <p className={`status-message status-${statusTone}`} aria-live="polite">
          {statusMessage}
        </p>
      </div>
    </>
  )
}
