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

const tarifas = await pool.query(`
  SELECT c.qtde_ini, c.qtde_fim, mbv.valor::numeric(14,2) AS valor, mbv.data::text, tp.descricao AS tipo_pgto
  FROM modal_bancada_condicao_tipo_pgto_valor mbv
  JOIN modal_bancada_condicao_tipo_pgto assoc ON assoc.codigo = mbv.modal_bancada_condicao_tipo_pgto_codigo
  JOIN modalidade_tipo_bancada mtb ON mtb.codigo = assoc.modalidade_tipo_bancada_codigo
  JOIN modalidade m ON m.codigo = mtb.modalidade_codigo
  JOIN tipo_bancada tb ON tb.codigo = mtb.tipo_bancada_codigo
  JOIN tipo_pgto tp ON tp.codigo = assoc.tipo_pgto_codigo
  JOIN condicao c ON c.codigo = assoc.condicao_codigo
  WHERE UPPER(BTRIM(m.descricao)) = 'TEG REGULAR'
    AND UPPER(BTRIM(tb.descricao)) = 'CONVENCIONAL'
    AND UPPER(BTRIM(tp.descricao)) LIKE 'PER CAPITA%'
    AND c.qtde_ini <= 16 AND c.qtde_fim >= 16
    AND mbv.data <= '2026-04-01'::date
  ORDER BY mbv.data DESC, mbv.codigo DESC
  LIMIT 5
`)

const tarifas15 = await pool.query(`
  SELECT c.qtde_ini, c.qtde_fim, mbv.valor::numeric(14,2) AS valor, mbv.data::text
  FROM modal_bancada_condicao_tipo_pgto_valor mbv
  JOIN modal_bancada_condicao_tipo_pgto assoc ON assoc.codigo = mbv.modal_bancada_condicao_tipo_pgto_codigo
  JOIN modalidade_tipo_bancada mtb ON mtb.codigo = assoc.modalidade_tipo_bancada_codigo
  JOIN modalidade m ON m.codigo = mtb.modalidade_codigo
  JOIN tipo_bancada tb ON tb.codigo = mtb.tipo_bancada_codigo
  JOIN tipo_pgto tp ON tp.codigo = assoc.tipo_pgto_codigo
  JOIN condicao c ON c.codigo = assoc.condicao_codigo
  WHERE UPPER(BTRIM(m.descricao)) = 'TEG REGULAR'
    AND UPPER(BTRIM(tb.descricao)) = 'CONVENCIONAL'
    AND UPPER(BTRIM(tp.descricao)) LIKE 'PER CAPITA%'
    AND c.qtde_ini <= 15 AND c.qtde_fim >= 15
    AND mbv.data <= '2026-04-01'::date
  ORDER BY mbv.data DESC, mbv.codigo DESC
  LIMIT 3
`)

const rem = await pool.query(`
  SELECT rs.teg_regular_fixo, rs.teg_regular_percapita, rs.teg_acessivel_fixo, rs.teg_acessivel_percapita
  FROM remuneracao_servicos rs
  JOIN ordem_servico os ON os.codigo = rs.ordem_servico_codigo
  WHERE rs.mes_ano='04/2026' AND rs.dre_codigo=9 AND rs.tipo_pessoa='PJ' AND rs.revisao=0
    AND rs.data_referencia='2026-04-01'
    AND REGEXP_REPLACE(COALESCE(os.crm,''), '[^0-9]', '', 'g') LIKE '%0185840%'
`)

console.log(JSON.stringify({
  remuneracaoGravada: rem.rows[0],
  tarifaFaixa16: tarifas.rows,
  tarifaFaixa15: tarifas15.rows,
  formula: '(valorMensalPerCapita * percapitaQty) / 30',
  calculo: {
    quantidadeNcPresAcm: 16,
    lookupQuantidade: 16,
    percapitaQty: 16,
    valorMensal: Number(tarifas.rows[0]?.valor ?? 0),
    valorDia: Number((((Number(tarifas.rows[0]?.valor ?? 0)) * 16) / 30).toFixed(2)),
  },
}, null, 2))

await pool.end()
