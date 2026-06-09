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

const rem2 = await pool.query(`
  SELECT rs.teg_regular_fixo, rs.teg_regular_percapita, rs.teg_acessivel_fixo, rs.teg_acessivel_percapita,
         os.os_concat, aps.crmc_condutor
  FROM remuneracao_servicos rs
  JOIN ordem_servico os ON os.codigo = rs.ordem_servico_codigo
  JOIN apuracao_servicos aps ON aps.mes_ano = rs.mes_ano AND aps.dre_codigo = rs.dre_codigo
    AND aps.tipo_pessoa = rs.tipo_pessoa AND aps.revisao = rs.revisao
    AND aps.data_referencia = rs.data_referencia AND aps.ordem_servico_codigo = rs.ordem_servico_codigo
  WHERE rs.mes_ano='04/2026' AND rs.dre_codigo=9 AND rs.tipo_pessoa='PJ' AND rs.revisao=0
    AND rs.data_referencia='2026-04-01'
    AND REGEXP_REPLACE(COALESCE(aps.crmc_condutor, ''), '[^0-9]', '', 'g') LIKE '%0185840%'
  LIMIT 1
`)

console.log(JSON.stringify(rem2.rows[0], null, 2))
await pool.end()
