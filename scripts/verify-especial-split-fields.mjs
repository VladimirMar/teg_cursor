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

const rows = await pool.query(`
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
    AND os.os_concat = '2022/0034761-001B'
  ORDER BY rs.data_referencia
  LIMIT 3
`)

const totals = await pool.query(`
  SELECT
    SUM(rs.teg_regular_fixo) AS teg_regular_fixo,
    SUM(rs.teg_regular_percapita) AS teg_regular_percapita,
    SUM(rs.teg_especial_regular_fixo) AS teg_especial_regular_fixo,
    SUM(rs.teg_especial_regular_percapita) AS teg_especial_regular_percapita,
    SUM(rs.teg_especial_acessivel_fixo) AS teg_especial_acessivel_fixo,
    SUM(rs.teg_especial_acessivel_percapita) AS teg_especial_acessivel_percapita
  FROM remuneracao_servicos rs
  JOIN ordem_servico os ON os.codigo = rs.ordem_servico_codigo
  WHERE rs.mes_ano = '04/2026'
    AND rs.dre_codigo = 9
    AND rs.tipo_pessoa = 'PJ'
    AND rs.revisao = 0
    AND os.os_concat = '2022/0034761-001B'
`)

console.log(JSON.stringify({ amostra: rows.rows, totais: totals.rows[0] }, null, 2))
await pool.end()
