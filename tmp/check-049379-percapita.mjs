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

const crmc = '049.379-00'
const mesAno = '04/2026'
const dreCodigo = 15
const tipoPessoa = 'PJ'

const condutor = await pool.query(`
  SELECT codigo, crmc, cpf_condutor, condutor
  FROM condutor
  WHERE regexp_replace(COALESCE(crmc, ''), '[^0-9]', '', 'g') = regexp_replace($1, '[^0-9]', '', 'g')
  LIMIT 5
`, [crmc])

const cpfKeys = condutor.rows.map((r) => String(r.cpf_condutor || '').replace(/\D/g, '')).filter(Boolean)

const apontamento = await pool.query(`
  SELECT
    aps.data_referencia,
    te.sigla AS tipo_escola,
    aps.nc_pres,
    aps.cad,
    aps.ac_nc,
    aps.ac_cad,
    aps.nc_pres_acm,
    aps.ac_nc_acm,
    aps.cad_acm,
    aps.tipo_veiculo,
    os.num_os,
    os.modalidade_descricao
  FROM apuracao_servicos aps
  INNER JOIN tipo_escola te ON te.codigo = aps.tipo_escola_codigo
  INNER JOIN ordem_servico os ON os.codigo = aps.ordem_servico_codigo
  WHERE aps.mes_ano = $1
    AND aps.dre_codigo = $2
    AND BTRIM(aps.tipo_pessoa) = $3
    AND aps.revisao = 0
    AND COALESCE(BTRIM(aps.cpf_condutor_key), '') = ANY($4::text[])
  ORDER BY aps.data_referencia, te.sigla
`, [mesAno, dreCodigo, tipoPessoa, cpfKeys.length ? cpfKeys : ['__none__']])

const remuneracao = await pool.query(`
  SELECT
    rs.data_referencia,
    rs.teg_regular_fixo,
    rs.teg_regular_percapita,
    rs.teg_acessivel_fixo,
    rs.teg_acessivel_percapita,
    rs.teg_especial_regular_percapita,
    os.num_os,
    os.modalidade_descricao
  FROM remuneracao_servicos rs
  INNER JOIN ordem_servico os ON os.codigo = rs.ordem_servico_codigo
  WHERE rs.mes_ano = $1
    AND rs.dre_codigo = $2
    AND BTRIM(rs.tipo_pessoa) = $3
    AND rs.revisao = 0
    AND EXISTS (
      SELECT 1 FROM apuracao_servicos aps
      WHERE aps.mes_ano = rs.mes_ano
        AND aps.data_referencia = rs.data_referencia
        AND aps.dre_codigo = rs.dre_codigo
        AND aps.ordem_servico_codigo = rs.ordem_servico_codigo
        AND aps.revisao = rs.revisao
        AND COALESCE(BTRIM(aps.tipo_pessoa), '') = BTRIM(rs.tipo_pessoa)
        AND COALESCE(BTRIM(aps.cpf_condutor_key), '') = ANY($4::text[])
    )
  ORDER BY rs.data_referencia
`, [mesAno, dreCodigo, tipoPessoa, cpfKeys.length ? cpfKeys : ['__none__']])

const totals = await pool.query(`
  SELECT
    SUM(aps.nc_pres)::int AS sum_nc_pres,
    SUM(aps.ac_nc)::int AS sum_ac_nc,
    MAX(aps.nc_pres_acm)::int AS max_nc_pres_acm,
    MAX(aps.ac_nc_acm)::int AS max_ac_nc_acm,
    COUNT(DISTINCT aps.data_referencia)::int AS dias
  FROM apuracao_servicos aps
  WHERE aps.mes_ano = $1
    AND aps.dre_codigo = $2
    AND BTRIM(aps.tipo_pessoa) = $3
    AND aps.revisao = 0
    AND COALESCE(BTRIM(aps.cpf_condutor_key), '') = ANY($4::text[])
`, [mesAno, dreCodigo, tipoPessoa, cpfKeys.length ? cpfKeys : ['__none__']])

const emei = await pool.query(`
  SELECT
    rs.data_referencia::date AS data_referencia,
    aps.nc_pres_acm,
    te.sigla,
    rs.teg_regular_percapita,
    rs.teg_creche_fixo,
    rs.teg_creche_percapita
  FROM remuneracao_servicos rs
  JOIN apuracao_servicos aps
    ON aps.mes_ano = rs.mes_ano
   AND aps.data_referencia = rs.data_referencia
   AND aps.dre_codigo = rs.dre_codigo
   AND aps.ordem_servico_codigo = rs.ordem_servico_codigo
   AND aps.revisao = rs.revisao
   AND aps.tipo_pessoa = rs.tipo_pessoa
  JOIN tipo_escola te ON te.codigo = aps.tipo_escola_codigo
  WHERE rs.mes_ano = $1
    AND rs.dre_codigo = $2
    AND BTRIM(rs.tipo_pessoa) = $3
    AND aps.cpf_condutor_key = ANY($4::text[])
    AND te.sigla = 'EMEI'
  ORDER BY rs.data_referencia
  LIMIT 5
`, [mesAno, dreCodigo, tipoPessoa, cpfKeys])

console.log(JSON.stringify({
  crmc,
  condutor: condutor.rows,
  cpfKeys,
  totals: totals.rows[0],
  apontamentoSample: apontamento.rows.slice(0, 8),
  apontamentoCount: apontamento.rowCount,
  remuneracaoSample: remuneracao.rows.slice(0, 8),
  emeiSample: emei.rows,
  remuneracaoTotals: {
    teg_regular_percapita: remuneracao.rows.reduce((s, r) => s + Number(r.teg_regular_percapita || 0), 0),
    teg_creche_percapita: remuneracao.rows.reduce((s, r) => s + Number(r.teg_creche_percapita || 0), 0),
    teg_acessivel_percapita: remuneracao.rows.reduce((s, r) => s + Number(r.teg_acessivel_percapita || 0), 0),
    dias: remuneracao.rowCount,
  },
}, null, 2))

await pool.end()
