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

const fetchValor = async (dataReferencia, tipoBancada) => {
  const result = await pool.query(`
    SELECT mbv.valor::numeric(14,2) AS valor
    FROM modal_bancada_condicao_tipo_pgto_valor mbv
    INNER JOIN modal_bancada_condicao_tipo_pgto assoc ON assoc.codigo = mbv.modal_bancada_condicao_tipo_pgto_codigo
    INNER JOIN modalidade_tipo_bancada mtb ON mtb.codigo = assoc.modalidade_tipo_bancada_codigo
    INNER JOIN modalidade m ON m.codigo = mtb.modalidade_codigo
    INNER JOIN tipo_bancada tb ON tb.codigo = mtb.tipo_bancada_codigo
    INNER JOIN tipo_pgto tp ON tp.codigo = assoc.tipo_pgto_codigo
    INNER JOIN condicao c ON c.codigo = assoc.condicao_codigo
    WHERE UPPER(BTRIM(m.descricao)) = 'TEG REGULAR'
      AND UPPER(BTRIM(tb.descricao)) = UPPER(BTRIM($1))
      AND UPPER(BTRIM(tp.descricao)) = 'PER CAPITA'
      AND c.qtde_ini <= 1
      AND c.qtde_fim >= 1
      AND mbv.data <= $2::date
    ORDER BY mbv.data DESC, mbv.codigo DESC
    LIMIT 1
  `, [tipoBancada, dataReferencia])

  return result.rows[0] ? Number(result.rows[0].valor) : null
}

const dataReferencia = '2026-04-01'
const convencional = await fetchValor(dataReferencia, 'CONVENCIONAL')
const acessivel = await fetchValor(dataReferencia, 'ACESSIVEL')

const exemplo = {
  ncPres: 1,
  atComplNc: 1,
  cad: 1,
  atComplCad: 0,
}

const ncQty = exemplo.ncPres + exemplo.atComplNc
const cadQty = exemplo.cad + exemplo.atComplCad
const total = round2(((ncQty * convencional) / 30) + ((cadQty * acessivel) / 30))

console.log(JSON.stringify({
  dataReferencia,
  tarifas: { convencional, acessivel },
  exemplo,
  formula: '((nc_pres+ac_nc)*conv/30)+((cad+ac_cad)*acess/30)',
  total,
}, null, 2))

await pool.end()
