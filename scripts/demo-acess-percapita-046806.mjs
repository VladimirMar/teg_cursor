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

const cenario = {
  mesAno: '04/2026',
  tipoPessoa: 'PJ',
  dre: '9 - Freguesia/Brasilândia',
  dataReferencia: '2026-04-01',
  crmc: '046.806-00',
  campo: 'Acess. Percapita (teg_especial_acessivel_percapita)',
}

const apontamento = await pool.query(`
  SELECT
    aps.data_referencia::text,
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
    AND aps.data_referencia = '2026-04-01'
    AND REGEXP_REPLACE(COALESCE(aps.crmc_condutor, ''), '[^0-9]', '', 'g') LIKE '%0468060%'
  ORDER BY te.sigla
`)

const remuneracao = await pool.query(`
  SELECT
    rs.teg_regular_fixo,
    rs.teg_regular_percapita,
    rs.teg_acessivel_fixo,
    rs.teg_acessivel_percapita,
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
    AND rs.data_referencia = '2026-04-01'
    AND os.os_concat = $1
`, [apontamento.rows[0]?.os_concat ?? ''])

const tarifa = await pool.query(`
  SELECT mbv.valor::numeric(14,2) AS valor, mbv.data::text, c.descricao AS condicao, tp.descricao AS tipo_pgto
  FROM modal_bancada_condicao_tipo_pgto_valor mbv
  JOIN modal_bancada_condicao_tipo_pgto assoc ON assoc.codigo = mbv.modal_bancada_condicao_tipo_pgto_codigo
  JOIN modalidade_tipo_bancada mtb ON mtb.codigo = assoc.modalidade_tipo_bancada_codigo
  JOIN modalidade m ON m.codigo = mtb.modalidade_codigo
  JOIN tipo_bancada tb ON tb.codigo = mtb.tipo_bancada_codigo
  JOIN tipo_pgto tp ON tp.codigo = assoc.tipo_pgto_codigo
  JOIN condicao c ON c.codigo = assoc.condicao_codigo
  WHERE UPPER(BTRIM(m.descricao)) = 'TEG ESPECIAL'
    AND UPPER(BTRIM(c.descricao)) = 'PER CAP ACESSI'
    AND mbv.data <= '2026-04-01'
  ORDER BY mbv.data DESC
  LIMIT 1
`)

const includedSiglas = ['CEI', 'EMEI', 'EMEF', 'EMEE']
let quantidadeCadAcm = 0
const linhas = []

for (const row of apontamento.rows) {
  const cadAcm = Number(row.cad_acm)
  const acCadAcm = Number(row.ac_cad_acm)
  const inclui = includedSiglas.includes(row.tipo_escola)
  const contrib = inclui ? cadAcm + acCadAcm : 0
  if (inclui) quantidadeCadAcm += contrib

  linhas.push({
    tipoEscola: row.tipo_escola,
    cad: Number(row.cad),
    acCad: Number(row.ac_cad),
    cadAcm,
    acCadAcm,
    incluidoNoQuantitativoAcessivel: inclui,
    contribuicaoQuantidade: contrib,
  })
}

const valorMensal = tarifa.rows[0] ? Number(tarifa.rows[0].valor) : null
const valorDiaCalculado = valorMensal != null
  ? round2((valorMensal * quantidadeCadAcm) / 30)
  : null
const gravado = remuneracao.rows[0]

console.log(JSON.stringify({
  cenario,
  identificacao: {
    os: apontamento.rows[0]?.os_concat ?? null,
    modalidadeOs: apontamento.rows[0]?.modalidade_os ?? null,
    tipoVeiculo: apontamento.rows[0]?.tipo_veiculo ?? null,
    osEspecial: apontamento.rows[0]?.os_especial ?? null,
    tipoBancada: apontamento.rows[0]?.tipo_de_bancada ?? null,
  },
  regraAplicada: {
    descricao: 'OS TEG ESPECIAL + veiculo ACESSIVEL: per capita em teg_especial_acessivel_percapita',
    modalidade: 'TEG ESPECIAL',
    tipoBancada: 'ACESSIVEL',
    tipoPagamento: 'PER CAPITA',
    condicaoTarifa: tarifa.rows[0]?.condicao ?? 'Per Cap Acessi',
    tiposEscolaConsiderados: 'CEI, EMEI, EMEF, EMEE (cad_acm + ac_cad_acm)',
  },
  apontamentoLinhas: linhas,
  quantidadeUtilizada: quantidadeCadAcm,
  tarifaVigente: tarifa.rows[0] ?? null,
  calculo: {
    formula: 'valor_dia = (valor_mensal × quantidade) ÷ 30',
    valorMensal,
    quantidade: quantidadeCadAcm,
    valorDiaCalculado,
    valorDiaGravado: gravado ? Number(gravado.teg_especial_acessivel_percapita) : null,
    conferencia: valorDiaCalculado != null && gravado
      ? round2(valorDiaCalculado) === round2(Number(gravado.teg_especial_acessivel_percapita))
      : null,
  },
  demaisCamposDia: gravado ? {
    tegEspecialAcessivelFixo: Number(gravado.teg_especial_acessivel_fixo),
    tegEspecialAcessivelPercapita: Number(gravado.teg_especial_acessivel_percapita),
    tegRegularFixo: Number(gravado.teg_regular_fixo),
    tegRegularPercapita: Number(gravado.teg_regular_percapita),
  } : null,
}, null, 2))

await pool.end()
