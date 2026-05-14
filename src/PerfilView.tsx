import { useCallback, useDeferredValue, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  createPerfilItem,
  deletePerfilItem,
  listPerfilItemsPaginated,
  updatePerfilItem,
} from './services/perfil'
import type { PerfilItem } from './services/perfil'

type PerfilSortField = 'codigo' | 'descricao'
type FormMode = 'create' | 'edit'
type StatusTone = 'idle' | 'error' | 'success'

const PAGE_SIZE = 20

const getSortIndicator = (
  sortBy: PerfilSortField,
  currentSortBy: PerfilSortField,
  currentSortDirection: 'asc' | 'desc',
) => {
  if (sortBy !== currentSortBy) {
    return '↕'
  }

  return currentSortDirection === 'asc' ? '↑' : '↓'
}

export default function PerfilView() {
  const [items, setItems] = useState<PerfilItem[]>([])
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [sortBy, setSortBy] = useState<PerfilSortField>('codigo')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [codigo, setCodigo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [editingCodigo, setEditingCodigo] = useState<string | null>(null)
  const [formMode, setFormMode] = useState<FormMode>('create')
  const [isFormVisible, setIsFormVisible] = useState(false)
  const [statusTone, setStatusTone] = useState<StatusTone>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const [descricaoError, setDescricaoError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeletingCodigo, setIsDeletingCodigo] = useState<string | null>(null)

  const resetForm = useCallback(() => {
    setCodigo('')
    setDescricao('')
    setEditingCodigo(null)
    setFormMode('create')
    setDescricaoError('')
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

  const loadItems = useCallback(async (pageToLoad: number) => {
    setIsLoading(true)
    setStatusTone('idle')
    setStatusMessage('Carregando perfis...')

    try {
      const result = await listPerfilItemsPaginated({
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
      setStatusMessage(result.items.length ? '' : 'Nenhum perfil encontrado.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao carregar os perfis.'
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
    void loadItems(page)
  }, [loadItems, page])

  useEffect(() => {
    setPage(1)
  }, [deferredSearch, sortBy, sortDirection])

  const handleStartInsert = () => {
    resetForm()
    setIsFormVisible(true)
    setStatusTone('idle')
    setStatusMessage('')
  }

  const handleCancelForm = () => {
    resetForm()
    setIsFormVisible(false)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedDescricao = descricao.trim()
    setDescricaoError('')

    if (!normalizedDescricao) {
      setDescricaoError('Informe a descricao.')
      return
    }

    setIsSubmitting(true)
    setStatusTone('idle')
    setStatusMessage(editingCodigo ? 'Salvando alteracao...' : 'Salvando perfil...')

    try {
      const savedItem = editingCodigo
        ? await updatePerfilItem(editingCodigo, { descricao: normalizedDescricao })
        : await createPerfilItem({ descricao: normalizedDescricao })

      resetForm()
      setIsFormVisible(false)
      setStatusTone('success')
      setStatusMessage(editingCodigo
        ? `Perfil ${savedItem.codigo} alterado com sucesso.`
        : `Perfil ${savedItem.codigo} cadastrado com sucesso.`)
      setPage(1)
      await loadItems(1)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao salvar o perfil.'
      setStatusTone('error')
      setStatusMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (item: PerfilItem) => {
    setCodigo(item.codigo)
    setDescricao(item.descricao)
    setEditingCodigo(item.codigo)
    setFormMode('edit')
    setIsFormVisible(true)
    setDescricaoError('')
    setStatusTone('idle')
    setStatusMessage(`Alterando perfil ${item.codigo}.`)
  }

  const handleDelete = async (item: PerfilItem) => {
    if (!window.confirm(`Excluir o perfil ${item.codigo} - ${item.descricao}?`)) {
      return
    }

    setIsDeletingCodigo(item.codigo)
    setStatusTone('idle')
    setStatusMessage(`Excluindo perfil ${item.codigo}...`)

    try {
      await deletePerfilItem(item.codigo)

      if (editingCodigo === item.codigo) {
        handleCancelForm()
      }

      setStatusTone('success')
      setStatusMessage(`Perfil ${item.codigo} excluido com sucesso.`)
      const nextPage = items.length === 1 && page > 1 ? page - 1 : page
      setPage(nextPage)
      await loadItems(nextPage)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao excluir o perfil.'
      setStatusTone('error')
      setStatusMessage(message)
    } finally {
      setIsDeletingCodigo(null)
    }
  }

  const handleSort = (field: PerfilSortField) => {
    setSortBy(field)
    setSortDirection((currentDirection) => {
      if (sortBy !== field) {
        return 'asc'
      }

      return currentDirection === 'asc' ? 'desc' : 'asc'
    })
  }

  return (
    <div className="management-layout">
      <div className="management-toolbar">
        <button
          type="button"
          className="primary-button dre-insert-button"
          onClick={handleStartInsert}
          disabled={isSubmitting || Boolean(isDeletingCodigo)}
        >
          Inserir registro
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
            placeholder="Filtrar por codigo ou descricao"
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
            aria-labelledby="perfil-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <form className="management-card management-form dre-form management-modal-form-card" onSubmit={handleSubmit} noValidate>
              <div className="management-modal-header">
                <div>
                  <p className="management-modal-kicker">Cadastro administrativo - PERFCAD020</p>
                  <h2 id="perfil-modal-title">Perfil</h2>
                </div>
                <button
                  type="button"
                  className="secondary-button management-modal-close-button"
                  onClick={handleCancelForm}
                  disabled={isSubmitting}
                  aria-label="Fechar formulario de perfil"
                >
                  X
                </button>
              </div>

              <p className="management-modal-subtitle">
                {formMode === 'edit' ? 'Alterar registro' : 'Novo registro'}
              </p>

              <label className="field-group" htmlFor="perfil-codigo">
                <span>Codigo</span>
                <input id="perfil-codigo" value={codigo} readOnly placeholder="Gerado automaticamente" />
              </label>

              <label className="field-group" htmlFor="perfil-descricao">
                <span>Descricao</span>
                <input
                  id="perfil-descricao"
                  name="descricao"
                  type="text"
                  value={descricao}
                  onChange={(event) => setDescricao(event.target.value)}
                  aria-invalid={descricaoError ? 'true' : 'false'}
                  disabled={isSubmitting}
                  maxLength={255}
                />
                {descricaoError ? <strong className="field-error">{descricaoError}</strong> : null}
              </label>

              <p className={`status-message status-${statusTone}`} aria-live="polite">
                {statusMessage}
              </p>

              <div className="button-row dre-button-row management-modal-footer">
                <button type="submit" className="primary-button" disabled={isSubmitting}>
                  {isSubmitting ? 'Salvando...' : formMode === 'edit' ? 'Salvar alteracao' : 'Salvar perfil'}
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
                  <button type="button" className="dre-sort-button" onClick={() => handleSort('descricao')}>
                    Descricao <span>{getSortIndicator('descricao', sortBy, sortDirection)}</span>
                  </button>
                </th>
                <th className="dre-actions-column">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.codigo}>
                  <td>{item.codigo}</td>
                  <td>{item.descricao}</td>
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

        {!items.length && !isLoading ? <p className="management-empty-state">Nenhum perfil encontrado.</p> : null}

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