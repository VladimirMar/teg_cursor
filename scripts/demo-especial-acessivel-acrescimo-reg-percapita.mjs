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

const isIncludedEmeiEmefEmee = (sigla) => ['EMEI', 'EMEF', 'EMEE'].includes(sigla)
const isIncludedAcessivelCad = (sigla) => ['CEI', 'EMEI', 'EMEF', 'EMEE'].includes(sigla)

const fetchTegEspecialValor = async (dataReferencia, tipoBancada, tipoPgto, condicaoDescricao) => {
  const condicoes = Array.isArray(condicaoDescricao) ? condicaoDescricao : [condicaoDescricao]

  for (const condicao of condicoes) {
    const result = await pool.query(`
      SELECT mbv.valor::numeric(14,2) AS valor, mbv.data::text, c.descricao AS condicao
      FROM modal_bancada_condicao_tipo_pgto_valor mbv
      JOIN modal_bancada_condicao_tipo_pgto assoc ON assoc.codigo = mbv.modal_bancada_condicao_tipo_pgto_codigo
      JOIN modalidade_tipo_bancada mtb ON mtb.codigo = assoc.modalidade_tipo_bancada_codigo
      JOIN modalidade m ON m.codigo = mtb.modalidade_codigo
      JOIN tipo_bancada tb ON tb.codigo = mtb.tipo_bancada_codigo
      JOIN tipo_pgto tp ON tp.codigo = assoc.tipo_pgto_codigo
      JOIN condicao c ON c.codigo = assoc.condicao_codigo
      WHERE UPPER(BTRIM(m.descricao)) = 'TEG ESPECIAL'
        AND UPPER(BTRIM(tb.descricao)) = UPPER(BTRIM($1))
        AND UPPER(BTRIM(tp.descricao)) LIKE UPPER(BTRIM($2)) || '%'
        AND UPPER(BTRIM(c.descricao)) = UPPER(BTRIM($3))
        AND mbv.data <= $4::date
      ORDER BY mbv.data DESC, mbv.codigo DESC
      LIMIT 1
    `, [tipoBancada, tipoPgto, condicao, dataReferencia])

    if (result.rows[0]) {
      return {
        valorMensal: Number(result.rows[0].valor),
        data: result.rows[0].data,
        condicao: result.rows[0].condicao,
      }
    }
  }

  return null
}

const calcEspecialPercapitaDia = (valorMensal, quantidade) => round2(((Number(valorMensal) || 0) * Math.max(0, Number(quantidade) || 0)) / 30)
const calcEspecialFixoDia = (valorMensal) => round2((Number(valorMensal) || 0) / 30)

const cenario = {
  mesAno: '04/2026',
  tipoPessoa: 'PJ',
  dre: '9 - Freguesia/Brasilândia',
  dataReferencia: '2026-04-01',
  crmc: '046.806-00',
}

const apontamento = await pool.query(`
  SELECT te.sigla AS tipo_escola, aps.nc_pres, aps.cad, aps.ac_nc, aps.ac_cad,
         aps.nc_pres_acm, aps.cad_acm, aps.ac_nc_acm, aps.ac_cad_acm,
         os.os_concat, m.descricao AS modalidade_os, aps.tipo_veiculo, v.os_especial
  FROM apuracao_servicos aps
  JOIN ordem_servico os ON os.codigo = aps.ordem_servico_codigo
  JOIN tipo_escola te ON te.codigo = aps.tipo_escola_codigo
  LEFT JOIN modalidade m ON m.codigo = os.modalidade_codigo
  LEFT JOIN veiculo v ON BTRIM(v.crm) = BTRIM(os.crm)
  WHERE aps.mes_ano = '04/2026' AND aps.dre_codigo = 9 AND aps.tipo_pessoa = 'PJ'
    AND aps.revisao = 0 AND aps.data_referencia = '2026-04-01'
    AND REGEXP_REPLACE(COALESCE(aps.crmc_condutor, ''), '[^0-9]', '', 'g') LIKE '%0468060%'
  ORDER BY te.sigla
`)

const remuneracao = await pool.query(`
  SELECT rs.teg_especial_regular_fixo, rs.teg_especial_regular_percapita,
         rs.teg_especial_acessivel_fixo, rs.teg_especial_acessivel_percapita
  FROM remuneracao_servicos rs
  JOIN ordem_servico os ON os.codigo = rs.ordem_servico_codigo
  WHERE rs.mes_ano = '04/2026' AND rs.dre_codigo = 9 AND rs.tipo_pessoa = 'PJ'
    AND rs.revisao = 0 AND rs.data_referencia = '2026-04-01'
    AND os.os_concat = $1
`, [apontamento.rows[0]?.os_concat ?? ''])

let qtdNcPresEmeiEmefEmee = 0
let qtdAtComplNcEmeiEmefEmee = 0
let qtdCadAcessivel = 0
const linhas = []

for (const row of apontamento.rows) {
  const ncPresAcm = Number(row.nc_pres_acm)
  const acNcAcm = Number(row.ac_nc_acm)
  const cadAcm = Number(row.cad_acm)
  const acCadAcm = Number(row.ac_cad_acm)

  const ncContrib = isIncludedEmeiEmefEmee(row.tipo_escola) ? ncPresAcm : 0
  const acNcContrib = isIncludedEmeiEmefEmee(row.tipo_escola) ? acNcAcm : 0
  const cadContrib = isIncludedAcessivelCad(row.tipo_escola) ? cadAcm + acCadAcm : 0

  qtdNcPresEmeiEmefEmee += ncContrib
  qtdAtComplNcEmeiEmefEmee += acNcContrib
  qtdCadAcessivel += cadContrib

  linhas.push({
    tipoEscola: row.tipo_escola,
    ncPres: Number(row.nc_pres),
    acNc: Number(row.ac_nc),
    cad: Number(row.cad),
    ncPresAcm,
    acNcAcm,
    cadAcm,
    acCadAcm,
    contribNcPresAcrescimo: ncContrib,
    contribAtComplNcAcrescimo: acNcContrib,
    contribCadAcessivel: cadContrib,
  })
}

const qtdRegPercapitaAcrescimo = qtdNcPresEmeiEmefEmee + qtdAtComplNcEmeiEmefEmee
const dataReferencia = '2026-04-01'

const tarifaRegPercapita = await fetchTegEspecialValor(dataReferencia, 'Convencional', 'Per capita', 'Per Cap Regular')
const tarifaAcessFixo = await fetchTegEspecialValor(dataReferencia, 'Acessível', 'Fixo', ['Fixo Esp para acessivel', 'Fixo Esp'])
const tarifaAcessPercapita = await fetchTegEspecialValor(dataReferencia, 'Acessível', 'Per capita', ['Per Cap Acessi', 'Per Cap Acessivel'])

const atualAcessivelFixo = calcEspecialFixoDia(tarifaAcessFixo?.valorMensal)
const atualAcessivelPercapita = calcEspecialPercapitaDia(tarifaAcessPercapita?.valorMensal, qtdCadAcessivel)
const propostoRegPercapitaAcrescimo = calcEspecialPercapitaDia(tarifaRegPercapita?.valorMensal, qtdRegPercapitaAcrescimo)
const gravado = remuneracao.rows[0]

console.log(JSON.stringify({
  cenario,
  identificacao: {
    os: apontamento.rows[0]?.os_concat,
    modalidadeOs: apontamento.rows[0]?.modalidade_os,
    tipoVeiculo: apontamento.rows[0]?.tipo_veiculo,
    osEspecial: apontamento.rows[0]?.os_especial,
  },
  apontamentoLinhas: linhas,
  calculoAtual: {
    regra: 'TEG ESPECIAL ACESSIVEL sobre cad_acm + ac_cad_acm (CEI/EMEI/EMEF/EMEE)',
    quantidadeCad: qtdCadAcessivel,
    tegEspecialAcessivelFixo: {
      tarifa: tarifaAcessFixo,
      formula: 'valor_mensal ÷ 30',
      valorDia: atualAcessivelFixo,
      gravado: gravado ? Number(gravado.teg_especial_acessivel_fixo) : null,
    },
    tegEspecialAcessivelPercapita: {
      tarifa: tarifaAcessPercapita,
      formula: '(valor_mensal × quantidade_cad) ÷ 30',
      quantidade: qtdCadAcessivel,
      valorDia: atualAcessivelPercapita,
      gravado: gravado ? Number(gravado.teg_especial_acessivel_percapita) : null,
    },
    tegEspecialRegularPercapita: {
      valorDia: 0,
      gravado: gravado ? Number(gravado.teg_especial_regular_percapita) : null,
    },
    totalDia: round2(atualAcessivelFixo + atualAcessivelPercapita),
  },
  calculoProposto: {
    regra: 'Manter TEG ESPECIAL ACESSIVEL + acrescimo TEG ESPECIAL REG. PERCAPITA (EMEI/EMEF/EMEE) em teg_especial_regular_percapita',
    parteMantida: {
      tegEspecialAcessivelFixo: atualAcessivelFixo,
      tegEspecialAcessivelPercapita: atualAcessivelPercapita,
    },
    acrescimoRegPercapita: {
      tiposEscola: 'EMEI, EMEF, EMEE',
      quantidades: {
        ncPresAcm: qtdNcPresEmeiEmefEmee,
        atComplNcAcm: qtdAtComplNcEmeiEmefEmee,
        total: qtdRegPercapitaAcrescimo,
      },
      tarifa: tarifaRegPercapita,
      formula: '(valor_mensal × quantidade) ÷ 30 — mesma regra de teg_especial_regular_percapita',
      tegEspecialRegularPercapita: propostoRegPercapitaAcrescimo,
      tegEspecialRegularFixo: 0,
    },
    camposFinaisPropostos: {
      tegEspecialAcessivelFixo: atualAcessivelFixo,
      tegEspecialAcessivelPercapita: atualAcessivelPercapita,
      tegEspecialRegularFixo: 0,
      tegEspecialRegularPercapita: propostoRegPercapitaAcrescimo,
      totalDia: round2(atualAcessivelFixo + atualAcessivelPercapita + propostoRegPercapitaAcrescimo),
    },
  },
}, null, 2))

await pool.end()
