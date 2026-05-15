import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { listDreItemsPaginated } from './services/dre'
import type { DreItem } from './services/dre'
import {
  listApontamentoServicosItems,
  saveApontamentoServicosItems,
  type ApontamentoServicosItem,
} from './services/apontamentoServicos'
import {
  APURACAO_TIPO_PESSOA_OPTIONS,
} from './services/apuracaoTipoPessoa'
import type { ApuracaoTipoPessoa } from './services/apuracaoTipoPessoa'
import { getEditPermissionDeniedMessage, hasEditableFormPermission } from './utils/formAccess'

type StatusTone = 'idle' | 'error' | 'success' | 'warning'

const FORM_ACCESS_KEY = 'form_apursvc021'
const APURACAO_SERVICOS_EDITABLE_STATUS = 'Em digitacao'

const normalizeMonthYearInput = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 6)

  if (digits.length <= 2) {
    return digits
  }

  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

const isValidMonthYear = (value: string) => /^(0[1-9]|1[0-2])\/\d{4}$/.test(value)
const normalizeIntegerInput = (value: string) => value.replace(/[^\d]/g, '')
const normalizeKmInput = (value: string) => value.replace(/[^\d,.-]/g, '')

const getCurrentMonthYear = () => {
  const currentDate = new Date()
  const month = String(currentDate.getMonth() + 1).padStart(2, '0')
  return `${month}/${currentDate.getFullYear()}`
}

const getCurrentIsoDate = () => {
  return new Date().toISOString().slice(0, 10)
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

const buildRowKey = (item: Pick<ApontamentoServicosItem, 'mesAno' | 'dreCodigo' | 'ordemServicoCodigo' | 'revisao' | 'tipoEscolaCodigo' | 'tipoPessoa'>) => {
  return `${item.mesAno}|${item.dreCodigo}|${item.ordemServicoCodigo}|${item.revisao}|${item.tipoEscolaCodigo}|${item.tipoPessoa}`
}

const buildOrdemServicoGroupKey = (item: Pick<ApontamentoServicosItem, 'mesAno' | 'dreCodigo' | 'ordemServicoCodigo' | 'revisao' | 'tipoPessoa'>) => {
  return `${item.mesAno}|${item.dreCodigo}|${item.ordemServicoCodigo}|${item.revisao}|${item.tipoPessoa}`
}

const getOrdemServicoGroupRowIndex = (items: ApontamentoServicosItem[], itemIndex: number) => {
  const currentGroupKey = buildOrdemServicoGroupKey(items[itemIndex])
  let groupRowIndex = 0

  for (let index = itemIndex - 1; index >= 0; index -= 1) {
    if (buildOrdemServicoGroupKey(items[index]) !== currentGroupKey) {
      break
    }

    groupRowIndex += 1
  }

  return groupRowIndex
}

export default function ApontamentoServicosView() {
  const hasEditPermission = hasEditableFormPermission(FORM_ACCESS_KEY)
  const [dreOptions, setDreOptions] = useState<DreItem[]>([])
  const [mesAno, setMesAno] = useState(getCurrentMonthYear())
  const [dataReferencia, setDataReferencia] = useState(getCurrentIsoDate())
  const [dreCodigo, setDreCodigo] = useState('')
  const [revisao, setRevisao] = useState('0')
  const [tipoPessoa, setTipoPessoa] = useState<ApuracaoTipoPessoa>('PF')
  const [items, setItems] = useState<ApontamentoServicosItem[]>([])
  const [statusMessage, setStatusMessage] = useState('')
  const [statusTone, setStatusTone] = useState<StatusTone>('idle')
  const [isLoadingOptions, setIsLoadingOptions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!doesDateBelongToMonthYear(dataReferencia, mesAno)) {
      const firstDate = getFirstDateOfMonthYear(mesAno)
      if (firstDate) {
        setDataReferencia(firstDate)
      }
    }
  }, [dataReferencia, mesAno])

  const shouldShowEmpresaColumn = tipoPessoa !== 'PF'

  const renderMergedPrimaryCell = (item: ApontamentoServicosItem, groupRowIndex: number) => {
    const primaryLines = [
      <strong key="crmc" className="apontamento-servicos-primary-value">{item.crmcCondutor || '-'}</strong>,
      <span key="os" className="apontamento-servicos-primary-detail">OS: {item.ordemServicoOsConcat || item.ordemServicoNumOs || item.ordemServicoCodigo}</span>,
      <span key="placa" className="apontamento-servicos-primary-detail">Placa: {item.placa || '-'}</span>,
      <span key="periodo" className="apontamento-servicos-primary-detail">Periodo: {formatPeriodLabel(item) || '-'}</span>,
    ]

    if (shouldShowEmpresaColumn) {
      primaryLines.splice(4, 0, <span key="empresa" className="apontamento-servicos-primary-detail">Empresa: {item.empresa || '-'}</span>)
    }

    primaryLines.push(<span key="condutor" className="apontamento-servicos-primary-detail">Condutor: {item.nomeCondutor || '-'}</span>)

    return <div className="apontamento-servicos-primary-cell">{primaryLines[groupRowIndex] ?? ''}</div>
  }

  const loadDreOptions = useCallback(async () => {
    setIsLoadingOptions(true)
    try {
      const result = await listDreItemsPaginated({ page: 1, pageSize: 500, sortBy: 'descricao', sortDirection: 'asc' })
      setDreOptions(result.items)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao carregar as DREs.'
      setStatusTone('error')
      setStatusMessage(message)
    } finally {
      setIsLoadingOptions(false)
    }
  }, [])

  const loadItems = useCallback(async () => {
    if (!isValidMonthYear(mesAno)) {
      setStatusTone('warning')
      setStatusMessage('Informe um mes/ano valido para consultar o apontamento.')
      return
    }

    if (!doesDateBelongToMonthYear(dataReferencia, mesAno)) {
      setStatusTone('warning')
      setStatusMessage('A data de referencia deve pertencer ao mes/ano informado.')
      return
    }

    setIsLoading(true)
    setStatusTone('idle')
    setStatusMessage('Carregando apontamento de servicos...')

    try {
      const parsedRevisao = Number.parseInt(revisao, 10)
      const result = await listApontamentoServicosItems({
        mesAno,
        dataReferencia,
        dreCodigo,
        revisao: Number.isInteger(parsedRevisao) ? parsedRevisao : undefined,
        tipoPessoa,
      })

      setItems(result.items)
      setStatusTone('idle')
      setStatusMessage(result.items.length ? '' : 'Nenhum apontamento disponivel para os filtros informados.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao carregar o apontamento de servicos.'
      setItems([])
      setStatusTone('error')
      setStatusMessage(message)
    } finally {
      setIsLoading(false)
    }
  }, [dataReferencia, dreCodigo, mesAno, revisao, tipoPessoa])

  useEffect(() => {
    void loadDreOptions()
  }, [loadDreOptions])

  useEffect(() => {
    if (isValidMonthYear(mesAno) && doesDateBelongToMonthYear(dataReferencia, mesAno)) {
      void loadItems()
    }
  }, [dataReferencia, loadItems, mesAno])

  const handleFilterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await loadItems()
  }

  const handleClearFilter = async () => {
    const currentMonthYear = getCurrentMonthYear()
    const currentIsoDate = getCurrentIsoDate()
    setMesAno(currentMonthYear)
    setDataReferencia(doesDateBelongToMonthYear(currentIsoDate, currentMonthYear) ? currentIsoDate : getFirstDateOfMonthYear(currentMonthYear))
    setDreCodigo('')
    setRevisao('0')
    setTipoPessoa('PF')
    setStatusTone('idle')
    setStatusMessage('')
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
        [field]: Number(normalizeIntegerInput(value) || '0'),
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

    setIsSaving(true)
    setStatusTone('idle')
    setStatusMessage('Gravando apontamento de servicos...')

    try {
      const message = await saveApontamentoServicosItems({
        mesAno,
        dataReferencia,
        items: items.map((item) => ({
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
        })),
      })

      setStatusTone('success')
      setStatusMessage(message)
      await loadItems()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao gravar o apontamento de servicos.'
      setStatusTone('error')
      setStatusMessage(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <div className="content-copy">
        <p className="content-description">
          Digite os quantitativos diarios do credenciamento com base nas OS ativas de Apuracao Servicos, separados por DRE, revisao, tipo pessoa e tipo de atendimento.
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
                onChange={(event) => setMesAno(normalizeMonthYearInput(event.target.value))}
              />
            </label>
            <label className="apontamento-servicos-filter-field">
              <span className="apontamento-servicos-filter-label">Data referencia</span>
              <input
                className="management-filter-input apontamento-servicos-filter-input"
                type="date"
                value={dataReferencia}
                onChange={(event) => setDataReferencia(event.target.value)}
              />
            </label>
            <label className="apontamento-servicos-filter-field">
              <span className="apontamento-servicos-filter-label">DRE</span>
              <select
                className="management-filter-input apontamento-servicos-filter-input"
                value={dreCodigo}
                onChange={(event) => setDreCodigo(event.target.value)}
                disabled={isLoadingOptions}
              >
                <option value="">Todas as DREs</option>
                {dreOptions.map((item) => (
                  <option key={item.codigo} value={item.codigo}>
                    {formatDreOptionLabel(item)}
                  </option>
                ))}
              </select>
            </label>
            <label className="apontamento-servicos-filter-field">
              <span className="apontamento-servicos-filter-label">Revisao</span>
              <input
                className="management-filter-input apontamento-servicos-filter-input"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={revisao}
                onChange={(event) => setRevisao(normalizeIntegerInput(event.target.value))}
              />
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
            <div className="apontamento-servicos-filter-actions">
              <button type="submit" className="secondary-button management-filter-button" disabled={isLoading || isSaving}>
                Filtrar
              </button>
              <button type="button" className="secondary-button management-filter-button" onClick={handleClearFilter} disabled={isLoading || isSaving}>
                Limpar
              </button>
            </div>
          </form>

          <button type="button" className="primary-button" onClick={handleSave} disabled={isSaving || isLoading || !items.length}>
            {isSaving ? 'Salvando...' : 'Salvar apontamento'}
          </button>
        </div>

        <div className="management-card management-table-card apontamento-servicos-table-card">
          <div className="apontamento-servicos-table-wrapper">
            <table className="management-table apontamento-servicos-table">
              <thead>
                <tr>
                  <th className="apontamento-servicos-header-detail">CRMC</th>
                  <th className="apontamento-servicos-header-detail apontamento-servicos-header-compact">Tipo de<br />veiculo</th>
                  <th className="apontamento-servicos-header-detail apontamento-servicos-header-compact">Tipo<br />atendimento</th>
                  <th className="apontamento-servicos-header-detail apontamento-servicos-header-compact">Km<br />adicional</th>
                  <th className="apontamento-servicos-header-detail apontamento-servicos-header-compact">N CAD<br />presencial</th>
                  <th className="apontamento-servicos-header-metric-main apontamento-servicos-header-compact">CAD</th>
                  <th className="apontamento-servicos-header-metric-secondary apontamento-servicos-header-compact">AT. COMPL.<br />N CAD</th>
                  <th className="apontamento-servicos-header-metric-secondary apontamento-servicos-header-compact">AT. COMPL.<br />CAD</th>
                  <th className="apontamento-servicos-header-metric-secondary apontamento-servicos-header-compact">Cont<br />N CAD</th>
                  <th className="apontamento-servicos-header-metric-secondary apontamento-servicos-header-compact">Cont<br />CAD</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, itemIndex) => {
                  const rowKey = buildRowKey(item)
                  const currentGroupKey = buildOrdemServicoGroupKey(item)
                  const previousGroupKey = itemIndex > 0 ? buildOrdemServicoGroupKey(items[itemIndex - 1]) : null
                  const isSameOrdemServicoGroup = previousGroupKey === currentGroupKey
                  const groupRowIndex = getOrdemServicoGroupRowIndex(items, itemIndex)
                  const isGroupStart = itemIndex > 0 && !isSameOrdemServicoGroup
                  const isEditableRow = hasEditPermission && item.isAtivoNaData && item.apuracaoFinanceiraSituacao === APURACAO_SERVICOS_EDITABLE_STATUS
                  const rowClassName = [
                    !item.isAtivoNaData ? 'apontamento-servicos-row-inactive' : '',
                    isGroupStart ? 'apontamento-servicos-row-group-start' : '',
                  ].filter(Boolean).join(' ')

                  return (
                    <tr key={rowKey} className={rowClassName}>
                      <td>{renderMergedPrimaryCell(item, groupRowIndex)}</td>
                      <td className="apontamento-servicos-cell-compact">{item.tipoVeiculo || '-'}</td>
                      <td className="apontamento-servicos-cell-compact">{item.tipoEscolaSigla || item.tipoEscolaDescricao || '-'}</td>
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
                      <td className="apontamento-servicos-cell-compact">
                        <input
                          className="apontamento-servicos-grid-input"
                          type="number"
                          min="0"
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
                          min="0"
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
                          min="0"
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
                          min="0"
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
                          min="0"
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
                          min="0"
                          step="1"
                          value={item.continuaCadeirante}
                          onChange={(event) => updateMetricField(rowKey, 'continuaCadeirante', event.target.value)}
                          disabled={!isEditableRow || isSaving}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {!isLoading && items.length === 0 ? (
            <p className="management-empty-state">Nenhuma linha encontrada para o apontamento informado.</p>
          ) : null}
        </div>

        <p className={`status-message status-${statusTone}`} aria-live="polite">
          {statusMessage}
        </p>
      </div>
    </>
  )
}
