import { useCallback, useDeferredValue, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { listResumoFinanceiroItemsPaginated } from './services/resumoFinanceiro'
import type { ResumoFinanceiroItem, ResumoFinanceiroSortField } from './services/resumoFinanceiro'
import { formatApuracaoTipoPessoaLabel } from './services/apuracaoTipoPessoa'

type StatusTone = 'idle' | 'error' | 'success' | 'warning'

const pageSize = 20

const formatDreLabel = (item: Pick<ResumoFinanceiroItem, 'dreCodigo' | 'dreSigla' | 'dreDescricao'>) => {
  return `${item.dreCodigo} - ${item.dreSigla} - ${item.dreDescricao}`
}

const formatIntegerValue = (value: number) => value.toLocaleString('pt-BR')

const formatFourDecimalValue = (value: string) => {
  const numericValue = Number.parseFloat(value.replace(',', '.'))

  if (!Number.isFinite(numericValue)) {
    return '0,0000'
  }

  return numericValue.toLocaleString('pt-BR', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  })
}

const getSortIndicator = (field: ResumoFinanceiroSortField, currentField: ResumoFinanceiroSortField, currentDirection: 'asc' | 'desc') => {
  if (field !== currentField) {
    return '↕'
  }

  return currentDirection === 'asc' ? '↑' : '↓'
}

export default function ResumoFinanceiroView() {
  const [items, setItems] = useState<ResumoFinanceiroItem[]>([])
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [page, setPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [sortBy, setSortBy] = useState<ResumoFinanceiroSortField>('mesAno')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [statusMessage, setStatusMessage] = useState('')
  const [statusTone, setStatusTone] = useState<StatusTone>('idle')
  const [isLoading, setIsLoading] = useState(false)
  const [isFormVisible, setIsFormVisible] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ResumoFinanceiroItem | null>(null)

  const canGoToPreviousPage = page > 1
  const canGoToNextPage = page < totalPages

  const loadItems = useCallback(async () => {
    setIsLoading(true)
    setStatusTone('idle')
    setStatusMessage('Carregando resumo financeiro...')

    try {
      const result = await listResumoFinanceiroItemsPaginated({
        search: deferredSearch,
        page,
        pageSize,
        sortBy,
        sortDirection,
      })

      setItems(result.items)
      setTotalItems(result.total)
      setTotalPages(result.totalPages)
      setStatusTone('idle')
      setStatusMessage(result.total ? '' : 'Nenhum resumo financeiro encontrado.')
    } catch (error) {
      setItems([])
      setTotalItems(0)
      setTotalPages(1)
      setStatusTone('error')
      setStatusMessage(error instanceof Error ? error.message : 'Falha ao carregar o resumo financeiro.')
    } finally {
      setIsLoading(false)
    }
  }, [deferredSearch, page, sortBy, sortDirection])

  useEffect(() => {
    void loadItems()
  }, [loadItems])

  useEffect(() => {
    if (!isFormVisible) {
      return
    }

    document.body.classList.add('management-modal-open')

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFormVisible(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.classList.remove('management-modal-open')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isFormVisible])

  const handleFilterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPage(1)
    void loadItems()
  }

  const handleClearFilter = () => {
    setSearch('')
    setPage(1)
  }

  const handleSort = (field: ResumoFinanceiroSortField) => {
    setPage(1)
    setSortDirection((currentDirection) => (sortBy === field ? (currentDirection === 'asc' ? 'desc' : 'asc') : field === 'mesAno' ? 'desc' : 'asc'))
    setSortBy(field)
  }

  const handleStartView = (item: ResumoFinanceiroItem) => {
    setSelectedItem(item)
    setIsFormVisible(true)
  }

  const handleCloseForm = () => {
    setIsFormVisible(false)
    setSelectedItem(null)
  }

  return (
    <>
      <div className="content-copy">
        <p className="content-kicker">Operacional financeiro</p>
        <h2 id="content-title">Resumo Financeiro</h2>
        <p className="content-description">
          Consulte os valores aglutinados por Mes/Ano, DRE e Tipo Pessoa, combinando a situacao da Apuracao Financeira com os totais correntes de Total Servicos refletidos pelo Apontamento Servicos.
        </p>
      </div>

      <div className="management-layout">
        <div className="management-toolbar">
          <button type="button" className="secondary-button dre-insert-button" onClick={() => void loadItems()} disabled={isLoading}>
            {isLoading ? 'Atualizando...' : 'Atualizar'}
          </button>

          <form className="management-filter-form" onSubmit={handleFilterSubmit}>
            <input
              className="management-filter-input"
              type="text"
              placeholder="Filtrar por mes/ano, DRE, tipo pessoa ou situacao"
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

        {isFormVisible && selectedItem ? (
          <div
            className="management-modal-overlay"
            role="presentation"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                handleCloseForm()
              }
            }}
          >
            <div
              className="management-modal-shell"
              role="dialog"
              aria-modal="true"
              aria-labelledby="resumo-financeiro-modal-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="management-card management-form dre-form management-modal-form-card">
                <div className="management-modal-header">
                  <div>
                    <p className="management-modal-kicker">Operacional financeiro - RESUFIN025</p>
                    <h2 id="resumo-financeiro-modal-title">RESUMO FINANCEIRO</h2>
                  </div>
                  <button
                    type="button"
                    className="secondary-button management-modal-close-button"
                    onClick={handleCloseForm}
                    aria-label="Fechar formulario de resumo financeiro"
                  >
                    X
                  </button>
                </div>

                <p className="management-modal-subtitle">
                  Consulta dos valores aglutinados originados em Total Servicos e mantidos atualizados a partir do Apontamento Servicos.
                </p>

                <label className="field-group">
                  <span>Mes/Ano</span>
                  <input type="text" value={selectedItem.mesAno} readOnly disabled />
                </label>

                <label className="field-group">
                  <span>DRE</span>
                  <input type="text" value={formatDreLabel(selectedItem)} readOnly disabled />
                </label>

                <label className="field-group">
                  <span>Tipo Pessoa</span>
                  <input type="text" value={formatApuracaoTipoPessoaLabel(selectedItem.tipoPessoa)} readOnly disabled />
                </label>

                <label className="field-group">
                  <span>Situacoes em Apuracao Financeira</span>
                  <input type="text" value={selectedItem.situacoesApuracaoFinanceira || 'Sem apuracao financeira'} readOnly disabled />
                </label>

                <div className="management-grid-wrapper">
                  <table className="dre-table">
                    <tbody>
                      <tr>
                        <th>Total revisoes</th>
                        <td>{formatIntegerValue(selectedItem.totalRevisoes)}</td>
                        <th>Maior revisao</th>
                        <td>{formatIntegerValue(selectedItem.maiorRevisao)}</td>
                      </tr>
                      <tr>
                        <th>Registros filhos</th>
                        <td>{formatIntegerValue(selectedItem.totalRegistros)}</td>
                        <th>Ordens de servico</th>
                        <td>{formatIntegerValue(selectedItem.totalOrdensServico)}</td>
                      </tr>
                      <tr>
                        <th>Tipos escola</th>
                        <td>{formatIntegerValue(selectedItem.totalTiposEscola)}</td>
                        <th>Datas referencia</th>
                        <td>{formatIntegerValue(selectedItem.totalDatasReferencia)}</td>
                      </tr>
                      <tr>
                        <th>Ultima alteracao origem</th>
                        <td colSpan={3}>{selectedItem.dataAlteracaoOrigem || 'Nao informada'}</td>
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
                        <td>{formatIntegerValue(selectedItem.naoCadeirantePresencial)}</td>
                        <td>{formatIntegerValue(selectedItem.cadeirante)}</td>
                        <td>{formatIntegerValue(selectedItem.atendimentoComplementarNaoCadeirante)}</td>
                        <td>{formatIntegerValue(selectedItem.atendimentoComplementarCadeirante)}</td>
                        <td>{formatIntegerValue(selectedItem.continuaNaoCadeirante)}</td>
                        <td>{formatIntegerValue(selectedItem.continuaCadeirante)}</td>
                        <td>{formatFourDecimalValue(selectedItem.kilometragem)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="button-row dre-button-row management-modal-footer">
                  <button type="button" className="secondary-button" onClick={handleCloseForm}>
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
                    <button type="button" className="dre-sort-button" onClick={() => handleSort('tipoPessoa')}>
                      Tipo Pessoa <span>{getSortIndicator('tipoPessoa', sortBy, sortDirection)}</span>
                    </button>
                  </th>
                  <th>
                    <button type="button" className="dre-sort-button" onClick={() => handleSort('totalRevisoes')}>
                      Revisoes <span>{getSortIndicator('totalRevisoes', sortBy, sortDirection)}</span>
                    </button>
                  </th>
                  <th>Situacoes</th>
                  <th>
                    <button type="button" className="dre-sort-button" onClick={() => handleSort('totalRegistros')}>
                      Registros <span>{getSortIndicator('totalRegistros', sortBy, sortDirection)}</span>
                    </button>
                  </th>
                  <th className="dre-actions-column">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={`${item.mesAno}|${item.dreCodigo}|${item.tipoPessoa}`}>
                    <td>{item.mesAno}</td>
                    <td>{formatDreLabel(item)}</td>
                    <td>{formatApuracaoTipoPessoaLabel(item.tipoPessoa)}</td>
                    <td>{formatIntegerValue(item.totalRevisoes)}</td>
                    <td>{item.situacoesApuracaoFinanceira || 'Sem apuracao financeira'}</td>
                    <td>{formatIntegerValue(item.totalRegistros)}</td>
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
              <p className="management-empty-state">Nenhum resumo financeiro encontrado.</p>
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
            <span className="management-pagination-info">
              Pagina {page} de {totalPages}
            </span>
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