import { useCallback, useDeferredValue, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { listDreItemsPaginated } from './services/dre'
import type { DreItem } from './services/dre'
import { listTipoEscolaItemsPaginated } from './services/tipoEscola'
import type { TipoEscolaItem } from './services/tipoEscola'
import {
  createApuracaoServicosItem,
  deleteApuracaoServicosItem,
  listApuracaoServicosItemsPaginated,
  listApuracaoServicosOrdemServicoOptions,
  updateApuracaoServicosItem,
} from './services/apuracaoServicos'
import type {
  ApuracaoServicosItem,
  ApuracaoServicosKey,
  ApuracaoServicosOrdemServicoOption,
  ApuracaoServicosSaveItem,
  ApuracaoServicosSortField,
} from './services/apuracaoServicos'
import {
  APURACAO_TIPO_PESSOA_OPTIONS,
  formatApuracaoTipoPessoaLabel,
} from './services/apuracaoTipoPessoa'
import type { ApuracaoTipoPessoa } from './services/apuracaoTipoPessoa'

type StatusTone = 'idle' | 'error' | 'success'
type FormMode = 'create' | 'edit' | 'view'

const normalizeMonthYearInput = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 6)

  if (digits.length <= 2) {
    return digits
  }

  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

const isValidMonthYear = (value: string) => /^(0[1-9]|1[0-2])\/\d{4}$/.test(value)

const normalizeIntegerInput = (value: string) => value.replace(/[^\d]/g, '')

const parseNonNegativeInteger = (value: string) => {
  if (!value.trim()) {
    return Number.NaN
  }

  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : Number.NaN
}

const parseFourDecimalInput = (value: string) => {
  const normalizedValue = value.trim()

  if (!normalizedValue) {
    return Number.NaN
  }

  const parsed = /^-?\d+(?:\.\d+)?$/.test(normalizedValue)
    ? Number(normalizedValue)
    : Number(normalizedValue.replace(/\./g, '').replace(',', '.'))

  return Number.isFinite(parsed) ? Number(parsed.toFixed(4)) : Number.NaN
}

const formatAuditDateTime = (value: string) => {
  if (!value) {
    return ''
  }

  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(parsedDate)
}

const formatApuracaoServicosKey = (item: Pick<ApuracaoServicosKey, 'mesAno' | 'dreCodigo' | 'ordemServicoCodigo' | 'revisao' | 'tipoEscolaCodigo' | 'tipoPessoa'>) => {
  return `${item.mesAno}|${item.dreCodigo}|${item.ordemServicoCodigo}|${item.revisao}|${item.tipoEscolaCodigo}|${item.tipoPessoa}`
}

const formatDreOptionLabel = (item: Pick<DreItem, 'codigo' | 'sigla' | 'descricao'>) => {
  return `${item.codigo} - ${item.sigla} - ${item.descricao}`
}

const formatTipoEscolaOptionLabel = (item: Pick<TipoEscolaItem, 'codigo' | 'sigla' | 'descricao'>) => {
  return `${item.codigo} - ${item.sigla} - ${item.descricao}`
}

const formatDreGridLabel = (item: Pick<ApuracaoServicosItem, 'dreCodigo' | 'dreSigla' | 'dreDescricao'>) => {
  return `${item.dreCodigo} - ${item.dreSigla} - ${item.dreDescricao}`
}

const formatTipoEscolaGridLabel = (item: Pick<ApuracaoServicosItem, 'tipoEscolaCodigo' | 'tipoEscolaSigla' | 'tipoEscolaDescricao'>) => {
  return `${item.tipoEscolaCodigo} - ${item.tipoEscolaSigla} - ${item.tipoEscolaDescricao}`
}

const formatOrdemServicoOptionLabel = (item: ApuracaoServicosOrdemServicoOption) => {
  const mainLabel = item.osConcat || [item.termoAdesao, item.numOs, item.revisao].filter(Boolean).join(' / ')
  const suffix = [item.modalidadeDescricao, item.dreDescricao].filter(Boolean).join(' - ')
  return suffix ? `${item.codigo} - ${mainLabel} - ${suffix}` : `${item.codigo} - ${mainLabel}`
}

const formatOrdemServicoGridLabel = (item: Pick<ApuracaoServicosItem, 'ordemServicoCodigo' | 'ordemServicoOsConcat' | 'ordemServicoTermoAdesao' | 'ordemServicoNumOs'>) => {
  const descriptor = item.ordemServicoOsConcat || [item.ordemServicoTermoAdesao, item.ordemServicoNumOs].filter(Boolean).join(' / ')
  return descriptor ? `${item.ordemServicoCodigo} - ${descriptor}` : item.ordemServicoCodigo
}

const getSortIndicator = (sortBy: ApuracaoServicosSortField, currentSortBy: ApuracaoServicosSortField, currentSortDirection: 'asc' | 'desc') => {
  if (sortBy !== currentSortBy) {
    return '↕'
  }

  return currentSortDirection === 'asc' ? '↑' : '↓'
}

const emptyFormErrors = {
  mesAno: '',
  dreCodigo: '',
  ordemServicoCodigo: '',
  revisao: '',
  tipoEscolaCodigo: '',
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
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [sortBy, setSortBy] = useState<ApuracaoServicosSortField>('mesAno')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [statusMessage, setStatusMessage] = useState('')
  const [statusTone, setStatusTone] = useState<StatusTone>('idle')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const [dreOptions, setDreOptions] = useState<DreItem[]>([])
  const [tipoEscolaOptions, setTipoEscolaOptions] = useState<TipoEscolaItem[]>([])
  const [ordemServicoOptions, setOrdemServicoOptions] = useState<ApuracaoServicosOrdemServicoOption[]>([])
  const [isLoadingFormOptions, setIsLoadingFormOptions] = useState(false)
  const [isLoadingOrdemServicoOptions, setIsLoadingOrdemServicoOptions] = useState(false)

  const [isFormVisible, setIsFormVisible] = useState(false)
  const [formMode, setFormMode] = useState<FormMode>('create')
  const [editingKey, setEditingKey] = useState<ApuracaoServicosKey | null>(null)

  const [mesAno, setMesAno] = useState('')
  const [dreCodigo, setDreCodigo] = useState('')
  const [ordemServicoCodigo, setOrdemServicoCodigo] = useState('')
  const [revisao, setRevisao] = useState('0')
  const [tipoEscolaCodigo, setTipoEscolaCodigo] = useState('')
  const [tipoPessoa, setTipoPessoa] = useState<ApuracaoTipoPessoa>('PF')
  const [naoCadeirantePresencial, setNaoCadeirantePresencial] = useState('0')
  const [cadeirante, setCadeirante] = useState('0')
  const [atendimentoComplementarNaoCadeirante, setAtendimentoComplementarNaoCadeirante] = useState('0')
  const [atendimentoComplementarCadeirante, setAtendimentoComplementarCadeirante] = useState('0')
  const [continuaNaoCadeirante, setContinuaNaoCadeirante] = useState('0')
  const [continuaCadeirante, setContinuaCadeirante] = useState('0')
  const [kilometragem, setKilometragem] = useState('0,0000')
  const [dataInclusao, setDataInclusao] = useState('')
  const [dataAlteracao, setDataAlteracao] = useState('')
  const [formErrors, setFormErrors] = useState(emptyFormErrors)

  const canGoToPreviousPage = page > 1
  const canGoToNextPage = page < totalPages
  const isReadOnly = formMode === 'view'

  const resetForm = useCallback(() => {
    setMesAno('')
    setDreCodigo('')
    setOrdemServicoCodigo('')
    setRevisao('0')
    setTipoEscolaCodigo('')
    setTipoPessoa('PF')
    setNaoCadeirantePresencial('0')
    setCadeirante('0')
    setAtendimentoComplementarNaoCadeirante('0')
    setAtendimentoComplementarCadeirante('0')
    setContinuaNaoCadeirante('0')
    setContinuaCadeirante('0')
    setKilometragem('0,0000')
    setDataInclusao('')
    setDataAlteracao('')
    setFormErrors(emptyFormErrors)
    setEditingKey(null)
    setOrdemServicoOptions([])
  }, [tipoPessoa])

  const loadItems = useCallback(async (pageToLoad: number) => {
    setIsLoading(true)
    setStatusTone('idle')
    setStatusMessage('Carregando registros de apuracao de servicos...')

    try {
      const result = await listApuracaoServicosItemsPaginated({
        search: deferredSearch,
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
      setStatusMessage(result.items.length ? '' : 'Nenhum registro encontrado na tabela Apuracao Servicos.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao carregar os registros de apuracao de servicos.'
      setStatusTone('error')
      setStatusMessage(message)
    } finally {
      setIsLoading(false)
    }
  }, [deferredSearch, sortBy, sortDirection])

  const loadStaticOptions = useCallback(async () => {
    setIsLoadingFormOptions(true)

    try {
      const [dreResult, tipoEscolaResult] = await Promise.all([
        listDreItemsPaginated({ page: 1, pageSize: 500, sortBy: 'descricao', sortDirection: 'asc' }),
        listTipoEscolaItemsPaginated({ page: 1, pageSize: 500, sortBy: 'descricao', sortDirection: 'asc' }),
      ])

      setDreOptions(dreResult.items)
      setTipoEscolaOptions(tipoEscolaResult.items)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao carregar as opcoes da apuracao de servicos.'
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
  }, [])

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
    setPage(1)
  }

  const handleSort = (field: ApuracaoServicosSortField) => {
    setPage(1)
    setSortDirection((currentDirection) => (
      sortBy === field ? (currentDirection === 'asc' ? 'desc' : 'asc') : 'asc'
    ))
    setSortBy(field)
  }

  const handleStartInsert = () => {
    resetForm()
    setFormMode('create')
    setIsFormVisible(true)
    setStatusTone('idle')
    setStatusMessage('')
  }

  const openFormWithItem = (item: ApuracaoServicosItem, nextMode: FormMode) => {
    setEditingKey({
      mesAno: item.mesAno,
      dreCodigo: item.dreCodigo,
      ordemServicoCodigo: item.ordemServicoCodigo,
      revisao: item.revisao,
      tipoEscolaCodigo: item.tipoEscolaCodigo,
      tipoPessoa: item.tipoPessoa,
    })
    setMesAno(item.mesAno)
    setDreCodigo(item.dreCodigo)
    setOrdemServicoCodigo(item.ordemServicoCodigo)
    setRevisao(String(item.revisao))
    setTipoEscolaCodigo(item.tipoEscolaCodigo)
    setTipoPessoa(item.tipoPessoa)
    setNaoCadeirantePresencial(String(item.naoCadeirantePresencial))
    setCadeirante(String(item.cadeirante))
    setAtendimentoComplementarNaoCadeirante(String(item.atendimentoComplementarNaoCadeirante))
    setAtendimentoComplementarCadeirante(String(item.atendimentoComplementarCadeirante))
    setContinuaNaoCadeirante(String(item.continuaNaoCadeirante))
    setContinuaCadeirante(String(item.continuaCadeirante))
    setKilometragem(item.kilometragem.replace('.', ','))
    setDataInclusao(item.dataInclusao)
    setDataAlteracao(item.dataAlteracao)
    setFormErrors(emptyFormErrors)
    setFormMode(nextMode)
    setIsFormVisible(true)
    setStatusTone('idle')
    setStatusMessage('')
  }

  const handleStartEdit = (item: ApuracaoServicosItem) => {
    openFormWithItem(item, 'edit')
  }

  const handleStartView = (item: ApuracaoServicosItem) => {
    openFormWithItem(item, 'view')
  }

  const handleCancelForm = () => {
    if (isSaving) {
      return
    }

    setIsFormVisible(false)
    resetForm()
    setStatusTone('idle')
    setStatusMessage('')
  }

  const buildPayload = (): ApuracaoServicosSaveItem | null => {
    const nextErrors = { ...emptyFormErrors }
    const parsedRevisao = parseNonNegativeInteger(revisao)
    const parsedNaoCadeirantePresencial = parseNonNegativeInteger(naoCadeirantePresencial)
    const parsedCadeirante = parseNonNegativeInteger(cadeirante)
    const parsedAtendimentoComplementarNaoCadeirante = parseNonNegativeInteger(atendimentoComplementarNaoCadeirante)
    const parsedAtendimentoComplementarCadeirante = parseNonNegativeInteger(atendimentoComplementarCadeirante)
    const parsedContinuaNaoCadeirante = parseNonNegativeInteger(continuaNaoCadeirante)
    const parsedContinuaCadeirante = parseNonNegativeInteger(continuaCadeirante)
    const parsedKilometragem = parseFourDecimalInput(kilometragem)

    if (!isValidMonthYear(mesAno)) {
      nextErrors.mesAno = 'Informe o mes/ano no formato mm/aaaa.'
    }

    if (!dreCodigo) {
      nextErrors.dreCodigo = 'Selecione a DRE.'
    }

    if (!ordemServicoCodigo) {
      nextErrors.ordemServicoCodigo = 'Selecione a ordem de servico.'
    }

    if (!Number.isInteger(parsedRevisao)) {
      nextErrors.revisao = 'Informe uma revisao inteira maior ou igual a zero.'
    }

    if (!tipoEscolaCodigo) {
      nextErrors.tipoEscolaCodigo = 'Selecione o tipo de escola.'
    }

    if (!APURACAO_TIPO_PESSOA_OPTIONS.some((item) => item.value === tipoPessoa)) {
      nextErrors.tipoPessoa = 'Selecione o tipo pessoa.'
    }

    if (!Number.isInteger(parsedNaoCadeirantePresencial)) {
      nextErrors.naoCadeirantePresencial = 'Informe um valor inteiro maior ou igual a zero.'
    }

    if (!Number.isInteger(parsedCadeirante)) {
      nextErrors.cadeirante = 'Informe um valor inteiro maior ou igual a zero.'
    }

    if (!Number.isInteger(parsedAtendimentoComplementarNaoCadeirante)) {
      nextErrors.atendimentoComplementarNaoCadeirante = 'Informe um valor inteiro maior ou igual a zero.'
    }

    if (!Number.isInteger(parsedAtendimentoComplementarCadeirante)) {
      nextErrors.atendimentoComplementarCadeirante = 'Informe um valor inteiro maior ou igual a zero.'
    }

    if (!Number.isInteger(parsedContinuaNaoCadeirante)) {
      nextErrors.continuaNaoCadeirante = 'Informe um valor inteiro maior ou igual a zero.'
    }

    if (!Number.isInteger(parsedContinuaCadeirante)) {
      nextErrors.continuaCadeirante = 'Informe um valor inteiro maior ou igual a zero.'
    }

    if (!Number.isFinite(parsedKilometragem) || parsedKilometragem < 0) {
      nextErrors.kilometragem = 'Informe a kilometragem com ate 4 casas decimais.'
    }

    setFormErrors(nextErrors)

    if (Object.values(nextErrors).some(Boolean)) {
      return null
    }

    return {
      mesAno,
      dreCodigo,
      ordemServicoCodigo,
      revisao: parsedRevisao,
      tipoEscolaCodigo,
      tipoPessoa,
      naoCadeirantePresencial: parsedNaoCadeirantePresencial,
      cadeirante: parsedCadeirante,
      atendimentoComplementarNaoCadeirante: parsedAtendimentoComplementarNaoCadeirante,
      atendimentoComplementarCadeirante: parsedAtendimentoComplementarCadeirante,
      continuaNaoCadeirante: parsedContinuaNaoCadeirante,
      continuaCadeirante: parsedContinuaCadeirante,
      kilometragem: parsedKilometragem.toFixed(4),
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isReadOnly) {
      return
    }

    const payload = buildPayload()

    if (!payload) {
      setStatusTone('error')
      setStatusMessage('Corrija os campos destacados para continuar.')
      return
    }

    setIsSaving(true)
    setStatusTone('idle')
    setStatusMessage(editingKey ? 'Salvando alteracoes...' : 'Salvando apuracao de servicos...')

    try {
      const savedItem = editingKey
        ? await updateApuracaoServicosItem(editingKey, payload)
        : await createApuracaoServicosItem(payload)

      setStatusTone('success')
      setStatusMessage(editingKey ? 'Apuracao de servicos alterada com sucesso.' : 'Apuracao de servicos cadastrada com sucesso.')
      setIsFormVisible(false)
      resetForm()
      await loadItems(page)
      if (!editingKey && savedItem) {
        setPage(1)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao salvar a apuracao de servicos.'
      setStatusTone('error')
      setStatusMessage(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (item: ApuracaoServicosItem) => {
    const confirmed = window.confirm(`Deseja excluir a apuracao de servicos ${formatApuracaoServicosKey(item)}?`)

    if (!confirmed) {
      return
    }

    setIsDeleting(true)
    setStatusTone('idle')
    setStatusMessage('Excluindo registro...')

    try {
      await deleteApuracaoServicosItem(item)
      setStatusTone('success')
      setStatusMessage('Apuracao de servicos excluida com sucesso.')
      const nextPage = items.length === 1 && page > 1 ? page - 1 : page
      setPage(nextPage)
      await loadItems(nextPage)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao excluir a apuracao de servicos.'
      setStatusTone('error')
      setStatusMessage(message)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <div className="content-copy">
        <p className="content-kicker">Operacional financeiro</p>
        <h2 id="content-title">Apuracao Servicos</h2>
        <p className="content-description">
          Controle a apuracao de servicos por mes/ano, DRE, tipo pessoa, OS ativa, revisao e tipo de escola, com quantitativos inteiros e kilometragem com 4 casas decimais.
        </p>
      </div>

      <div className="management-layout">
        <div className="management-toolbar">
          <button
            type="button"
            className="primary-button dre-insert-button"
            onClick={handleStartInsert}
            disabled={isSaving || isDeleting || isLoadingFormOptions}
          >
            Inserir registro
          </button>

          <form className="management-filter-form" onSubmit={handleFilterSubmit}>
            <input
              className="management-filter-input"
              type="text"
              placeholder="Filtrar por mes/ano, DRE, OS ou tipo escola"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
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
            onClick={(event) => {
              if (event.target === event.currentTarget && !isSaving) {
                handleCancelForm()
              }
            }}
          >
            <div
              className="management-modal-shell"
              role="dialog"
              aria-modal="true"
              aria-labelledby="apuracao-servicos-modal-title"
              onClick={(event) => event.stopPropagation()}
            >
              <form className="management-card management-form dre-form management-modal-form-card" onSubmit={handleSubmit} noValidate>
                <div className="management-modal-header">
                  <div>
                    <p className="management-modal-kicker">Operacional financeiro</p>
                    <h2 id="apuracao-servicos-modal-title">APURACAO SERVICOS</h2>
                  </div>
                  <button
                    type="button"
                    className="secondary-button management-modal-close-button"
                    onClick={handleCancelForm}
                    disabled={isSaving}
                    aria-label="Fechar formulario de apuracao de servicos"
                  >
                    X
                  </button>
                </div>

                <p className="management-modal-subtitle">
                  {formMode === 'view' ? 'Consulta de registro' : editingKey ? 'Alterar registro' : 'Novo registro'}
                </p>

                <label className="field-group" htmlFor="apuracao-servicos-mes-ano">
                  <span>Mes/Ano</span>
                  <input
                    id="apuracao-servicos-mes-ano"
                    type="text"
                    inputMode="numeric"
                    placeholder="mm/aaaa"
                    value={mesAno}
                    onChange={(event) => setMesAno(normalizeMonthYearInput(event.target.value))}
                    disabled={isSaving || isReadOnly}
                    aria-invalid={Boolean(formErrors.mesAno)}
                  />
                  {formErrors.mesAno ? <strong className="field-error">{formErrors.mesAno}</strong> : null}
                </label>

                <label className="field-group" htmlFor="apuracao-servicos-dre">
                  <span>DRE</span>
                  <select
                    id="apuracao-servicos-dre"
                    value={dreCodigo}
                    onChange={(event) => setDreCodigo(event.target.value)}
                    disabled={isSaving || isReadOnly || isLoadingFormOptions}
                  >
                    <option value="">Selecione a DRE</option>
                    {dreOptions.map((item) => (
                      <option key={item.codigo} value={item.codigo}>
                        {formatDreOptionLabel(item)}
                      </option>
                    ))}
                  </select>
                  {formErrors.dreCodigo ? <strong className="field-error">{formErrors.dreCodigo}</strong> : null}
                </label>

                <label className="field-group" htmlFor="apuracao-servicos-os">
                  <span>Ordem de Servico</span>
                  <select
                    id="apuracao-servicos-os"
                    value={ordemServicoCodigo}
                    onChange={(event) => setOrdemServicoCodigo(event.target.value)}
                    disabled={isSaving || isReadOnly || isLoadingOrdemServicoOptions || !isValidMonthYear(mesAno) || !dreCodigo}
                  >
                    <option value="">Selecione a OS ativa</option>
                    {ordemServicoOptions.map((item) => (
                      <option key={item.codigo} value={item.codigo}>
                        {formatOrdemServicoOptionLabel(item)}
                      </option>
                    ))}
                  </select>
                  {formErrors.ordemServicoCodigo ? <strong className="field-error">{formErrors.ordemServicoCodigo}</strong> : null}
                </label>

                <label className="field-group" htmlFor="apuracao-servicos-revisao">
                  <span>Revisao</span>
                  <input
                    id="apuracao-servicos-revisao"
                    type="number"
                    min="0"
                    step="1"
                    value={revisao}
                    onChange={(event) => setRevisao(normalizeIntegerInput(event.target.value))}
                    disabled={isSaving || isReadOnly}
                    aria-invalid={Boolean(formErrors.revisao)}
                  />
                  {formErrors.revisao ? <strong className="field-error">{formErrors.revisao}</strong> : null}
                </label>

                <label className="field-group" htmlFor="apuracao-servicos-tipo-escola">
                  <span>Tipo Escola</span>
                  <select
                    id="apuracao-servicos-tipo-escola"
                    value={tipoEscolaCodigo}
                    onChange={(event) => setTipoEscolaCodigo(event.target.value)}
                    disabled={isSaving || isReadOnly || isLoadingFormOptions}
                  >
                    <option value="">Selecione o tipo de escola</option>
                    {tipoEscolaOptions.map((item) => (
                      <option key={item.codigo} value={item.codigo}>
                        {formatTipoEscolaOptionLabel(item)}
                      </option>
                    ))}
                  </select>
                  {formErrors.tipoEscolaCodigo ? <strong className="field-error">{formErrors.tipoEscolaCodigo}</strong> : null}
                </label>

                <div className="field-group">
                  <span>Tipo Pessoa</span>
                  <div className="radio-group" role="radiogroup" aria-label="Tipo pessoa apuracao servicos">
                    {APURACAO_TIPO_PESSOA_OPTIONS.map((item) => (
                      <label key={item.value} className="radio-option">
                        <input
                          type="radio"
                          name="apuracao-servicos-tipo-pessoa"
                          value={item.value}
                          checked={tipoPessoa === item.value}
                          onChange={(event) => setTipoPessoa(event.target.value as ApuracaoTipoPessoa)}
                          disabled={isSaving || isReadOnly}
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>
                  {formErrors.tipoPessoa ? <strong className="field-error">{formErrors.tipoPessoa}</strong> : null}
                </div>

                <label className="field-group" htmlFor="apuracao-servicos-nc-pres">
                  <span>Nao cadeirante presencial</span>
                  <input
                    id="apuracao-servicos-nc-pres"
                    type="number"
                    min="0"
                    step="1"
                    value={naoCadeirantePresencial}
                    onChange={(event) => setNaoCadeirantePresencial(normalizeIntegerInput(event.target.value))}
                    disabled={isSaving || isReadOnly}
                    aria-invalid={Boolean(formErrors.naoCadeirantePresencial)}
                  />
                  {formErrors.naoCadeirantePresencial ? <strong className="field-error">{formErrors.naoCadeirantePresencial}</strong> : null}
                </label>

                <label className="field-group" htmlFor="apuracao-servicos-cad">
                  <span>Cadeirante</span>
                  <input
                    id="apuracao-servicos-cad"
                    type="number"
                    min="0"
                    step="1"
                    value={cadeirante}
                    onChange={(event) => setCadeirante(normalizeIntegerInput(event.target.value))}
                    disabled={isSaving || isReadOnly}
                    aria-invalid={Boolean(formErrors.cadeirante)}
                  />
                  {formErrors.cadeirante ? <strong className="field-error">{formErrors.cadeirante}</strong> : null}
                </label>

                <label className="field-group" htmlFor="apuracao-servicos-ac-nc">
                  <span>Atend. compl. nao cadeirante</span>
                  <input
                    id="apuracao-servicos-ac-nc"
                    type="number"
                    min="0"
                    step="1"
                    value={atendimentoComplementarNaoCadeirante}
                    onChange={(event) => setAtendimentoComplementarNaoCadeirante(normalizeIntegerInput(event.target.value))}
                    disabled={isSaving || isReadOnly}
                    aria-invalid={Boolean(formErrors.atendimentoComplementarNaoCadeirante)}
                  />
                  {formErrors.atendimentoComplementarNaoCadeirante ? <strong className="field-error">{formErrors.atendimentoComplementarNaoCadeirante}</strong> : null}
                </label>

                <label className="field-group" htmlFor="apuracao-servicos-ac-cad">
                  <span>Atend. compl. cadeirante</span>
                  <input
                    id="apuracao-servicos-ac-cad"
                    type="number"
                    min="0"
                    step="1"
                    value={atendimentoComplementarCadeirante}
                    onChange={(event) => setAtendimentoComplementarCadeirante(normalizeIntegerInput(event.target.value))}
                    disabled={isSaving || isReadOnly}
                    aria-invalid={Boolean(formErrors.atendimentoComplementarCadeirante)}
                  />
                  {formErrors.atendimentoComplementarCadeirante ? <strong className="field-error">{formErrors.atendimentoComplementarCadeirante}</strong> : null}
                </label>

                <label className="field-group" htmlFor="apuracao-servicos-cont-nc">
                  <span>Continua nao cadeirante</span>
                  <input
                    id="apuracao-servicos-cont-nc"
                    type="number"
                    min="0"
                    step="1"
                    value={continuaNaoCadeirante}
                    onChange={(event) => setContinuaNaoCadeirante(normalizeIntegerInput(event.target.value))}
                    disabled={isSaving || isReadOnly}
                    aria-invalid={Boolean(formErrors.continuaNaoCadeirante)}
                  />
                  {formErrors.continuaNaoCadeirante ? <strong className="field-error">{formErrors.continuaNaoCadeirante}</strong> : null}
                </label>

                <label className="field-group" htmlFor="apuracao-servicos-cont-cad">
                  <span>Continua cadeirante</span>
                  <input
                    id="apuracao-servicos-cont-cad"
                    type="number"
                    min="0"
                    step="1"
                    value={continuaCadeirante}
                    onChange={(event) => setContinuaCadeirante(normalizeIntegerInput(event.target.value))}
                    disabled={isSaving || isReadOnly}
                    aria-invalid={Boolean(formErrors.continuaCadeirante)}
                  />
                  {formErrors.continuaCadeirante ? <strong className="field-error">{formErrors.continuaCadeirante}</strong> : null}
                </label>

                <label className="field-group" htmlFor="apuracao-servicos-km">
                  <span>Kilometragem</span>
                  <input
                    id="apuracao-servicos-km"
                    type="text"
                    inputMode="decimal"
                    placeholder="0,0000"
                    value={kilometragem}
                    onChange={(event) => setKilometragem(event.target.value)}
                    disabled={isSaving || isReadOnly}
                    aria-invalid={Boolean(formErrors.kilometragem)}
                  />
                  {formErrors.kilometragem ? <strong className="field-error">{formErrors.kilometragem}</strong> : null}
                </label>

                <label className="field-group" htmlFor="apuracao-servicos-data-inclusao">
                  <span>Data Inclusao</span>
                  <input
                    id="apuracao-servicos-data-inclusao"
                    type="text"
                    value={formatAuditDateTime(dataInclusao)}
                    readOnly
                    disabled
                  />
                </label>

                <label className="field-group" htmlFor="apuracao-servicos-data-alteracao">
                  <span>Data Alteracao</span>
                  <input
                    id="apuracao-servicos-data-alteracao"
                    type="text"
                    value={formatAuditDateTime(dataAlteracao)}
                    readOnly
                    disabled
                  />
                </label>

                <p className={`status-message status-${statusTone}`} aria-live="polite">
                  {isLoadingOrdemServicoOptions ? 'Carregando ordens de servico ativas...' : statusMessage}
                </p>

                <div className="button-row dre-button-row management-modal-footer">
                  {!isReadOnly ? (
                    <button type="submit" className="primary-button" disabled={isSaving}>
                      {isSaving ? 'Salvando...' : editingKey ? 'Salvar alteracao' : 'Salvar Apuracao Servicos'}
                    </button>
                  ) : null}
                  <button type="button" className="secondary-button" onClick={handleCancelForm} disabled={isSaving}>
                    {isReadOnly ? 'Fechar' : 'Cancelar'}
                  </button>
                </div>
              </form>
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
                    <button type="button" className="dre-sort-button" onClick={() => handleSort('ordemServicoCodigo')}>
                      OS <span>{getSortIndicator('ordemServicoCodigo', sortBy, sortDirection)}</span>
                    </button>
                  </th>
                  <th>
                    <button type="button" className="dre-sort-button" onClick={() => handleSort('revisao')}>
                      Revisao <span>{getSortIndicator('revisao', sortBy, sortDirection)}</span>
                    </button>
                  </th>
                  <th>
                    Tipo Pessoa
                  </th>
                  <th>
                    <button type="button" className="dre-sort-button" onClick={() => handleSort('tipoEscolaDescricao')}>
                      Tipo Escola <span>{getSortIndicator('tipoEscolaDescricao', sortBy, sortDirection)}</span>
                    </button>
                  </th>
                  <th>Qtds.</th>
                  <th>Km</th>
                  <th>
                    <button type="button" className="dre-sort-button" onClick={() => handleSort('dataAlteracao')}>
                      Data Alteracao <span>{getSortIndicator('dataAlteracao', sortBy, sortDirection)}</span>
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
                    <td>{formatOrdemServicoGridLabel(item)}</td>
                    <td>{item.revisao}</td>
                    <td>{formatApuracaoTipoPessoaLabel(item.tipoPessoa)}</td>
                    <td>{formatTipoEscolaGridLabel(item)}</td>
                    <td>
                      {item.naoCadeirantePresencial}/{item.cadeirante}/{item.atendimentoComplementarNaoCadeirante}/{item.atendimentoComplementarCadeirante}/{item.continuaNaoCadeirante}/{item.continuaCadeirante}
                    </td>
                    <td>{item.kilometragem}</td>
                    <td>{formatAuditDateTime(item.dataAlteracao || item.dataInclusao)}</td>
                    <td>
                      <div className="dre-row-actions">
                        <button type="button" className="row-action-button" onClick={() => handleStartView(item)}>
                          Consulta
                        </button>
                        <button type="button" className="row-action-button row-action-edit" onClick={() => handleStartEdit(item)}>
                          Alterar
                        </button>
                        <button type="button" className="row-action-button row-action-delete" onClick={() => void handleDelete(item)}>
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!isLoading && items.length === 0 ? (
              <p className="management-empty-state">Nenhum registro de apuracao de servicos encontrado.</p>
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