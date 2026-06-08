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

const cca = await pool.query(`
  SELECT m.descricao AS modalidade, tb.descricao AS tipo_bancada, tp.descricao AS tipo_pgto,
         c.descricao AS condicao, c.qtde_ini, c.qtde_fim, mbv.valor, mbv.data::text
  FROM modal_bancada_condicao_tipo_pgto_valor mbv
  INNER JOIN modal_bancada_condicao_tipo_pgto assoc ON assoc.codigo = mbv.modal_bancada_condicao_tipo_pgto_codigo
  INNER JOIN modalidade_tipo_bancada mtb ON mtb.codigo = assoc.modalidade_tipo_bancada_codigo
  INNER JOIN modalidade m ON m.codigo = mtb.modalidade_codigo
  INNER JOIN tipo_bancada tb ON tb.codigo = mtb.tipo_bancada_codigo
  INNER JOIN tipo_pgto tp ON tp.codigo = assoc.tipo_pgto_codigo
  INNER JOIN condicao c ON c.codigo = assoc.condicao_codigo
  WHERE UPPER(m.descricao) LIKE '%CCA%'
     OR UPPER(tb.descricao) LIKE '%CCA%'
     OR UPPER(c.descricao) LIKE '%CCA%'
  ORDER BY mbv.data DESC
  LIMIT 40
`)

const vals = await pool.query(`
  SELECT m.descricao AS modalidade, tb.descricao AS tipo_bancada, tp.descricao AS tipo_pgto,
         c.descricao AS condicao, mbv.valor, mbv.data::text
  FROM modal_bancada_condicao_tipo_pgto_valor mbv
  INNER JOIN modal_bancada_condicao_tipo_pgto assoc ON assoc.codigo = mbv.modal_bancada_condicao_tipo_pgto_codigo
  INNER JOIN modalidade_tipo_bancada mtb ON mtb.codigo = assoc.modalidade_tipo_bancada_codigo
  INNER JOIN modalidade m ON m.codigo = mtb.modalidade_codigo
  INNER JOIN tipo_bancada tb ON tb.codigo = mtb.tipo_bancada_codigo
  INNER JOIN tipo_pgto tp ON tp.codigo = assoc.tipo_pgto_codigo
  INNER JOIN condicao c ON c.codigo = assoc.condicao_codigo
  WHERE mbv.valor::numeric(14,2) IN (385.23, 2043.65)
     OR (mbv.valor::numeric(14,2) >= 385 AND mbv.valor::numeric(14,2) <= 386)
     OR (mbv.valor::numeric(14,2) >= 2043 AND mbv.valor::numeric(14,2) <= 2044)
  ORDER BY mbv.data DESC
  LIMIT 20
`)

const apont = await pool.query(`
  SELECT COUNT(*)::int AS cnt
  FROM apuracao_servicos aps
  JOIN tipo_escola te ON te.codigo = aps.tipo_escola_codigo
  WHERE te.sigla = 'CCA'
    AND (COALESCE(aps.nc_pres,0) + COALESCE(aps.ac_nc,0) + COALESCE(aps.cad,0) + COALESCE(aps.ac_cad,0)) > 0
`)

console.log(JSON.stringify({ cca: cca.rows, vals: vals.rows, apontamentoCca: apont.rows[0] }, null, 2))
await pool.end()
