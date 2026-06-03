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

const round2 = (value) => Number(parseNumber(value).toFixed(2))

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}

const calculateKmValorByThreshold = ({ quantidadeKmAdicional, aPartirDoKm, valorKm }) => {
  const normalizedQuantidade = parseNumber(quantidadeKmAdicional)
  const normalizedMinimo = parseNumber(aPartirDoKm)
  const normalizedValorKm = parseNumber(valorKm)

  if (normalizedQuantidade < normalizedMinimo) {
    return 0
  }

  return round2(normalizedQuantidade * normalizedValorKm)
}

const calculateContinuaRegular = ({ modalidadeDescricao, tipoBancada, quantidade, valorUnitario }) => {
  const normalizedModalidade = String(modalidadeDescricao || '').trim().toUpperCase()
  const normalizedTipoBancada = String(tipoBancada || '').trim().toUpperCase()
  const normalizedQuantidade = parseNumber(quantidade)

  if (normalizedModalidade !== 'TEG REGULAR' || normalizedTipoBancada !== 'CONVENCIONAL' || normalizedQuantidade <= 0) {
    return 0
  }

  return round2(normalizedQuantidade * parseNumber(valorUnitario))
}

const calculateContinuaCadeirante = ({ modalidadeDescricao, tipoBancada, quantidade, valorUnitario }) => {
  const normalizedModalidade = String(modalidadeDescricao || '').trim().toUpperCase()
  const normalizedTipoBancada = String(tipoBancada || '').trim().toUpperCase()
  const normalizedQuantidade = parseNumber(quantidade)

  if (normalizedModalidade !== 'TEG REGULAR' || normalizedTipoBancada !== 'ACESSIVEL' || normalizedQuantidade <= 0) {
    return 0
  }

  return round2(normalizedQuantidade * parseNumber(valorUnitario))
}

const findLatestContinuaValor = async (client, tipoContinua) => {
  const result = await client.query(
    `SELECT
       valor::numeric(14,2) AS valor,
       TO_CHAR(data, 'YYYY-MM-DD') AS data
     FROM continua_valor
     WHERE UPPER(BTRIM(tipo_continua)) = UPPER(BTRIM($1))
     ORDER BY data DESC, codigo DESC
     LIMIT 1`,
    [tipoContinua],
  )

  return result.rows[0] ?? null
}

const findLatestKmValorByQtdeIni = async (client, qtdeIni) => {
  const result = await client.query(
    `SELECT
       kv.valor::numeric(14,2) AS valor,
       c.qtde_ini::numeric(14,4) AS qtde_ini,
       TO_CHAR(kv.data, 'YYYY-MM-DD') AS data
     FROM km_valor kv
     INNER JOIN condicao c ON c.codigo = kv.condicao_codigo
     WHERE c.qtde_ini::numeric(14,4) = $1::numeric(14,4)
     ORDER BY kv.data DESC, kv.codigo DESC
     LIMIT 1`,
    [qtdeIni],
  )

  return result.rows[0] ?? null
}

const run = async () => {
  const client = new Client(dbConfig)
  await client.connect()

  try {
    const kmBase = await findLatestKmValorByQtdeIni(client, 6)
    assert(Boolean(kmBase), 'Nao foi encontrado registro de km_valor com condicao qtde_ini = 6 para validar os testes de km.')

    const kmValorUnitario = parseNumber(kmBase.valor)
    assert(kmValorUnitario > 0, 'O valor unitario de km para qtde_ini = 6 deve ser maior que zero.')

    const kmMenorQueSeis = calculateKmValorByThreshold({
      quantidadeKmAdicional: 5,
      aPartirDoKm: 6,
      valorKm: kmValorUnitario,
    })
    assert(kmMenorQueSeis === 0, 'Teste KM < 6 falhou: o valor deve ser zero quando a quantidade estiver abaixo do minimo.')

    const kmMaiorIgualSeis = calculateKmValorByThreshold({
      quantidadeKmAdicional: 6,
      aPartirDoKm: 6,
      valorKm: kmValorUnitario,
    })
    const expectedKmMaiorIgualSeis = round2(6 * kmValorUnitario)
    assert(kmMaiorIgualSeis === expectedKmMaiorIgualSeis, 'Teste KM >= 6 falhou: o valor deve ser quantidade * valor_km.')

    const continuaRegularBase = await findLatestContinuaValor(client, 'Regular')
    assert(Boolean(continuaRegularBase), 'Nao foi encontrado valor de continua Regular para validar o teste.')

    const continuaRegularUnitario = parseNumber(continuaRegularBase.valor)
    const continuaRegularQuantidadeUm = calculateContinuaRegular({
      modalidadeDescricao: 'TEG REGULAR',
      tipoBancada: 'CONVENCIONAL',
      quantidade: 1,
      valorUnitario: continuaRegularUnitario,
    })
    assert(continuaRegularQuantidadeUm === round2(continuaRegularUnitario), 'Teste continua Regular (quantidade 1) falhou.')

    const continuaCadeiranteBase = await findLatestContinuaValor(client, 'Cadeirante')
    assert(Boolean(continuaCadeiranteBase), 'Nao foi encontrado valor de continua Cadeirante para validar o teste.')

    const continuaCadeiranteUnitario = parseNumber(continuaCadeiranteBase.valor)
    const continuaCadeiranteQuantidadeUm = calculateContinuaCadeirante({
      modalidadeDescricao: 'TEG REGULAR',
      tipoBancada: 'ACESSIVEL',
      quantidade: 1,
      valorUnitario: continuaCadeiranteUnitario,
    })
    assert(continuaCadeiranteQuantidadeUm === round2(continuaCadeiranteUnitario), 'Teste continua Cadeirante (quantidade 1) falhou.')

    console.log(JSON.stringify({
      status: 'ok',
      checkedAt: new Date().toISOString(),
      km: {
        referenciaQtdeIni: 6,
        dataValor: kmBase.data,
        valorUnitario: kmValorUnitario.toFixed(2),
        testeMenorQueSeis: kmMenorQueSeis.toFixed(2),
        testeMaiorIgualSeis: kmMaiorIgualSeis.toFixed(2),
      },
      continua: {
        regular: {
          dataValor: continuaRegularBase.data,
          valorUnitario: continuaRegularUnitario.toFixed(2),
          quantidadeUm: continuaRegularQuantidadeUm.toFixed(2),
        },
        cadeirante: {
          dataValor: continuaCadeiranteBase.data,
          valorUnitario: continuaCadeiranteUnitario.toFixed(2),
          quantidadeUm: continuaCadeiranteQuantidadeUm.toFixed(2),
        },
      },
    }, null, 2))
  } finally {
    await client.end()
  }
}

run().catch((error) => {
  console.error(`SMOKE KM/CONTINUA FALHOU: ${error.message}`)
  process.exitCode = 1
})
