export type BatchProcessStatus = 'running' | 'completed' | 'failed'

export type BatchProcessItem = {
  processId: string
  processType: string
  processName: string
  source: string
  status: BatchProcessStatus
  isRunning: boolean
  startedAt: string
  finishedAt: string
  updatedAt: string
  message: string
  errorMessage: string
  currentStepLabel: string
  currentFileName: string
  currentRecord: number | null
  totalRecords: number | null
  progressPercent: number | null
  etaSeconds: number | null
  requestedFilters: Record<string, unknown> | null
  summary: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
}

export type BatchProcessListResponse = {
  generatedAt: string
  total: number
  running: number
  completed: number
  failed: number
  items: BatchProcessItem[]
}

const getBatchProcessesBaseUrl = () => {
  return import.meta.env.VITE_BATCH_PROCESSES_URL?.trim() || '/api/batch-processes'
}

const parseJsonSafely = (value: string) => {
  if (!value) {
    return {}
  }

  try {
    return JSON.parse(value) as Record<string, unknown>
  } catch {
    return { message: value }
  }
}

const getErrorMessage = (payload: Record<string, unknown>) => {
  return typeof payload.message === 'string' && payload.message.trim()
    ? payload.message
    : 'Falha ao consultar os processamentos em lote.'
}

const normalizeBatchProcessItem = (payload: Record<string, unknown>): BatchProcessItem => {
  return {
    processId: typeof payload.processId === 'string' ? payload.processId : '',
    processType: typeof payload.processType === 'string' ? payload.processType : '',
    processName: typeof payload.processName === 'string' ? payload.processName : '',
    source: typeof payload.source === 'string' ? payload.source : '',
    status: (payload.status as BatchProcessStatus) ?? 'running',
    isRunning: Boolean(payload.isRunning),
    startedAt: typeof payload.startedAt === 'string' ? payload.startedAt : '',
    finishedAt: typeof payload.finishedAt === 'string' ? payload.finishedAt : '',
    updatedAt: typeof payload.updatedAt === 'string' ? payload.updatedAt : '',
    message: typeof payload.message === 'string' ? payload.message : '',
    errorMessage: typeof payload.errorMessage === 'string' ? payload.errorMessage : '',
    currentStepLabel: typeof payload.currentStepLabel === 'string' ? payload.currentStepLabel : '',
    currentFileName: typeof payload.currentFileName === 'string' ? payload.currentFileName : '',
    currentRecord: typeof payload.currentRecord === 'number' ? payload.currentRecord : null,
    totalRecords: typeof payload.totalRecords === 'number' ? payload.totalRecords : null,
    progressPercent: typeof payload.progressPercent === 'number' ? payload.progressPercent : null,
    etaSeconds: typeof payload.etaSeconds === 'number' ? payload.etaSeconds : null,
    requestedFilters: (payload.requestedFilters as Record<string, unknown> | null) ?? null,
    summary: (payload.summary as Record<string, unknown> | null) ?? null,
    metadata: (payload.metadata as Record<string, unknown> | null) ?? null,
  }
}

const normalizeBatchProcessListResponse = (payload: Record<string, unknown>): BatchProcessListResponse => {
  const itemsPayload = Array.isArray(payload.items) ? payload.items : []

  return {
    generatedAt: typeof payload.generatedAt === 'string' ? payload.generatedAt : '',
    total: Number(payload.total) || 0,
    running: Number(payload.running) || 0,
    completed: Number(payload.completed) || 0,
    failed: Number(payload.failed) || 0,
    items: itemsPayload
      .filter((item) => item && typeof item === 'object')
      .map((item) => normalizeBatchProcessItem(item as Record<string, unknown>)),
  }
}

export async function listBatchProcesses(activeOnly = false): Promise<BatchProcessListResponse> {
  const queryParams = new URLSearchParams()

  if (activeOnly) {
    queryParams.set('activeOnly', 'true')
  }

  const response = await fetch(
    queryParams.size
      ? `${getBatchProcessesBaseUrl()}?${queryParams.toString()}`
      : getBatchProcessesBaseUrl(),
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    },
  )

  const responseText = await response.text()
  const payload = parseJsonSafely(responseText)

  if (!response.ok) {
    throw new Error(getErrorMessage(payload))
  }

  return normalizeBatchProcessListResponse(payload)
}

export async function listActiveBatchProcesses(): Promise<BatchProcessListResponse> {
  const response = await fetch(`${getBatchProcessesBaseUrl()}/active`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  const responseText = await response.text()
  const payload = parseJsonSafely(responseText)

  if (!response.ok) {
    throw new Error(getErrorMessage(payload))
  }

  return normalizeBatchProcessListResponse(payload)
}

export async function getBatchProcessById(processId: string): Promise<BatchProcessItem> {
  const normalizedId = processId.trim()

  if (!normalizedId) {
    throw new Error('Processo em lote invalido.')
  }

  const response = await fetch(`${getBatchProcessesBaseUrl()}/${encodeURIComponent(normalizedId)}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  const responseText = await response.text()
  const payload = parseJsonSafely(responseText)

  if (!response.ok) {
    throw new Error(getErrorMessage(payload))
  }

  return normalizeBatchProcessItem(payload)
}
