const baseUrl = process.env.API_BASE_URL ?? 'http://localhost:3001'

const fixedScenario = {
  mesAno: '04/2026',
  dataReferencia: '2026-04-01',
  expectedFirstEmpresa: 'CARIVALDO DE JESUS',
  expectedFirstCondutor: 'CARIVALDO DE JESUS',
  expectedSecondEmpresa: 'DAVID LOPES BATISTA',
  expectedSecondCondutor: 'DAVID LOPES BATISTA',
}

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}

const compareStrings = (left, right) => {
  return String(left ?? '').trim().localeCompare(String(right ?? '').trim(), 'pt-BR', { sensitivity: 'base' })
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

const main = async () => {
  console.log('Verificando ordenacao alfabetica de Apontamento Servicos por empresa/condutor...')

  const query = new URLSearchParams({
    mesAno: fixedScenario.mesAno,
    dataReferencia: fixedScenario.dataReferencia,
    page: '1',
    pageSize: '50',
  })

  const response = await requestJson(`/api/apontamento-servicos?${query.toString()}`)
  const items = Array.isArray(response.items) ? response.items : []
  assert(items.length > 0, 'Nenhum item retornado para a verificacao de ordenacao.')

  const groupedOrdens = []
  const seenGroupKeys = new Set()

  for (const item of items) {
    const groupKey = [item.mesAno, item.dreCodigo, item.ordemServicoCodigo, item.revisao, item.tipoPessoa].join('|')

    if (seenGroupKeys.has(groupKey)) {
      continue
    }

    seenGroupKeys.add(groupKey)
    groupedOrdens.push({
      empresa: String(item.empresa ?? '').trim(),
      nomeCondutor: String(item.nomeCondutor ?? '').trim(),
      ordemServicoCodigo: String(item.ordemServicoCodigo ?? '').trim(),
    })
  }

  assert(groupedOrdens.length >= 2, 'A verificacao de ordenacao exige ao menos duas OS agrupadas.')

  for (let index = 1; index < groupedOrdens.length; index += 1) {
    const previous = groupedOrdens[index - 1]
    const current = groupedOrdens[index]
    const companyComparison = compareStrings(previous.empresa, current.empresa)

    if (companyComparison < 0) {
      continue
    }

    if (companyComparison === 0) {
      const driverComparison = compareStrings(previous.nomeCondutor, current.nomeCondutor)
      assert(driverComparison <= 0, `Condutor fora de ordem alfabetica entre ${previous.nomeCondutor} e ${current.nomeCondutor}.`)
      continue
    }

    throw new Error(`Empresa fora de ordem alfabetica entre ${previous.empresa} e ${current.empresa}.`)
  }

  assert(groupedOrdens[0].empresa === fixedScenario.expectedFirstEmpresa, `Primeira empresa inesperada: ${groupedOrdens[0].empresa || '-'}.`)
  assert(groupedOrdens[0].nomeCondutor === fixedScenario.expectedFirstCondutor, `Primeiro condutor inesperado: ${groupedOrdens[0].nomeCondutor || '-'}.`)
  assert(groupedOrdens[1].empresa === fixedScenario.expectedSecondEmpresa, `Segunda empresa inesperada: ${groupedOrdens[1].empresa || '-'}.`)
  assert(groupedOrdens[1].nomeCondutor === fixedScenario.expectedSecondCondutor, `Segundo condutor inesperado: ${groupedOrdens[1].nomeCondutor || '-'}.`)

  console.log(`- Primeira OS agrupada: ${groupedOrdens[0].empresa} / ${groupedOrdens[0].nomeCondutor}`)
  console.log(`- Segunda OS agrupada: ${groupedOrdens[1].empresa} / ${groupedOrdens[1].nomeCondutor}`)
  console.log(`- Ordenacao alfabetica validada para ${groupedOrdens.length} OS agrupada(s).`)
}

try {
  await main()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`Falha na verificacao da ordenacao de Apontamento Servicos: ${message}`)
  process.exit(1)
}