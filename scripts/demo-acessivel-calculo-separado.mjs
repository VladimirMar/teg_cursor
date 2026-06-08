import pg from 'pg'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(readFileSync('.env', 'utf8').split(/\r?\n/).filter(Boolean).map((line) => {
  const idx = line.indexOf('=')
  return [line.slice(0, idx), line.slice(idx + 1)]
}))

const pool = new pg.Pool({
  host: env.PGHOST,
  port: Number(env.PGPORT),
  user: env.PGUSER,
  password: env.PGPASSWORD,
  database: env.PGDATABASE,
})

const round2 = (value) => Number((Number(value) || 0).toFixed(2))

const lookupQuantidadeRegular = (quantidade) => {
  const qty = Math.max(0, Number(quantidade) || 0)
  if (qty <= 15) return qty
  if (qty === 16) return 16
  return 17
}

const percapitaQuantidadeRegular = (quantidade) => {
  const qty = Math.max(0, Number(quantidade) || 0)
  if (qty <= 15) return qty
  if (qty === 16) return 16
  return Math.max(qty - 17 + 1, 0)
}

const calcTegRegularDaily = ({ quantidade, fixoMensal, percapitaMensal }) => {
  const qty = Math.max(0, Number(quantidade) || 0)
  const fixo = round2((Number(fixoMensal) || 0) / 30)
  const percapitaQty = percapitaQuantidadeRegular(qty)
  const percapita = round2(((Number(percapitaMensal) || 0) * percapitaQty) / 30)
  return {
    quantidade: qty,
    lookupQuantidade: lookupQuantidadeRegular(qty),
    fixo,
    percapita,
    percapitaQty,
    total: round2(fixo + percapita),
  }
}

const calcTegAcessivelAtualDaily = ({ quantidade, fixoMensal, percapitaMensal }) => {
  const qty = Math.max(0, Number(quantidade) || 0)
  const lookupQty = qty >= 3 ? 3 : qty
  const fixo = round2((Number(fixoMensal) || 0) / 30)
  const percapitaQty = lookupQty <= 1
    ? lookupQty
    : lookupQty === 2
      ? 2
      : Math.max(lookupQty - 3 + 1, 0)
  const percapita = round2(((Number(percapitaMensal) || 0) * percapitaQty) / 30)
  return { quantidade: qty, lookupQuantidade: lookupQty, fixo, percapita, percapitaQty, total: round2(fixo + percapita) }
}

const isExcludedRegularNc = (sigla) => ['CEI', 'CCA'].includes(sigla)

const fetchTabelaValor = async (dataReferencia, modalidade, tipoBancada, tipoPgto, lookupQuantidade) => {
  const result = await pool.query(`
    SELECT mbv.valor::numeric(14,2) AS valor
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
      AND mbv.data <= $5::date
    ORDER BY mbv.data DESC, mbv.codigo DESC
    LIMIT 1
  `, [modalidade, tipoBancada, tipoPgto, lookupQuantidade, dataReferencia])

  return result.rows[0] ? Number(result.rows[0].valor) : null
}

const cenario = {
  mesAnoSolicitado: '04/2025',
  mesAnoUtilizado: '04/2026',
  dre: 'Freguesia/Brasilândia (cod. 9)',
  tipoPessoa: 'PF',
  revisao: 0,
  crmc: '005.388-00',
}

const has2025 = await pool.query(`
  SELECT COUNT(*)::int AS cnt
  FROM apuracao_servicos
  WHERE mes_ano = '04/2025'
    AND dre_codigo = 9
    AND tipo_pessoa = 'PF'
    AND revisao = 0
    AND REGEXP_REPLACE(COALESCE(crmc_condutor, ''), '[^0-9]', '', 'g') LIKE '%0053880%'
`)

const dias = await pool.query(`
  SELECT
    aps.data_referencia::text AS data_referencia,
    te.sigla AS tipo_escola,
    aps.nc_pres,
    aps.cad,
    aps.ac_nc,
    aps.ac_cad,
    aps.nc_pres_acm,
    aps.cad_acm,
    aps.ac_nc_acm,
    aps.ac_cad_acm,
    os.os_concat,
    m.descricao AS modalidade_os,
    aps.tipo_veiculo
  FROM apuracao_servicos aps
  JOIN ordem_servico os ON os.codigo = aps.ordem_servico_codigo
  JOIN tipo_escola te ON te.codigo = aps.tipo_escola_codigo
  LEFT JOIN modalidade m ON m.codigo = os.modalidade_codigo
  WHERE aps.mes_ano = '04/2026'
    AND aps.dre_codigo = 9
    AND aps.tipo_pessoa = 'PF'
    AND aps.revisao = 0
    AND REGEXP_REPLACE(COALESCE(aps.crmc_condutor, ''), '[^0-9]', '', 'g') LIKE '%0053880%'
  ORDER BY aps.data_referencia, te.sigla
`)

const remuneracao = await pool.query(`
  SELECT rs.data_referencia::text, rs.teg_acessivel_fixo, rs.teg_acessivel_percapita
  FROM remuneracao_servicos rs
  JOIN ordem_servico os ON os.codigo = rs.ordem_servico_codigo
  WHERE rs.mes_ano = '04/2026'
    AND rs.dre_codigo = 9
    AND rs.tipo_pessoa = 'PF'
    AND rs.revisao = 0
    AND os.os_concat = $1
  ORDER BY rs.data_referencia
`, [dias.rows[0]?.os_concat ?? ''])

const diasMap = new Map()

for (const row of dias.rows) {
  const day = diasMap.get(row.data_referencia) ?? {
    dataReferencia: row.data_referencia,
    os: row.os_concat,
    modalidadeOs: row.modalidade_os,
    tipoVeiculo: row.tipo_veiculo,
    linhas: [],
    qtdNcPresAcm: 0,
    qtdAtComplNcAcm: 0,
    qtdAcessivelAtualAcm: 0,
  }

  day.linhas.push({
    tipoEscola: row.tipo_escola,
    ncPres: Number(row.nc_pres),
    cad: Number(row.cad),
    acNc: Number(row.ac_nc),
    acCad: Number(row.ac_cad),
    ncPresAcm: Number(row.nc_pres_acm),
    cadAcm: Number(row.cad_acm),
    acNcAcm: Number(row.ac_nc_acm),
    acCadAcm: Number(row.ac_cad_acm),
  })

  if (!isExcludedRegularNc(row.tipo_escola)) {
    day.qtdNcPresAcm += Number(row.nc_pres_acm)
    day.qtdAtComplNcAcm += Number(row.ac_nc_acm)
  }

  if (['CEI', 'EMEI', 'EMEF', 'EMEE'].includes(row.tipo_escola)) {
    day.qtdAcessivelAtualAcm += Number(row.cad_acm) + Number(row.ac_cad_acm)
  }

  diasMap.set(row.data_referencia, day)
}

const diasDetalhados = []

for (const day of diasMap.values()) {
  const dataReferencia = day.dataReferencia
  const qtdNcPres = day.qtdNcPresAcm
  const qtdAtComplNc = day.qtdAtComplNcAcm
  const qtdAtual = day.qtdAcessivelAtualAcm

  const lookupNc = lookupQuantidadeRegular(qtdNcPres)
  const lookupAtCompl = lookupQuantidadeRegular(qtdAtComplNc)
  const lookupAtual = qtdAtual >= 3 ? 3 : qtdAtual

  const fixoNc = qtdNcPres > 0 ? await fetchTabelaValor(dataReferencia, 'TEG REGULAR', 'CONVENCIONAL', 'FIXO', lookupNc) : null
  const percapitaNc = qtdNcPres > 0 ? await fetchTabelaValor(dataReferencia, 'TEG REGULAR', 'CONVENCIONAL', 'PER CAPITA', lookupNc) : null
  const fixoAtCompl = qtdAtComplNc > 0 ? await fetchTabelaValor(dataReferencia, 'TEG REGULAR', 'CONVENCIONAL', 'FIXO', lookupAtCompl) : null
  const percapitaAtCompl = qtdAtComplNc > 0 ? await fetchTabelaValor(dataReferencia, 'TEG REGULAR', 'CONVENCIONAL', 'PER CAPITA', lookupAtCompl) : null
  const fixoAtual = qtdAtual > 0 ? await fetchTabelaValor(dataReferencia, 'TEG REGULAR', 'ACESSIVEL', 'FIXO', lookupAtual) : null
  const percapitaAtual = qtdAtual > 0 ? await fetchTabelaValor(dataReferencia, 'TEG REGULAR', 'ACESSIVEL', 'PER CAPITA', lookupAtual) : null

  const propostoNcPres = qtdNcPres > 0
    ? calcTegRegularDaily({ quantidade: qtdNcPres, fixoMensal: fixoNc, percapitaMensal: percapitaNc })
    : { fixo: 0, percapita: 0, total: 0 }
  const propostoAtComplNc = qtdAtComplNc > 0
    ? calcTegRegularDaily({ quantidade: qtdAtComplNc, fixoMensal: fixoAtCompl, percapitaMensal: percapitaAtCompl })
    : { fixo: 0, percapita: 0, total: 0 }

  const propostoTotal = {
    fixo: round2(propostoNcPres.fixo + propostoAtComplNc.fixo),
    percapita: round2(propostoNcPres.percapita + propostoAtComplNc.percapita),
    total: round2(propostoNcPres.total + propostoAtComplNc.total),
  }

  const atual = qtdAtual > 0
    ? calcTegAcessivelAtualDaily({ quantidade: qtdAtual, fixoMensal: fixoAtual, percapitaMensal: percapitaAtual })
    : { fixo: 0, percapita: 0, total: 0 }

  const gravado = remuneracao.rows.find((item) => item.data_referencia === dataReferencia)

  diasDetalhados.push({
    dataReferencia,
    quantidadesAcumuladas: {
      ncPresAcm: qtdNcPres,
      atComplNcAcm: qtdAtComplNc,
      acessivelAtualCadAcm: qtdAtual,
    },
    calculoAtual: {
      regra: 'TEG REGULAR + bancada ACESSIVEL sobre CAD acumulado (cad_acm + ac_cad_acm)',
      detalhe: atual,
      gravado: gravado
        ? {
          tegAcessivelFixo: Number(gravado.teg_acessivel_fixo),
          tegAcessivelPercapita: Number(gravado.teg_acessivel_percapita),
          total: round2(Number(gravado.teg_acessivel_fixo) + Number(gravado.teg_acessivel_percapita)),
        }
        : null,
    },
    calculoProposto: {
      regra: 'Acréscimo: TEG REGULAR CONVENCIONAL(nc_pres_acm) + TEG REGULAR CONVENCIONAL(ac_nc_acm)',
      ncPres: propostoNcPres,
      atComplNc: propostoAtComplNc,
      tegAcessivelFixo: propostoTotal.fixo,
      tegAcessivelPercapita: propostoTotal.percapita,
      totalDia: propostoTotal.total,
    },
    linhasApontamento: day.linhas,
  })
}

const totaisMes = diasDetalhados.reduce((acc, day) => {
  acc.proposto.fixo += day.calculoProposto.tegAcessivelFixo
  acc.proposto.percapita += day.calculoProposto.tegAcessivelPercapita
  acc.gravado.fixo += day.calculoAtual.gravado?.tegAcessivelFixo ?? 0
  acc.gravado.percapita += day.calculoAtual.gravado?.tegAcessivelPercapita ?? 0
  return acc
}, { proposto: { fixo: 0, percapita: 0 }, gravado: { fixo: 0, percapita: 0 } })

for (const key of ['proposto', 'gravado']) {
  totaisMes[key].fixo = round2(totaisMes[key].fixo)
  totaisMes[key].percapita = round2(totaisMes[key].percapita)
  totaisMes[key].total = round2(totaisMes[key].fixo + totaisMes[key].percapita)
}

const exemploDia = diasDetalhados.find((day) => day.quantidadesAcumuladas.ncPresAcm > 0 || day.quantidadesAcumuladas.atComplNcAcm > 0) ?? diasDetalhados[0]

console.log(JSON.stringify({
  observacao: has2025.rows[0].cnt === 0
    ? 'Nao ha dados em 04/2025 para CRMC 005.388-00. Demonstracao com 04/2026 (unico periodo disponivel para este condutor).'
    : 'Dados de 04/2025 encontrados.',
  cenario,
  identificacao: {
    os: dias.rows[0]?.os_concat ?? null,
    modalidadeOs: dias.rows[0]?.modalidade_os ?? null,
    tipoVeiculo: dias.rows[0]?.tipo_veiculo ?? null,
  },
  exemploDiaDetalhado: exemploDia,
  totaisMes: totaisMes,
  totalRemuneracaoProposto: {
    tegAcessivelFixo: totaisMes.proposto.fixo,
    tegAcessivelPercapita: totaisMes.proposto.percapita,
    valorTotal: totaisMes.proposto.total,
  },
}, null, 2))

await pool.end()
