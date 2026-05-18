const baseUrl = process.env.API_BASE_URL ?? 'http://localhost:3001'

const fixedScenario = {
  mesAno: '04/2026',
  dataReferencia: '2026-04-01',
  dreCodigo: '11',
  placa: 'STF3C60',
  crmcCondutor: '043.197-00',
  ordemServicoCodigo: '3348',
}

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}

const requestJson = async (path) => {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      Accept: 'application/json',
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

const buildPath = (extraParams = {}) => {
  const query = new URLSearchParams({
    mesAno: fixedScenario.mesAno,
    dataReferencia: fixedScenario.dataReferencia,
    dreCodigo: fixedScenario.dreCodigo,
    ...extraParams,
  })

  return `/api/apontamento-servicos?${query.toString()}`
}

const expectMatchingItems = (items, expected) => {
  assert(Array.isArray(items) && items.length > 0, 'Nenhum item retornado para o filtro testado.')

  for (const item of items) {
    assert(String(item?.ordemServicoCodigo ?? '') === expected.ordemServicoCodigo, `OS inesperada retornada: ${item?.ordemServicoCodigo ?? '-'}.`)
    assert(String(item?.placa ?? '') === expected.placa, `Placa inesperada retornada: ${item?.placa ?? '-'}.`)
    assert(String(item?.crmcCondutor ?? '') === expected.crmcCondutor, `CRMC inesperado retornado: ${item?.crmcCondutor ?? '-'}.`)
  }
}

const main = async () => {
  console.log('Verificando filtros de Apontamento Serviços para 01/04/2026, DRE Butantã...')

  const baseline = await requestJson(buildPath())
  const baselineItems = Array.isArray(baseline.items) ? baseline.items : []
  const baselineMatch = baselineItems.find((item) => {
    return String(item?.placa ?? '') === fixedScenario.placa
      && String(item?.crmcCondutor ?? '') === fixedScenario.crmcCondutor
      && String(item?.ordemServicoCodigo ?? '') === fixedScenario.ordemServicoCodigo
  })

  assert(baseline.total >= 1, 'A base sem filtros nao retornou ordens de servico.')
  assert(baselineMatch, 'O cenario fixo STF3C60 / 043.197-00 nao foi encontrado na base para 01/04/2026.')
  console.log(`- Base localizada com ${baseline.total} OS e cenario fixo presente.`)

  const placaFiltered = await requestJson(buildPath({ placa: fixedScenario.placa }))
  assert(placaFiltered.total === 1, `Filtro por placa deveria retornar 1 OS, mas retornou ${placaFiltered.total}.`)
  expectMatchingItems(placaFiltered.items, fixedScenario)
  console.log(`- Filtro por placa ${fixedScenario.placa} retornou 1 OS com itens consistentes.`)

  const crmcFiltered = await requestJson(buildPath({ crmcCondutor: fixedScenario.crmcCondutor }))
  assert(crmcFiltered.total === 1, `Filtro por CRMC deveria retornar 1 OS, mas retornou ${crmcFiltered.total}.`)
  expectMatchingItems(crmcFiltered.items, fixedScenario)
  console.log(`- Filtro por CRMC ${fixedScenario.crmcCondutor} retornou 1 OS com itens consistentes.`)

  console.log('Verificacao concluida com sucesso.')
}

try {
  await main()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`Falha na verificacao dos filtros de Apontamento Serviços: ${message}`)
  process.exit(1)
}