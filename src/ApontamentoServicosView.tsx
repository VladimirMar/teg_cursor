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
import { getEditPermissionDeniedMessage, hasEditableFormPermission } from './utils/formAccess'

type StatusTone = 'idle' | 'error' | 'success' | 'warning'

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
const DEFAULT_APONTAMENTO_SERVICOS_IMPORT_DIRECTORY_PATH = 'C:/Users/m089383/Aplicativos/teg_financ/pgtos/2026-04 Pgto'
const DEFAULT_APONTAMENTO_SERVICOS_IMPORT_FILE_NAME = '04 ATESTE BT PF ABR 26.xlsx'

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

const apontamentoServicosSortCollator = new Intl.Collator('pt-BR', {
  sensitivity: 'base',
  numeric: true,
})

const sortApontamentoServicosItems = (items: ApontamentoServicosItem[]) => {
  return [...items].sort((left, right) => {
    const empresaCompare = apontamentoServicosSortCollator.compare(left.empresa || '', right.empresa || '')

    if (empresaCompare !== 0) {
      return empresaCompare
    }

    const condutorCompare = apontamentoServicosSortCollator.compare(left.nomeCondutor || '', right.nomeCondutor || '')

    if (condutorCompare !== 0) {
      return condutorCompare
    }

    const crmcCompare = apontamentoServicosSortCollator.compare(left.crmcCondutor || '', right.crmcCondutor || '')

    if (crmcCompare !== 0) {
      return crmcCompare
    }

    const ordemServicoCompare = apontamentoServicosSortCollator.compare(left.ordemServicoCodigo || '', right.ordemServicoCodigo || '')

    if (ordemServicoCompare !== 0) {
      return ordemServicoCompare
    }

    const dataCompare = apontamentoServicosSortCollator.compare(left.dataReferencia || '', right.dataReferencia || '')

    if (dataCompare !== 0) {
      return dataCompare
    }

    return apontamentoServicosSortCollator.compare(buildRowKey(left), buildRowKey(right))
  })
}

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
  const [showAccumulatedColumns, setShowAccumulatedColumns] = useState(true)
  const [isLoadingOptions, setIsLoadingOptions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const topScrollWrapperRef = useRef<HTMLDivElement | null>(null)
  const topScrollContentRef = useRef<HTMLDivElement | null>(null)
  const tableWrapperRef = useRef<HTMLDivElement | null>(null)
  const importStatusPollTimerRef = useRef<number | null>(null)
  const shouldFocusFirstGridRecordRef = useRef(false)
  const shouldShowKmAdicionalColumn = appliedFilters.dataReferencia.endsWith('-01')
  const tableColumnCount = (shouldShowKmAdicionalColumn ? 10 : 9) + (showAccumulatedColumns ? 6 : 0)
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
      const sortedItems = sortApontamentoServicosItems(result.items)

      setItems(sortedItems)
      setLoadedItemsSnapshot(sortedItems)
      setPage(result.page)
      setPageSize(result.pageSize)
      setTotalItems(result.total)
      setTotalPages(result.totalPages)
      setStatusTone('idle')
      setStatusMessage(sortedItems.length ? '' : 'Nenhum apontamento disponivel para os filtros informados.')
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
    if (!isValidationDialogVisible && !isImportDialogVisible && !isImportRequestDialogVisible) {
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
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.classList.remove('management-modal-open')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    closeImportDialog,
    closeImportRequestDialog,
    closeValidationDialog,
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
    setStatusMessage('Gravando apontamento de servicos...')

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
  }, [items, pageSize, shouldShowKmAdicionalColumn, showAccumulatedColumns])

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
              {isSaving ? 'Salvando...' : 'Salvar apontamento'}
            </button>
          </div>
        </div>

        <div className="management-card management-table-card apontamento-servicos-table-card">
          <div className="management-grid-header">
            <h2>Registros cadastrados</h2>
            <span>
              {isLoading ? 'Atualizando...' : `${totalItems} ordem(ns) de servico encontrada(s)`}
            </span>
            <label className="apontamento-servicos-accumulated-toggle">
              <input
                type="checkbox"
                checked={showAccumulatedColumns}
                onChange={(event) => setShowAccumulatedColumns(event.target.checked)}
                disabled={isLoading || isSaving || isImporting}
              />
              <span>Mostrar acumulados</span>
            </label>
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
            <table className={`management-table apontamento-servicos-table${showAccumulatedColumns ? '' : ' apontamento-servicos-table-sem-acumulados'}`}>
              <thead>
                <tr>
                  <th className="apontamento-servicos-header-detail apontamento-servicos-header-compact">CRMC</th>
                  <th className="apontamento-servicos-header-detail apontamento-servicos-header-compact">Tipo de<br />veiculo</th>
                  <th className="apontamento-servicos-header-detail apontamento-servicos-header-compact">Tipo<br />atendimento</th>
                  {shouldShowKmAdicionalColumn ? <th className="apontamento-servicos-header-metric-km apontamento-servicos-header-compact">Km<br />adicional</th> : null}
                  <th className="apontamento-servicos-header-metric-input apontamento-servicos-header-compact">N CAD<br />presencial</th>
                  <th className="apontamento-servicos-header-metric-input apontamento-servicos-header-compact">CAD</th>
                  <th className="apontamento-servicos-header-metric-input apontamento-servicos-header-compact">AT. COMPL.<br />N CAD</th>
                  <th className="apontamento-servicos-header-metric-input apontamento-servicos-header-compact">AT. COMPL.<br />CAD</th>
                  <th className="apontamento-servicos-header-metric-continua apontamento-servicos-header-compact">Cont<br />N CAD</th>
                  <th className="apontamento-servicos-header-metric-continua apontamento-servicos-header-compact">Cont<br />CAD</th>
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
                        {shouldShowKmAdicionalColumn ? (
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
