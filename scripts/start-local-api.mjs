import { execFileSync } from 'node:child_process'
import process from 'node:process'

const port = String(process.env.PORT ?? '3001').trim() || '3001'

const listListenerProcessIds = (targetPort) => {
  if (process.platform === 'win32') {
    const output = execFileSync('netstat', ['-ano', '-p', 'tcp'], { encoding: 'utf8' })

    return output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith('TCP'))
      .map((line) => line.split(/\s+/))
      .filter((parts) => parts[1]?.endsWith(`:${targetPort}`) && parts[3] === 'LISTENING')
      .map((parts) => Number(parts[4]))
      .filter((pid) => Number.isInteger(pid) && pid > 0)
  }

  try {
    const output = execFileSync('lsof', ['-ti', `tcp:${targetPort}`], { encoding: 'utf8' })

    return output
      .split(/\r?\n/)
      .map((value) => Number(value.trim()))
      .filter((pid) => Number.isInteger(pid) && pid > 0)
  } catch {
    return []
  }
}

const stopExistingListeners = (targetPort) => {
  const currentPid = process.pid
  const processIds = [...new Set(listListenerProcessIds(targetPort))].filter((pid) => pid !== currentPid)

  processIds.forEach((pid) => {
    try {
      process.kill(pid, 'SIGKILL')
      console.log(`Processo antigo encerrado na porta ${targetPort}: PID ${pid}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`Falha ao encerrar PID ${pid} na porta ${targetPort}: ${message}`)
    }
  })
}

stopExistingListeners(port)
process.env.PORT = port

await import('../server.js')
