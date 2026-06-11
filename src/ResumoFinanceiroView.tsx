import { useCallback, useDeferredValue, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  deleteResumoFinanceiroCascade,
  fetchRemuneracaoTotalsForResumoItem,
  listResumoFinanceiroItemsPaginated,
} from './services/resumoFinanceiro'
import type { ResumoFinanceiroItem, ResumoFinanceiroSortField } from './services/resumoFinanceiro'
import { listDreItemsPaginated } from './services/dre'
import type { DreItem } from './services/dre'
import { formatApuracaoTipoPessoaLabel } from './services/apuracaoTipoPessoa'

type StatusTone = 'idle' | 'error' | 'success' | 'warning'

const pageSize = 20

const normalizeMonthYearInput = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 6)

  if (digits.length <= 2) {
    return digits
  }

  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

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
  { key: 'continuaRegularValor', groupTitle: 'Continua', columnTitle: 'Reg.', headerClass: 'remuneracao-servicos-header-continua' },
  { key: 'continuaCadeiranteValor', groupTitle: 'Continua', columnTitle: 'Cadeirante', headerClass: 'remuneracao-servicos-header-continua' },
  { key: 'ccaValor', groupTitle: 'CCA', columnTitle: 'Valor', headerClass: 'remuneracao-servicos-header-cca' },
] as const

type MonetaryColumnKey = (typeof monetaryColumns)[number]['key']

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const formatMoneyValue = (value: number) => {
  if (!Number.isFinite(value)) {
    return currencyFormatter.format(0)
  }

  return currencyFormatter.format(value)
}

const calculateRemuneracaoValorTotal = (item: Pick<ResumoFinanceiroItem, MonetaryColumnKey>) => {
  return monetaryColumns.reduce((sum, column) => sum + (item[column.key] || 0), 0)
}

const buildMonetaryHeaderGroups = () => {
  const groups: Array<{ title: string; colSpan: number }> = []
  let currentTitle = ''
  let currentColSpan = 0

  for (const column of monetaryColumns) {
    if (column.groupTitle !== currentTitle) {
      if (currentColSpan > 0) {
        groups.push({ title: currentTitle, colSpan: currentColSpan })
      }

      currentTitle = column.groupTitle
      currentColSpan = 1
    } else {
      currentColSpan += 1
    }
  }

  if (currentColSpan > 0) {
    groups.push({ title: currentTitle, colSpan: currentColSpan })
  }

  return groups
}

const monetaryHeaderGroups = buildMonetaryHeaderGroups()

const normalizeRemuneracaoFields = (item: ResumoFinanceiroItem): ResumoFinanceiroItem => ({
  ...item,
  tegRegularFixo: Number(item.tegRegularFixo) || 0,
  tegRegularPercapita: Number(item.tegRegularPercapita) || 0,
  tegAcessivelFixo: Number(item.tegAcessivelFixo) || 0,
  tegAcessivelPercapita: Number(item.tegAcessivelPercapita) || 0,
  tegEspecialRegularFixo: Number(item.tegEspecialRegularFixo) || 0,
  tegEspecialRegularPercapita: Number(item.tegEspecialRegularPercapita) || 0,
  tegEspecialAcessivelFixo: Number(item.tegEspecialAcessivelFixo) || 0,
  tegEspecialAcessivelPercapita: Number(item.tegEspecialAcessivelPercapita) || 0,
  tegCrecheFixo: Number(item.tegCrecheFixo) || 0,
  tegCrechePercapita: Number(item.tegCrechePercapita) || 0,
  kmValor: Number(item.kmValor) || 0,
  continuaRegularValor: Number(item.continuaRegularValor) || 0,
  continuaCadeiranteValor: Number(item.continuaCadeiranteValor) || 0,
  ccaValor: Number(item.ccaValor) || 0,
})

type RemuneracaoTotalsGridProps = {
  item: ResumoFinanceiroItem
}

type ApontamentosTotalsGridProps = {
  item: ResumoFinanceiroItem
}

type ResumoFinanceiroConsultaResumoGridProps = {
  item: ResumoFinanceiroItem
}

function ResumoFinanceiroConsultaResumoGrid({ item }: ResumoFinanceiroConsultaResumoGridProps) {
  return (
    <div className="management-grid-wrapper resumo-financeiro-consulta-resumo-wrapper">
      <table className="dre-table">
        <tbody>
          <tr>
            <th>Total revisoes</th>
            <td>{formatIntegerValue(item.totalRevisoes)}</td>
            <th>Maior revisao</th>
            <td>{formatIntegerValue(item.maiorRevisao)}</td>
          </tr>
          <tr>
            <th>Registros filhos</th>
            <td>{formatIntegerValue(item.totalRegistros)}</td>
            <th>Ordens de servico</th>
            <td>{formatIntegerValue(item.totalOrdensServico)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function ApontamentosTotalsGrid({ item }: ApontamentosTotalsGridProps) {
  return (
    <div className="management-grid-wrapper resumo-financeiro-apontamentos-table-wrapper">
      <table className="dre-table resumo-financeiro-apontamentos-table">
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
            <td>{formatIntegerValue(item.naoCadeirantePresencial)}</td>
            <td>{formatIntegerValue(item.cadeirante)}</td>
            <td>{formatIntegerValue(item.atendimentoComplementarNaoCadeirante)}</td>
            <td>{formatIntegerValue(item.atendimentoComplementarCadeirante)}</td>
            <td>{formatIntegerValue(item.continuaNaoCadeirante)}</td>
            <td>{formatIntegerValue(item.continuaCadeirante)}</td>
            <td>{formatFourDecimalValue(item.kilometragem)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function RemuneracaoTotalsGrid({ item }: RemuneracaoTotalsGridProps) {
  return (
    <div className="management-grid-wrapper apontamento-servicos-table-wrapper remuneracao-servicos-table-wrapper resumo-financeiro-remuneracao-table-wrapper">
      <table className="apontamento-servicos-table apontamento-servicos-table-sem-acumulados remuneracao-servicos-table resumo-financeiro-remuneracao-table">
        <thead>
          <tr>
            {monetaryHeaderGroups.map((group, index) => {
              const groupHeaderClass = monetaryColumns.find((column) => column.groupTitle === group.title)?.headerClass ?? ''

              return (
                <th
                  key={`${group.title}-${index}`}
                  colSpan={group.colSpan}
                  className={`apontamento-servicos-header-detail remuneracao-servicos-header-detail ${groupHeaderClass}`.trim()}
                >
                  <span className="remuneracao-servicos-header-line">{group.title}</span>
                </th>
              )
            })}
            <th rowSpan={2} className="apontamento-servicos-header-detail remuneracao-servicos-header-detail remuneracao-servicos-header-valor-total">
              <span className="remuneracao-servicos-header-line">Valor Total</span>
            </th>
          </tr>
          <tr>
            {monetaryColumns.map((column) => (
              <th
                key={column.key}
                className={`apontamento-servicos-header-detail remuneracao-servicos-header-detail ${column.headerClass}`.trim()}
              >
                <span className="remuneracao-servicos-header-line">{column.columnTitle}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {monetaryColumns.map((column) => (
              <td key={column.key} className="apontamento-servicos-cell-compact">
                <span className="apontamento-servicos-grid-readonly">{formatMoneyValue(item[column.key])}</span>
              </td>
            ))}
            <td className="apontamento-servicos-cell-compact total-remuneracao-servicos-valor-total-cell">
              <span className="apontamento-servicos-grid-readonly total-remuneracao-servicos-valor-total-value">
                {formatMoneyValue(calculateRemuneracaoValorTotal(item))}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
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
  const [isDeleteCascadeVisible, setIsDeleteCascadeVisible] = useState(false)
  const [deleteMesAno, setDeleteMesAno] = useState('')
  const [deleteDreCodigo, setDeleteDreCodigo] = useState('')
  const [deleteRevisao, setDeleteRevisao] = useState('')
  const [deleteTipoPessoa, setDeleteTipoPessoa] = useState<'TODOS' | 'PF' | 'PJ'>('TODOS')
  const [deleteDreOptions, setDeleteDreOptions] = useState<DreItem[]>([])
  const [deleteMesAnoError, setDeleteMesAnoError] = useState('')
  const [deleteRevisaoError, setDeleteRevisaoError] = useState('')
  const [deleteCascadeFeedbackMessage, setDeleteCascadeFeedbackMessage] = useState('')
  const [deleteCascadeFeedbackTone, setDeleteCascadeFeedbackTone] = useState<StatusTone>('idle')
  const [isDeletingCascade, setIsDeletingCascade] = useState(false)
  const [detailItem, setDetailItem] = useState<ResumoFinanceiroItem | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [consultaTab, setConsultaTab] = useState<'remuneracao' | 'apontamentos'>('apontamentos')

  const canGoToPreviousPage = page > 1
  const canGoToNextPage = page < totalPages

  const loadItems = useCallback(async () => {
    setIsLoading(true)
    setStatusTone('idle')
    setStatusMessage('Carregando resumo financeiro e totais de remuneracao...')

    try {
      const result = await listResumoFinanceiroItemsPaginated({
        search: deferredSearch,
        page,
        pageSize,
        sortBy,
        sortDirection,
      })

      const normalizedItems = result.items.map(normalizeRemuneracaoFields)
      const itemsWithRemuneracao = await Promise.all(
        normalizedItems.map(async (item) => {
          try {
            const remuneracaoTotals = await fetchRemuneracaoTotalsForResumoItem(item)

            return {
              ...item,
              ...remuneracaoTotals,
            }
          } catch {
            return item
          }
        }),
      )

      setItems(itemsWithRemuneracao)
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
    const loadDeleteDreOptions = async () => {
      try {
        const result = await listDreItemsPaginated({ page: 1, pageSize: 500, sortBy: 'codigo', sortDirection: 'asc' })
        const orderedItems = [...result.items].sort((left, right) => {
          const codeComparison = left.codigo.localeCompare(right.codigo, 'pt-BR', { numeric: true, sensitivity: 'base' })

          if (codeComparison !== 0) {
            return codeComparison
          }

          return left.descricao.localeCompare(right.descricao, 'pt-BR', { sensitivity: 'base' })
        })

        setDeleteDreOptions(orderedItems)
      } catch {
        setDeleteDreOptions([])
      }
    }

    void loadDeleteDreOptions()
  }, [])

  useEffect(() => {
    if (!isFormVisible && !isDeleteCascadeVisible) {
      return
    }

    document.body.classList.add('management-modal-open')

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFormVisible(false)
        setIsDeleteCascadeVisible(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.classList.remove('management-modal-open')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isDeleteCascadeVisible, isFormVisible])

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

  const loadConsultaRemuneracaoTotals = useCallback(async (item: ResumoFinanceiroItem) => {
    const normalizedItem = normalizeRemuneracaoFields(item)
    setDetailItem(normalizedItem)
    setIsDetailLoading(true)

    try {
      const remuneracaoTotals = await fetchRemuneracaoTotalsForResumoItem(normalizedItem)
      setDetailItem({
        ...normalizedItem,
        ...remuneracaoTotals,
      })
    } catch {
      setDetailItem(normalizedItem)
    } finally {
      setIsDetailLoading(false)
    }
  }, [])

  const handleStartView = (item: ResumoFinanceiroItem) => {
    setConsultaTab('apontamentos')
    setSelectedItem(item)
    setDetailItem(null)
    setIsDetailLoading(false)
    setIsFormVisible(true)
    void loadConsultaRemuneracaoTotals(item)
  }

  const handleCloseForm = () => {
    setIsFormVisible(false)
    setSelectedItem(null)
    setDetailItem(null)
    setIsDetailLoading(false)
    setConsultaTab('apontamentos')
  }

  const handleOpenDeleteCascade = () => {
    setDeleteMesAno('')
    setDeleteDreCodigo('')
    setDeleteRevisao('')
    setDeleteTipoPessoa('TODOS')
    setDeleteMesAnoError('')
    setDeleteRevisaoError('')
    setDeleteCascadeFeedbackTone('idle')
    setDeleteCascadeFeedbackMessage('')
    setIsDeleteCascadeVisible(true)
  }

  const handleCloseDeleteCascade = () => {
    if (isDeletingCascade) {
      return
    }

    setIsDeleteCascadeVisible(false)
  }

  const handleDeleteCascade = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedMesAno = deleteMesAno.trim()
    const normalizedDreCodigo = deleteDreCodigo.trim()
    const normalizedRevisao = deleteRevisao.trim()
    const parsedRevisao = normalizedRevisao === '' ? null : Number.parseInt(normalizedRevisao, 10)

    let hasError = false
    setDeleteMesAnoError('')
    setDeleteRevisaoError('')

    if (!/^\d{2}\/\d{4}$/.test(normalizedMesAno)) {
      setDeleteMesAnoError('Mes/ano invalido. Use o formato mm/aaaa.')
      hasError = true
    }

    if (normalizedRevisao !== '' && (!Number.isInteger(parsedRevisao) || (parsedRevisao ?? -1) < 0)) {
      setDeleteRevisaoError('Revisao deve ser um numero inteiro maior ou igual a zero.')
      hasError = true
    }

    if (hasError) {
      return
    }

    const confirmMessage = [
      'Excluir os dados financeiros desta selecao?',
      `Mes/Ano: ${normalizedMesAno}`,
      `Tipo Pessoa: ${deleteTipoPessoa === 'TODOS' ? 'TODOS' : formatApuracaoTipoPessoaLabel(deleteTipoPessoa)}`,
      `DRE: ${normalizedDreCodigo || 'TODAS'}`,
      `Revisao: ${normalizedRevisao || 'TODAS'}`,
      'A ausencia de filtro remove todos os filhos do nivel informado.',
    ].join('\n')

    if (!window.confirm(confirmMessage)) {
      return
    }

    setDeleteCascadeFeedbackTone('idle')
    setDeleteCascadeFeedbackMessage('Excluindo cadeia financeira do resumo financeiro...')
    setIsDeletingCascade(true)
    setStatusTone('idle')
    setStatusMessage('Excluindo cadeia financeira do resumo financeiro...')

    try {
      const result = await deleteResumoFinanceiroCascade({
        mesAno: normalizedMesAno,
        dreCodigo: normalizedDreCodigo || undefined,
        revisao: parsedRevisao,
        tipoPessoa: deleteTipoPessoa === 'TODOS' ? null : deleteTipoPessoa,
      })

      const totalDeleted = result.deletedRemuneracaoServicos + result.deletedApuracaoServicos + result.deletedApuracaoFinanceira
      setDeleteCascadeFeedbackTone('success')
      setDeleteCascadeFeedbackMessage(
        `Operacao concluida com sucesso. ${totalDeleted} registros excluidos (${result.deletedRemuneracaoServicos} remuneracao, ${result.deletedApuracaoServicos} apontamento/total e ${result.deletedApuracaoFinanceira} apuracao financeira).`,
      )
      setStatusTone('success')
      setStatusMessage(
        `Operacao concluida com sucesso. ${totalDeleted} registros excluidos (${result.deletedRemuneracaoServicos} remuneracao, ${result.deletedApuracaoServicos} apontamento/total e ${result.deletedApuracaoFinanceira} apuracao financeira).`,
      )
      await loadItems()
    } catch (error) {
      setDeleteCascadeFeedbackTone('error')
      setDeleteCascadeFeedbackMessage(error instanceof Error ? error.message : 'Falha ao excluir a cadeia financeira do resumo financeiro.')
      setStatusTone('error')
      setStatusMessage(error instanceof Error ? error.message : 'Falha ao excluir a cadeia financeira do resumo financeiro.')
    } finally {
      setIsDeletingCascade(false)
    }
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
          <button type="button" className="primary-button dre-insert-button" onClick={handleOpenDeleteCascade} disabled={isLoading || isDeletingCascade}>
            Excluir cadeia financeira
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
              className="management-modal-shell resumo-financeiro-modal-shell"
              role="dialog"
              aria-modal="true"
              aria-labelledby="resumo-financeiro-modal-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="management-card management-form dre-form management-modal-form-card resumo-financeiro-modal-form-card">
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

                <ResumoFinanceiroConsultaResumoGrid item={selectedItem} />

                <div className="resumo-financeiro-consulta-tabs" role="tablist" aria-label="Detalhes do resumo financeiro">
                  <button
                    type="button"
                    role="tab"
                    id="resumo-financeiro-tab-apontamentos"
                    className={`resumo-financeiro-consulta-tab-button ${consultaTab === 'apontamentos' ? 'resumo-financeiro-consulta-tab-button-active' : ''}`}
                    aria-selected={consultaTab === 'apontamentos'}
                    aria-controls="resumo-financeiro-tab-panel-apontamentos"
                    onClick={() => setConsultaTab('apontamentos')}
                  >
                    Apontamentos
                  </button>
                  <button
                    type="button"
                    role="tab"
                    id="resumo-financeiro-tab-remuneracao"
                    className={`resumo-financeiro-consulta-tab-button ${consultaTab === 'remuneracao' ? 'resumo-financeiro-consulta-tab-button-active' : ''}`}
                    aria-selected={consultaTab === 'remuneracao'}
                    aria-controls="resumo-financeiro-tab-panel-remuneracao"
                    onClick={() => setConsultaTab('remuneracao')}
                  >
                    Totais de remuneracao
                  </button>
                </div>

                <section
                  id="resumo-financeiro-tab-panel-remuneracao"
                  role="tabpanel"
                  aria-labelledby="resumo-financeiro-tab-remuneracao"
                  className={`resumo-financeiro-consulta-tab-panel ${consultaTab === 'remuneracao' ? 'resumo-financeiro-consulta-tab-panel-active' : ''}`}
                  hidden={consultaTab !== 'remuneracao'}
                >
                  <p className="management-modal-subtitle">
                    Valores aglutinados por mes/ano, DRE, tipo pessoa e revisao {formatIntegerValue(selectedItem.maiorRevisao)}.
                    {isDetailLoading ? ' Atualizando totais...' : ''}
                  </p>
                  {detailItem ? (
                    <RemuneracaoTotalsGrid item={detailItem} />
                  ) : (
                    <p className="management-modal-subtitle">Carregando totais de remuneracao...</p>
                  )}
                </section>

                <section
                  id="resumo-financeiro-tab-panel-apontamentos"
                  role="tabpanel"
                  aria-labelledby="resumo-financeiro-tab-apontamentos"
                  className={`resumo-financeiro-consulta-tab-panel ${consultaTab === 'apontamentos' ? 'resumo-financeiro-consulta-tab-panel-active' : ''}`}
                  hidden={consultaTab !== 'apontamentos'}
                >
                  <p className="management-modal-subtitle">
                    Totais de apontamento por mes/ano, DRE, tipo pessoa e revisao {formatIntegerValue(selectedItem.maiorRevisao)}.
                  </p>
                  <ApontamentosTotalsGrid item={selectedItem} />
                </section>

                <div className="button-row dre-button-row management-modal-footer">
                  <button type="button" className="secondary-button" onClick={handleCloseForm}>
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {isDeleteCascadeVisible ? (
          <div
            className="management-modal-overlay"
            role="presentation"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                handleCloseDeleteCascade()
              }
            }}
          >
            <div
              className="management-modal-shell"
              role="dialog"
              aria-modal="true"
              aria-labelledby="resumo-financeiro-delete-cascade-title"
              onClick={(event) => event.stopPropagation()}
            >
              <form className="management-card management-form dre-form management-modal-form-card" onSubmit={handleDeleteCascade} noValidate>
                <div className="management-modal-header">
                  <div>
                    <p className="management-modal-kicker">Operacional financeiro - RESUFIN025</p>
                    <h2 id="resumo-financeiro-delete-cascade-title">EXCLUSAO EM CADEIA</h2>
                  </div>
                  <button
                    type="button"
                    className="secondary-button management-modal-close-button"
                    onClick={handleCloseDeleteCascade}
                    disabled={isDeletingCascade}
                    aria-label="Fechar formulario de exclusao em cadeia"
                  >
                    X
                  </button>
                </div>

                <p className="management-modal-subtitle">
                  Remove toda a cadeia financeira do resumo: remuneracao, apontamento/total de servicos e apuracao financeira. Campos vazios apagam todos os filhos do nivel.
                </p>

                <label className="field-group" htmlFor="resumo-financeiro-delete-mes-ano">
                  <span>Mes/Ano</span>
                  <input
                    id="resumo-financeiro-delete-mes-ano"
                    type="text"
                    inputMode="numeric"
                    maxLength={7}
                    placeholder="mm/aaaa"
                    value={deleteMesAno}
                    onChange={(event) => setDeleteMesAno(normalizeMonthYearInput(event.target.value))}
                    disabled={isDeletingCascade}
                  />
                  {deleteMesAnoError ? <strong className="field-error">{deleteMesAnoError}</strong> : null}
                </label>

                <label className="field-group" htmlFor="resumo-financeiro-delete-tipo-pessoa">
                  <span>Tipo Pessoa</span>
                  <select
                    id="resumo-financeiro-delete-tipo-pessoa"
                    value={deleteTipoPessoa}
                    onChange={(event) => setDeleteTipoPessoa(event.target.value as 'TODOS' | 'PF' | 'PJ')}
                    disabled={isDeletingCascade}
                  >
                    <option value="TODOS">TODOS</option>
                    <option value="PF">Pessoa Fisica</option>
                    <option value="PJ">Pessoa Juridica / Cooperativa</option>
                  </select>
                </label>

                <label className="field-group" htmlFor="resumo-financeiro-delete-dre">
                  <span>DRE (opcional)</span>
                  <select
                    id="resumo-financeiro-delete-dre"
                    value={deleteDreCodigo}
                    onChange={(event) => setDeleteDreCodigo(event.target.value)}
                    disabled={isDeletingCascade}
                  >
                    <option value="">TODAS</option>
                    {deleteDreOptions.map((item) => (
                      <option key={item.codigo} value={item.codigo}>
                        {`${item.codigo} - ${item.descricao}`}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field-group" htmlFor="resumo-financeiro-delete-revisao">
                  <span>Revisao (opcional)</span>
                  <input
                    id="resumo-financeiro-delete-revisao"
                    type="number"
                    min={0}
                    step={1}
                    value={deleteRevisao}
                    onChange={(event) => setDeleteRevisao(event.target.value)}
                    disabled={isDeletingCascade}
                  />
                  {deleteRevisaoError ? <strong className="field-error">{deleteRevisaoError}</strong> : null}
                </label>

                <div className="button-row dre-button-row management-modal-footer">
                  <button type="submit" className="primary-button" disabled={isDeletingCascade}>
                    {isDeletingCascade ? 'Excluindo...' : 'Excluir cadeia'}
                  </button>
                  <button type="button" className="secondary-button" onClick={handleCloseDeleteCascade} disabled={isDeletingCascade}>
                    Cancelar
                  </button>
                </div>

                <p className={`status-message status-${deleteCascadeFeedbackTone}`} aria-live="polite">
                  {deleteCascadeFeedbackMessage}
                </p>
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
                    <button type="button" className="dre-sort-button" onClick={() => handleSort('tipoPessoa')}>
                      Tipo Pessoa <span>{getSortIndicator('tipoPessoa', sortBy, sortDirection)}</span>
                    </button>
                  </th>
                  <th>Situacoes</th>
                  <th>
                    <button type="button" className="dre-sort-button" onClick={() => handleSort('totalRevisoes')}>
                      Total revisoes <span>{getSortIndicator('totalRevisoes', sortBy, sortDirection)}</span>
                    </button>
                  </th>
                  <th>
                    <button type="button" className="dre-sort-button" onClick={() => handleSort('maiorRevisao')}>
                      Maior revisao <span>{getSortIndicator('maiorRevisao', sortBy, sortDirection)}</span>
                    </button>
                  </th>
                  <th>
                    <button type="button" className="dre-sort-button" onClick={() => handleSort('totalRegistros')}>
                      Registros filhos <span>{getSortIndicator('totalRegistros', sortBy, sortDirection)}</span>
                    </button>
                  </th>
                  <th>
                    <button type="button" className="dre-sort-button" onClick={() => handleSort('totalOrdensServico')}>
                      Ordens de servico <span>{getSortIndicator('totalOrdensServico', sortBy, sortDirection)}</span>
                    </button>
                  </th>
                  <th>Valor total remuneracao</th>
                  <th className="dre-actions-column">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={`${item.mesAno}|${item.dreCodigo}|${item.tipoPessoa}`}>
                    <td>{item.mesAno}</td>
                    <td>{formatDreLabel(item)}</td>
                    <td>{formatApuracaoTipoPessoaLabel(item.tipoPessoa)}</td>
                    <td>{item.situacoesApuracaoFinanceira || 'Sem apuracao financeira'}</td>
                    <td>{formatIntegerValue(item.totalRevisoes)}</td>
                    <td>{formatIntegerValue(item.maiorRevisao)}</td>
                    <td>{formatIntegerValue(item.totalRegistros)}</td>
                    <td>{formatIntegerValue(item.totalOrdensServico)}</td>
                    <td>{formatMoneyValue(calculateRemuneracaoValorTotal(item))}</td>
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