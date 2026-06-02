import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { fetchEnvironmentDiagnostics } from './services/environmentMonitoring'
import type { EnvironmentDiagnostics } from './services/environmentMonitoring'

type MonitoringSample = {
  timestamp: string
  webMs: number
  apiMs: number
  dbMs: number
  diagnostics: EnvironmentDiagnostics
}

type StatusTone = 'idle' | 'success' | 'error'

type ChartTick = {
  x?: number
  y?: number
  label: string
}

type LineChartModel = {
  width: number
  height: number
  padding: number
  maxValue: number
  polyline: string
  xTicks: ChartTick[]
  yTicks: ChartTick[]
}

type InfraToneClass =
  | 'environment-monitor-infra-green'
  | 'environment-monitor-infra-yellow'
  | 'environment-monitor-infra-red'
  | 'environment-monitor-infra-neutral'

const clampSampleCount = (value: number) => Math.min(Math.max(value, 1), 30)
const clampIntervalSeconds = (value: number) => Math.min(Math.max(value, 0), 30)

const formatMs = (value: number) => `${value.toFixed(1)} ms`

const resolveInfraToneClass = (value: number, threshold: number): InfraToneClass => {
  if (!Number.isFinite(value)) {
    return 'environment-monitor-infra-neutral'
  }

  if (value >= threshold) {
    return 'environment-monitor-infra-red'
  }

  if (value >= threshold * 0.8) {
    return 'environment-monitor-infra-yellow'
  }

  return 'environment-monitor-infra-green'
}

const wait = (milliseconds: number) => new Promise<void>((resolve) => {
  window.setTimeout(resolve, milliseconds)
})

const calculateAverage = (values: number[]) => {
  if (values.length === 0) {
    return 0
  }

  const total = values.reduce((accumulator, current) => accumulator + current, 0)
  return total / values.length
}

const calculateStdDev = (values: number[]) => {
  if (values.length <= 1) {
    return 0
  }

  const average = calculateAverage(values)
  const variance = values.reduce((accumulator, current) => {
    const distance = current - average
    return accumulator + distance * distance
  }, 0) / values.length

  return Math.sqrt(variance)
}

const calculatePercentile = (values: number[], percentile: number) => {
  if (values.length === 0) {
    return 0
  }

  const sortedValues = [...values].sort((left, right) => left - right)
  const boundedPercentile = Math.min(Math.max(percentile, 0), 100)
  const position = (boundedPercentile / 100) * (sortedValues.length - 1)
  const lowerIndex = Math.floor(position)
  const upperIndex = Math.ceil(position)

  if (lowerIndex === upperIndex) {
    return sortedValues[lowerIndex]
  }

  const interpolation = position - lowerIndex
  return sortedValues[lowerIndex] + ((sortedValues[upperIndex] - sortedValues[lowerIndex]) * interpolation)
}

const buildXTickIndices = (total: number, maxTicks = 6) => {
  if (total <= 0) {
    return []
  }

  if (total <= maxTicks) {
    return Array.from({ length: total }, (_, index) => index)
  }

  const step = (total - 1) / (maxTicks - 1)
  const indices = new Set<number>()

  for (let index = 0; index < maxTicks; index += 1) {
    indices.add(Math.round(index * step))
  }

  return [...indices].sort((left, right) => left - right)
}

const formatTimeTickLabel = (value: string) => {
  const dateValue = new Date(value)

  if (Number.isNaN(dateValue.getTime())) {
    return '--:--:--'
  }

  return dateValue.toLocaleTimeString('pt-BR')
}

const resolveXCoordinate = (index: number, total: number, width: number, padding: number) => {
  const usableWidth = width - (padding * 2)
  return padding + (total <= 1 ? 0 : (index / (total - 1)) * usableWidth)
}

const resolveYCoordinate = (value: number, maxValue: number, height: number, padding: number) => {
  const usableHeight = height - (padding * 2)
  const safeMax = maxValue <= 0 ? 1 : maxValue
  return padding + usableHeight - ((value / safeMax) * usableHeight)
}

const resolvePoint = (index: number, total: number, value: number, maxValue: number, width: number, height: number, padding: number) => {
  const usableWidth = width - (padding * 2)
  const usableHeight = height - (padding * 2)
  const safeMax = maxValue <= 0 ? 1 : maxValue
  const x = padding + (total <= 1 ? 0 : (index / (total - 1)) * usableWidth)
  const y = padding + usableHeight - ((value / safeMax) * usableHeight)
  return `${x.toFixed(2)},${y.toFixed(2)}`
}

const buildPolyline = (
  values: number[],
  maxValue: number,
  width: number,
  height: number,
  padding: number,
) => {
  return values
    .map((value, index) => resolvePoint(index, values.length, value, maxValue, width, height, padding))
    .join(' ')
}

const buildLineChartModel = (
  values: number[],
  timestamps: string[],
  options: { width: number, height: number, padding: number, yTickCount?: number, xTickCount?: number, fixedMax?: number },
): LineChartModel => {
  const { width, height, padding } = options
  const yTickCount = options.yTickCount ?? 5
  const xTickCount = options.xTickCount ?? 6
  const fixedMax = options.fixedMax
  const safeValues = values.length ? values : [0]
  const maxValue = Math.max(...safeValues, Number.isFinite(fixedMax) ? Number(fixedMax) : 1)
  const polyline = values.length ? buildPolyline(values, maxValue, width, height, padding) : ''

  const yTicks: ChartTick[] = Array.from({ length: yTickCount }, (_, index) => {
    const ratio = yTickCount <= 1 ? 1 : (index / (yTickCount - 1))
    const tickValue = maxValue * (1 - ratio)

    return {
      y: resolveYCoordinate(tickValue, maxValue, height, padding),
      label: tickValue >= 100 ? `${tickValue.toFixed(0)}` : `${tickValue.toFixed(1)}`,
    }
  })

  const xTickIndices = buildXTickIndices(values.length, xTickCount)
  const xTicks: ChartTick[] = xTickIndices.map((index) => ({
    x: resolveXCoordinate(index, values.length, width, padding),
    label: formatTimeTickLabel(timestamps[index] ?? ''),
  }))

  return {
    width,
    height,
    padding,
    maxValue,
    polyline,
    xTicks,
    yTicks,
  }
}

const buildEnvironmentSuggestions = (samples: MonitoringSample[], latestDiagnostics: EnvironmentDiagnostics | null) => {
  if (samples.length === 0) {
    return [
      'Colete ao menos uma amostra para gerar diagnostico do ambiente.',
      'Acompanhe CPU, memoria, disco e conexoes simultaneas durante o horario de pico.',
      'Defina uma linha de base por horario para comparar degradacoes futuras.',
    ]
  }

  const webValues = samples.map((item) => item.webMs)
  const apiValues = samples.map((item) => item.apiMs)
  const dbValues = samples.map((item) => item.dbMs)
  const avgWeb = calculateAverage(webValues)
  const avgApi = calculateAverage(apiValues)
  const avgDb = calculateAverage(dbValues)
  const p95Web = calculatePercentile(webValues, 95)
  const p95Api = calculatePercentile(apiValues, 95)
  const p95Db = calculatePercentile(dbValues, 95)
  const webStdDev = calculateStdDev(webValues)
  const apiStdDev = calculateStdDev(apiValues)
  const dbStdDev = calculateStdDev(dbValues)
  const suggestions: string[] = []

  if (avgWeb > 1200) {
    suggestions.push('Tempo web medio alto. Verifique tamanho de payloads, compressao HTTP e cache de assets estaticos.')
  } else if (avgWeb > 700) {
    suggestions.push('Tempo web moderado. Avalie cache no frontend e revisao de recursos que bloqueiam renderizacao.')
  }

  if (avgApi > 900) {
    suggestions.push('Tempo de API elevado. Revise endpoints mais lentos, limites de concorrencia e logs de erro no servidor.')
  } else if (avgApi > 450) {
    suggestions.push('Tempo de API em atencao. Considere monitorar p95/p99 para identificar picos fora da media.')
  }

  if (avgDb > 300) {
    suggestions.push('Tempo de banco alto. Avalie indices, planos de execucao e contencao de locks.')
  } else if (avgDb > 150) {
    suggestions.push('Tempo de banco moderado. Monitore consultas com maior custo e ajuste de pool de conexoes.')
  }

  if (webStdDev > 250 || apiStdDev > 250 || dbStdDev > 120) {
    suggestions.push('Foi detectada alta variabilidade entre amostras. Investigue oscilacao de carga, recursos de infraestrutura e jobs concorrentes.')
  }

  if (p95Web > 1500 || p95Api > 1200 || p95Db > 450) {
    suggestions.push('Os percentis p95 estao elevados para pelo menos uma camada. Priorize gargalos de cauda longa antes de aumentar capacidade.')
  }

  if (latestDiagnostics) {
    const infra = latestDiagnostics.infrastructure

    if (infra.cpuLoadPercent > 80) {
      suggestions.push('CPU acima de 80%. Avalie concorrencia, limites de processo e distribuicao de carga.')
    }

    if (infra.memory.usedPercent > 85) {
      suggestions.push('Uso de memoria elevado. Verifique pressao de heap, caches e configuracao de memoria do processo.')
    }

    if (infra.pool.waitingCount > 0 || infra.pool.utilizationPercent > 85) {
      suggestions.push('Pool de conexoes com espera/alta utilizacao. Ajuste tamanho do pool e otimize consultas mais custosas.')
    }

    if ((infra.network.tcpLatencyMs ?? 0) > 120) {
      suggestions.push('Latencia de rede ao banco acima do esperado. Verifique rota, firewall, DNS e proximidade da infraestrutura.')
    }
  }

  suggestions.push('Inclua no acompanhamento metricas de infraestrutura: CPU, memoria, I/O de disco, latencia de rede e uso do pool de conexoes.')
  suggestions.push('Para avaliacao continua do ambiente, acompanhe SLO com p95 e p99 para web, API e banco alem da media.')

  return suggestions
}

async function collectSample(): Promise<MonitoringSample> {
  const timestamp = new Date().toISOString()

  const webStart = performance.now()
  const webResponse = await fetch(`/?monitoramento=${Date.now()}`, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Accept: 'text/html',
    },
  })

  if (!webResponse.ok) {
    throw new Error('Falha ao medir tempo de resposta web.')
  }

  const webMs = performance.now() - webStart

  const apiStart = performance.now()
  const diagnostics = await fetchEnvironmentDiagnostics()
  const apiMs = performance.now() - apiStart

  return {
    timestamp,
    webMs,
    apiMs,
    dbMs: diagnostics.dbResponseMs,
    diagnostics,
  }
}

export default function EnvironmentMonitoringView() {
  const [sampleCountInput, setSampleCountInput] = useState('6')
  const [intervalSecondsInput, setIntervalSecondsInput] = useState('1')
  const [samples, setSamples] = useState<MonitoringSample[]>([])
  const [latestDiagnostics, setLatestDiagnostics] = useState<EnvironmentDiagnostics | null>(null)
  const [isCollecting, setIsCollecting] = useState(false)
  const [statusTone, setStatusTone] = useState<StatusTone>('idle')
  const [statusMessage, setStatusMessage] = useState('')

  const sloMetrics = useMemo(() => {
    const webValues = samples.map((item) => item.webMs)
    const apiValues = samples.map((item) => item.apiMs)
    const dbValues = samples.map((item) => item.dbMs)

    return {
      web: {
        avg: calculateAverage(webValues),
        p95: calculatePercentile(webValues, 95),
        p99: calculatePercentile(webValues, 99),
      },
      api: {
        avg: calculateAverage(apiValues),
        p95: calculatePercentile(apiValues, 95),
        p99: calculatePercentile(apiValues, 99),
      },
      db: {
        avg: calculateAverage(dbValues),
        p95: calculatePercentile(dbValues, 95),
        p99: calculatePercentile(dbValues, 99),
      },
    }
  }, [samples])

  const chartModel = useMemo(() => {
    const webValues = samples.map((item) => item.webMs)
    const apiValues = samples.map((item) => item.apiMs)
    const dbValues = samples.map((item) => item.dbMs)
    const timestamps = samples.map((item) => item.timestamp)
    const baseModel = buildLineChartModel(
      [...webValues, ...apiValues, ...dbValues],
      timestamps,
      { width: 980, height: 320, padding: 44, yTickCount: 6, xTickCount: 6 },
    )

    return {
      ...baseModel,
      webPolyline: webValues.length
        ? buildPolyline(webValues, baseModel.maxValue, baseModel.width, baseModel.height, baseModel.padding)
        : '',
      apiPolyline: apiValues.length
        ? buildPolyline(apiValues, baseModel.maxValue, baseModel.width, baseModel.height, baseModel.padding)
        : '',
      dbPolyline: dbValues.length
        ? buildPolyline(dbValues, baseModel.maxValue, baseModel.width, baseModel.height, baseModel.padding)
        : '',
    }
  }, [samples])

  const infraTrendModels = useMemo(() => {
    const timestamps = samples.map((item) => item.timestamp)

    const cpuValues = samples.map((item) => item.diagnostics.infrastructure.cpuLoadPercent)
    const memoryValues = samples.map((item) => item.diagnostics.infrastructure.memory.usedPercent)
    const poolValues = samples.map((item) => item.diagnostics.infrastructure.pool.utilizationPercent)

    return [
      {
        key: 'cpu',
        title: 'CPU (%)',
        alertValue: 80,
        alertLabel: 'Limite 80%',
        lineClassName: 'environment-monitor-line-cpu',
        model: buildLineChartModel(cpuValues, timestamps, { width: 420, height: 210, padding: 34, yTickCount: 5, xTickCount: 4, fixedMax: 100 }),
      },
      {
        key: 'memory',
        title: 'Memoria do Host (%)',
        alertValue: 85,
        alertLabel: 'Limite 85%',
        lineClassName: 'environment-monitor-line-memory',
        model: buildLineChartModel(memoryValues, timestamps, { width: 420, height: 210, padding: 34, yTickCount: 5, xTickCount: 4, fixedMax: 100 }),
      },
      {
        key: 'pool',
        title: 'Uso do Pool (%)',
        alertValue: 85,
        alertLabel: 'Limite 85%',
        lineClassName: 'environment-monitor-line-pool',
        model: buildLineChartModel(poolValues, timestamps, { width: 420, height: 210, padding: 34, yTickCount: 5, xTickCount: 4, fixedMax: 100 }),
      },
    ]
  }, [samples])

  const suggestions = useMemo(() => buildEnvironmentSuggestions(samples, latestDiagnostics), [latestDiagnostics, samples])
  const cpuInfraToneClass = latestDiagnostics
    ? resolveInfraToneClass(latestDiagnostics.infrastructure.cpuLoadPercent, 80)
    : 'environment-monitor-infra-neutral'
  const memoryInfraToneClass = latestDiagnostics
    ? resolveInfraToneClass(latestDiagnostics.infrastructure.memory.usedPercent, 85)
    : 'environment-monitor-infra-neutral'
  const poolInfraToneClass = latestDiagnostics
    ? resolveInfraToneClass(latestDiagnostics.infrastructure.pool.utilizationPercent, 85)
    : 'environment-monitor-infra-neutral'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const sampleCount = clampSampleCount(Number(sampleCountInput) || 1)
    const intervalSeconds = clampIntervalSeconds(Number(intervalSecondsInput) || 0)

    setSampleCountInput(String(sampleCount))
    setIntervalSecondsInput(String(intervalSeconds))
    setIsCollecting(true)
    setStatusTone('idle')
    setStatusMessage('Executando coleta de monitoramento...')

    try {
      const nextSamples: MonitoringSample[] = []

      for (let index = 0; index < sampleCount; index += 1) {
        const sample = await collectSample()
        nextSamples.push(sample)
        setLatestDiagnostics(sample.diagnostics)
        setSamples((current) => [...current, sample].slice(-80))

        if (index < sampleCount - 1 && intervalSeconds > 0) {
          await wait(intervalSeconds * 1000)
        }
      }

      setStatusTone('success')
      setStatusMessage(`Coleta concluida com ${nextSamples.length} amostra(s).`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao executar monitoramento.'
      setStatusTone('error')
      setStatusMessage(message)
    } finally {
      setIsCollecting(false)
    }
  }

  return (
    <>
      <div className="content-copy">
        <p className="content-kicker">Monitoramento operacional</p>
        <h2 id="content-title">Diagnostico de Tempo de Resposta</h2>
        <p className="content-description">
          Execute coletas para acompanhar o tempo de resposta web, API e banco de dados em uma unica visao.
        </p>
      </div>

      <div className="management-layout">
        <form className="management-card environment-monitor-form" onSubmit={handleSubmit}>
          <div className="environment-monitor-form-grid">
            <label className="field-group" htmlFor="monitor-samples">
              <span>Quantidade de amostras (1 a 30)</span>
              <input
                id="monitor-samples"
                type="number"
                min={1}
                max={30}
                value={sampleCountInput}
                onChange={(event) => setSampleCountInput(event.target.value)}
                disabled={isCollecting}
              />
            </label>

            <label className="field-group" htmlFor="monitor-interval">
              <span>Intervalo entre amostras (segundos)</span>
              <input
                id="monitor-interval"
                type="number"
                min={0}
                max={30}
                value={intervalSecondsInput}
                onChange={(event) => setIntervalSecondsInput(event.target.value)}
                disabled={isCollecting}
              />
            </label>
          </div>

          <div className="environment-monitor-actions">
            <button type="submit" className="primary-button" disabled={isCollecting}>
              {isCollecting ? 'Coletando...' : 'Executar monitoramento'}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setSamples([])
                setLatestDiagnostics(null)
                setStatusTone('idle')
                setStatusMessage('')
              }}
              disabled={isCollecting || samples.length === 0}
            >
              Limpar historico
            </button>
          </div>

          <p className={`status-message status-${statusTone}`} aria-live="polite">
            {statusMessage}
          </p>
        </form>

        <div className="environment-monitor-summary-grid">
          <article className="management-card environment-monitor-summary-card">
            <p>Media Web</p>
            <strong>{formatMs(sloMetrics.web.avg)}</strong>
          </article>
          <article className="management-card environment-monitor-summary-card">
            <p>Media API</p>
            <strong>{formatMs(sloMetrics.api.avg)}</strong>
          </article>
          <article className="management-card environment-monitor-summary-card">
            <p>Media Banco</p>
            <strong>{formatMs(sloMetrics.db.avg)}</strong>
          </article>
        </div>

        <div className="management-card environment-monitor-slo-card">
          <div className="management-grid-header">
            <h2>SLO de latencia (media, p95 e p99)</h2>
          </div>
          <div className="environment-monitor-slo-table-wrapper">
            <table className="management-table">
              <thead>
                <tr>
                  <th>Camada</th>
                  <th>Media</th>
                  <th>p95</th>
                  <th>p99</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Web</td>
                  <td>{formatMs(sloMetrics.web.avg)}</td>
                  <td>{formatMs(sloMetrics.web.p95)}</td>
                  <td>{formatMs(sloMetrics.web.p99)}</td>
                </tr>
                <tr>
                  <td>API</td>
                  <td>{formatMs(sloMetrics.api.avg)}</td>
                  <td>{formatMs(sloMetrics.api.p95)}</td>
                  <td>{formatMs(sloMetrics.api.p99)}</td>
                </tr>
                <tr>
                  <td>Banco</td>
                  <td>{formatMs(sloMetrics.db.avg)}</td>
                  <td>{formatMs(sloMetrics.db.p95)}</td>
                  <td>{formatMs(sloMetrics.db.p99)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="management-card environment-monitor-infra-card">
          <div className="management-grid-header">
            <h2>Metricas de infraestrutura (ultima coleta)</h2>
          </div>

          {latestDiagnostics ? (
            <div className="environment-monitor-infra-grid">
              <article className={`environment-monitor-infra-item ${cpuInfraToneClass}`}>
                <p>CPU</p>
                <strong>{latestDiagnostics.infrastructure.cpuLoadPercent.toFixed(1)}%</strong>
              </article>
              <article className={`environment-monitor-infra-item ${memoryInfraToneClass}`}>
                <p>Memoria do host</p>
                <strong>{latestDiagnostics.infrastructure.memory.usedPercent.toFixed(1)}%</strong>
                <span>{latestDiagnostics.infrastructure.memory.freeMb.toFixed(1)} MB livres</span>
              </article>
              <article className="environment-monitor-infra-item environment-monitor-infra-neutral">
                <p>Memoria do processo</p>
                <strong>RSS {latestDiagnostics.infrastructure.memory.processRssMb.toFixed(1)} MB</strong>
                <span>Heap {latestDiagnostics.infrastructure.memory.processHeapUsedMb.toFixed(1)} MB</span>
              </article>
              <article className="environment-monitor-infra-item environment-monitor-infra-neutral">
                <p>I/O de disco</p>
                <strong>Write {latestDiagnostics.infrastructure.diskIo.writeMs.toFixed(2)} ms</strong>
                <span>Read {latestDiagnostics.infrastructure.diskIo.readMs.toFixed(2)} ms</span>
              </article>
              <article className="environment-monitor-infra-item environment-monitor-infra-neutral">
                <p>Latencia de rede</p>
                <strong>{latestDiagnostics.infrastructure.network.tcpLatencyMs == null ? 'Indisponivel' : `${latestDiagnostics.infrastructure.network.tcpLatencyMs.toFixed(2)} ms`}</strong>
                <span>{latestDiagnostics.infrastructure.network.targetHost}:{latestDiagnostics.infrastructure.network.targetPort}</span>
              </article>
              <article className={`environment-monitor-infra-item ${poolInfraToneClass}`}>
                <p>Pool de conexoes</p>
                <strong>{latestDiagnostics.infrastructure.pool.utilizationPercent.toFixed(1)}% em uso</strong>
                <span>Total {latestDiagnostics.infrastructure.pool.totalCount} | Idle {latestDiagnostics.infrastructure.pool.idleCount} | Fila {latestDiagnostics.infrastructure.pool.waitingCount}</span>
              </article>
            </div>
          ) : (
            <p className="management-empty-state">Colete amostras para visualizar as metricas de infraestrutura.</p>
          )}
        </div>

        <div className="management-card environment-monitor-chart-card">
          <div className="management-grid-header">
            <h2>Grafico de tempo de resposta (ms)</h2>
            <span>{samples.length} amostra(s)</span>
          </div>

          {samples.length === 0 ? (
            <p className="management-empty-state">Nenhuma amostra coletada ainda.</p>
          ) : (
            <>
              <div className="environment-monitor-legend">
                <span><i className="legend-dot legend-dot-web" /> Web</span>
                <span><i className="legend-dot legend-dot-api" /> API</span>
                <span><i className="legend-dot legend-dot-db" /> Banco</span>
              </div>

              <div className="environment-monitor-chart-wrapper">
                <svg viewBox={`0 0 ${chartModel.width} ${chartModel.height}`} role="img" aria-label="Grafico de monitoramento de tempo de resposta">
                  {chartModel.yTicks.map((tick) => (
                    <g key={`main-y-${tick.label}-${tick.y}`}>
                      <line
                        x1={chartModel.padding}
                        y1={tick.y}
                        x2={chartModel.width - chartModel.padding}
                        y2={tick.y}
                        className="environment-monitor-grid-line"
                      />
                      <text
                        x={chartModel.padding - 10}
                        y={(tick.y ?? 0) + 4}
                        className="environment-monitor-axis-label"
                        textAnchor="end"
                      >
                        {tick.label}
                      </text>
                    </g>
                  ))}

                  {chartModel.xTicks.map((tick) => (
                    <g key={`main-x-${tick.label}-${tick.x}`}>
                      <line
                        x1={tick.x}
                        y1={chartModel.height - chartModel.padding}
                        x2={tick.x}
                        y2={chartModel.padding}
                        className="environment-monitor-grid-line"
                      />
                      <text
                        x={tick.x}
                        y={chartModel.height - chartModel.padding + 18}
                        className="environment-monitor-axis-label"
                        textAnchor="middle"
                      >
                        {tick.label}
                      </text>
                    </g>
                  ))}

                  <line
                    x1={chartModel.padding}
                    y1={chartModel.height - chartModel.padding}
                    x2={chartModel.width - chartModel.padding}
                    y2={chartModel.height - chartModel.padding}
                    className="environment-monitor-axis"
                  />
                  <line
                    x1={chartModel.padding}
                    y1={chartModel.padding}
                    x2={chartModel.padding}
                    y2={chartModel.height - chartModel.padding}
                    className="environment-monitor-axis"
                  />

                  <polyline points={chartModel.webPolyline} className="environment-monitor-line environment-monitor-line-web" />
                  <polyline points={chartModel.apiPolyline} className="environment-monitor-line environment-monitor-line-api" />
                  <polyline points={chartModel.dbPolyline} className="environment-monitor-line environment-monitor-line-db" />

                  <text
                    x={chartModel.padding - 26}
                    y={chartModel.padding - 10}
                    className="environment-monitor-axis-label"
                    textAnchor="start"
                  >
                    ms
                  </text>
                </svg>
              </div>

              <div className="environment-monitor-last-samples">
                {samples.slice(-5).map((sample) => (
                  <div key={sample.timestamp} className="environment-monitor-last-sample-item">
                    <strong>{new Date(sample.timestamp).toLocaleTimeString('pt-BR')}</strong>
                    <span>Web: {formatMs(sample.webMs)}</span>
                    <span>API: {formatMs(sample.apiMs)}</span>
                    <span>DB: {formatMs(sample.dbMs)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="management-card environment-monitor-mini-trends-card">
          <div className="management-grid-header">
            <h2>Mini graficos temporais de infraestrutura</h2>
            <span>CPU, memoria e pool por amostra</span>
          </div>

          {samples.length === 0 ? (
            <p className="management-empty-state">Nenhuma amostra coletada para exibir tendencia de infraestrutura.</p>
          ) : (
            <div className="environment-monitor-mini-trends-grid">
              {infraTrendModels.map((trendItem) => (
                <article key={trendItem.key} className="environment-monitor-mini-trend-item">
                  <strong>{trendItem.title}</strong>
                  <div className="environment-monitor-mini-chart-wrapper">
                    <svg
                      viewBox={`0 0 ${trendItem.model.width} ${trendItem.model.height}`}
                      role="img"
                      aria-label={`Tendencia temporal de ${trendItem.title}`}
                    >
                      <line
                        x1={trendItem.model.padding}
                        y1={resolveYCoordinate(trendItem.alertValue, trendItem.model.maxValue, trendItem.model.height, trendItem.model.padding)}
                        x2={trendItem.model.width - trendItem.model.padding}
                        y2={resolveYCoordinate(trendItem.alertValue, trendItem.model.maxValue, trendItem.model.height, trendItem.model.padding)}
                        className="environment-monitor-threshold-line"
                      />
                      <text
                        x={trendItem.model.width - trendItem.model.padding}
                        y={resolveYCoordinate(trendItem.alertValue, trendItem.model.maxValue, trendItem.model.height, trendItem.model.padding) - 6}
                        className="environment-monitor-threshold-label"
                        textAnchor="end"
                      >
                        {trendItem.alertLabel}
                      </text>

                      {trendItem.model.yTicks.map((tick) => (
                        <g key={`${trendItem.key}-y-${tick.label}-${tick.y}`}>
                          <line
                            x1={trendItem.model.padding}
                            y1={tick.y}
                            x2={trendItem.model.width - trendItem.model.padding}
                            y2={tick.y}
                            className="environment-monitor-grid-line"
                          />
                          <text
                            x={trendItem.model.padding - 8}
                            y={(tick.y ?? 0) + 4}
                            className="environment-monitor-axis-label environment-monitor-axis-label-mini"
                            textAnchor="end"
                          >
                            {tick.label}
                          </text>
                        </g>
                      ))}

                      {trendItem.model.xTicks.map((tick) => (
                        <g key={`${trendItem.key}-x-${tick.label}-${tick.x}`}>
                          <line
                            x1={tick.x}
                            y1={trendItem.model.height - trendItem.model.padding}
                            x2={tick.x}
                            y2={trendItem.model.padding}
                            className="environment-monitor-grid-line"
                          />
                          <text
                            x={tick.x}
                            y={trendItem.model.height - trendItem.model.padding + 14}
                            className="environment-monitor-axis-label environment-monitor-axis-label-mini"
                            textAnchor="middle"
                          >
                            {tick.label}
                          </text>
                        </g>
                      ))}

                      <line
                        x1={trendItem.model.padding}
                        y1={trendItem.model.height - trendItem.model.padding}
                        x2={trendItem.model.width - trendItem.model.padding}
                        y2={trendItem.model.height - trendItem.model.padding}
                        className="environment-monitor-axis"
                      />
                      <line
                        x1={trendItem.model.padding}
                        y1={trendItem.model.padding}
                        x2={trendItem.model.padding}
                        y2={trendItem.model.height - trendItem.model.padding}
                        className="environment-monitor-axis"
                      />

                      <polyline points={trendItem.model.polyline} className={`environment-monitor-line ${trendItem.lineClassName}`} />
                    </svg>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="management-card environment-monitor-suggestions-card">
          <div className="management-grid-header">
            <h2>Sugestoes de avaliacao do ambiente</h2>
          </div>
          <ul className="environment-monitor-suggestions-list">
            {suggestions.map((suggestion) => (
              <li key={suggestion}>{suggestion}</li>
            ))}
          </ul>
        </div>
      </div>
    </>
  )
}
