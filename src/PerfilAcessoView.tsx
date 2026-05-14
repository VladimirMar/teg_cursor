import { useCallback, useDeferredValue, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  deletePerfilAcessoItem,
  generatePerfilAcessoAll,
  getPerfilAcessoMatrix,
  listPerfilAcessoItemsPaginated,
  listPerfilAcessoPaginaOptions,
  listPerfilAcessoPerfilOptions,
  savePerfilAcessoMatrix,
} from './services/perfilAcesso'
import type {
  PerfilAcessoItem,
  PerfilAcessoMatrixSaveItem,
  PerfilAcessoPaginaOption,
  PerfilAcessoPerfilOption,
  PerfilAcessoPermissao,
} from './services/perfilAcesso'

type PerfilAcessoSortField = 'codigo' | 'perfilDescricao' | 'acessoPaginaDescricao' | 'permissao'
type FormMode = 'create' | 'edit'
type StatusTone = 'idle' | 'error' | 'success'
type PerfilAcessoMatrixSelection = PerfilAcessoPermissao | ''

const PAGE_SIZE = 20
const PERMISSAO_OPTIONS: PerfilAcessoPermissao[] = ['todos', 'consulta', 'alteracao', 'exclusao', 'execucao']

const getSortIndicator = (
  sortBy: PerfilAcessoSortField,
  currentSortBy: PerfilAcessoSortField,
  currentSortDirection: 'asc' | 'desc',
) => {
  if (sortBy !== currentSortBy) {
    return '↕'
  }

  return currentSortDirection === 'asc' ? '↑' : '↓'
}

const getPerfilLabel = (item: PerfilAcessoPerfilOption) => `${item.codigo} - ${item.descricao}`
const getAcessoPaginaLabel = (item: PerfilAcessoPaginaOption) => [item.sigla, item.descricao].filter(Boolean).join(' - ')

export default function PerfilAcessoView() {
  const [items, setItems] = useState<PerfilAcessoItem[]>([])
  const [perfilOptions, setPerfilOptions] = useState<PerfilAcessoPerfilOption[]>([])
  const [acessoPaginaOptions, setAcessoPaginaOptions] = useState<PerfilAcessoPaginaOption[]>([])
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [sortBy, setSortBy] = useState<PerfilAcessoSortField>('codigo')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [perfilCodigo, setPerfilCodigo] = useState('')
  const [selectedPermissionsByPage, setSelectedPermissionsByPage] = useState<Record<string, PerfilAcessoMatrixSelection>>({})
  const [editingPerfilCodigo, setEditingPerfilCodigo] = useState<string | null>(null)
  const [formMode, setFormMode] = useState<FormMode>('create')
  const [isFormVisible, setIsFormVisible] = useState(false)
  const [statusTone, setStatusTone] = useState<StatusTone>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const [perfilCodigoError, setPerfilCodigoError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingOptions, setIsLoadingOptions] = useState(false)
  const [isLoadingMatrix, setIsLoadingMatrix] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeletingCodigo, setIsDeletingCodigo] = useState<string | null>(null)

  const resetForm = useCallback(() => {
    setPerfilCodigo('')
    setSelectedPermissionsByPage({})
    setEditingPerfilCodigo(null)
    setFormMode('create')
    setPerfilCodigoError('')
  }, [])

  useEffect(() => {
    if (!isFormVisible) {
      document.body.classList.remove('management-modal-open')
      return
    }

    document.body.classList.add('management-modal-open')

    return () => {
      document.body.classList.remove('management-modal-open')
    }
  }, [isFormVisible])

  const loadOptions = useCallback(async () => {
    setIsLoadingOptions(true)

    try {
      const [nextPerfilOptions, nextAcessoPaginaOptions] = await Promise.all([
        listPerfilAcessoPerfilOptions(),
        listPerfilAcessoPaginaOptions(),
      ])

      setPerfilOptions(nextPerfilOptions)
      setAcessoPaginaOptions(nextAcessoPaginaOptions)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao carregar as opcoes de PerfilAcesso.'
      setStatusTone('error')
      setStatusMessage(message)
    } finally {
      setIsLoadingOptions(false)
    }
  }, [])

  const loadItems = useCallback(async (pageToLoad: number) => {
    setIsLoading(true)
    setStatusTone('idle')
    setStatusMessage('Carregando PerfilAcesso...')

    try {
      const result = await listPerfilAcessoItemsPaginated({
        search: deferredSearch,
        page: pageToLoad,
        pageSize: PAGE_SIZE,
        sortBy,
        sortDirection,
      })

      setItems(result.items)
      setPage(result.page)
      setTotalPages(result.totalPages)
      setTotalItems(result.total)
      setSortBy(result.sortBy)
      setSortDirection(result.sortDirection)
      setStatusMessage(result.items.length ? '' : 'Nenhum PerfilAcesso encontrado.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao carregar PerfilAcesso.'
      setItems([])
      setTotalItems(0)
      setTotalPages(1)
      setStatusTone('error')
      setStatusMessage(message)
    } finally {
      setIsLoading(false)
    }
  }, [deferredSearch, sortBy, sortDirection])

  useEffect(() => {
    void loadOptions()
  }, [loadOptions])

  useEffect(() => {
    void loadItems(page)
  }, [loadItems, page])

  useEffect(() => {
    setPage(1)
  }, [deferredSearch, sortBy, sortDirection])

  const loadPerfilMatrix = useCallback(async (nextPerfilCodigo: string) => {
    if (!nextPerfilCodigo) {
      setSelectedPermissionsByPage({})
      return
    }

    setIsLoadingMatrix(true)

    try {
      const result = await getPerfilAcessoMatrix(nextPerfilCodigo)
      const nextSelections = result.items.reduce<Record<string, PerfilAcessoMatrixSelection>>((accumulator, item) => {
        accumulator[item.acessoPaginaCodigo] = item.permissao
        return accumulator
      }, {})

      setSelectedPermissionsByPage(nextSelections)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao carregar as permissoes do perfil.'
      setStatusTone('error')
      setStatusMessage(message)
    } finally {
      setIsLoadingMatrix(false)
    }
  }, [])

  const handleStartInsert = () => {
    if (!perfilOptions.length || !acessoPaginaOptions.length) {
      setStatusTone('error')
      setStatusMessage('Cadastre ao menos um Perfil e um Acesso Pagina antes de criar PerfilAcesso.')
      return
    }

    resetForm()
    setIsFormVisible(true)
    setStatusTone('idle')
    setStatusMessage('')
  }

  const handleGenerateAll = async () => {
    if (!window.confirm('Gerar todos os registros faltantes de Perfil x Acesso Pagina com permissao todos?')) {
      return
    }

    setIsSubmitting(true)
    setStatusTone('idle')
    setStatusMessage('Gerando registros de PerfilAcesso...')

    try {
      const result = await generatePerfilAcessoAll()
      setStatusTone('success')
      setStatusMessage(`${result.message} Perfis: ${result.totalPerfis}. Acessos: ${result.totalAcessos}.`) 
      await loadItems(1)

      if (perfilCodigo) {
        await loadPerfilMatrix(perfilCodigo)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao gerar registros de PerfilAcesso.'
      setStatusTone('error')
      setStatusMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelForm = () => {
    resetForm()
    setIsFormVisible(false)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setPerfilCodigoError('')

    if (!perfilCodigo) {
      setPerfilCodigoError('Selecione o perfil.')
      return
    }

    const itemsToSave: PerfilAcessoMatrixSaveItem[] = Object.entries(selectedPermissionsByPage)
      .filter((entry): entry is [string, PerfilAcessoPermissao] => PERMISSAO_OPTIONS.includes(entry[1] as PerfilAcessoPermissao))
      .map(([acessoPaginaCodigo, permissao]) => ({ acessoPaginaCodigo, permissao }))

    setIsSubmitting(true)
    setStatusTone('idle')
    setStatusMessage(editingPerfilCodigo ? 'Salvando alteracoes do perfil...' : 'Salvando PerfilAcesso...')

    try {
      await savePerfilAcessoMatrix(perfilCodigo, itemsToSave)

      resetForm()
      setIsFormVisible(false)
      setStatusTone('success')
      setStatusMessage(`Permissoes do perfil ${perfilCodigo} salvas com sucesso.`)
      setPage(1)
      await loadItems(1)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao salvar PerfilAcesso.'
      setStatusTone('error')
      setStatusMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (item: PerfilAcessoItem) => {
    setPerfilCodigo(item.perfilCodigo)
    setEditingPerfilCodigo(item.perfilCodigo)
    setFormMode('edit')
    setIsFormVisible(true)
    setPerfilCodigoError('')
    setStatusTone('idle')
    setStatusMessage(`Alterando permissoes do perfil ${item.perfilCodigo}.`)
    void loadPerfilMatrix(item.perfilCodigo)
  }

  const handleDelete = async (item: PerfilAcessoItem) => {
    if (!window.confirm(`Excluir o PerfilAcesso ${item.codigo} - ${item.perfilDescricao} / ${item.acessoPaginaDescricao}?`)) {
      return
    }

    setIsDeletingCodigo(item.codigo)
    setStatusTone('idle')
    setStatusMessage(`Excluindo PerfilAcesso ${item.codigo}...`)

    try {
      await deletePerfilAcessoItem(item.codigo)

      setStatusTone('success')
      setStatusMessage(`PerfilAcesso ${item.codigo} excluido com sucesso.`)
      const nextPage = items.length === 1 && page > 1 ? page - 1 : page
      setPage(nextPage)
      await loadItems(nextPage)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao excluir PerfilAcesso.'
      setStatusTone('error')
      setStatusMessage(message)
    } finally {
      setIsDeletingCodigo(null)
    }
  }

  const handleSort = (field: PerfilAcessoSortField) => {
    setSortBy(field)
    setSortDirection((currentDirection) => {
      if (sortBy !== field) {
        return 'asc'
      }

      return currentDirection === 'asc' ? 'desc' : 'asc'
    })
  }

  const handlePerfilSelectionChange = async (nextPerfilCodigo: string) => {
    setPerfilCodigo(nextPerfilCodigo)
    setEditingPerfilCodigo(nextPerfilCodigo || null)
    setPerfilCodigoError('')
    await loadPerfilMatrix(nextPerfilCodigo)
  }

  const handlePermissionSelection = (acessoPaginaCodigo: string, nextPermissao: PerfilAcessoPermissao) => {
    setSelectedPermissionsByPage((current) => ({
      ...current,
      [acessoPaginaCodigo]: nextPermissao,
    }))
  }

  const handlePermissionToggleOff = (acessoPaginaCodigo: string) => {
    setSelectedPermissionsByPage((current) => ({
      ...current,
      [acessoPaginaCodigo]: '',
    }))
  }

  return (
    <div className="management-layout">
      <div className="management-toolbar">
        <button
          type="button"
          className="primary-button dre-insert-button"
          onClick={handleStartInsert}
          disabled={isSubmitting || Boolean(isDeletingCodigo) || isLoadingOptions}
        >
          Inserir registro
        </button>
        <button
          type="button"
          className="secondary-button management-filter-button"
          onClick={() => void handleGenerateAll()}
          disabled={isSubmitting || isLoadingOptions}
        >
          Gerar registros
        </button>

        <form
          className="management-filter-form"
          onSubmit={(event) => {
            event.preventDefault()
            setPage(1)
            void loadItems(1)
          }}
        >
          <input
            className="management-filter-input"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filtrar por perfil, acesso pagina ou permissao"
          />
          <button type="submit" className="secondary-button management-filter-button">Filtrar</button>
          <button
            type="button"
            className="secondary-button management-filter-button"
            onClick={() => {
              setSearch('')
              setPage(1)
            }}
          >
            Limpar
          </button>
        </form>
      </div>

      {isFormVisible ? (
        <div
          className="management-modal-overlay"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget && !isSubmitting) {
              handleCancelForm()
            }
          }}
        >
          <div
            className="management-modal-shell"
            role="dialog"
            aria-modal="true"
            aria-labelledby="perfil-acesso-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <form className="management-card management-form dre-form management-modal-form-card" onSubmit={handleSubmit} noValidate>
              <div className="management-modal-header">
                <div>
                  <p className="management-modal-kicker">Cadastro administrativo - PERFACS023</p>
                  <h2 id="perfil-acesso-modal-title">PerfilAcesso</h2>
                </div>
                <button
                  type="button"
                  className="secondary-button management-modal-close-button"
                  onClick={handleCancelForm}
                  disabled={isSubmitting}
                  aria-label="Fechar formulario de PerfilAcesso"
                >
                  X
                </button>
              </div>

              <p className="management-modal-subtitle">
                {formMode === 'edit' ? 'Alterar permissoes do perfil' : 'Novo perfil com permissoes'}
              </p>

              <label className="field-group" htmlFor="perfil-acesso-perfil">
                <span>Perfil</span>
                <select
                  id="perfil-acesso-perfil"
                  value={perfilCodigo}
                  onChange={(event) => {
                    void handlePerfilSelectionChange(event.target.value)
                  }}
                  aria-invalid={perfilCodigoError ? 'true' : 'false'}
                  disabled={isSubmitting || isLoadingOptions || isLoadingMatrix}
                >
                  <option value="">Selecione</option>
                  {perfilOptions.map((item) => (
                    <option key={item.codigo} value={item.codigo}>{getPerfilLabel(item)}</option>
                  ))}
                </select>
                {perfilCodigoError ? <strong className="field-error">{perfilCodigoError}</strong> : null}
              </label>

              <div className="perfil-acesso-matrix-card">
                <div className="perfil-acesso-matrix-header">
                  <strong>Permissoes por acesso pagina</strong>
                  <span>
                    {isLoadingMatrix
                      ? 'Carregando permissoes...'
                      : perfilCodigo
                        ? 'Clique novamente no radio marcado para remover a permissao da linha.'
                        : 'Selecione um perfil para liberar a grade de permissoes.'}
                  </span>
                </div>

                <div className="management-grid-wrapper perfil-acesso-matrix-wrapper">
                  <table className="dre-table perfil-acesso-matrix-table">
                    <thead>
                      <tr>
                        <th>Acesso Pagina</th>
                        {PERMISSAO_OPTIONS.map((item) => (
                          <th key={item} className="perfil-acesso-permission-column">{item}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {acessoPaginaOptions.map((item) => {
                        const selectedPermissao = selectedPermissionsByPage[item.codigo] ?? ''

                        return (
                          <tr key={item.codigo}>
                            <td>
                              <div className="perfil-acesso-page-cell">
                                <strong>{getAcessoPaginaLabel(item)}</strong>
                                <span>{`Cod. ${item.codigo} | ${item.funcao}`}</span>
                              </div>
                            </td>
                            {PERMISSAO_OPTIONS.map((option) => {
                              const isChecked = selectedPermissao === option

                              return (
                                <td key={option} className="perfil-acesso-permission-cell">
                                  <label className={`perfil-acesso-permission-radio ${isChecked ? 'perfil-acesso-permission-radio-selected' : ''}`}>
                                    <input
                                      type="radio"
                                      name={`perfil-acesso-${item.codigo}`}
                                      checked={isChecked}
                                      onClick={(event) => {
                                        if (isChecked) {
                                          event.preventDefault()
                                          handlePermissionToggleOff(item.codigo)
                                        }
                                      }}
                                      onChange={() => handlePermissionSelection(item.codigo, option)}
                                      disabled={!perfilCodigo || isSubmitting || isLoadingOptions || isLoadingMatrix}
                                    />
                                  </label>
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <p className={`status-message status-${statusTone}`} aria-live="polite">
                {statusMessage}
              </p>

              <div className="button-row dre-button-row management-modal-footer">
                <button type="submit" className="primary-button" disabled={isSubmitting || isLoadingOptions || isLoadingMatrix}>
                  {isSubmitting ? 'Salvando...' : formMode === 'edit' ? 'Salvar alteracao' : 'Salvar PerfilAcesso'}
                </button>
                <button type="button" className="secondary-button" onClick={handleCancelForm} disabled={isSubmitting}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <section className="management-card management-grid-card dre-list-card">
        <div className="management-grid-header">
          <h3>Registros cadastrados</h3>
          <span>{isLoading ? 'Atualizando...' : `${totalItems} item(ns) encontrados`}</span>
        </div>

        <div className="management-grid-wrapper">
          <table className="dre-table">
            <thead>
              <tr>
                <th>
                  <button type="button" className="dre-sort-button" onClick={() => handleSort('codigo')}>
                    Codigo <span>{getSortIndicator('codigo', sortBy, sortDirection)}</span>
                  </button>
                </th>
                <th>
                  <button type="button" className="dre-sort-button" onClick={() => handleSort('perfilDescricao')}>
                    Perfil <span>{getSortIndicator('perfilDescricao', sortBy, sortDirection)}</span>
                  </button>
                </th>
                <th>
                  <button type="button" className="dre-sort-button" onClick={() => handleSort('acessoPaginaDescricao')}>
                    Acesso Pagina <span>{getSortIndicator('acessoPaginaDescricao', sortBy, sortDirection)}</span>
                  </button>
                </th>
                <th>Funcao</th>
                <th>
                  <button type="button" className="dre-sort-button" onClick={() => handleSort('permissao')}>
                    Permissao <span>{getSortIndicator('permissao', sortBy, sortDirection)}</span>
                  </button>
                </th>
                <th className="dre-actions-column">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.codigo}>
                  <td>{item.codigo}</td>
                  <td>{`${item.perfilCodigo} - ${item.perfilDescricao}`}</td>
                  <td>{`${item.acessoPaginaCodigo} - ${item.acessoPaginaDescricao}`}</td>
                  <td>{item.acessoPaginaFuncao}</td>
                  <td>{item.permissao}</td>
                  <td>
                    <div className="dre-row-actions">
                      <button type="button" className="row-action-button row-action-edit" onClick={() => handleEdit(item)}>
                        Alterar
                      </button>
                      <button
                        type="button"
                        className="row-action-button row-action-delete"
                        onClick={() => void handleDelete(item)}
                        disabled={isDeletingCodigo === item.codigo}
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!items.length && !isLoading ? <p className="management-empty-state">Nenhum PerfilAcesso encontrado.</p> : null}

        <div className="management-pagination dre-pagination">
          <button
            type="button"
            className="secondary-button dre-pagination-button"
            onClick={() => setPage((currentPage) => Math.max(currentPage - 1, 1))}
            disabled={page <= 1 || isLoading}
          >
            Pagina anterior
          </button>
          <span className="management-pagination-info dre-pagination-info">Pagina {page} de {totalPages}</span>
          <button
            type="button"
            className="secondary-button dre-pagination-button"
            onClick={() => setPage((currentPage) => Math.min(currentPage + 1, totalPages))}
            disabled={page >= totalPages || isLoading}
          >
            Proxima pagina
          </button>
        </div>
      </section>

      {!isFormVisible ? (
        <p className={`status-message ${statusTone === 'error' ? 'status-error' : statusTone === 'success' ? 'status-success' : ''}`}>
          {statusMessage}
        </p>
      ) : null}
    </div>
  )
}