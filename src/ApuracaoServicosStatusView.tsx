import { useCallback, useDeferredValue, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { listDreItemsPaginated } from './services/dre'
import type { DreItem } from './services/dre'
import {
  listApuracaoFinanceiraItemsPaginated,
  updateApuracaoFinanceiraItem,
} from './services/apuracaoFinanceira'
import type {
  ApuracaoFinanceiraKey,
  ApuracaoFinanceiraItem,
  ApuracaoFinanceiraSortField,
  ApuracaoFinanceiraStatus,
} from './services/apuracaoFinanceira'
import { formatApuracaoTipoPessoaLabel } from './services/apuracaoTipoPessoa'

type StatusTone = 'idle' | 'error' | 'success' | 'warning'

type StatusWorkflowFilter = 'Processado' | 'Em digitacao' | 'Aprovacao SME'

const STATUS_FILTER_OPTIONS: Array<{ value: StatusWorkflowFilter; label: string }> = [
  { value: 'Processado', label: 'Processado' },
  { value: 'Em digitacao', label: 'Digitacao' },
  { value: 'Aprovacao SME', label: 'Aprovacao SME' },
]

const NEXT_STATUS_BY_CURRENT: Partial<Record<StatusWorkflowFilter, ApuracaoFinanceiraStatus>> = {
  Processado: 'Em digitacao',
  'Em digitacao': 'Aprovacao SME',
  'Aprovacao SME': 'Aprovado SME',
}

const STATUS_LABEL_BY_VALUE: Record<StatusWorkflowFilter, string> = {
  Processado: 'Processado',
  'Em digitacao': 'Digitacao',
  'Aprovacao SME': 'Aprovacao SME',
}

const NEXT_STATUS_LABEL_BY_CURRENT: Record<StatusWorkflowFilter, string> = {
  Processado: 'Digitacao',
  'Em digitacao': 'Aprovacao SME',
  'Aprovacao SME': 'Aprovado SME',
}

const getSortIndicator = (
  sortBy: ApuracaoFinanceiraSortField,
  currentSortBy: ApuracaoFinanceiraSortField,
  currentSortDirection: 'asc' | 'desc',
) => {
  if (sortBy !== currentSortBy) {
    return '↕'
  }

  return currentSortDirection === 'asc' ? '↑' : '↓'
}

const formatDreLabel = (item: Pick<ApuracaoFinanceiraItem, 'dreCodigo' | 'dreSigla' | 'dreDescricao'>) => {
  return `${item.dreCodigo} - ${item.dreSigla} - ${item.dreDescricao}`
}

const formatApuracaoFinanceiraKey = (item: Pick<ApuracaoFinanceiraKey, 'mesAno' | 'dreCodigo' | 'revisao' | 'tipoPessoa'>) => {
  return `${item.mesAno}|${item.dreCodigo}|${item.revisao}|${item.tipoPessoa}`
}

export default function ApuracaoServicosStatusView() {
  const [items, setItems] = useState<ApuracaoFinanceiraItem[]>([])
  const [dreOptions, setDreOptions] = useState<DreItem[]>([])
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [dreCodigoFilter, setDreCodigoFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusWorkflowFilter>('Em digitacao')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [sortBy, setSortBy] = useState<ApuracaoFinanceiraSortField>('mesAno')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [statusTone, setStatusTone] = useState<StatusTone>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingDreOptions, setIsLoadingDreOptions] = useState(false)
  const [isSelectingAllFiltered, setIsSelectingAllFiltered] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [selectedItemsByKey, setSelectedItemsByKey] = useState<Record<string, ApuracaoFinanceiraItem>>({})

  const loadDreOptions = useCallback(async () => {
    setIsLoadingDreOptions(true)

    try {
      const result = await listDreItemsPaginated({ page: 1, pageSize: 500, sortBy: 'descricao', sortDirection: 'asc' })
      setDreOptions(result.items)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao carregar as opcoes de DRE.'
      setStatusTone('error')
      setStatusMessage(message)
    } finally {
      setIsLoadingDreOptions(false)
    }
  }, [])

  const loadItems = useCallback(async (pageToLoad: number) => {
    setIsLoading(true)
    setStatusTone('idle')
    setStatusMessage('Carregando registros para mudanca de status...')

    try {
      const result = await listApuracaoFinanceiraItemsPaginated({
        search: deferredSearch,
        dreCodigo: dreCodigoFilter || undefined,
        situacao: statusFilter,
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
      setStatusMessage(result.items.length ? '' : 'Nenhum registro encontrado para o status selecionado.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao carregar os registros para mudanca de status.'
      setStatusTone('error')
      setStatusMessage(message)
    } finally {
      setIsLoading(false)
    }
  }, [deferredSearch, dreCodigoFilter, sortBy, sortDirection, statusFilter])

  useEffect(() => {
    void loadDreOptions()
  }, [loadDreOptions])

  useEffect(() => {
    void loadItems(page)
  }, [loadItems, page])

  useEffect(() => {
    setSelectedItemsByKey({})
  }, [deferredSearch, dreCodigoFilter, statusFilter])

  const handleFilterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPage(1)
  }

  const handleClearFilter = () => {
    setSearch('')
    setDreCodigoFilter('')
    setStatusFilter('Em digitacao')
    setPage(1)
  }

  const handleSort = (field: ApuracaoFinanceiraSortField) => {
    setPage(1)
    setSortDirection((currentDirection) => (
      sortBy === field ? (currentDirection === 'asc' ? 'desc' : 'asc') : 'asc'
    ))
    setSortBy(field)
  }

  const handleToggleItemSelection = (item: ApuracaoFinanceiraItem) => {
    const key = formatApuracaoFinanceiraKey(item)

    setSelectedItemsByKey((currentItems) => {
      if (currentItems[key]) {
        const nextItems = { ...currentItems }
        delete nextItems[key]
        return nextItems
      }

      return {
        ...currentItems,
        [key]: item,
      }
    })
  }

  const handleToggleCurrentPageSelection = () => {
    const currentPageKeys = items.map((item) => formatApuracaoFinanceiraKey(item))
    const areAllCurrentPageItemsSelected = currentPageKeys.length > 0 && currentPageKeys.every((key) => key in selectedItemsByKey)

    setSelectedItemsByKey((currentItems) => {
      const nextItems = { ...currentItems }

      if (areAllCurrentPageItemsSelected) {
        currentPageKeys.forEach((key) => {
          delete nextItems[key]
        })

        return nextItems
      }

      items.forEach((item) => {
        nextItems[formatApuracaoFinanceiraKey(item)] = item
      })

      return nextItems
    })
  }

  const handleSelectAllFiltered = async () => {
    setIsSelectingAllFiltered(true)
    setStatusTone('idle')
    setStatusMessage('Selecionando todos os registros filtrados...')

    try {
      const pageSize = 50
      const firstPageResult = await listApuracaoFinanceiraItemsPaginated({
        search: deferredSearch,
        dreCodigo: dreCodigoFilter || undefined,
        situacao: statusFilter,
        page: 1,
        pageSize,
        sortBy,
        sortDirection,
      })

      const allItems = [...firstPageResult.items]

      for (let currentPage = 2; currentPage <= firstPageResult.totalPages; currentPage += 1) {
        const pageResult = await listApuracaoFinanceiraItemsPaginated({
          search: deferredSearch,
          dreCodigo: dreCodigoFilter || undefined,
          situacao: statusFilter,
          page: currentPage,
          pageSize,
          sortBy,
          sortDirection,
        })

        allItems.push(...pageResult.items)
      }

      setSelectedItemsByKey(Object.fromEntries(allItems.map((item) => [formatApuracaoFinanceiraKey(item), item])))
      setStatusTone('success')
      setStatusMessage(`${allItems.length} registro(s) filtrado(s) selecionado(s).`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao selecionar os registros filtrados.'
      setStatusTone('error')
      setStatusMessage(message)
    } finally {
      setIsSelectingAllFiltered(false)
    }
  }

  const handleClearSelection = () => {
    setSelectedItemsByKey({})
    setStatusTone('idle')
    setStatusMessage('Selecao removida.')
  }

  const handleAdvanceSelectedStatuses = async () => {
    const selectedItems = Object.values(selectedItemsByKey)
    const nextStatus = NEXT_STATUS_BY_CURRENT[statusFilter]
    const nextStatusLabel = NEXT_STATUS_LABEL_BY_CURRENT[statusFilter]
    const currentStatusLabel = STATUS_LABEL_BY_VALUE[statusFilter]

    if (!nextStatus) {
      setStatusTone('warning')
      setStatusMessage('Nao ha proximo status configurado para os registros filtrados.')
      return
    }

    if (selectedItems.length === 0) {
      setStatusTone('warning')
      setStatusMessage('Selecione ao menos um registro para alterar o status.')
      return
    }

    const confirmed = window.confirm(
      `Alterar ${selectedItems.length} registro(s) de ${currentStatusLabel} para ${nextStatusLabel}?`,
    )

    if (!confirmed) {
      return
    }

    setIsUpdating(true)
    setStatusTone('idle')
    setStatusMessage('Atualizando status dos registros selecionados...')

    try {
      const results = await Promise.allSettled(
        selectedItems.map((item) => updateApuracaoFinanceiraItem(
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
            situacao: nextStatus,
          },
        )),
      )

      const fulfilledResults = results.filter((result): result is PromiseFulfilledResult<ApuracaoFinanceiraItem> => result.status === 'fulfilled')

      if (fulfilledResults.length === 0) {
        throw new Error('Falha ao atualizar o status dos registros selecionados.')
      }

      setSelectedItemsByKey({})
      setStatusTone('success')
      setStatusMessage(`${fulfilledResults.length} registro(s) alterado(s) de ${currentStatusLabel} para ${nextStatusLabel}.`)
      await loadItems(items.length === fulfilledResults.length && page > 1 ? page - 1 : page)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao atualizar o status dos registros selecionados.'
      setStatusTone('error')
      setStatusMessage(message)
    } finally {
      setIsUpdating(false)
    }
  }

  const canGoToPreviousPage = page > 1
  const canGoToNextPage = page < totalPages
  const selectedKeys = Object.keys(selectedItemsByKey)
  const currentPageKeys = items.map((item) => formatApuracaoFinanceiraKey(item))
  const areAllCurrentPageItemsSelected = currentPageKeys.length > 0 && currentPageKeys.every((key) => key in selectedItemsByKey)
  const nextStatusLabel = NEXT_STATUS_LABEL_BY_CURRENT[statusFilter] ?? 'Sem proximo status'
  const currentStatusLabel = STATUS_LABEL_BY_VALUE[statusFilter]
  const canAdvanceFilteredStatus = Boolean(NEXT_STATUS_BY_CURRENT[statusFilter])

  return (
    <>
      <div className="content-copy">
        <p className="content-kicker">Operacional financeiro</p>
        <h2 id="content-title">Aprovacao Digitacao</h2>
        <p className="content-description">
          Gerencie a aprovacao da digitacao dos registros existentes de Apuracao Servicos por meio do status da apuracao financeira vinculada.
        </p>
      </div>

      <div className="management-layout">
        <div className="management-toolbar">
          <form className="management-filter-form" onSubmit={handleFilterSubmit}>
            <input
              className="management-filter-input"
              type="text"
              placeholder="Filtrar por mes/ano, DRE ou tipo pessoa"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              disabled={isLoading || isUpdating || isLoadingDreOptions}
            />
            <select
              value={dreCodigoFilter}
              onChange={(event) => {
                setDreCodigoFilter(event.target.value)
                setPage(1)
              }}
              disabled={isLoading || isUpdating || isLoadingDreOptions}
            >
              <option value="">Todas as DREs</option>
              {dreOptions.map((item) => (
                <option key={item.codigo} value={item.codigo}>
                  {item.codigo} - {item.sigla} - {item.descricao}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as StatusWorkflowFilter)
                setPage(1)
              }}
              disabled={isLoading || isUpdating || isLoadingDreOptions}
            >
              {STATUS_FILTER_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <button type="submit" className="secondary-button management-filter-button" disabled={isLoading || isUpdating || isLoadingDreOptions}>
              Filtrar
            </button>
            <button type="button" className="secondary-button management-filter-button" onClick={handleClearFilter} disabled={isLoading || isUpdating || isLoadingDreOptions}>
              Limpar
            </button>
          </form>
        </div>

        <div className="management-card management-form">
          <div className="apuracao-financeira-inline-fields">
            <label className="field-group">
              <span>De</span>
              <input type="text" value={currentStatusLabel} readOnly disabled />
            </label>
            <label className="field-group">
              <span>Para</span>
              <input type="text" value={nextStatusLabel} readOnly disabled />
            </label>
          </div>

          <div className="button-row dre-button-row">
            <button
              type="button"
              className="secondary-button"
              onClick={handleSelectAllFiltered}
              disabled={isLoading || isLoadingDreOptions || isSelectingAllFiltered || isUpdating || totalItems === 0}
            >
              {isSelectingAllFiltered ? 'Selecionando...' : 'Selecionar todos os filtrados'}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={handleClearSelection}
              disabled={isLoading || isLoadingDreOptions || isSelectingAllFiltered || isUpdating || selectedKeys.length === 0}
            >
              Deselecionar todos
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={handleAdvanceSelectedStatuses}
              disabled={isLoading || isLoadingDreOptions || isSelectingAllFiltered || isUpdating || selectedKeys.length === 0 || !canAdvanceFilteredStatus}
            >
              {isUpdating ? 'Alterando...' : 'Alterar status selecionados'}
            </button>
          </div>

          <p className="status-message status-idle" aria-live="polite">
            {selectedKeys.length === 1 ? '1 registro selecionado.' : `${selectedKeys.length} registro(s) selecionado(s).`}
          </p>
        </div>

        <div className="management-card management-grid-card dre-list-card">
          <div className="management-grid-header">
            <h2>Registros cadastrados</h2>
            <span>{isLoading ? 'Atualizando...' : `${totalItems} item(ns) encontrados`}</span>
          </div>

          <div className="management-grid-wrapper">
            <table className="dre-table">
              <thead>
                <tr>
                  <th className="dre-actions-column">
                    <input
                      type="checkbox"
                      aria-label="Selecionar registros da pagina"
                      checked={areAllCurrentPageItemsSelected}
                      onChange={handleToggleCurrentPageSelection}
                      disabled={items.length === 0 || isLoading || isSelectingAllFiltered || isUpdating}
                    />
                  </th>
                  <th>
                    <button type="button" className="dre-sort-button" onClick={() => handleSort('mesAno')}>
                      Mes/Ano <span>{getSortIndicator('mesAno', sortBy, sortDirection)}</span>
                    </button>
                  </th>
                  <th>
                    <button type="button" className="dre-sort-button" onClick={() => handleSort('revisao')}>
                      Revisao <span>{getSortIndicator('revisao', sortBy, sortDirection)}</span>
                    </button>
                  </th>
                  <th>
                    <button type="button" className="dre-sort-button" onClick={() => handleSort('dreDescricao')}>
                      DRE <span>{getSortIndicator('dreDescricao', sortBy, sortDirection)}</span>
                    </button>
                  </th>
                  <th>Tipo Pessoa</th>
                  <th>
                    <button type="button" className="dre-sort-button" onClick={() => handleSort('situacao')}>
                      Status <span>{getSortIndicator('situacao', sortBy, sortDirection)}</span>
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const workflowStatus = item.situacao as StatusWorkflowFilter
                  const itemKey = formatApuracaoFinanceiraKey(item)

                  return (
                    <tr key={itemKey}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Selecionar registro ${item.mesAno} ${formatDreLabel(item)} ${item.revisao} ${formatApuracaoTipoPessoaLabel(item.tipoPessoa)}`}
                          checked={itemKey in selectedItemsByKey}
                          onChange={() => handleToggleItemSelection(item)}
                          disabled={isLoading || isSelectingAllFiltered || isUpdating || !canAdvanceFilteredStatus}
                        />
                      </td>
                      <td>{item.mesAno}</td>
                      <td>{item.revisao}</td>
                      <td>{formatDreLabel(item)}</td>
                      <td>{formatApuracaoTipoPessoaLabel(item.tipoPessoa)}</td>
                      <td>{STATUS_LABEL_BY_VALUE[workflowStatus] ?? item.situacao}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {!isLoading && items.length === 0 ? (
              <p className="management-empty-state">Nenhum registro de mudanca de status encontrado.</p>
            ) : null}
          </div>

          <p className={`status-message status-${statusTone}`} aria-live="polite">
            {statusMessage}
          </p>

          <div className="management-pagination">
            <button
              type="button"
              className="secondary-button management-pagination-button management-pagination-button-icon"
              onClick={() => setPage(1)}
              disabled={!canGoToPreviousPage || isLoading || isUpdating}
              title="Primeiro registro"
              aria-label="Primeiro registro"
            >
              |◀
            </button>
            <button
              type="button"
              className="secondary-button management-pagination-button management-pagination-button-icon"
              onClick={() => setPage((currentPage) => currentPage - 1)}
              disabled={!canGoToPreviousPage || isLoading || isUpdating}
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
              disabled={!canGoToNextPage || isLoading || isUpdating}
              title="Proximo registro"
              aria-label="Proximo registro"
            >
              ▶
            </button>
            <button
              type="button"
              className="secondary-button management-pagination-button management-pagination-button-icon"
              onClick={() => setPage(totalPages)}
              disabled={!canGoToNextPage || isLoading || isUpdating}
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
