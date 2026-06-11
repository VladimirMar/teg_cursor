import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { listDreItemsPaginated } from './services/dre'
import type { DreItem } from './services/dre'
import {
  exportTotalRemuneracaoServicosExcel,
  listTotalRemuneracaoServicosItems,
  type TotalRemuneracaoServicosItem,
} from './services/totalRemuneracaoServicos'
import {
  APURACAO_TIPO_PESSOA_FILTER_OPTIONS,
} from './services/apuracaoTipoPessoa'
import type { ApuracaoTipoPessoaFilter } from './services/apuracaoTipoPessoa'
import { formatVeiculoOsEspecialDisplay } from './utils/veiculoDisplay'

type StatusTone = 'idle' | 'error' | 'success' | 'warning'
type MonetaryColumnVisibilityMode = 'all' | 'continua-only' | 'km-valor-only' | 'valor-total-only'

type TotalRemuneracaoServicosFilters = {
  mesAno: string
  dreCodigo: string
  crmcCondutor: string
  placa: string
  revisao: string
  tipoPessoa: ApuracaoTipoPessoaFilter
}

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

const formatDreOptionLabel = (item: DreItem) => `${item.codigo} - ${item.sigla} - ${item.descricao}`

const formatDateLabel = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }

  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

const formatPeriodLabel = (item: Pick<TotalRemuneracaoServicosItem, 'periodoInicio' | 'periodoFim'>) => {
  return [formatDateLabel(item.periodoInicio), formatDateLabel(item.periodoFim)].filter(Boolean).join(' a ')
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

const buildRowKey = (item: Pick<TotalRemuneracaoServicosItem, 'mesAno' | 'dreCodigo' | 'ordemServicoCodigo' | 'revisao' | 'tipoPessoa'>) => {
  return `${item.mesAno}|${item.dreCodigo}|${item.ordemServicoCodigo}|${item.revisao}|${item.tipoPessoa}`
}

const buildOrdemServicoGroupKey = (item: Pick<TotalRemuneracaoServicosItem, 'mesAno' | 'dreCodigo' | 'ordemServicoCodigo' | 'revisao' | 'tipoPessoa'>) => {
  return `${item.mesAno}|${item.dreCodigo}|${item.ordemServicoCodigo}|${item.revisao}|${item.tipoPessoa}`
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

const calculateValorTotal = (item: TotalRemuneracaoServicosItem) => {
  return monetaryColumns.reduce((sum, column) => sum + (item[column.key] || 0), 0)
}

export default function TotalRemuneracaoServicosView() {
  const initialMesAno = getCurrentMonthYear()
  const [dreOptions, setDreOptions] = useState<DreItem[]>([])
  const [mesAno, setMesAno] = useState(initialMesAno)
  const [dreCodigo, setDreCodigo] = useState('')
  const [crmcCondutor, setCrmcCondutor] = useState('')
  const [placa, setPlaca] = useState('')
  const [revisao, setRevisao] = useState('0')
  const [tipoPessoa, setTipoPessoa] = useState<ApuracaoTipoPessoaFilter>('')
  const [appliedFilters, setAppliedFilters] = useState<TotalRemuneracaoServicosFilters>({
    mesAno: initialMesAno,
    dreCodigo: '',
    crmcCondutor: '',
    placa: '',
    revisao: '0',
    tipoPessoa: '',
  })
  const [items, setItems] = useState<TotalRemuneracaoServicosItem[]>([])
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
  const [isExporting, setIsExporting] = useState(false)
  const [monetaryColumnVisibilityMode, setMonetaryColumnVisibilityMode] = useState<MonetaryColumnVisibilityMode>('all')
  const topScrollWrapperRef = useRef<HTMLDivElement | null>(null)
  const topScrollContentRef = useRef<HTMLDivElement | null>(null)
  const tableWrapperRef = useRef<HTMLDivElement | null>(null)
  const canGoToPreviousPage = page > 1
  const canGoToNextPage = page < totalPages
  const rowGroupInfoByIndex = useMemo(() => {
    const groupInfoByIndex = new Map<number, { isFirstRowOfGroup: boolean }>()
    let previousGroupKey = ''

    for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
      const currentGroupKey = buildOrdemServicoGroupKey(items[itemIndex])
      const isFirstRowOfGroup = itemIndex === 0 || currentGroupKey !== previousGroupKey
      groupInfoByIndex.set(itemIndex, { isFirstRowOfGroup })
      previousGroupKey = currentGroupKey
    }

    return groupInfoByIndex
  }, [items])
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

  const buildCurrentFilters = useCallback((): TotalRemuneracaoServicosFilters => ({
    mesAno,
    dreCodigo,
    crmcCondutor: crmcCondutor.trim(),
    placa: placa.trim(),
    revisao: revisao.trim(),
    tipoPessoa,
  }), [crmcCondutor, dreCodigo, mesAno, placa, revisao, tipoPessoa])

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

  const loadItems = useCallback(async (
    filters: TotalRemuneracaoServicosFilters,
    pageToLoad: number,
    pageSizeToLoad: number,
  ) => {
    if (!isValidMonthYear(filters.mesAno)) {
      openValidationDialog('Informe um mes/ano valido para consultar o total de remuneracao.')
      return
    }

    setIsLoading(true)
    setStatusTone('idle')
    setStatusMessage('Carregando total de remuneracao de servicos...')

    try {
      const parsedRevisao = Number.parseInt(filters.revisao, 10)
      const result = await listTotalRemuneracaoServicosItems({
        mesAno: filters.mesAno,
        dreCodigo: filters.dreCodigo,
        crmcCondutor: filters.crmcCondutor,
        placa: filters.placa,
        revisao: Number.isInteger(parsedRevisao) ? parsedRevisao : undefined,
        tipoPessoa: filters.tipoPessoa,
        page: pageToLoad,
        pageSize: pageSizeToLoad,
      })

      setItems(result.items)
      setTotalItems(result.total)
      setTotalPages(result.totalPages)
      setPage(result.page)
      setPageSize(result.pageSize)
      setStatusTone('idle')
      setStatusMessage(result.items.length ? '' : 'Nenhum total de remuneracao encontrado para os filtros informados.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao carregar o total de remuneracao de servicos.'
      setStatusTone('error')
      setStatusMessage(message)
      setItems([])
      setTotalItems(0)
      setTotalPages(1)
    } finally {
      setIsLoading(false)
    }
  }, [openValidationDialog])

  useEffect(() => {
    void loadDreOptions()
  }, [loadDreOptions])

  useEffect(() => {
    void loadItems(appliedFilters, page, pageSize)
  }, [appliedFilters, loadItems, page, pageSize])

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
      ? new ResizeObserver(syncScrollMetrics)
      : null

    if (resizeObserver && tableElement) {
      resizeObserver.observe(tableElement)
      resizeObserver.observe(tableWrapper)
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
  }, [items, pageSize, visibleMonetaryColumns.length])

  const handleFilterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPage(1)
    setAppliedFilters(buildCurrentFilters())
  }

  const handleClearFilters = () => {
    const resetMesAno = getCurrentMonthYear()
    setMesAno(resetMesAno)
    setDreCodigo('')
    setCrmcCondutor('')
    setPlaca('')
    setRevisao('0')
    setTipoPessoa('')
    setPage(1)
    setAppliedFilters({
      mesAno: resetMesAno,
      dreCodigo: '',
      crmcCondutor: '',
      placa: '',
      revisao: '0',
      tipoPessoa: '',
    })
  }

  const handlePageSizeChange = (value: string) => {
    const nextPageSize = Number.parseInt(value, 10)

    if (!PAGE_SIZE_OPTIONS.includes(nextPageSize)) {
      return
    }

    setPage(1)
    setPageSize(nextPageSize)
  }

  const handleExportExcel = useCallback(async () => {
    if (!isValidMonthYear(appliedFilters.mesAno)) {
      openValidationDialog('Informe um mes/ano valido para exportar o total de remuneracao.')
      return
    }

    setIsExporting(true)
    setStatusTone('idle')
    setStatusMessage('Gerando Excel fechamento...')

    try {
      const parsedRevisao = Number.parseInt(appliedFilters.revisao, 10)
      await exportTotalRemuneracaoServicosExcel({
        mesAno: appliedFilters.mesAno,
        dreCodigo: appliedFilters.dreCodigo,
        crmcCondutor: appliedFilters.crmcCondutor,
        placa: appliedFilters.placa,
        revisao: Number.isInteger(parsedRevisao) ? parsedRevisao : 0,
        tipoPessoa: appliedFilters.tipoPessoa,
      })
      setStatusTone('success')
      setStatusMessage('Excel fechamento exportado com sucesso.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao exportar o total de remuneracao de servicos.'
      setStatusTone('error')
      setStatusMessage(message)
    } finally {
      setIsExporting(false)
    }
  }, [appliedFilters, openValidationDialog])

  return (
    <>
      {isValidationDialogVisible ? (
        <div className="management-modal-overlay" role="presentation" onClick={closeValidationDialog}>
          <div
            className="management-modal-shell"
            role="dialog"
            aria-modal="true"
            aria-labelledby="total-remuneracao-servicos-validation-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="management-modal-header">
              <div>
                <p className="management-modal-kicker">Validacao</p>
                <h2 id="total-remuneracao-servicos-validation-dialog-title">Validacao do filtro</h2>
              </div>
              <button type="button" className="secondary-button" onClick={closeValidationDialog}>
                Fechar
              </button>
            </div>
            <p className="management-modal-message">{validationDialogMessage}</p>
          </div>
        </div>
      ) : null}

      <div className="management-layout">
        <div className="management-toolbar apontamento-servicos-toolbar">
          <form className="management-filter-form apontamento-servicos-filter-form" onSubmit={handleFilterSubmit}>
            <label className="field-group apontamento-servicos-filter-field" htmlFor="total-remuneracao-servicos-mes-ano">
              <span className="apontamento-servicos-filter-label">Mes/Ano</span>
              <input
                id="total-remuneracao-servicos-mes-ano"
                className="management-filter-input apontamento-servicos-filter-input"
                type="text"
                inputMode="numeric"
                placeholder="mm/aaaa"
                value={mesAno}
                onChange={(event) => setMesAno(normalizeMonthYearInput(event.target.value))}
                disabled={isLoading}
              />
            </label>
            <label className="field-group apontamento-servicos-filter-field" htmlFor="total-remuneracao-servicos-dre">
              <span className="apontamento-servicos-filter-label">DRE</span>
              <select
                id="total-remuneracao-servicos-dre"
                className="management-filter-select apontamento-servicos-filter-input"
                value={dreCodigo}
                onChange={(event) => setDreCodigo(event.target.value)}
                disabled={isLoading || isLoadingOptions}
              >
                <option value="">Todas</option>
                {dreOptions.map((item) => (
                  <option key={item.codigo} value={item.codigo}>
                    {formatDreOptionLabel(item)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-group apontamento-servicos-filter-field" htmlFor="total-remuneracao-servicos-tipo-pessoa">
              <span className="apontamento-servicos-filter-label">Tipo pessoa</span>
              <select
                id="total-remuneracao-servicos-tipo-pessoa"
                className="management-filter-select apontamento-servicos-filter-input"
                value={tipoPessoa}
                onChange={(event) => setTipoPessoa(event.target.value as ApuracaoTipoPessoaFilter)}
                disabled={isLoading}
              >
                {APURACAO_TIPO_PESSOA_FILTER_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-group apontamento-servicos-filter-field" htmlFor="total-remuneracao-servicos-revisao">
              <span className="apontamento-servicos-filter-label">Revisao</span>
              <input
                id="total-remuneracao-servicos-revisao"
                className="management-filter-input apontamento-servicos-filter-input"
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={revisao}
                onChange={(event) => setRevisao(normalizeIntegerInput(event.target.value))}
                disabled={isLoading}
              />
            </label>
            <label className="field-group apontamento-servicos-filter-field" htmlFor="total-remuneracao-servicos-crmc">
              <span className="apontamento-servicos-filter-label">CRMC condutor</span>
              <input
                id="total-remuneracao-servicos-crmc"
                className="management-filter-input apontamento-servicos-filter-input"
                type="text"
                value={crmcCondutor}
                onChange={(event) => setCrmcCondutor(event.target.value)}
                disabled={isLoading}
              />
            </label>
            <label className="field-group apontamento-servicos-filter-field" htmlFor="total-remuneracao-servicos-placa">
              <span className="apontamento-servicos-filter-label">Placa</span>
              <input
                id="total-remuneracao-servicos-placa"
                className="management-filter-input apontamento-servicos-filter-input"
                type="text"
                value={placa}
                onChange={(event) => setPlaca(event.target.value)}
                disabled={isLoading}
              />
            </label>
            <div className="apontamento-servicos-filter-actions">
              <button type="submit" className="secondary-button management-filter-button" disabled={isLoading || isExporting}>
                Filtrar
              </button>
              <button type="button" className="secondary-button management-filter-button" onClick={handleClearFilters} disabled={isLoading || isExporting}>
                Limpar
              </button>
              <button
                type="button"
                className="secondary-button management-filter-button"
                onClick={() => void handleExportExcel()}
                disabled={isLoading || isExporting}
              >
                {isExporting ? 'Gerando...' : 'Excel Fechamento'}
              </button>
            </div>
          </form>
        </div>

        <div className="management-card apontamento-servicos-table-card">
          <div className="management-grid-header">
            <h2>Totais de remuneracao</h2>
            <span>{isLoading ? 'Atualizando...' : `${totalItems} ordem(ns) de servico encontrada(s)`}</span>
            <div className="remuneracao-servicos-visibility-toggles">
              <label className="apontamento-servicos-accumulated-toggle">
                <input
                  type="checkbox"
                  checked={monetaryColumnVisibilityMode === 'continua-only'}
                  onChange={(event) => setMonetaryColumnVisibilityMode(event.target.checked ? 'continua-only' : 'all')}
                  disabled={isLoading}
                />
                <span>Mostrar somente Continua</span>
              </label>
              <label className="apontamento-servicos-accumulated-toggle">
                <input
                  type="checkbox"
                  checked={monetaryColumnVisibilityMode === 'km-valor-only'}
                  onChange={(event) => setMonetaryColumnVisibilityMode(event.target.checked ? 'km-valor-only' : 'all')}
                  disabled={isLoading}
                />
                <span>Mostrar somente KM Valor</span>
              </label>
              <label className="apontamento-servicos-accumulated-toggle">
                <input
                  type="checkbox"
                  checked={monetaryColumnVisibilityMode === 'valor-total-only'}
                  onChange={(event) => setMonetaryColumnVisibilityMode(event.target.checked ? 'valor-total-only' : 'all')}
                  disabled={isLoading}
                />
                <span>Mostrar somente Valor Total</span>
              </label>
            </div>
          </div>

          <div className="remuneracao-servicos-grid-top-actions">
            <label className="apontamento-servicos-page-size-control" htmlFor="total-remuneracao-servicos-page-size">
              <span>OS por pagina</span>
              <select
                id="total-remuneracao-servicos-page-size"
                className="apontamento-servicos-page-size-select"
                value={pageSize}
                onChange={(event) => handlePageSizeChange(event.target.value)}
                disabled={isLoading}
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
                  const groupInfo = rowGroupInfoByIndex.get(index) ?? { isFirstRowOfGroup: index === 0 }
                  const isFirstRowOfGroup = groupInfo.isFirstRowOfGroup

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
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                      <tr key={rowKey} className={isFirstRowOfGroup ? 'apontamento-servicos-row-group-start' : ''}>
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
                            <span className="apontamento-servicos-grid-readonly">{formatMoneyValue(item[column.key])}</span>
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
                    </Fragment>
                  )
                })}
              </tbody>
            </table>

            {!items.length && !isLoading ? <p className="management-empty-state">Nenhum total de remuneracao encontrado.</p> : null}
          </div>

          <p className={`status-message status-${statusTone}`} aria-live="polite">{statusMessage}</p>

          <div className="management-pagination">
            <button
              type="button"
              className="secondary-button management-pagination-button management-pagination-button-icon"
              onClick={() => setPage(1)}
              disabled={!canGoToPreviousPage || isLoading || !items.length}
              title="Primeiro registro"
              aria-label="Primeiro registro"
            >
              |◀
            </button>
            <button
              type="button"
              className="secondary-button management-pagination-button management-pagination-button-icon"
              onClick={() => setPage((currentPage) => currentPage - 1)}
              disabled={!canGoToPreviousPage || isLoading || !items.length}
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
              disabled={!canGoToNextPage || isLoading || !items.length}
              title="Proximo registro"
              aria-label="Proximo registro"
            >
              ▶
            </button>
            <button
              type="button"
              className="secondary-button management-pagination-button management-pagination-button-icon"
              onClick={() => setPage(totalPages)}
              disabled={!canGoToNextPage || isLoading || !items.length}
              title="Ultimo registro"
              aria-label="Ultimo registro"
            >
              ▶|
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
