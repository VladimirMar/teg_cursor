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

const cpf = '22748448871'

const cei = await pool.query(`
  SELECT
    aps.data_referencia::date AS data_referencia,
    te.sigla,
    te.codigo AS tipo_escola_codigo,
    aps.nc_pres,
    aps.ac_nc,
    aps.nc_pres_acm,
    aps.ac_nc_acm,
    rs.teg_regular_percapita,
    rs.teg_creche_fixo,
    rs.teg_creche_percapita
  FROM apuracao_servicos aps
  JOIN tipo_escola te ON te.codigo = aps.tipo_escola_codigo
  LEFT JOIN remuneracao_servicos rs
    ON rs.mes_ano = aps.mes_ano
   AND rs.data_referencia = aps.data_referencia
   AND rs.dre_codigo = aps.dre_codigo
   AND rs.ordem_servico_codigo = aps.ordem_servico_codigo
   AND rs.revisao = aps.revisao
   AND rs.tipo_pessoa = aps.tipo_pessoa
  WHERE aps.mes_ano = '04/2026'
    AND aps.dre_codigo = 15
    AND BTRIM(aps.tipo_pessoa) = 'PJ'
    AND aps.revisao = 0
    AND aps.cpf_condutor_key = $1
    AND te.sigla = 'CEI'
  ORDER BY aps.data_referencia
`, [cpf])

const daysWithQty = await pool.query(`
  SELECT
    aps.data_referencia::date AS data_referencia,
    SUM(CASE WHEN te.sigla = 'CEI' THEN COALESCE(aps.nc_pres_acm, 0) + COALESCE(aps.ac_nc_acm, 0) ELSE 0 END)::int AS cei_acm,
    SUM(CASE WHEN te.sigla IN ('CEI','EMEI','EMEF','EMEE') THEN COALESCE(aps.nc_pres_acm, 0) ELSE 0 END)::int AS nc_pres_acm_schools,
    MAX(rs.teg_creche_percapita) AS teg_creche_percapita,
    MAX(rs.teg_regular_percapita) AS teg_regular_percapita
  FROM apuracao_servicos aps
  JOIN tipo_escola te ON te.codigo = aps.tipo_escola_codigo
  LEFT JOIN remuneracao_servicos rs
    ON rs.mes_ano = aps.mes_ano
   AND rs.data_referencia = aps.data_referencia
   AND rs.dre_codigo = aps.dre_codigo
   AND rs.ordem_servico_codigo = aps.ordem_servico_codigo
   AND rs.revisao = aps.revisao
   AND rs.tipo_pessoa = aps.tipo_pessoa
  WHERE aps.mes_ano = '04/2026'
    AND aps.dre_codigo = 15
    AND BTRIM(aps.tipo_pessoa) = 'PJ'
    AND aps.revisao = 0
    AND aps.cpf_condutor_key = $1
  GROUP BY aps.data_referencia
  HAVING SUM(CASE WHEN te.sigla = 'CEI' THEN COALESCE(aps.nc_pres_acm, 0) + COALESCE(aps.ac_nc_acm, 0) ELSE 0 END) > 0
     OR SUM(CASE WHEN te.sigla = 'EMEI' THEN COALESCE(aps.nc_pres_acm, 0) ELSE 0 END) > 0
  ORDER BY aps.data_referencia
`, [cpf])

const veiculo = await pool.query(`
  SELECT DISTINCT os.veiculo_placas, v.cap_teg_creche, v.tipo_de_bancada
  FROM apuracao_servicos aps
  JOIN ordem_servico os ON os.codigo = aps.ordem_servico_codigo
  LEFT JOIN veiculo v ON BTRIM(v.crm) = BTRIM(os.crm)
  WHERE aps.mes_ano = '04/2026' AND aps.dre_codigo = 15 AND aps.cpf_condutor_key = $1
  LIMIT 5
`, [cpf])

console.log(JSON.stringify({
  ceiRows: cei.rows,
  ceiNonZero: cei.rows.filter((r) => Number(r.nc_pres) > 0 || Number(r.nc_pres_acm) > 0),
  daysWithQty: daysWithQty.rows,
  veiculo: veiculo.rows,
}, null, 2))

await pool.end()
