const baseUrl = process.env.API_BASE_URL ?? 'http://localhost:3001'
const targetMesAno = String(process.env.VERIFY_APURACAO_MES_ANO ?? '04/2026').trim()
const targetTipoPessoa = String(process.env.VERIFY_APURACAO_TIPO_PESSOA ?? 'PF').trim().toUpperCase()
const targetDreCodigo = String(process.env.VERIFY_APURACAO_DRE_CODIGO ?? '').trim()
const pollTimeoutMs = Number(process.env.VERIFY_APURACAO_POLL_TIMEOUT_MS ?? 120000)
const pollIntervalMs = Number(process.env.VERIFY_APURACAO_POLL_INTERVAL_MS ?? 1000)

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}

const wait = (milliseconds) => new Promise((resolve) => {
  setTimeout(resolve, milliseconds)
})

const requestJson = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers ?? {}),
    },
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message = payload && typeof payload.message === 'string'
      ? payload.message
      : `HTTP ${response.status} em ${path}`

    throw new Error(message)
  }

  return payload
}

const listApuracaoFinanceira = async ({ mesAno, dreCodigo = '', revisao, tipoPessoa }) => {
  const params = new URLSearchParams({
    mesAno,
    page: '1',
    pageSize: '200',
  })

  if (dreCodigo) {
    params.set('dreCodigo', dreCodigo)
  }

  if (Number.isInteger(revisao) && revisao >= 0) {
    params.set('revisao', String(revisao))
  }

  if (tipoPessoa) {
    params.set('tipoPessoa', tipoPessoa)
  }

  const payload = await requestJson(`/api/apuracao-financeira?${params.toString()}`)
  return Array.isArray(payload.items) ? payload.items : []
}

const getApuracaoFilhosResumo = async ({ mesAno, dreCodigo, revisao, tipoPessoa }) => {
  const params = new URLSearchParams({
    mesAno,
    dreCodigo,
    revisao: String(revisao),
    tipoPessoa,
  })

  try {
    const payload = await requestJson(`/api/apuracao-financeira/resumo-filhos?${params.toString()}`)
    return payload.summary ?? null
  } catch (error) {
    if (error instanceof Error && error.message.includes('Nenhum valor aglutinado')) {
      return null
    }

    throw error
  }
}

const updateApuracaoFinanceiraSituacao = async ({ mesAno, dreCodigo, revisao, tipoPessoa, situacao }) => {
  const encodedMesAno = encodeURIComponent(mesAno)
  const encodedDre = encodeURIComponent(String(dreCodigo))
  const encodedRevisao = encodeURIComponent(String(revisao))
  const encodedTipoPessoa = encodeURIComponent(tipoPessoa)

  return requestJson(`/api/apuracao-financeira/${encodedMesAno}/${encodedDre}/${encodedRevisao}/${encodedTipoPessoa}`, {
    method: 'PUT',
    body: JSON.stringify({
      mesAno,
      dreCodigo,
      revisao,
      tipoPessoa,
      situacao,
    }),
  })
}

const startRemuneracaoBatch = async ({ mesAno, dreCodigo, revisao, tipoPessoa }) => {
  return requestJson('/api/remuneracao-servicos/calcular', {
    method: 'POST',
    body: JSON.stringify({
      mesAno,
      dreCodigo,
      revisao,
      tipoPessoa,
    }),
  })
}

const waitForRemuneracaoBatchCompletion = async () => {
  const startedAt = Date.now()
  let lastStatus = null

  while (Date.now() - startedAt <= pollTimeoutMs) {
    lastStatus = await requestJson('/api/remuneracao-servicos/calcular')

    if (!lastStatus.isRunning) {
      return lastStatus
    }

    await wait(pollIntervalMs)
  }

  throw new Error(`Timeout aguardando termino do calculo de remuneracao apos ${pollTimeoutMs} ms.`)
}

const findTargetApuracao = async () => {
  const apuracaoItems = await listApuracaoFinanceira({
    mesAno: targetMesAno,
    dreCodigo: targetDreCodigo,
    tipoPessoa: targetTipoPessoa,
  })

  assert(apuracaoItems.length > 0, `Nenhuma apuracao financeira encontrada para mes/ano ${targetMesAno}, tipo ${targetTipoPessoa}${targetDreCodigo ? ` e DRE ${targetDreCodigo}` : ''}.`)

  // Prioriza revisoes mais recentes para validar o fluxo na linha operacional atual.
  const sortedItems = [...apuracaoItems].sort((left, right) => Number(right.revisao || 0) - Number(left.revisao || 0))

  for (const item of sortedItems) {
    const resumo = await getApuracaoFilhosResumo({
      mesAno: item.mesAno,
      dreCodigo: String(item.dreCodigo),
      revisao: Number(item.revisao) || 0,
      tipoPessoa: String(item.tipoPessoa || '').trim().toUpperCase(),
    })

    const totalRegistros = Number(resumo?.totalRegistros) || 0

    if (totalRegistros > 0) {
      return {
        mesAno: item.mesAno,
        dreCodigo: String(item.dreCodigo),
        revisao: Number(item.revisao) || 0,
        tipoPessoa: String(item.tipoPessoa || '').trim().toUpperCase(),
        situacao: String(item.situacao || '').trim(),
        totalRegistros,
      }
    }
  }

  throw new Error('Nenhuma apuracao financeira com registros filhos em Total Servicos foi encontrada para validar a transicao de status.')
}

const findExactApuracaoItem = async ({ mesAno, dreCodigo, revisao, tipoPessoa }) => {
  const items = await listApuracaoFinanceira({
    mesAno,
    dreCodigo,
    revisao,
    tipoPessoa,
  })

  return items.find((item) => {
    return String(item.mesAno).trim() === mesAno
      && String(item.dreCodigo).trim() === String(dreCodigo)
      && (Number(item.revisao) || 0) === revisao
      && String(item.tipoPessoa || '').trim().toUpperCase() === tipoPessoa
  }) ?? null
}

const run = async () => {
  const target = await findTargetApuracao()

  await updateApuracaoFinanceiraSituacao({
    mesAno: target.mesAno,
    dreCodigo: target.dreCodigo,
    revisao: target.revisao,
    tipoPessoa: target.tipoPessoa,
    situacao: 'A processar',
  })

  const beforeItem = await findExactApuracaoItem(target)
  assert(Boolean(beforeItem), 'Nao foi possivel localizar a apuracao financeira apos forcar status A processar.')
  assert(String(beforeItem.situacao || '').trim() === 'A processar', 'Falha ao preparar o cenario: a situacao deveria estar A processar antes do recálculo.')

  await startRemuneracaoBatch(target)
  const batchStatus = await waitForRemuneracaoBatchCompletion()

  assert(String(batchStatus.status || '').toLowerCase() === 'passed', `O lote de remuneracao nao finalizou com sucesso. Status: ${batchStatus.status || 'desconhecido'}. ${batchStatus.errorMessage || ''}`.trim())

  const afterItem = await findExactApuracaoItem(target)
  assert(Boolean(afterItem), 'Nao foi possivel localizar a apuracao financeira apos o recálculo.')

  const afterSituacao = String(afterItem.situacao || '').trim()
  assert(afterSituacao === 'Processado', `Transicao de status invalida: esperado Processado, recebido ${afterSituacao || '(vazio)'}.`)

  console.log(JSON.stringify({
    status: 'ok',
    checkedAt: new Date().toISOString(),
    mesAno: target.mesAno,
    dreCodigo: target.dreCodigo,
    revisao: target.revisao,
    tipoPessoa: target.tipoPessoa,
    totalRegistrosFilhos: target.totalRegistros,
    beforeSituacao: 'A processar',
    afterSituacao,
    batchStatus: {
      status: batchStatus.status,
      totalRegistros: Number(batchStatus.totalRegistros) || 0,
      totalCalculados: Number(batchStatus.totalCalculados) || 0,
      totalAtualizados: Number(batchStatus.totalAtualizados) || 0,
      totalIgnorados: Number(batchStatus.totalIgnorados) || 0,
      errorMessage: String(batchStatus.errorMessage || ''),
    },
  }, null, 2))
}

run().catch((error) => {
  console.error(`SMOKE APURACAO STATUS TRANSITION FALHOU: ${error.message}`)
  process.exitCode = 1
})
