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

const dre = await pool.query(`
  SELECT codigo, sigla, descricao
  FROM dre
  WHERE codigo = 15 OR sigla ILIKE '%MP%' OR descricao ILIKE '%Miguel%'
`)

const af = await pool.query(`
  SELECT mes_ano, dre_codigo, revisao, tipo_pessoa, situacao, data_alteracao::text
  FROM apuracao_financeira
  WHERE mes_ano = '04/2026' AND dre_codigo = 15 AND tipo_pessoa = 'PJ' AND revisao = 0
`)

const counts = await pool.query(`
  SELECT
    data_referencia::text,
    COUNT(*)::int AS linhas,
    SUM(CASE WHEN nc_pres <> 0 OR cad <> 0 OR ac_nc <> 0 OR ac_cad <> 0 OR cont_nc <> 0 OR cont_cad <> 0 OR km <> 0 THEN 1 ELSE 0 END)::int AS com_valor
  FROM apuracao_servicos
  WHERE mes_ano = '04/2026' AND dre_codigo = 15 AND tipo_pessoa = 'PJ' AND revisao = 0
  GROUP BY data_referencia
  ORDER BY data_referencia
  LIMIT 10
`)

const day01 = await pool.query(`
  SELECT COUNT(*)::int AS total,
         SUM(nc_pres)::int AS nc_pres,
         SUM(cad)::int AS cad,
         SUM(cont_nc)::int AS cont_nc,
         SUM(cont_cad)::int AS cont_cad
  FROM apuracao_servicos
  WHERE mes_ano = '04/2026' AND dre_codigo = 15 AND tipo_pessoa = 'PJ' AND revisao = 0
    AND data_referencia = '2026-04-01'
`)

const day01Sample = await pool.query(`
  SELECT aps.nc_pres, aps.cad, aps.ac_nc, aps.ac_cad, aps.cont_nc, aps.cont_cad, aps.km,
         os.os_concat, te.sigla AS tipo_escola
  FROM apuracao_servicos aps
  JOIN ordem_servico os ON os.codigo = aps.ordem_servico_codigo
  JOIN tipo_escola te ON te.codigo = aps.tipo_escola_codigo
  WHERE aps.mes_ano = '04/2026' AND aps.dre_codigo = 15 AND aps.tipo_pessoa = 'PJ' AND aps.revisao = 0
    AND aps.data_referencia = '2026-04-01'
    AND (aps.nc_pres <> 0 OR aps.cad <> 0 OR aps.ac_nc <> 0 OR aps.ac_cad <> 0 OR aps.cont_nc <> 0 OR aps.cont_cad <> 0 OR aps.km <> 0)
  LIMIT 5
`)

const day01_2024 = await pool.query(`
  SELECT COUNT(*)::int AS total
  FROM apuracao_servicos
  WHERE mes_ano = '04/2026' AND dre_codigo = 15 AND tipo_pessoa = 'PJ' AND revisao = 0
    AND data_referencia = '2024-04-01'
`)

console.log(JSON.stringify({
  dre: dre.rows,
  apuracaoFinanceira: af.rows,
  countsByDate: counts.rows,
  day01_2026: day01.rows[0],
  day01SampleWithValues: day01Sample.rows,
  day01_2024_wrong_filter: day01_2024.rows[0],
}, null, 2))

await pool.end()
