import { Client } from 'pg'

const dbConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: Number(process.env.POSTGRES_PORT || 5432),
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || '12345',
  database: process.env.POSTGRES_DB || process.env.PGDATABASE || 'teg_cursor',
}

const parseNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const formatCurrency = (value) => parseNumber(value).toFixed(6)

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}

const findLatestCondicaoValor = async ({ client, modalidadeDescricao, tipoBancadaDescricao, tipoPgtoDescricao, quantidade }) => {
  const result = await client.query(
    `SELECT
       mbv.valor::numeric(14,2) AS valor,
       TO_CHAR(mbv.data, 'YYYY-MM-DD') AS data,
       c.qtde_ini,
       c.qtde_fim
     FROM modal_bancada_condicao_tipo_pgto_valor mbv
     INNER JOIN modal_bancada_condicao_tipo_pgto assoc ON assoc.codigo = mbv.modal_bancada_condicao_tipo_pgto_codigo
     INNER JOIN modalidade_tipo_bancada mtb ON mtb.codigo = assoc.modalidade_tipo_bancada_codigo
     INNER JOIN modalidade m ON m.codigo = mtb.modalidade_codigo
     INNER JOIN tipo_bancada tb ON tb.codigo = mtb.tipo_bancada_codigo
     INNER JOIN tipo_pgto tp ON tp.codigo = assoc.tipo_pgto_codigo
     INNER JOIN condicao c ON c.codigo = assoc.condicao_codigo
     WHERE UPPER(BTRIM(m.descricao)) = UPPER(BTRIM($1))
       AND UPPER(BTRIM(tb.descricao)) = UPPER(BTRIM($2))
       AND UPPER(BTRIM(tp.descricao)) = UPPER(BTRIM($3))
       AND c.qtde_ini <= $4
       AND c.qtde_fim >= $4
     ORDER BY mbv.data DESC, mbv.codigo DESC
     LIMIT 1`,
    [modalidadeDescricao, tipoBancadaDescricao, tipoPgtoDescricao, quantidade],
  )

  return result.rows[0] ?? null
}

const resolveAcessivelModalidade = async (client) => {
  const preferredModalidades = ['TEG ACESSIVEL', 'TEG REGULAR']

  for (const modalidade of preferredModalidades) {
    const result = await client.query(
      `SELECT 1
       FROM modal_bancada_condicao_tipo_pgto_valor mbv
       INNER JOIN modal_bancada_condicao_tipo_pgto assoc ON assoc.codigo = mbv.modal_bancada_condicao_tipo_pgto_codigo
       INNER JOIN modalidade_tipo_bancada mtb ON mtb.codigo = assoc.modalidade_tipo_bancada_codigo
       INNER JOIN modalidade m ON m.codigo = mtb.modalidade_codigo
       INNER JOIN tipo_bancada tb ON tb.codigo = mtb.tipo_bancada_codigo
       WHERE UPPER(BTRIM(m.descricao)) = UPPER(BTRIM($1))
         AND UPPER(BTRIM(tb.descricao)) = UPPER(BTRIM('Acessível'))
       LIMIT 1`,
      [modalidade],
    )

    if (result.rowCount > 0) {
      return modalidade
    }
  }

  throw new Error('Nao foi encontrado cadastro para Acessivel em TEG ACESSIVEL nem em TEG REGULAR.')
}

const resolveCrecheTipoBancada = async (client) => {
  const preferredTiposBancada = ['Creche', 'Crecheeee']

  for (const tipoBancada of preferredTiposBancada) {
    const result = await client.query(
      `SELECT 1
       FROM modal_bancada_condicao_tipo_pgto_valor mbv
       INNER JOIN modal_bancada_condicao_tipo_pgto assoc ON assoc.codigo = mbv.modal_bancada_condicao_tipo_pgto_codigo
       INNER JOIN modalidade_tipo_bancada mtb ON mtb.codigo = assoc.modalidade_tipo_bancada_codigo
       INNER JOIN modalidade m ON m.codigo = mtb.modalidade_codigo
       INNER JOIN tipo_bancada tb ON tb.codigo = mtb.tipo_bancada_codigo
       WHERE UPPER(BTRIM(m.descricao)) = UPPER(BTRIM('TEG CRECHE'))
         AND UPPER(BTRIM(tb.descricao)) = UPPER(BTRIM($1))
       LIMIT 1`,
      [tipoBancada],
    )

    if (result.rowCount > 0) {
      return tipoBancada
    }
  }

  throw new Error('Nao foi encontrado cadastro para TEG CRECHE no tipo de bancada Creche.')
}

const buildScenarioResults = async ({
  client,
  scenarioName,
  modalidadeDescricao,
  tipoBancadaDescricao,
  quantidades,
  resolveLookupQuantidade,
  resolvePercapitaMultiplicador,
}) => {
  const results = []

  for (const quantidade of quantidades) {
    const lookupQuantidade = resolveLookupQuantidade(quantidade)
    const percapitaMultiplicador = resolvePercapitaMultiplicador(quantidade)

    const fixo = await findLatestCondicaoValor({
      client,
      modalidadeDescricao,
      tipoBancadaDescricao,
      tipoPgtoDescricao: 'Fixo',
      quantidade: lookupQuantidade,
    })

    const percapita = await findLatestCondicaoValor({
      client,
      modalidadeDescricao,
      tipoBancadaDescricao,
      tipoPgtoDescricao: 'Per capita',
      quantidade: lookupQuantidade,
    })

    assert(Boolean(fixo), `${scenarioName}: valor FIXO nao encontrado para quantidade ${lookupQuantidade}.`)
    assert(Boolean(percapita), `${scenarioName}: valor PER CAPITA nao encontrado para quantidade ${lookupQuantidade}.`)

    const fixoValorTabela = parseNumber(fixo.valor)
    const percapitaValorTabela = parseNumber(percapita.valor)
    const fixoDiario = fixoValorTabela / 30
    const percapitaDiario = (percapitaValorTabela * percapitaMultiplicador) / 30
    const totalDiario = fixoDiario + percapitaDiario

    results.push({
      quantidade,
      lookupQuantidade,
      percapitaMultiplicador,
      fixoFaixa: `${fixo.qtde_ini}-${fixo.qtde_fim}`,
      fixoData: fixo.data,
      fixoValorTabela: fixoValorTabela.toFixed(2),
      percapitaFaixa: `${percapita.qtde_ini}-${percapita.qtde_fim}`,
      percapitaData: percapita.data,
      percapitaValorTabela: percapitaValorTabela.toFixed(2),
      fixoDiario: formatCurrency(fixoDiario),
      percapitaDiario: formatCurrency(percapitaDiario),
      totalDiario: formatCurrency(totalDiario),
    })
  }

  return results
}

const run = async () => {
  const client = new Client(dbConfig)
  await client.connect()

  try {
    const acessivelModalidade = await resolveAcessivelModalidade(client)
    const crecheTipoBancada = await resolveCrecheTipoBancada(client)

    const acessivelResults = await buildScenarioResults({
      client,
      scenarioName: 'ACESSIVEL',
      modalidadeDescricao: acessivelModalidade,
      tipoBancadaDescricao: 'Acessível',
      quantidades: [1, 2, 3, 4, 5],
      resolveLookupQuantidade: (quantidade) => (quantidade >= 3 ? 3 : quantidade),
      resolvePercapitaMultiplicador: (quantidade) => (quantidade <= 1 ? quantidade : (quantidade === 2 ? 2 : quantidade - 2)),
    })

    const acessivelQ3 = acessivelResults.find((item) => item.quantidade === 3)
    const acessivelQ4 = acessivelResults.find((item) => item.quantidade === 4)
    const acessivelQ5 = acessivelResults.find((item) => item.quantidade === 5)

    assert(Boolean(acessivelQ3 && acessivelQ4 && acessivelQ5), 'ACESSIVEL: nao foi possivel montar as quantidades 3, 4 e 5 para validacao de faixa >= 3.')
    assert(acessivelQ3.lookupQuantidade === 3, 'ACESSIVEL: quantidade 3 deveria usar lookup na faixa 3.')
    assert(acessivelQ4.lookupQuantidade === 3, 'ACESSIVEL: quantidade 4 deveria usar lookup na faixa 3.')
    assert(acessivelQ5.lookupQuantidade === 3, 'ACESSIVEL: quantidade 5 deveria usar lookup na faixa 3.')
    assert(acessivelQ3.fixoValorTabela === acessivelQ4.fixoValorTabela && acessivelQ4.fixoValorTabela === acessivelQ5.fixoValorTabela, 'ACESSIVEL: valor FIXO da faixa >= 3 deve ser o mesmo para q=3,4,5.')
    assert(acessivelQ3.percapitaValorTabela === acessivelQ4.percapitaValorTabela && acessivelQ4.percapitaValorTabela === acessivelQ5.percapitaValorTabela, 'ACESSIVEL: valor PER CAPITA da faixa >= 3 deve ser o mesmo para q=3,4,5.')
    assert(acessivelQ3.percapitaMultiplicador === 1 && acessivelQ4.percapitaMultiplicador === 2 && acessivelQ5.percapitaMultiplicador === 3, 'ACESSIVEL: multiplicador per capita esperado para q=3,4,5 eh 1,2,3.')

    const regularTnResults = await buildScenarioResults({
      client,
      scenarioName: 'REGULAR_TN',
      modalidadeDescricao: 'TEG REGULAR',
      tipoBancadaDescricao: 'Convencional',
      quantidades: [1, 2, 3, 4],
      resolveLookupQuantidade: (quantidade) => quantidade,
      resolvePercapitaMultiplicador: (quantidade) => quantidade,
    })

    const crecheResults = await buildScenarioResults({
      client,
      scenarioName: 'CRECHE',
      modalidadeDescricao: 'TEG CRECHE',
      tipoBancadaDescricao: crecheTipoBancada,
      quantidades: [1, 9, 10, 11, 12],
      resolveLookupQuantidade: (quantidade) => quantidade,
      resolvePercapitaMultiplicador: (quantidade) => (quantidade <= 9 ? quantidade : (quantidade === 10 ? quantidade : quantidade - 10)),
    })

    const crecheQ9 = crecheResults.find((item) => item.quantidade === 9)
    const crecheQ10 = crecheResults.find((item) => item.quantidade === 10)
    const crecheQ11 = crecheResults.find((item) => item.quantidade === 11)
    const crecheQ12 = crecheResults.find((item) => item.quantidade === 12)

    assert(Boolean(crecheQ9 && crecheQ10 && crecheQ11 && crecheQ12), 'CRECHE: nao foi possivel montar as quantidades 9, 10, 11 e 12 para validacao das faixas.')
    assert(crecheQ9.lookupQuantidade === 9, 'CRECHE: quantidade 9 deveria usar lookup 9 (ate 9).')
    assert(crecheQ10.lookupQuantidade === 10, 'CRECHE: quantidade 10 deveria usar lookup 10.')
    assert(crecheQ11.lookupQuantidade === 11, 'CRECHE: quantidade 11 deveria usar lookup 11 (11 em diante).')
    assert(crecheQ12.lookupQuantidade === 12, 'CRECHE: quantidade 12 deveria mapear na faixa 11 em diante mantendo lookup por quantidade.')
    assert(crecheQ9.percapitaMultiplicador === 9, 'CRECHE: multiplicador esperado para q=9 deve ser 9.')
    assert(crecheQ10.percapitaMultiplicador === 10, 'CRECHE: multiplicador esperado para q=10 deve ser 10.')
    assert(crecheQ11.percapitaMultiplicador === 1, 'CRECHE: multiplicador esperado para q=11 deve ser 1.')
    assert(crecheQ12.percapitaMultiplicador === 2, 'CRECHE: multiplicador esperado para q=12 deve ser 2.')

    const output = {
      status: 'ok',
      checkedAt: new Date().toISOString(),
      acessivel: {
        modalidade: acessivelModalidade,
        tipoBancada: 'Acessível',
        quantidades: acessivelResults,
        validation: {
          regraFaixaMaiorIgualTres: 'ok',
          lookupQuantidades: [acessivelQ3.lookupQuantidade, acessivelQ4.lookupQuantidade, acessivelQ5.lookupQuantidade],
        },
      },
      regularTn: {
        modalidade: 'TEG REGULAR',
        tipoBancada: 'Convencional',
        quantidades: regularTnResults,
      },
      creche: {
        modalidade: 'TEG CRECHE',
        tipoBancada: crecheTipoBancada,
        quantidades: crecheResults,
        validation: {
          regraFaixasCreche: 'ok',
        },
      },
    }

    console.log(JSON.stringify(output, null, 2))
  } finally {
    await client.end()
  }
}

run().catch((error) => {
  console.error(`SMOKE REMUNERACAO FALHOU: ${error.message}`)
  process.exitCode = 1
})