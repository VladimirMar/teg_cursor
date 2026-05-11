import pg from 'pg'

const { Pool } = pg

const pool = new Pool({
  host: process.env.PGHOST ?? 'localhost',
  port: Number(process.env.PGPORT ?? 5432),
  database: process.env.PGDATABASE ?? 'teg_financ',
  user: process.env.PGUSER ?? 'postgres',
  password: process.env.PGPASSWORD ?? '12345',
})

const sql = `
WITH parametro AS (
  SELECT pv.qtde_condicao::numeric(14,2) AS viagens
  FROM parametro_veiculo pv
  INNER JOIN modalidade_tipo_bancada mtb ON mtb.codigo = pv.modalidade_tipo_bancada_codigo
  INNER JOIN modalidade m ON m.codigo = mtb.modalidade_codigo
  INNER JOIN tipo_bancada tb ON tb.codigo = mtb.tipo_bancada_codigo
  WHERE UPPER(BTRIM(m.descricao)) = 'TEG ESPECIAL'
    AND UPPER(BTRIM(tb.descricao)) = 'CONVENCIONAL'
    AND UPPER(BTRIM(pv.condicao)) = 'VIAGEM'
  ORDER BY pv.data DESC, pv.codigo DESC
  LIMIT 1
), fixo AS (
  SELECT mbv.valor::numeric(14,2) AS valor_fixo
  FROM modal_bancada_condicao_tipo_pgto_valor mbv
  INNER JOIN modal_bancada_condicao_tipo_pgto assoc ON assoc.codigo = mbv.modal_bancada_condicao_tipo_pgto_codigo
  INNER JOIN modalidade_tipo_bancada mtb ON mtb.codigo = assoc.modalidade_tipo_bancada_codigo
  INNER JOIN modalidade m ON m.codigo = mtb.modalidade_codigo
  INNER JOIN tipo_bancada tb ON tb.codigo = mtb.tipo_bancada_codigo
  INNER JOIN tipo_pgto tp ON tp.codigo = assoc.tipo_pgto_codigo
  INNER JOIN condicao c ON c.codigo = assoc.condicao_codigo
  WHERE UPPER(BTRIM(m.descricao)) = 'TEG ESPECIAL'
    AND UPPER(BTRIM(tb.descricao)) = 'CONVENCIONAL'
    AND UPPER(BTRIM(tp.descricao)) = 'FIXO'
    AND UPPER(BTRIM(c.descricao)) = 'FIXO ESP'
  ORDER BY mbv.data DESC, mbv.codigo DESC
  LIMIT 1
), percap AS (
  SELECT mbv.valor::numeric(14,2) AS valor_percap
  FROM modal_bancada_condicao_tipo_pgto_valor mbv
  INNER JOIN modal_bancada_condicao_tipo_pgto assoc ON assoc.codigo = mbv.modal_bancada_condicao_tipo_pgto_codigo
  INNER JOIN modalidade_tipo_bancada mtb ON mtb.codigo = assoc.modalidade_tipo_bancada_codigo
  INNER JOIN modalidade m ON m.codigo = mtb.modalidade_codigo
  INNER JOIN tipo_bancada tb ON tb.codigo = mtb.tipo_bancada_codigo
  INNER JOIN tipo_pgto tp ON tp.codigo = assoc.tipo_pgto_codigo
  INNER JOIN condicao c ON c.codigo = assoc.condicao_codigo
  WHERE UPPER(BTRIM(m.descricao)) = 'TEG ESPECIAL'
    AND UPPER(BTRIM(tb.descricao)) = 'CONVENCIONAL'
    AND UPPER(BTRIM(tp.descricao)) = 'PER CAPITA'
    AND UPPER(BTRIM(c.descricao)) = 'PER CAP REGULAR'
  ORDER BY mbv.data DESC, mbv.codigo DESC
  LIMIT 1
)
SELECT
  COUNT(*)::int AS total_afetados,
  MIN(ROUND(((fixo.valor_fixo * 12) + (((CAST(v.cap_teg AS numeric(14,2)) * percap.valor_percap) * parametro.viagens) * 12)), 2))::text AS menor_valor,
  MAX(ROUND(((fixo.valor_fixo * 12) + (((CAST(v.cap_teg AS numeric(14,2)) * percap.valor_percap) * parametro.viagens) * 12)), 2))::text AS maior_valor
FROM veiculo v
CROSS JOIN parametro
CROSS JOIN fixo
CROSS JOIN percap
WHERE UPPER(BTRIM(COALESCE(v.os_especial, ''))) = 'SIM'
  AND UPPER(BTRIM(COALESCE(v.tipo_de_bancada, ''))) = 'CONVENCIONAL'
  AND NULLIF(BTRIM(CAST(v.cap_teg AS text)), '') IS NOT NULL;
`

const sampleSql = `
WITH parametro AS (
  SELECT pv.qtde_condicao::numeric(14,2) AS viagens
  FROM parametro_veiculo pv
  INNER JOIN modalidade_tipo_bancada mtb ON mtb.codigo = pv.modalidade_tipo_bancada_codigo
  INNER JOIN modalidade m ON m.codigo = mtb.modalidade_codigo
  INNER JOIN tipo_bancada tb ON tb.codigo = mtb.tipo_bancada_codigo
  WHERE UPPER(BTRIM(m.descricao)) = 'TEG ESPECIAL'
    AND UPPER(BTRIM(tb.descricao)) = 'CONVENCIONAL'
    AND UPPER(BTRIM(pv.condicao)) = 'VIAGEM'
  ORDER BY pv.data DESC, pv.codigo DESC
  LIMIT 1
), fixo AS (
  SELECT mbv.valor::numeric(14,2) AS valor_fixo
  FROM modal_bancada_condicao_tipo_pgto_valor mbv
  INNER JOIN modal_bancada_condicao_tipo_pgto assoc ON assoc.codigo = mbv.modal_bancada_condicao_tipo_pgto_codigo
  INNER JOIN modalidade_tipo_bancada mtb ON mtb.codigo = assoc.modalidade_tipo_bancada_codigo
  INNER JOIN modalidade m ON m.codigo = mtb.modalidade_codigo
  INNER JOIN tipo_bancada tb ON tb.codigo = mtb.tipo_bancada_codigo
  INNER JOIN tipo_pgto tp ON tp.codigo = assoc.tipo_pgto_codigo
  INNER JOIN condicao c ON c.codigo = assoc.condicao_codigo
  WHERE UPPER(BTRIM(m.descricao)) = 'TEG ESPECIAL'
    AND UPPER(BTRIM(tb.descricao)) = 'CONVENCIONAL'
    AND UPPER(BTRIM(tp.descricao)) = 'FIXO'
    AND UPPER(BTRIM(c.descricao)) = 'FIXO ESP'
  ORDER BY mbv.data DESC, mbv.codigo DESC
  LIMIT 1
), percap AS (
  SELECT mbv.valor::numeric(14,2) AS valor_percap
  FROM modal_bancada_condicao_tipo_pgto_valor mbv
  INNER JOIN modal_bancada_condicao_tipo_pgto assoc ON assoc.codigo = mbv.modal_bancada_condicao_tipo_pgto_codigo
  INNER JOIN modalidade_tipo_bancada mtb ON mtb.codigo = assoc.modalidade_tipo_bancada_codigo
  INNER JOIN modalidade m ON m.codigo = mtb.modalidade_codigo
  INNER JOIN tipo_bancada tb ON tb.codigo = mtb.tipo_bancada_codigo
  INNER JOIN tipo_pgto tp ON tp.codigo = assoc.tipo_pgto_codigo
  INNER JOIN condicao c ON c.codigo = assoc.condicao_codigo
  WHERE UPPER(BTRIM(m.descricao)) = 'TEG ESPECIAL'
    AND UPPER(BTRIM(tb.descricao)) = 'CONVENCIONAL'
    AND UPPER(BTRIM(tp.descricao)) = 'PER CAPITA'
    AND UPPER(BTRIM(c.descricao)) = 'PER CAP REGULAR'
  ORDER BY mbv.data DESC, mbv.codigo DESC
  LIMIT 1
)
SELECT
  CAST(v.codigo AS text) AS codigo,
  BTRIM(COALESCE(v.placas, '')) AS placas,
  BTRIM(CAST(v.cap_teg AS text)) AS cap_teg,
  COALESCE(TO_CHAR(v.valor_veiculo, 'FM999999999990.00'), '') AS valor_atual,
  ROUND(((fixo.valor_fixo * 12) + (((CAST(v.cap_teg AS numeric(14,2)) * percap.valor_percap) * parametro.viagens) * 12)), 2)::text AS valor_calculado
FROM veiculo v
CROSS JOIN parametro
CROSS JOIN fixo
CROSS JOIN percap
WHERE UPPER(BTRIM(COALESCE(v.os_especial, ''))) = 'SIM'
  AND UPPER(BTRIM(COALESCE(v.tipo_de_bancada, ''))) = 'CONVENCIONAL'
  AND NULLIF(BTRIM(CAST(v.cap_teg AS text)), '') IS NOT NULL
ORDER BY v.codigo ASC
LIMIT 10;
`

async function main() {
  const [summaryResult, sampleResult] = await Promise.all([
    pool.query(sql),
    pool.query(sampleSql),
  ])

  console.log(JSON.stringify({ summary: summaryResult.rows[0], sample: sampleResult.rows }, null, 2))
  await pool.end()
}

main().catch(async (error) => {
  console.error(error)
  await pool.end()
  process.exitCode = 1
})
