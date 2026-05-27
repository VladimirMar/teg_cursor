import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getBatchProcessById,
  listBatchProcesses,
  type BatchProcessItem,
} from './services/batchProcesses'

function formatDateTime(value: string) {
  const dateValue = new Date(value)

  if (!value || Number.isNaN(dateValue.getTime())) {
    return '-'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(dateValue)
}

function formatDuration(startedAt: string, finishedAt: string) {
  const start = new Date(startedAt)
  const end = finishedAt ? new Date(finishedAt) : new Date()

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return '-'
  }

  const totalSeconds = Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}m ${String(seconds).padStart(2, '0')}s`
}

function formatEta(etaSeconds: number | null) {
  if (!Number.isFinite(etaSeconds) || etaSeconds === null || etaSeconds < 0) {
    return '-'
  }

  const minutes = Math.floor(etaSeconds / 60)
  const seconds = etaSeconds % 60
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`
}

function getStatusLabel(status: BatchProcessItem['status']) {
  if (status === 'running') {
    return 'Em execucao'
  }

  if (status === 'completed') {
    return 'Concluido'
  }

  return 'Falhou'
}

function getStatusClassName(status: BatchProcessItem['status']) {
  if (status === 'running') {
    return 'batch-status-pill batch-status-pill-running'
  }

  if (status === 'completed') {
    return 'batch-status-pill batch-status-pill-completed'
  }

  return 'batch-status-pill batch-status-pill-failed'
}

export default function BatchProcessMonitorView() {
  const [items, setItems] = useState<BatchProcessItem[]>([])
  const [selectedProcessId, setSelectedProcessId] = useState('')
  const [selectedItem, setSelectedItem] = useState<BatchProcessItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshingDetail, setIsRefreshingDetail] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const loadProcesses = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const response = await listBatchProcesses(false)
      setItems(response.items)

      setSelectedProcessId((currentSelectedId) => {
        if (!currentSelectedId && response.items.length > 0) {
          return response.items[0].processId
        }

        if (currentSelectedId && !response.items.some((item) => item.processId === currentSelectedId)) {
          return response.items[0]?.processId ?? ''
        }

        return currentSelectedId
      })
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Falha ao carregar os processamentos em lote.'
      setErrorMessage(message)
      setItems([])
      setSelectedProcessId('')
      setSelectedItem(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadSelectedDetails = useCallback(async (processId: string) => {
    const normalizedId = processId.trim()

    if (!normalizedId) {
      setSelectedItem(null)
      return
    }

    setIsRefreshingDetail(true)

    try {
      const item = await getBatchProcessById(normalizedId)
      setSelectedItem(item)
    } catch {
      setSelectedItem((currentItem) => {
        if (currentItem?.processId === normalizedId) {
          return currentItem
        }

        return null
      })
    } finally {
      setIsRefreshingDetail(false)
    }
  }, [])

  useEffect(() => {
    void loadProcesses()
  }, [loadProcesses])

  useEffect(() => {
    if (!selectedProcessId) {
      setSelectedItem(null)
      return
    }

    void loadSelectedDetails(selectedProcessId)
  }, [selectedProcessId, loadSelectedDetails])

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadProcesses()
    }, 5000)

    return () => {
      window.clearInterval(timer)
    }
  }, [loadProcesses])

  const summary = useMemo(() => {
    const running = items.filter((item) => item.status === 'running').length
    const completed = items.filter((item) => item.status === 'completed').length
    const failed = items.filter((item) => item.status === 'failed').length

    return {
      total: items.length,
      running,
      completed,
      failed,
    }
  }, [items])

  return (
    <>
      <div className="content-copy">
        <p className="content-kicker">Operacional financeiro</p>
        <h2 id="content-title">Monitor de Processamentos em Lote</h2>
        <p className="content-description">
          Acompanhe em tempo real os processamentos batch do sistema com inicio, termino, status e previsao de encerramento.
        </p>
      </div>

      <div className="management-layout">
        <div className="batch-summary-grid">
          <article className="management-card batch-summary-card">
            <p className="batch-summary-label">Total</p>
            <strong>{summary.total}</strong>
          </article>
          <article className="management-card batch-summary-card">
            <p className="batch-summary-label">Em execucao</p>
            <strong>{summary.running}</strong>
          </article>
          <article className="management-card batch-summary-card">
            <p className="batch-summary-label">Concluidos</p>
            <strong>{summary.completed}</strong>
          </article>
          <article className="management-card batch-summary-card">
            <p className="batch-summary-label">Falhas</p>
            <strong>{summary.failed}</strong>
          </article>
        </div>

        <div className="management-card batch-monitor-card">
          <div className="batch-monitor-header-row">
            <h3>Fila de Processamentos</h3>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                void loadProcesses()
              }}
              disabled={isLoading}
            >
              Atualizar
            </button>
          </div>

          {errorMessage ? <p className="status-message status-error">{errorMessage}</p> : null}

          {isLoading ? <p className="status-message">Carregando processamentos...</p> : null}

          {!isLoading && items.length === 0 ? <p className="status-message">Nenhum processamento em lote encontrado.</p> : null}

          {!isLoading && items.length > 0 ? (
            <div className="batch-monitor-table-wrapper">
              <table className="management-table">
                <thead>
                  <tr>
                    <th>Processo</th>
                    <th>Status</th>
                    <th>Progresso</th>
                    <th>Inicio</th>
                    <th>Fim</th>
                    <th>Previsao</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const isSelected = item.processId === selectedProcessId

                    return (
                      <tr
                        key={item.processId}
                        className={isSelected ? 'batch-monitor-row-selected' : undefined}
                        onClick={() => setSelectedProcessId(item.processId)}
                      >
                        <td>
                          <div className="batch-process-main-cell">
                            <strong>{item.processName || item.processType || item.processId}</strong>
                            <span>{item.processId}</span>
                          </div>
                        </td>
                        <td>
                          <span className={getStatusClassName(item.status)}>{getStatusLabel(item.status)}</span>
                        </td>
                        <td>{item.progressPercent ?? 0}%</td>
                        <td>{formatDateTime(item.startedAt)}</td>
                        <td>{formatDateTime(item.finishedAt)}</td>
                        <td>{formatEta(item.etaSeconds)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        {selectedItem ? (
          <div className="management-card batch-monitor-card">
            <div className="batch-monitor-header-row">
              <h3>Detalhes do Processo</h3>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  void loadSelectedDetails(selectedItem.processId)
                }}
                disabled={isRefreshingDetail}
              >
                {isRefreshingDetail ? 'Atualizando...' : 'Atualizar detalhes'}
              </button>
            </div>

            <div className="batch-details-grid">
              <p><strong>Status:</strong> {getStatusLabel(selectedItem.status)}</p>
              <p><strong>Duracao:</strong> {formatDuration(selectedItem.startedAt, selectedItem.finishedAt)}</p>
              <p><strong>Etapa:</strong> {selectedItem.currentStepLabel || '-'}</p>
              <p><strong>Arquivo:</strong> {selectedItem.currentFileName || '-'}</p>
              <p><strong>Registros:</strong> {selectedItem.currentRecord ?? 0}/{selectedItem.totalRecords ?? 0}</p>
              <p><strong>Previsao:</strong> {formatEta(selectedItem.etaSeconds)}</p>
            </div>

            <p className="batch-details-message">{selectedItem.message || '-'}</p>

            {selectedItem.errorMessage ? <p className="status-message status-error">{selectedItem.errorMessage}</p> : null}

            {selectedItem.summary ? (
              <div className="batch-json-box">
                <h4>Resumo</h4>
                <pre>{JSON.stringify(selectedItem.summary, null, 2)}</pre>
              </div>
            ) : null}

            {selectedItem.metadata ? (
              <div className="batch-json-box">
                <h4>Metadados</h4>
                <pre>{JSON.stringify(selectedItem.metadata, null, 2)}</pre>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  )
}
