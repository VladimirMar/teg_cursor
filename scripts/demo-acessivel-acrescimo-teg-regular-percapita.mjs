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

const convencionalQuantidadeConfig = {
  faixa1Limite: 15,
  faixa2Quantidade: 16,
  faixa3Inicio: 17,
  resolveLookupQuantidade: (quantidade) => quantidade,
}

const acessivelQuantidadeConfig = {
  faixa1Limite: 1,
  faixa2Quantidade: 2,
  faixa3Inicio: 3,
  resolveLookupQuantidade: (quantidade) => (quantidade >= 3 ? 3 : quantidade),
}

const resolvePercapitaQuantity = (quantidade, quantidadeConfig) => {
  const normalizedQuantidade = Math.max(0, Number(quantidade) || 0)
  if (normalizedQuantidade <= quantidadeConfig.faixa1Limite) return normalizedQuantidade
  if (normalizedQuantidade === quantidadeConfig.faixa2Quantidade) return normalizedQuantidade
  return Math.max(normalizedQuantidade - quantidadeConfig.faixa3Inicio + 1, 0)
}

const calcAcessivelTegRegularPercapitaAcrescimoDia = ({ quantidade, percapitaMensalFaixa15 }) => {
  const qty = Math.max(0, Number(quantidade) || 0)
  return {
    quantidade: qty,
    lookupQuantidadeTarifa: convencionalQuantidadeConfig.faixa1Limite,
    percapitaQty: qty,
    valorDia: round2(((Number(percapitaMensalFaixa15) || 0) * qty) / 30),
  }
}

const calcTegAcessivelDia = ({ quantidade, fixoMensal, percapitaMensal }) => {
  const qty = Math.max(0, Number(quantidade) || 0)
  const lookupQuantidade = acessivelQuantidadeConfig.resolveLookupQuantidade(qty)
  const percapitaQty = resolvePercapitaQuantity(qty, acessivelQuantidadeConfig)
  return {
    quantidade: qty,
    lookupQuantidade,
    percapitaQty,
    fixoDia: round2((Number(fixoMensal) || 0) / 30),
    percapitaDia: round2(((Number(percapitaMensal) || 0) * percapitaQty) / 30),
  }
}

const isIncludedAcrescimo = (sigla) => ['CEI', 'EMEI', 'EMEF', 'EMEE'].includes(sigla)
const isIncludedAcessivelCad = (sigla) => ['CEI', 'EMEI', 'EMEF', 'EMEE'].includes(sigla)

const fetchTabelaValor = async (dataReferencia, modalidade, tipoBancada, tipoPgto, lookupQuantidade) => {
  const result = await pool.query(`
    SELECT mbv.valor::numeric(14,2) AS valor, mbv.data::text
    FROM modal_bancada_condicao_tipo_pgto_valor mbv
    JOIN modal_bancada_condicao_tipo_pgto assoc ON assoc.codigo = mbv.modal_bancada_condicao_tipo_pgto_codigo
    JOIN modalidade_tipo_bancada mtb ON mtb.codigo = assoc.modalidade_tipo_bancada_codigo
    JOIN modalidade m ON m.codigo = mtb.modalidade_codigo
    JOIN tipo_bancada tb ON tb.codigo = mtb.tipo_bancada_codigo
    JOIN tipo_pgto tp ON tp.codigo = assoc.tipo_pgto_codigo
    JOIN condicao c ON c.codigo = assoc.condicao_codigo
    WHERE UPPER(BTRIM(m.descricao)) = UPPER(BTRIM($1))
      AND UPPER(BTRIM(tb.descricao)) = UPPER(BTRIM($2))
      AND UPPER(BTRIM(tp.descricao)) LIKE UPPER(BTRIM($3)) || '%'
      AND c.qtde_ini <= $4 AND c.qtde_fim >= $4
      AND mbv.data <= $5::date
    ORDER BY mbv.data DESC, mbv.codigo DESC
    LIMIT 1
  `, [modalidade, tipoBancada, tipoPgto, lookupQuantidade, dataReferencia])

  return result.rows[0] ? { valorMensal: Number(result.rows[0].valor), data: result.rows[0].data } : null
}

const cenario = {
  mesAno: '04/2026',
  tipoPessoa: 'PJ',
  dre: '9 - Freguesia/Brasilândia',
  dataReferencia: '2026-04-01',
  crmc: '018.584-00',
  campoDestino: 'teg_regular_percapita',
}

const apontamento = await pool.query(`
  SELECT te.sigla AS tipo_escola, aps.nc_pres, aps.cad, aps.ac_nc, aps.ac_cad,
         aps.nc_pres_acm, aps.cad_acm, aps.ac_nc_acm, aps.ac_cad_acm,
         os.os_concat, m.descricao AS modalidade_os, aps.tipo_veiculo, v.os_especial, aps.dre_codigo
  FROM apuracao_servicos aps
  JOIN ordem_servico os ON os.codigo = aps.ordem_servico_codigo
  JOIN tipo_escola te ON te.codigo = aps.tipo_escola_codigo
  LEFT JOIN modalidade m ON m.codigo = os.modalidade_codigo
  LEFT JOIN veiculo v ON BTRIM(v.crm) = BTRIM(os.crm)
  WHERE aps.mes_ano = '04/2026' AND aps.tipo_pessoa = 'PJ' AND aps.revisao = 0
    AND aps.data_referencia = '2026-04-01'
    AND REGEXP_REPLACE(COALESCE(aps.crmc_condutor, ''), '[^0-9]', '', 'g') LIKE '%0185840%'
  ORDER BY te.sigla
`)

if (!apontamento.rows.length) {
  console.log(JSON.stringify({ erro: 'Nenhum apontamento encontrado para CRMC 018.584-00 em 01/04/2026 PJ' }, null, 2))
  await pool.end()
  process.exit(0)
}

const dreCodigo = apontamento.rows[0].dre_codigo
const remuneracao = await pool.query(`
  SELECT rs.teg_regular_fixo, rs.teg_regular_percapita, rs.teg_acessivel_fixo, rs.teg_acessivel_percapita
  FROM remuneracao_servicos rs
  JOIN ordem_servico os ON os.codigo = rs.ordem_servico_codigo
  WHERE rs.mes_ano = '04/2026' AND rs.dre_codigo = $1 AND rs.tipo_pessoa = 'PJ'
    AND rs.revisao = 0 AND rs.data_referencia = '2026-04-01'
    AND os.os_concat = $2
`, [dreCodigo, apontamento.rows[0].os_concat])

let qtdNcPres = 0
let qtdAtComplNc = 0
let qtdCadAcessivel = 0
const linhas = []

for (const row of apontamento.rows) {
  const ncPresAcm = Number(row.nc_pres_acm)
  const acNcAcm = Number(row.ac_nc_acm)
  const cadAcm = Number(row.cad_acm)
  const acCadAcm = Number(row.ac_cad_acm)
  const ncContrib = isIncludedAcrescimo(row.tipo_escola) ? ncPresAcm : 0
  const acNcContrib = isIncludedAcrescimo(row.tipo_escola) ? acNcAcm : 0
  const cadContrib = isIncludedAcessivelCad(row.tipo_escola) ? cadAcm + acCadAcm : 0

  qtdNcPres += ncContrib
  qtdAtComplNc += acNcContrib
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

const dataReferencia = '2026-04-01'
const tarifaFaixa15 = await fetchTabelaValor(
  dataReferencia,
  'TEG REGULAR',
  'Convencional',
  'Per capita',
  convencionalQuantidadeConfig.faixa1Limite,
)
const lookupCad = acessivelQuantidadeConfig.resolveLookupQuantidade(qtdCadAcessivel)
const tarifaAcessPercapita = qtdCadAcessivel > 0
  ? await fetchTabelaValor(dataReferencia, 'TEG REGULAR', 'Acessível', 'Per capita', lookupCad)
  : null
const tarifaAcessFixo = qtdCadAcessivel > 0
  ? await fetchTabelaValor(dataReferencia, 'TEG REGULAR', 'Acessível', 'Fixo', lookupCad)
  : null

const calcNc = qtdNcPres > 0
  ? calcAcessivelTegRegularPercapitaAcrescimoDia({ quantidade: qtdNcPres, percapitaMensalFaixa15: tarifaFaixa15?.valorMensal })
  : { valorDia: 0, quantidade: 0, percapitaQty: 0, lookupQuantidadeTarifa: convencionalQuantidadeConfig.faixa1Limite }
const calcAcNc = qtdAtComplNc > 0
  ? calcAcessivelTegRegularPercapitaAcrescimoDia({ quantidade: qtdAtComplNc, percapitaMensalFaixa15: tarifaFaixa15?.valorMensal })
  : { valorDia: 0, quantidade: 0, percapitaQty: 0, lookupQuantidadeTarifa: convencionalQuantidadeConfig.faixa1Limite }
const propostoTegRegularPercapita = round2(calcNc.valorDia + calcAcNc.valorDia)

const atualAcess = qtdCadAcessivel > 0
  ? calcTegAcessivelDia({ quantidade: qtdCadAcessivel, fixoMensal: tarifaAcessFixo?.valorMensal, percapitaMensal: tarifaAcessPercapita?.valorMensal })
  : { fixoDia: 0, percapitaDia: 0, percapitaQty: 0, lookupQuantidade: 0 }
const atualAcessPercapita = atualAcess.percapitaDia
const atualAcessFixo = atualAcess.fixoDia
const gravado = remuneracao.rows[0]

console.log(JSON.stringify({
  cenario,
  identificacao: {
    dreCodigo: String(dreCodigo),
    os: apontamento.rows[0].os_concat,
    modalidadeOs: apontamento.rows[0].modalidade_os,
    tipoVeiculo: apontamento.rows[0].tipo_veiculo,
    osEspecial: apontamento.rows[0].os_especial,
  },
  apontamentoLinhas: linhas,
  calculoAtual: {
    regra: 'TEG REGULAR ACESSIVEL sobre cad_acm + ac_cad_acm (CEI/EMEI/EMEF/EMEE); teg_regular_percapita zerado',
    quantidadeCad: qtdCadAcessivel,
    tegAcessivelFixo: { valorDia: atualAcessFixo, gravado: gravado ? Number(gravado.teg_acessivel_fixo) : null },
    tegAcessivelPercapita: {
      quantidadeCad: qtdCadAcessivel,
      percapitaQty: atualAcess.percapitaQty,
      valorDia: atualAcessPercapita,
      gravado: gravado ? Number(gravado.teg_acessivel_percapita) : null,
    },
    tegRegularPercapita: { valorDia: 0, gravado: gravado ? Number(gravado.teg_regular_percapita) : null },
  },
  calculoProposto: {
    regra: 'Manter TEG Acessivel + acrescimo TEG REGULAR PERCAPITA (CEI/EMEI/EMEF/EMEE) em teg_regular_percapita usando tarifa ate 15 alunos x quantidade apurada',
    parteMantida: {
      tegAcessivelFixo: atualAcessFixo,
      tegAcessivelPercapita: atualAcessPercapita,
    },
    acrescimoTegRegularPercapita: {
      tiposEscola: 'CEI, EMEI, EMEF, EMEE',
      tarifaFaixa15,
      ncPres: { quantidade: qtdNcPres, detalhe: calcNc },
      atComplNc: { quantidade: qtdAtComplNc, detalhe: calcAcNc },
      tegRegularFixo: 0,
      tegRegularPercapita: propostoTegRegularPercapita,
    },
    camposFinaisPropostos: {
      tegRegularFixo: 0,
      tegRegularPercapita: propostoTegRegularPercapita,
      tegAcessivelFixo: atualAcessFixo,
      tegAcessivelPercapita: atualAcessPercapita,
      totalDia: round2(propostoTegRegularPercapita + atualAcessFixo + atualAcessPercapita),
    },
  },
}, null, 2))

await pool.end()
