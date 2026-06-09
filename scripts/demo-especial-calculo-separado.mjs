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

const calcTegEspecialDaily = ({ quantidade, fixoMensal, percapitaMensal }) => {
  const qty = Math.max(0, Number(quantidade) || 0)
  const fixo = round2((Number(fixoMensal) || 0) / 30)
  const percapita = round2(((Number(percapitaMensal) || 0) * qty) / 30)
  return { quantidade: qty, fixo, percapita, total: round2(fixo + percapita) }
}

const lookupQuantidadeAcessivel = (quantidade) => {
  const qty = Math.max(0, Number(quantidade) || 0)
  return qty >= 3 ? 3 : qty
}

const percapitaQuantidadeAcessivel = (quantidade) => {
  const lookupQty = lookupQuantidadeAcessivel(quantidade)
  if (lookupQty <= 1) return lookupQty
  if (lookupQty === 2) return 2
  return Math.max(lookupQty - 3 + 1, 0)
}

const calcTegAcessivelEspecialDaily = ({ quantidade, fixoMensal, percapitaMensal }) => {
  const qty = Math.max(0, Number(quantidade) || 0)
  const lookupQty = lookupQuantidadeAcessivel(qty)
  const fixo = round2((Number(fixoMensal) || 0) / 30)
  const percapitaQty = percapitaQuantidadeAcessivel(qty)
  const percapita = round2(((Number(percapitaMensal) || 0) * percapitaQty) / 30)
  return { quantidade: qty, lookupQuantidade: lookupQty, fixo, percapita, percapitaQty, total: round2(fixo + percapita) }
}

const isIncludedTipoEscolaForAcessivel = (sigla) => ['CEI', 'EMEI', 'EMEF', 'EMEE'].includes(sigla)

const isExcludedRegularNc = (sigla) => ['CEI', 'CCA'].includes(sigla)
const isIncludedEspecialRegularAcrescimo = (sigla) => ['EMEI', 'EMEF', 'EMEE'].includes(sigla)

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

const fetchTegEspecialValor = async (dataReferencia, tipoBancada, tipoPgto, condicaoDescricao) => {
  const condicoes = Array.isArray(condicaoDescricao) ? condicaoDescricao : [condicaoDescricao]

  for (const condicao of condicoes) {
    const result = await pool.query(`
      SELECT mbv.valor::numeric(14,2) AS valor
      FROM modal_bancada_condicao_tipo_pgto_valor mbv
      INNER JOIN modal_bancada_condicao_tipo_pgto assoc ON assoc.codigo = mbv.modal_bancada_condicao_tipo_pgto_codigo
      INNER JOIN modalidade_tipo_bancada mtb ON mtb.codigo = assoc.modalidade_tipo_bancada_codigo
      INNER JOIN modalidade m ON m.codigo = mtb.modalidade_codigo
      INNER JOIN tipo_bancada tb ON tb.codigo = mtb.tipo_bancada_codigo
      INNER JOIN tipo_pgto tp ON tp.codigo = assoc.tipo_pgto_codigo
      INNER JOIN condicao c ON c.codigo = assoc.condicao_codigo
      WHERE UPPER(BTRIM(m.descricao)) = 'TEG ESPECIAL'
        AND UPPER(BTRIM(tb.descricao)) = UPPER(BTRIM($1))
        AND UPPER(BTRIM(tp.descricao)) = UPPER(BTRIM($2))
        AND UPPER(BTRIM(c.descricao)) = UPPER(BTRIM($3))
        AND mbv.data <= $4::date
      ORDER BY mbv.data DESC, mbv.codigo DESC
      LIMIT 1
    `, [tipoBancada, tipoPgto, condicao, dataReferencia])

    if (result.rows[0]) {
      return Number(result.rows[0].valor)
    }
  }

  return null
}

const cenario = {
  mesAnoSolicitado: '04/2025',
  mesAnoUtilizado: '04/2026',
  dre: 'Freguesia/Brasilândia (cod. 9)',
  tipoPessoa: 'PJ',
  revisao: 0,
  crmc: '046.806-00',
  dataExemplo: '2026-04-01',
}

const has2025 = await pool.query(`
  SELECT COUNT(*)::int AS cnt
  FROM apuracao_servicos
  WHERE mes_ano = '04/2025'
    AND dre_codigo = 9
    AND tipo_pessoa = 'PJ'
    AND revisao = 0
    AND REGEXP_REPLACE(COALESCE(crmc_condutor, ''), '[^0-9]', '', 'g') LIKE '%0468060%'
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
    aps.tipo_veiculo,
    v.os_especial,
    v.tipo_de_bancada
  FROM apuracao_servicos aps
  JOIN ordem_servico os ON os.codigo = aps.ordem_servico_codigo
  JOIN tipo_escola te ON te.codigo = aps.tipo_escola_codigo
  LEFT JOIN modalidade m ON m.codigo = os.modalidade_codigo
  LEFT JOIN veiculo v ON BTRIM(v.crm) = BTRIM(os.crm)
  WHERE aps.mes_ano = '04/2026'
    AND aps.dre_codigo = 9
    AND aps.tipo_pessoa = 'PJ'
    AND aps.revisao = 0
    AND REGEXP_REPLACE(COALESCE(aps.crmc_condutor, ''), '[^0-9]', '', 'g') LIKE '%0468060%'
  ORDER BY aps.data_referencia, te.sigla
`)

const remuneracao = await pool.query(`
  SELECT
    rs.data_referencia::text,
    rs.teg_regular_fixo,
    rs.teg_regular_percapita,
    rs.teg_especial_regular_fixo,
    rs.teg_especial_regular_percapita,
    rs.teg_especial_acessivel_fixo,
    rs.teg_especial_acessivel_percapita
  FROM remuneracao_servicos rs
  JOIN ordem_servico os ON os.codigo = rs.ordem_servico_codigo
  WHERE rs.mes_ano = '04/2026'
    AND rs.dre_codigo = 9
    AND rs.tipo_pessoa = 'PJ'
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
    osEspecial: row.os_especial,
    tipoBancada: row.tipo_de_bancada,
    linhas: [],
    qtdNcPresEspecialRegularAcm: 0,
    qtdAtComplNcEspecialRegularAcm: 0,
    qtdEspecialRegularAtualAcm: 0,
    qtdEspecialAcessivelAtualAcm: 0,
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

  if (isIncludedEspecialRegularAcrescimo(row.tipo_escola)) {
    day.qtdNcPresEspecialRegularAcm += Number(row.nc_pres_acm)
    day.qtdAtComplNcEspecialRegularAcm += Number(row.ac_nc_acm)
  }

  if (!isExcludedRegularNc(row.tipo_escola)) {
    day.qtdEspecialRegularAtualAcm += Number(row.nc_pres_acm) + Number(row.ac_nc_acm)
  }

  if (isIncludedTipoEscolaForAcessivel(row.tipo_escola)) {
    day.qtdEspecialAcessivelAtualAcm += Number(row.cad_acm) + Number(row.ac_cad_acm)
  }

  diasMap.set(row.data_referencia, day)
}

const diasDetalhados = []

for (const day of diasMap.values()) {
  const dataReferencia = day.dataReferencia
  const qtdNcPresAcrescimo = day.qtdNcPresEspecialRegularAcm
  const qtdAtComplNcAcrescimo = day.qtdAtComplNcEspecialRegularAcm
  const tipoBancada = String(day.tipoBancada ?? '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const isAcessivel = tipoBancada === 'ACESSIVEL'
  const qtdEspecialRegularAtual = day.qtdEspecialRegularAtualAcm
  const qtdEspecialAcessivelAtual = day.qtdEspecialAcessivelAtualAcm

  const lookupNc = lookupQuantidadeRegular(qtdNcPresAcrescimo)
  const lookupAtCompl = lookupQuantidadeRegular(qtdAtComplNcAcrescimo)

  const fixoNc = qtdNcPresAcrescimo > 0
    ? await fetchTabelaValor(dataReferencia, 'TEG REGULAR', 'CONVENCIONAL', 'FIXO', lookupNc)
    : null
  const percapitaNc = qtdNcPresAcrescimo > 0
    ? await fetchTabelaValor(dataReferencia, 'TEG REGULAR', 'CONVENCIONAL', 'PER CAPITA', lookupNc)
    : null
  const fixoAtCompl = qtdAtComplNcAcrescimo > 0
    ? await fetchTabelaValor(dataReferencia, 'TEG REGULAR', 'CONVENCIONAL', 'FIXO', lookupAtCompl)
    : null
  const percapitaAtCompl = qtdAtComplNcAcrescimo > 0
    ? await fetchTabelaValor(dataReferencia, 'TEG REGULAR', 'CONVENCIONAL', 'PER CAPITA', lookupAtCompl)
    : null

  const fixoEspecialRegular = !isAcessivel && qtdEspecialRegularAtual > 0
    ? await fetchTegEspecialValor(dataReferencia, 'CONVENCIONAL', 'FIXO', 'Fixo Esp')
    : null
  const percapitaEspecialRegular = !isAcessivel && qtdEspecialRegularAtual > 0
    ? await fetchTegEspecialValor(dataReferencia, 'CONVENCIONAL', 'PER CAPITA', 'Per Cap Regular')
    : null
  const fixoEspecialAcessivel = isAcessivel && qtdEspecialAcessivelAtual > 0
    ? await fetchTegEspecialValor(dataReferencia, 'ACESSIVEL', 'FIXO', ['Fixo Esp para acessivel', 'Fixo Esp'])
    : null
  const percapitaEspecialAcessivel = isAcessivel && qtdEspecialAcessivelAtual > 0
    ? await fetchTegEspecialValor(dataReferencia, 'ACESSIVEL', 'PER CAPITA', ['Per Cap Acessi', 'Per Cap Acessivel'])
    : null

  const propostoNcPres = qtdNcPresAcrescimo > 0
    ? calcTegRegularDaily({ quantidade: qtdNcPresAcrescimo, fixoMensal: fixoNc, percapitaMensal: percapitaNc })
    : { fixo: 0, percapita: 0, total: 0, quantidade: 0, lookupQuantidade: 0, percapitaQty: 0 }
  const propostoAtComplNc = qtdAtComplNcAcrescimo > 0
    ? calcTegRegularDaily({ quantidade: qtdAtComplNcAcrescimo, fixoMensal: fixoAtCompl, percapitaMensal: percapitaAtCompl })
    : { fixo: 0, percapita: 0, total: 0, quantidade: 0, lookupQuantidade: 0, percapitaQty: 0 }

  const propostoTegRegular = {
    fixo: round2(propostoNcPres.fixo + propostoAtComplNc.fixo),
    percapita: round2(propostoNcPres.percapita + propostoAtComplNc.percapita),
    total: round2(propostoNcPres.total + propostoAtComplNc.total),
  }

  const atualEspecialRegular = !isAcessivel && qtdEspecialRegularAtual > 0
    ? calcTegEspecialDaily({ quantidade: qtdEspecialRegularAtual, fixoMensal: fixoEspecialRegular, percapitaMensal: percapitaEspecialRegular })
    : { fixo: 0, percapita: 0, total: 0, quantidade: 0 }
  const atualEspecialAcessivel = isAcessivel && qtdEspecialAcessivelAtual > 0
    ? calcTegAcessivelEspecialDaily({ quantidade: qtdEspecialAcessivelAtual, fixoMensal: fixoEspecialAcessivel, percapitaMensal: percapitaEspecialAcessivel })
    : { fixo: 0, percapita: 0, total: 0, quantidade: 0 }

  const gravado = remuneracao.rows.find((item) => item.data_referencia === dataReferencia)

  diasDetalhados.push({
    dataReferencia,
    quantidadesAcumuladas: {
      ncPresEmeiEmefEmeeAcm: qtdNcPresAcrescimo,
      atComplNcEmeiEmefEmeeAcm: qtdAtComplNcAcrescimo,
      especialRegularAtualNcMaisAtComplAcm: qtdEspecialRegularAtual,
      especialAcessivelAtualCadMaisAcCadAcm: qtdEspecialAcessivelAtual,
    },
    calculoAtual: {
      regra: isAcessivel
        ? 'TEG ESPECIAL ACESSIVEL sobre (cad_acm + ac_cad_acm) de CEI/EMEI/EMEF/EMEE'
        : 'TEG ESPECIAL CONVENCIONAL sobre (nc_pres_acm + ac_nc_acm) excluindo CEI/CCA',
      detalheRegular: atualEspecialRegular,
      detalheAcessivel: atualEspecialAcessivel,
      gravado: gravado
        ? {
          tegRegularFixo: Number(gravado.teg_regular_fixo),
          tegRegularPercapita: Number(gravado.teg_regular_percapita),
          tegEspecialRegularFixo: Number(gravado.teg_especial_regular_fixo),
          tegEspecialRegularPercapita: Number(gravado.teg_especial_regular_percapita),
          tegEspecialAcessivelFixo: Number(gravado.teg_especial_acessivel_fixo),
          tegEspecialAcessivelPercapita: Number(gravado.teg_especial_acessivel_percapita),
        }
        : null,
    },
    calculoProposto: {
      regra: 'Separado: TEG REGULAR CONVENCIONAL (EMEI/EMEF/EMEE) em teg_regular_* + formulas TEG ESPECIAL anteriores em teg_especial_*',
      acrescimoTegRegular: {
        ncPres: propostoNcPres,
        atComplNc: propostoAtComplNc,
        tegRegularFixo: propostoTegRegular.fixo,
        tegRegularPercapita: propostoTegRegular.percapita,
        totalDia: propostoTegRegular.total,
      },
      tegEspecialMantido: {
        tegEspecialRegularFixo: atualEspecialRegular.fixo,
        tegEspecialRegularPercapita: atualEspecialRegular.percapita,
        tegEspecialAcessivelFixo: atualEspecialAcessivel.fixo,
        tegEspecialAcessivelPercapita: atualEspecialAcessivel.percapita,
        totalDia: round2(atualEspecialRegular.total + atualEspecialAcessivel.total),
      },
      totalRemuneracaoDia: round2(propostoTegRegular.total + atualEspecialRegular.total + atualEspecialAcessivel.total),
    },
    linhasApontamento: day.linhas,
  })
}

const exemploDia = diasDetalhados.find((day) => day.dataReferencia === cenario.dataExemplo)
  ?? diasDetalhados.find((day) => day.quantidadesAcumuladas.ncPresEmeiEmefEmeeAcm > 0)
  ?? diasDetalhados[0]

const totaisMes = diasDetalhados.reduce((acc, day) => {
  acc.proposto.tegRegular.fixo += day.calculoProposto.acrescimoTegRegular.tegRegularFixo
  acc.proposto.tegRegular.percapita += day.calculoProposto.acrescimoTegRegular.tegRegularPercapita
  acc.proposto.tegEspecialRegular.fixo += day.calculoProposto.tegEspecialMantido.tegEspecialRegularFixo
  acc.proposto.tegEspecialRegular.percapita += day.calculoProposto.tegEspecialMantido.tegEspecialRegularPercapita
  acc.proposto.tegEspecialAcessivel.fixo += day.calculoProposto.tegEspecialMantido.tegEspecialAcessivelFixo
  acc.proposto.tegEspecialAcessivel.percapita += day.calculoProposto.tegEspecialMantido.tegEspecialAcessivelPercapita
  return acc
}, {
  proposto: {
    tegRegular: { fixo: 0, percapita: 0 },
    tegEspecialRegular: { fixo: 0, percapita: 0 },
    tegEspecialAcessivel: { fixo: 0, percapita: 0 },
  },
})

for (const campo of ['tegRegular', 'tegEspecialRegular', 'tegEspecialAcessivel']) {
  totaisMes.proposto[campo].fixo = round2(totaisMes.proposto[campo].fixo)
  totaisMes.proposto[campo].percapita = round2(totaisMes.proposto[campo].percapita)
  totaisMes.proposto[campo].total = round2(totaisMes.proposto[campo].fixo + totaisMes.proposto[campo].percapita)
}

console.log(JSON.stringify({
  observacao: has2025.rows[0].cnt === 0
    ? 'Nao ha dados em 04/2025 para CRMC 046.806-00. Demonstracao com 04/2026 (periodo disponivel para este condutor).'
    : 'Dados de 04/2025 encontrados.',
  cenario,
  identificacao: {
    os: dias.rows[0]?.os_concat ?? null,
    modalidadeOs: dias.rows[0]?.modalidade_os ?? null,
    tipoVeiculo: dias.rows[0]?.tipo_veiculo ?? null,
    osEspecial: dias.rows[0]?.os_especial ?? null,
    tipoBancada: dias.rows[0]?.tipo_de_bancada ?? null,
  },
  exemploDiaDetalhado: exemploDia,
  totaisMes,
  totalRemuneracaoProposto: {
    tegRegularFixo: totaisMes.proposto.tegRegular.fixo,
    tegRegularPercapita: totaisMes.proposto.tegRegular.percapita,
    tegEspecialRegularFixo: totaisMes.proposto.tegEspecialRegular.fixo,
    tegEspecialRegularPercapita: totaisMes.proposto.tegEspecialRegular.percapita,
    tegEspecialAcessivelFixo: totaisMes.proposto.tegEspecialAcessivel.fixo,
    tegEspecialAcessivelPercapita: totaisMes.proposto.tegEspecialAcessivel.percapita,
    valorTotal: round2(
      totaisMes.proposto.tegRegular.total
      + totaisMes.proposto.tegEspecialRegular.total
      + totaisMes.proposto.tegEspecialAcessivel.total,
    ),
  },
}, null, 2))

await pool.end()
