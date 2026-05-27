import { useCallback, useDeferredValue, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { listDreItemsPaginated } from './services/dre'
import type { DreItem } from './services/dre'
import {
  listApuracaoServicosItemsPaginated,
  listApuracaoServicosOrdemServicoOptions,
} from './services/apuracaoServicos'
import type {
  ApuracaoServicosItem,
  ApuracaoServicosKey,
  ApuracaoServicosOrdemServicoOption,
  ApuracaoServicosSortField,
} from './services/apuracaoServicos'
import {
  APURACAO_TIPO_PESSOA_OPTIONS,
  formatApuracaoTipoPessoaLabel,
} from './services/apuracaoTipoPessoa'
import type { ApuracaoTipoPessoa } from './services/apuracaoTipoPessoa'

type StatusTone = 'idle' | 'error' | 'success' | 'warning'

const normalizeMonthYearInput = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 6)

  if (digits.length <= 2) {
    return digits
  }

  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

const isValidMonthYear = (value: string) => /^(0[1-9]|1[0-2])\/\d{4}$/.test(value)

const isValidDateInput = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)

const formatIsoDateToDisplay = (value: string) => {
  if (!isValidDateInput(value)) {
    return value
  }

  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

const normalizeIntegerInput = (value: string) => value.replace(/[^\d]/g, '')

const parseNonNegativeInteger = (value: string) => {
  if (!value.trim()) {
    return Number.NaN
  }

  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : Number.NaN
}

const formatDreDisplayLabel = (item: Pick<DreItem, 'sigla' | 'descricao'>) => {
  return [item.sigla, item.descricao].filter(Boolean).join(' - ')
}

const formatDreFormDisplayLabel = (item: Pick<ApuracaoServicosItem, 'dreSigla' | 'dreDescricao'>) => {
  return [item.dreSigla, item.dreDescricao].filter(Boolean).join(' - ')
}

const formatOrdemServicoFormDisplayLabel = (item: Pick<ApuracaoServicosItem, 'ordemServicoOsConcat' | 'ordemServicoTermoAdesao' | 'ordemServicoNumOs'>) => {
  return item.ordemServicoOsConcat || [item.ordemServicoTermoAdesao, item.ordemServicoNumOs].filter(Boolean).join(' / ')
}

const formatOrdemServicoDisplayLabel = (item: ApuracaoServicosOrdemServicoOption) => {
  const mainLabel = item.osConcat || [item.termoAdesao, item.numOs, item.revisao].filter(Boolean).join(' / ')
  const suffix = [item.modalidadeDescricao, item.dreDescricao].filter(Boolean).join(' - ')
  return suffix ? `${mainLabel} - ${suffix}` : mainLabel
}

const findDreByDisplayValue = (items: DreItem[], value: string) => {
  const normalizedValue = value.trim().toLowerCase()
  if (!normalizedValue) {
    return null
  }

  return items.find((item) => {
    return item.codigo.toLowerCase() === normalizedValue
      || formatDreOptionLabel(item).toLowerCase() === normalizedValue
      || formatDreDisplayLabel(item).toLowerCase() === normalizedValue
  }) ?? null
}

const findOrdemServicoByDisplayValue = (items: ApuracaoServicosOrdemServicoOption[], value: string) => {
  const normalizedValue = value.trim().toLowerCase()
  if (!normalizedValue) {
    return null
  }

  return items.find((item) => {
    return item.codigo.toLowerCase() === normalizedValue
      || formatOrdemServicoOptionLabel(item).toLowerCase() === normalizedValue
      || formatOrdemServicoDisplayLabel(item).toLowerCase() === normalizedValue
  }) ?? null
}

const findTipoPessoaByDisplayValue = (value: string) => {
  const normalizedValue = value.trim().toLowerCase()
  if (!normalizedValue) {
    return null
  }

  return APURACAO_TIPO_PESSOA_OPTIONS.find((item) => {
    return item.value.toLowerCase() === normalizedValue || item.label.toLowerCase() === normalizedValue
  }) ?? null
}

const formatApuracaoServicosKey = (item: Pick<ApuracaoServicosKey, 'mesAno' | 'dataReferencia' | 'dreCodigo' | 'ordemServicoCodigo' | 'revisao' | 'tipoPessoa'>) => {
  return `${item.mesAno}|${item.dataReferencia}|${item.dreCodigo}|${item.ordemServicoCodigo}|${item.revisao}|${item.tipoPessoa}`
}

const formatDreOptionLabel = (item: Pick<DreItem, 'codigo' | 'sigla' | 'descricao'>) => {
  return `${item.codigo} - ${item.sigla} - ${item.descricao}`
}

const formatDreGridLabel = (item: Pick<ApuracaoServicosItem, 'dreCodigo' | 'dreSigla' | 'dreDescricao'>) => {
  return item.dreSigla || item.dreDescricao || item.dreCodigo
}

const formatOrdemServicoOptionLabel = (item: ApuracaoServicosOrdemServicoOption) => {
  const mainLabel = item.osConcat || [item.termoAdesao, item.numOs, item.revisao].filter(Boolean).join(' / ')
  const suffix = [item.modalidadeDescricao, item.dreDescricao].filter(Boolean).join(' - ')
  return suffix ? `${item.codigo} - ${mainLabel} - ${suffix}` : `${item.codigo} - ${mainLabel}`
}

const formatOrdemServicoGridLabel = (item: Pick<ApuracaoServicosItem, 'ordemServicoCodigo' | 'ordemServicoOsConcat' | 'ordemServicoTermoAdesao' | 'ordemServicoNumOs'>) => {
  const descriptor = item.ordemServicoOsConcat || [item.ordemServicoTermoAdesao, item.ordemServicoNumOs].filter(Boolean).join(' / ')
  return descriptor || item.ordemServicoCodigo
}

const getSortIndicator = (sortBy: ApuracaoServicosSortField, currentSortBy: ApuracaoServicosSortField, currentSortDirection: 'asc' | 'desc') => {
  if (sortBy !== currentSortBy) {
    return '↕'
  }

  return currentSortDirection === 'asc' ? '↑' : '↓'
}

const emptyFormErrors = {
  mesAno: '',
  dataReferencia: '',
  dreCodigo: '',
  ordemServicoCodigo: '',
  revisao: '',
  tipoPessoa: '',
  naoCadeirantePresencial: '',
  cadeirante: '',
  atendimentoComplementarNaoCadeirante: '',
  atendimentoComplementarCadeirante: '',
  continuaNaoCadeirante: '',
  continuaCadeirante: '',
  kilometragem: '',
}

export default function ApuracaoServicosView() {
  const [items, setItems] = useState<ApuracaoServicosItem[]>([])
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [filterDataReferencia, setFilterDataReferencia] = useState('')
  const [filterDreCodigo, setFilterDreCodigo] = useState('')
  const [filterTipoPessoa, setFilterTipoPessoa] = useState('')
  const [filterRevisao, setFilterRevisao] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [sortBy, setSortBy] = useState<ApuracaoServicosSortField>('mesAno')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [statusMessage, setStatusMessage] = useState('')
  const [statusTone, setStatusTone] = useState<StatusTone>('idle')
  const [isLoading, setIsLoading] = useState(false)

  const [dreOptions, setDreOptions] = useState<DreItem[]>([])
  const [ordemServicoOptions, setOrdemServicoOptions] = useState<ApuracaoServicosOrdemServicoOption[]>([])
  const [isLoadingFormOptions, setIsLoadingFormOptions] = useState(false)
  const [isLoadingOrdemServicoOptions, setIsLoadingOrdemServicoOptions] = useState(false)

  const [isFormVisible, setIsFormVisible] = useState(false)

  const [mesAno, setMesAno] = useState('')
  const [dataReferencia, setDataReferencia] = useState('')
  const [dreCodigo, setDreCodigo] = useState('')
  const [dreDisplayValue, setDreDisplayValue] = useState('')
  const [ordemServicoDisplayValue, setOrdemServicoDisplayValue] = useState('')
  const [revisao, setRevisao] = useState('0')
  const [tipoPessoa, setTipoPessoa] = useState<ApuracaoTipoPessoa>('PF')
  const [tipoPessoaDisplayValue, setTipoPessoaDisplayValue] = useState(formatApuracaoTipoPessoaLabel('PF'))
  const [naoCadeirantePresencial, setNaoCadeirantePresencial] = useState('0')
  const [cadeirante, setCadeirante] = useState('0')
  const [atendimentoComplementarNaoCadeirante, setAtendimentoComplementarNaoCadeirante] = useState('0')
  const [atendimentoComplementarCadeirante, setAtendimentoComplementarCadeirante] = useState('0')
  const [continuaNaoCadeirante, setContinuaNaoCadeirante] = useState('0')
  const [continuaCadeirante, setContinuaCadeirante] = useState('0')
  const [kilometragem, setKilometragem] = useState('0,0000')
  const [formErrors, setFormErrors] = useState(emptyFormErrors)

  const canGoToPreviousPage = page > 1
  const canGoToNextPage = page < totalPages

  const resetForm = useCallback(() => {
    setMesAno('')
    setDataReferencia('')
    setDreCodigo('')
    setDreDisplayValue('')
    setOrdemServicoDisplayValue('')
    setRevisao('0')
    setTipoPessoa('PF')
    setTipoPessoaDisplayValue(formatApuracaoTipoPessoaLabel('PF'))
    setNaoCadeirantePresencial('0')
    setCadeirante('0')
    setAtendimentoComplementarNaoCadeirante('0')
    setAtendimentoComplementarCadeirante('0')
    setContinuaNaoCadeirante('0')
    setContinuaCadeirante('0')
    setKilometragem('0,0000')
    setFormErrors(emptyFormErrors)
    setOrdemServicoOptions([])
  }, [])

  const loadItems = useCallback(async (pageToLoad: number) => {
    setIsLoading(true)
    setStatusTone('idle')
    setStatusMessage('Carregando registros de total de servicos...')

    try {
      const parsedFilterRevisao = parseNonNegativeInteger(filterRevisao)
      const result = await listApuracaoServicosItemsPaginated({
        search: deferredSearch,
        dataReferencia: isValidDateInput(filterDataReferencia) ? filterDataReferencia : undefined,
        dreCodigo: filterDreCodigo,
        revisao: Number.isInteger(parsedFilterRevisao) ? parsedFilterRevisao : undefined,
        tipoPessoa: filterTipoPessoa as ApuracaoTipoPessoa | undefined,
        page: pageToLoad,
        pageSize: 20,
        sortBy,
        sortDirection,
      })

      setItems(result.items)
      setTotalItems(result.total)
      setTotalPages(result.totalPages)
      setPage(result.page)
      setSortBy(result.sortBy)
      setSortDirection(result.sortDirection)
      setStatusMessage(result.items.length ? '' : 'Nenhum registro encontrado na tabela Total Servicos.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao carregar os registros de total de servicos.'
      setStatusTone('error')
      setStatusMessage(message)
    } finally {
      setIsLoading(false)
    }
  }, [deferredSearch, filterDataReferencia, filterDreCodigo, filterRevisao, filterTipoPessoa, sortBy, sortDirection])

  const loadStaticOptions = useCallback(async () => {
    setIsLoadingFormOptions(true)

    try {
      const dreResult = await listDreItemsPaginated({ page: 1, pageSize: 500, sortBy: 'descricao', sortDirection: 'asc' })

      setDreOptions(dreResult.items)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao carregar as opcoes de total de servicos.'
      setStatusTone('error')
      setStatusMessage(message)
    } finally {
      setIsLoadingFormOptions(false)
    }
  }, [])

  const loadOrdemServicoOptions = useCallback(async (nextMesAno: string, nextDreCodigo: string) => {
    if (!isValidMonthYear(nextMesAno) || !nextDreCodigo) {
      setOrdemServicoOptions([])
      return
    }

    setIsLoadingOrdemServicoOptions(true)

    try {
      const result = await listApuracaoServicosOrdemServicoOptions({ mesAno: nextMesAno, dreCodigo: nextDreCodigo, tipoPessoa })
      setOrdemServicoOptions(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao carregar as ordens de servico ativas.'
      setStatusTone('error')
      setStatusMessage(message)
      setOrdemServicoOptions([])
    } finally {
      setIsLoadingOrdemServicoOptions(false)
    }
  }, [tipoPessoa])

  useEffect(() => {
    void loadStaticOptions()
  }, [loadStaticOptions])

  useEffect(() => {
    void loadItems(page)
  }, [loadItems, page])

  useEffect(() => {
    if (!isFormVisible) {
      return
    }

    void loadOrdemServicoOptions(mesAno, dreCodigo)
  }, [dreCodigo, isFormVisible, loadOrdemServicoOptions, mesAno, tipoPessoa])

  const handleFilterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPage(1)
  }

  const handleClearFilter = () => {
    setSearch('')
    setFilterDataReferencia('')
    setFilterDreCodigo('')
    setFilterRevisao('')
    setFilterTipoPessoa('')
    setPage(1)
  }

  const handleSort = (field: ApuracaoServicosSortField) => {
    setPage(1)
    setSortDirection((currentDirection) => (
      sortBy === field ? (currentDirection === 'asc' ? 'desc' : 'asc') : 'asc'
    ))
    setSortBy(field)
  }

  const openFormWithItem = (item: ApuracaoServicosItem) => {
    setMesAno(item.mesAno)
    setDataReferencia(item.dataReferencia)
    setDreCodigo(item.dreCodigo)
    setDreDisplayValue(formatDreFormDisplayLabel(item))
    setOrdemServicoDisplayValue(formatOrdemServicoFormDisplayLabel(item))
    setRevisao(String(item.revisao))
    setTipoPessoa(item.tipoPessoa)
    setTipoPessoaDisplayValue(formatApuracaoTipoPessoaLabel(item.tipoPessoa))
    setNaoCadeirantePresencial(String(item.naoCadeirantePresencial))
    setCadeirante(String(item.cadeirante))
    setAtendimentoComplementarNaoCadeirante(String(item.atendimentoComplementarNaoCadeirante))
    setAtendimentoComplementarCadeirante(String(item.atendimentoComplementarCadeirante))
    setContinuaNaoCadeirante(String(item.continuaNaoCadeirante))
    setContinuaCadeirante(String(item.continuaCadeirante))
    setKilometragem(item.kilometragem.replace('.', ','))
    setFormErrors(emptyFormErrors)
    setIsFormVisible(true)
    setStatusTone('idle')
    setStatusMessage('')
  }

  const handleStartView = (item: ApuracaoServicosItem) => {
    openFormWithItem(item)
  }

  const handleCancelForm = () => {
    setIsFormVisible(false)
    resetForm()
    setStatusTone('idle')
    setStatusMessage('')
  }

  const handleDreDisplayChange = (value: string) => {
    setDreDisplayValue(value)
    const matchedItem = findDreByDisplayValue(dreOptions, value)
    setDreCodigo(matchedItem?.codigo ?? '')
    if (!matchedItem) {
      setOrdemServicoDisplayValue('')
    }
  }

  const handleOrdemServicoDisplayChange = (value: string) => {
    setOrdemServicoDisplayValue(value)
    findOrdemServicoByDisplayValue(ordemServicoOptions, value)
  }

  const handleTipoPessoaDisplayChange = (value: string) => {
    setTipoPessoaDisplayValue(value)
    const matchedItem = findTipoPessoaByDisplayValue(value)
    setTipoPessoa(matchedItem?.value ?? ('' as ApuracaoTipoPessoa))
  }

  return (
    <>
      <div className="content-copy">
        <p className="content-kicker">Operacional financeiro</p>
        <h2 id="content-title">Total Servicos</h2>
        <p className="content-description">
          Consulte o total diario de servicos por data de referencia, DRE, tipo pessoa, OS ativa e revisao. Os valores sao exibidos de forma aglutinada e apurados automaticamente a partir das alteracoes realizadas em Apontamento Servicos.
        </p>
      </div>

      <div className="management-layout">
        <div className="management-toolbar">
          <form className="management-filter-form" onSubmit={handleFilterSubmit}>
            <input
              className="management-filter-input"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <input
              type="date"
              value={filterDataReferencia}
              onChange={(event) => setFilterDataReferencia(event.target.value)}
            />
            <select
              value={filterDreCodigo}
              onChange={(event) => setFilterDreCodigo(event.target.value)}
              disabled={isLoadingFormOptions}
            >
              <option value="">Todas as DREs</option>
              {dreOptions.map((item) => (
                <option key={item.codigo} value={item.codigo}>
                  {formatDreOptionLabel(item)}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              step="1"
              placeholder="Revisao"
              value={filterRevisao}
              onChange={(event) => setFilterRevisao(normalizeIntegerInput(event.target.value))}
            />
            <select
              value={filterTipoPessoa}
              onChange={(event) => setFilterTipoPessoa(event.target.value)}
            >
              <option value="">Todos os tipos pessoa</option>
              {APURACAO_TIPO_PESSOA_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <button type="submit" className="secondary-button management-filter-button">
              Filtrar
            </button>
            <button type="button" className="secondary-button management-filter-button" onClick={handleClearFilter}>
              Limpar
            </button>
          </form>
        </div>

        {isFormVisible ? (
          <div
            className="management-modal-overlay"
            role="presentation"
          >
            <div
              className="management-modal-shell"
              role="dialog"
              aria-modal="true"
              aria-labelledby="apuracao-servicos-modal-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="management-card management-form dre-form management-modal-form-card">
                <div className="management-modal-header">
                  <div>
                    <p className="management-modal-kicker">Operacional financeiro - APURSVC021</p>
                    <h2 id="apuracao-servicos-modal-title">TOTAL SERVICOS</h2>
                  </div>
                  <button
                    type="button"
                    className="secondary-button management-modal-close-button"
                    onClick={handleCancelForm}
                    aria-label="Fechar formulario de total de servicos"
                  >
                    X
                  </button>
                </div>

                <p className="management-modal-subtitle">
                  Consulta de registro
                </p>

                <div className="apuracao-servicos-section-card apuracao-servicos-primary-card">
                  <div className="apuracao-servicos-meta-row">
                    <label className="field-group" htmlFor="apuracao-servicos-mes-ano">
                      <span>Mes/Ano</span>
                      <input
                        id="apuracao-servicos-mes-ano"
                        type="text"
                        inputMode="numeric"
                        placeholder="mm/aaaa"
                        value={mesAno}
                        onChange={(event) => setMesAno(normalizeMonthYearInput(event.target.value))}
                        disabled
                        aria-invalid={Boolean(formErrors.mesAno)}
                      />
                      {formErrors.mesAno ? <strong className="field-error">{formErrors.mesAno}</strong> : null}
                    </label>

                    <label className="field-group" htmlFor="apuracao-servicos-data-referencia">
                      <span>Data Referencia</span>
                      <input
                        id="apuracao-servicos-data-referencia"
                        type="date"
                        value={dataReferencia}
                        onChange={(event) => setDataReferencia(event.target.value)}
                        disabled
                        aria-invalid={Boolean(formErrors.dataReferencia)}
                      />
                      {formErrors.dataReferencia ? <strong className="field-error">{formErrors.dataReferencia}</strong> : null}
                    </label>

                    <label className="field-group" htmlFor="apuracao-servicos-revisao">
                      <span>Revisao</span>
                      <input
                        id="apuracao-servicos-revisao"
                        type="text"
                        inputMode="numeric"
                        value={revisao}
                        onChange={(event) => setRevisao(normalizeIntegerInput(event.target.value))}
                        disabled
                        aria-invalid={Boolean(formErrors.revisao)}
                      />
                      {formErrors.revisao ? <strong className="field-error">{formErrors.revisao}</strong> : null}
                    </label>
                  </div>

                  <div className="apuracao-servicos-key-grid">
                    <label className="field-group" htmlFor="apuracao-servicos-dre">
                      <span>DRE</span>
                      <input
                        id="apuracao-servicos-dre"
                        type="text"
                        list="apuracao-servicos-dre-options"
                        placeholder="Descritivo da DRE"
                        value={dreDisplayValue}
                        onChange={(event) => handleDreDisplayChange(event.target.value)}
                        disabled
                        aria-invalid={Boolean(formErrors.dreCodigo)}
                      />
                      <datalist id="apuracao-servicos-dre-options">
                        {dreOptions.map((item) => (
                            <option key={item.codigo} value={formatDreDisplayLabel(item)} />
                        ))}
                      </datalist>
                      {formErrors.dreCodigo ? <strong className="field-error">{formErrors.dreCodigo}</strong> : null}
                    </label>

                    <label className="field-group" htmlFor="apuracao-servicos-os">
                      <span>Ordem de Servico</span>
                      <input
                        id="apuracao-servicos-os"
                        type="text"
                        list="apuracao-servicos-os-options"
                        placeholder="Descritivo da OS"
                        value={ordemServicoDisplayValue}
                        onChange={(event) => handleOrdemServicoDisplayChange(event.target.value)}
                        disabled
                        aria-invalid={Boolean(formErrors.ordemServicoCodigo)}
                      />
                      <datalist id="apuracao-servicos-os-options">
                        {ordemServicoOptions.map((item) => (
                            <option key={item.codigo} value={formatOrdemServicoDisplayLabel(item)} />
                        ))}
                      </datalist>
                      {formErrors.ordemServicoCodigo ? <strong className="field-error">{formErrors.ordemServicoCodigo}</strong> : null}
                    </label>

                    <label className="field-group" htmlFor="apuracao-servicos-tipo-pessoa">
                      <span>Tipo Pessoa</span>
                      <input
                        id="apuracao-servicos-tipo-pessoa"
                        type="text"
                        list="apuracao-servicos-tipo-pessoa-options"
                        placeholder="Descritivo do tipo pessoa"
                        value={tipoPessoaDisplayValue}
                        onChange={(event) => handleTipoPessoaDisplayChange(event.target.value)}
                        disabled
                        aria-invalid={Boolean(formErrors.tipoPessoa)}
                      />
                      <datalist id="apuracao-servicos-tipo-pessoa-options">
                        {APURACAO_TIPO_PESSOA_OPTIONS.map((item) => (
                            <option key={item.value} value={item.label} />
                        ))}
                      </datalist>
                      {formErrors.tipoPessoa ? <strong className="field-error">{formErrors.tipoPessoa}</strong> : null}
                    </label>
                  </div>
                </div>

                <div className="apuracao-servicos-section-card apuracao-servicos-secondary-card">
                  <div className="apuracao-servicos-quantity-grid">
                  <label className="field-group apuracao-servicos-compact-field" htmlFor="apuracao-servicos-nc-pres">
                    <span>Nao cadeirante<br />presencial</span>
                    <input
                      id="apuracao-servicos-nc-pres"
                      type="number"
                      min="0"
                      step="1"
                      value={naoCadeirantePresencial}
                      onChange={(event) => setNaoCadeirantePresencial(normalizeIntegerInput(event.target.value))}
                      disabled
                      aria-invalid={Boolean(formErrors.naoCadeirantePresencial)}
                    />
                    {formErrors.naoCadeirantePresencial ? <strong className="field-error">{formErrors.naoCadeirantePresencial}</strong> : null}
                  </label>

                  <label className="field-group apuracao-servicos-compact-field" htmlFor="apuracao-servicos-cad">
                    <span>Cadeirante</span>
                    <input
                      id="apuracao-servicos-cad"
                      type="number"
                      min="0"
                      step="1"
                      value={cadeirante}
                      onChange={(event) => setCadeirante(normalizeIntegerInput(event.target.value))}
                      disabled
                      aria-invalid={Boolean(formErrors.cadeirante)}
                    />
                    {formErrors.cadeirante ? <strong className="field-error">{formErrors.cadeirante}</strong> : null}
                  </label>

                  <label className="field-group apuracao-servicos-compact-field" htmlFor="apuracao-servicos-ac-nc">
                    <span>Atend. compl.<br />nao cadeirante</span>
                    <input
                      id="apuracao-servicos-ac-nc"
                      type="number"
                      min="0"
                      step="1"
                      value={atendimentoComplementarNaoCadeirante}
                      onChange={(event) => setAtendimentoComplementarNaoCadeirante(normalizeIntegerInput(event.target.value))}
                      disabled
                      aria-invalid={Boolean(formErrors.atendimentoComplementarNaoCadeirante)}
                    />
                    {formErrors.atendimentoComplementarNaoCadeirante ? <strong className="field-error">{formErrors.atendimentoComplementarNaoCadeirante}</strong> : null}
                  </label>

                  <label className="field-group apuracao-servicos-compact-field" htmlFor="apuracao-servicos-ac-cad">
                    <span>Atend. compl.<br />cadeirante</span>
                    <input
                      id="apuracao-servicos-ac-cad"
                      type="number"
                      min="0"
                      step="1"
                      value={atendimentoComplementarCadeirante}
                      onChange={(event) => setAtendimentoComplementarCadeirante(normalizeIntegerInput(event.target.value))}
                      disabled
                      aria-invalid={Boolean(formErrors.atendimentoComplementarCadeirante)}
                    />
                    {formErrors.atendimentoComplementarCadeirante ? <strong className="field-error">{formErrors.atendimentoComplementarCadeirante}</strong> : null}
                  </label>

                  <label className="field-group apuracao-servicos-compact-field" htmlFor="apuracao-servicos-cont-nc">
                    <span>Continua<br />nao cadeirante</span>
                    <input
                      id="apuracao-servicos-cont-nc"
                      type="number"
                      min="0"
                      step="1"
                      value={continuaNaoCadeirante}
                      onChange={(event) => setContinuaNaoCadeirante(normalizeIntegerInput(event.target.value))}
                      disabled
                      aria-invalid={Boolean(formErrors.continuaNaoCadeirante)}
                    />
                    {formErrors.continuaNaoCadeirante ? <strong className="field-error">{formErrors.continuaNaoCadeirante}</strong> : null}
                  </label>

                  <label className="field-group apuracao-servicos-compact-field" htmlFor="apuracao-servicos-cont-cad">
                    <span>Continua<br />cadeirante</span>
                    <input
                      id="apuracao-servicos-cont-cad"
                      type="number"
                      min="0"
                      step="1"
                      value={continuaCadeirante}
                      onChange={(event) => setContinuaCadeirante(normalizeIntegerInput(event.target.value))}
                      disabled
                      aria-invalid={Boolean(formErrors.continuaCadeirante)}
                    />
                    {formErrors.continuaCadeirante ? <strong className="field-error">{formErrors.continuaCadeirante}</strong> : null}
                  </label>

                  <label className="field-group apuracao-servicos-compact-field" htmlFor="apuracao-servicos-km">
                    <span>Kilometragem</span>
                    <input
                      id="apuracao-servicos-km"
                      type="text"
                      inputMode="decimal"
                      placeholder="0,0000"
                      value={kilometragem}
                      onChange={(event) => setKilometragem(event.target.value)}
                      disabled
                      aria-invalid={Boolean(formErrors.kilometragem)}
                    />
                    {formErrors.kilometragem ? <strong className="field-error">{formErrors.kilometragem}</strong> : null}
                  </label>
                </div>
                </div>

                <p className={`status-message status-${statusTone}`} aria-live="polite">
                  {isLoadingOrdemServicoOptions ? 'Carregando ordens de servico ativas...' : statusMessage}
                </p>

                <div className="button-row dre-button-row management-modal-footer">
                  <button type="button" className="secondary-button" onClick={handleCancelForm}>
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
            <span>{isLoading ? 'Atualizando...' : `${totalItems} item(ns) encontrados`}</span>
          </div>

          <div className="management-grid-wrapper">
            <table className="dre-table">
              <thead>
                <tr>
                  <th>
                    <button type="button" className="dre-sort-button" onClick={() => handleSort('mesAno')}>
                      Mes/Ano <span>{getSortIndicator('mesAno', sortBy, sortDirection)}</span>
                    </button>
                  </th>
                  <th>
                    <button type="button" className="dre-sort-button" onClick={() => handleSort('dreDescricao')}>
                      DRE <span>{getSortIndicator('dreDescricao', sortBy, sortDirection)}</span>
                    </button>
                  </th>
                  <th>
                    Tipo Pessoa
                  </th>
                  <th>
                    <button type="button" className="dre-sort-button" onClick={() => handleSort('revisao')}>
                      Revisao <span>{getSortIndicator('revisao', sortBy, sortDirection)}</span>
                    </button>
                  </th>
                  <th>
                    <button type="button" className="dre-sort-button" onClick={() => handleSort('dataReferencia')}>
                      Data Referencia <span>{getSortIndicator('dataReferencia', sortBy, sortDirection)}</span>
                    </button>
                  </th>
                  <th>
                    <button type="button" className="dre-sort-button" onClick={() => handleSort('ordemServicoCodigo')}>
                      OS <span>{getSortIndicator('ordemServicoCodigo', sortBy, sortDirection)}</span>
                    </button>
                  </th>
                  <th className="dre-actions-column">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={formatApuracaoServicosKey(item)}>
                    <td>{item.mesAno}</td>
                    <td>{formatDreGridLabel(item)}</td>
                    <td>{formatApuracaoTipoPessoaLabel(item.tipoPessoa)}</td>
                    <td>{item.revisao}</td>
                    <td>{formatIsoDateToDisplay(item.dataReferencia)}</td>
                    <td>{formatOrdemServicoGridLabel(item)}</td>
                    <td>
                      <div className="dre-row-actions">
                        <button type="button" className="row-action-button" onClick={() => handleStartView(item)}>
                          Consulta
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!isLoading && items.length === 0 ? (
              <p className="management-empty-state">Nenhum registro de total de servicos encontrado.</p>
            ) : null}
          </div>

          <p className={`status-message status-${statusTone}`} aria-live="polite">
            {isFormVisible ? '' : statusMessage}
          </p>

          <div className="management-pagination">
            <button
              type="button"
              className="secondary-button management-pagination-button management-pagination-button-icon"
              onClick={() => setPage(1)}
              disabled={!canGoToPreviousPage || isLoading}
              title="Primeiro registro"
              aria-label="Primeiro registro"
            >
              |◀
            </button>
            <button
              type="button"
              className="secondary-button management-pagination-button management-pagination-button-icon"
              onClick={() => setPage((currentPage) => currentPage - 1)}
              disabled={!canGoToPreviousPage || isLoading}
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
              disabled={!canGoToNextPage || isLoading}
              title="Proximo registro"
              aria-label="Proximo registro"
            >
              ▶
            </button>
            <button
              type="button"
              className="secondary-button management-pagination-button management-pagination-button-icon"
              onClick={() => setPage(totalPages)}
              disabled={!canGoToNextPage || isLoading}
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