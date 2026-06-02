export type EnvironmentDiagnostics = {
  collectedAt: string
  apiProcessingMs: number
  dbResponseMs: number
  dbStatus: 'ok' | 'error'
  infrastructure: {
    cpuLoadPercent: number
    memory: {
      totalMb: number
      freeMb: number
      usedPercent: number
      processRssMb: number
      processHeapUsedMb: number
    }
    diskIo: {
      writeMs: number
      readMs: number
    }
    network: {
      tcpLatencyMs: number | null
      targetHost: string
      targetPort: number
    }
    pool: {
      totalCount: number
      idleCount: number
      waitingCount: number
      utilizationPercent: number
    }
  }
}

const diagnosticsEndpoint = '/api/monitoramento/diagnostico'

const parseJsonSafely = (value: string): Record<string, unknown> => {
  if (!value) {
    return {}
  }

  try {
    return JSON.parse(value) as Record<string, unknown>
  } catch {
    return {}
  }
}

const normalizeDiagnostics = (payload: Record<string, unknown>): EnvironmentDiagnostics => {
  const dbStatus = payload.dbStatus === 'error' ? 'error' : 'ok'
  const infrastructurePayload = payload.infrastructure && typeof payload.infrastructure === 'object'
    ? payload.infrastructure as Record<string, unknown>
    : {}
  const memoryPayload = infrastructurePayload.memory && typeof infrastructurePayload.memory === 'object'
    ? infrastructurePayload.memory as Record<string, unknown>
    : {}
  const diskIoPayload = infrastructurePayload.diskIo && typeof infrastructurePayload.diskIo === 'object'
    ? infrastructurePayload.diskIo as Record<string, unknown>
    : {}
  const networkPayload = infrastructurePayload.network && typeof infrastructurePayload.network === 'object'
    ? infrastructurePayload.network as Record<string, unknown>
    : {}
  const poolPayload = infrastructurePayload.pool && typeof infrastructurePayload.pool === 'object'
    ? infrastructurePayload.pool as Record<string, unknown>
    : {}

  return {
    collectedAt: typeof payload.collectedAt === 'string' ? payload.collectedAt : new Date().toISOString(),
    apiProcessingMs: Number(payload.apiProcessingMs) || 0,
    dbResponseMs: Number(payload.dbResponseMs) || 0,
    dbStatus,
    infrastructure: {
      cpuLoadPercent: Number(infrastructurePayload.cpuLoadPercent) || 0,
      memory: {
        totalMb: Number(memoryPayload.totalMb) || 0,
        freeMb: Number(memoryPayload.freeMb) || 0,
        usedPercent: Number(memoryPayload.usedPercent) || 0,
        processRssMb: Number(memoryPayload.processRssMb) || 0,
        processHeapUsedMb: Number(memoryPayload.processHeapUsedMb) || 0,
      },
      diskIo: {
        writeMs: Number(diskIoPayload.writeMs) || 0,
        readMs: Number(diskIoPayload.readMs) || 0,
      },
      network: {
        tcpLatencyMs: typeof networkPayload.tcpLatencyMs === 'number' ? networkPayload.tcpLatencyMs : null,
        targetHost: typeof networkPayload.targetHost === 'string' ? networkPayload.targetHost : '',
        targetPort: Number(networkPayload.targetPort) || 0,
      },
      pool: {
        totalCount: Number(poolPayload.totalCount) || 0,
        idleCount: Number(poolPayload.idleCount) || 0,
        waitingCount: Number(poolPayload.waitingCount) || 0,
        utilizationPercent: Number(poolPayload.utilizationPercent) || 0,
      },
    },
  }
}

export async function fetchEnvironmentDiagnostics(): Promise<EnvironmentDiagnostics> {
  const response = await fetch(diagnosticsEndpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  })

  const responseText = await response.text()
  const payload = parseJsonSafely(responseText)

  if (!response.ok) {
    const message = typeof payload.message === 'string' && payload.message.trim()
      ? payload.message
      : 'Falha ao consultar o diagnostico de monitoramento.'
    throw new Error(message)
  }

  return normalizeDiagnostics(payload)
}
