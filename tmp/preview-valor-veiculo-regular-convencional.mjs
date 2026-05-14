import pg from 'pg'

const { Pool } = pg

const pool = new Pool({
  host: process.env.PGHOST ?? 'localhost',
  port: Number(process.env.PGPORT ?? 5432),
  database: process.env.PGDATABASE ?? 'teg_financ',
  user: process.env.PGUSER ?? 'postgres',
  password: process.env.PGPASSWORD ?? '12345',
})

const normalizeSqlText = "translate(UPPER(BTRIM(COALESCE(%s, ''))), 'ÁÀÃÂÉÊÍÓÔÕÚÇ', 'AAAAEEIOOOUC')"

const summarySql = `
WITH parametro_multiplicador AS (
  SELECT pv.qtde_condicao::numeric(14,2) AS multiplicador
  FROM parametro_veiculo pv
  INNER JOIN modalidade_tipo_bancada mtb ON mtb.codigo = pv.modalidade_tipo_bancada_codigo
  INNER JOIN modalidade m ON m.codigo = mtb.modalidade_codigo
  INNER JOIN tipo_bancada tb ON tb.codigo = mtb.tipo_bancada_codigo
  WHERE ${normalizeSqlText.replace('%s', 'm.descricao')} = 'TEG REGULAR'
    AND ${normalizeSqlText.replace('%s', 'tb.descricao')} = 'CONVENCIONAL'
    AND ${normalizeSqlText.replace('%s', 'pv.condicao')} = 'DESCONTO/ VIAGEM'
  ORDER BY pv.data DESC, pv.codigo DESC
  LIMIT 1
), parametro_subtracao AS (
  SELECT pv.qtde_condicao::numeric(14,2) AS subtracao
  FROM parametro_veiculo pv
  INNER JOIN modalidade_tipo_bancada mtb ON mtb.codigo = pv.modalidade_tipo_bancada_codigo
  INNER JOIN modalidade m ON m.codigo = mtb.modalidade_codigo
  INNER JOIN tipo_bancada tb ON tb.codigo = mtb.tipo_bancada_codigo
  WHERE ${normalizeSqlText.replace('%s', 'm.descricao')} = 'TEG ESPECIAL'
    AND ${normalizeSqlText.replace('%s', 'tb.descricao')} = 'CONVENCIONAL'
    AND ${normalizeSqlText.replace('%s', 'pv.condicao')} = 'CAPACIDADE'
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
  WHERE ${normalizeSqlText.replace('%s', 'm.descricao')} = 'TEG REGULAR'
    AND ${normalizeSqlText.replace('%s', 'tb.descricao')} = 'CONVENCIONAL'
    AND ${normalizeSqlText.replace('%s', 'tp.descricao')} = 'FIXO'
    AND ${normalizeSqlText.replace('%s', 'c.descricao')} = '17 EM DIANTE'
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
  WHERE ${normalizeSqlText.replace('%s', 'm.descricao')} = 'TEG REGULAR'
    AND ${normalizeSqlText.replace('%s', 'tb.descricao')} = 'CONVENCIONAL'
    AND ${normalizeSqlText.replace('%s', 'tp.descricao')} = 'PER CAPITA'
    AND ${normalizeSqlText.replace('%s', 'c.descricao')} = '17 EM DIANTE'
  ORDER BY mbv.data DESC, mbv.codigo DESC
  LIMIT 1
), calculo AS (
  SELECT
    v.codigo,
    ROUND(((fixo.valor_fixo * 12) + ((((v.cap_teg::numeric(14,2) * parametro_multiplicador.multiplicador) - parametro_subtracao.subtracao) * percap.valor_percap) * 12)), 2) AS valor_calculado
  FROM veiculo v
  CROSS JOIN parametro_multiplicador
  CROSS JOIN parametro_subtracao
  CROSS JOIN fixo
  CROSS JOIN percap
  WHERE ${normalizeSqlText.replace('%s', 'v.os_especial')} = 'NAO'
    AND ${normalizeSqlText.replace('%s', 'v.tipo_de_bancada')} = 'CONVENCIONAL'
    AND v.cap_teg IS NOT NULL
)
SELECT
  (SELECT multiplicador::text FROM parametro_multiplicador) AS multiplicador,
  (SELECT subtracao::text FROM parametro_subtracao) AS subtracao,
  (SELECT valor_fixo::text FROM fixo) AS valor_fixo,
  (SELECT valor_percap::text FROM percap) AS valor_percap,
  COUNT(*)::int AS total_afetados,
  COUNT(*) FILTER (WHERE COALESCE(v.valor_veiculo, -1) <> calculo.valor_calculado)::int AS total_divergente,
  MIN(calculo.valor_calculado)::text AS menor_valor,
  MAX(calculo.valor_calculado)::text AS maior_valor
FROM calculo
INNER JOIN veiculo v ON v.codigo = calculo.codigo;
`

const sampleSql = `
WITH parametro_multiplicador AS (
  SELECT pv.qtde_condicao::numeric(14,2) AS multiplicador
  FROM parametro_veiculo pv
  INNER JOIN modalidade_tipo_bancada mtb ON mtb.codigo = pv.modalidade_tipo_bancada_codigo
  INNER JOIN modalidade m ON m.codigo = mtb.modalidade_codigo
  INNER JOIN tipo_bancada tb ON tb.codigo = mtb.tipo_bancada_codigo
  WHERE ${normalizeSqlText.replace('%s', 'm.descricao')} = 'TEG REGULAR'
    AND ${normalizeSqlText.replace('%s', 'tb.descricao')} = 'CONVENCIONAL'
    AND ${normalizeSqlText.replace('%s', 'pv.condicao')} = 'DESCONTO/ VIAGEM'
  ORDER BY pv.data DESC, pv.codigo DESC
  LIMIT 1
), parametro_subtracao AS (
  SELECT pv.qtde_condicao::numeric(14,2) AS subtracao
  FROM parametro_veiculo pv
  INNER JOIN modalidade_tipo_bancada mtb ON mtb.codigo = pv.modalidade_tipo_bancada_codigo
  INNER JOIN modalidade m ON m.codigo = mtb.modalidade_codigo
  INNER JOIN tipo_bancada tb ON tb.codigo = mtb.tipo_bancada_codigo
  WHERE ${normalizeSqlText.replace('%s', 'm.descricao')} = 'TEG ESPECIAL'
    AND ${normalizeSqlText.replace('%s', 'tb.descricao')} = 'CONVENCIONAL'
    AND ${normalizeSqlText.replace('%s', 'pv.condicao')} = 'CAPACIDADE'
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
  WHERE ${normalizeSqlText.replace('%s', 'm.descricao')} = 'TEG REGULAR'
    AND ${normalizeSqlText.replace('%s', 'tb.descricao')} = 'CONVENCIONAL'
    AND ${normalizeSqlText.replace('%s', 'tp.descricao')} = 'FIXO'
    AND ${normalizeSqlText.replace('%s', 'c.descricao')} = '17 EM DIANTE'
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
  WHERE ${normalizeSqlText.replace('%s', 'm.descricao')} = 'TEG REGULAR'
    AND ${normalizeSqlText.replace('%s', 'tb.descricao')} = 'CONVENCIONAL'
    AND ${normalizeSqlText.replace('%s', 'tp.descricao')} = 'PER CAPITA'
    AND ${normalizeSqlText.replace('%s', 'c.descricao')} = '17 EM DIANTE'
  ORDER BY mbv.data DESC, mbv.codigo DESC
  LIMIT 1
)
SELECT
  CAST(v.codigo AS text) AS codigo,
  BTRIM(COALESCE(v.placas, '')) AS placas,
  BTRIM(CAST(v.cap_teg AS text)) AS cap_teg,
  COALESCE(TO_CHAR(v.valor_veiculo, 'FM999999999990.00'), '') AS valor_atual,
  ROUND(((fixo.valor_fixo * 12) + ((((v.cap_teg::numeric(14,2) * parametro_multiplicador.multiplicador) - parametro_subtracao.subtracao) * percap.valor_percap) * 12)), 2)::text AS valor_calculado
FROM veiculo v
CROSS JOIN parametro_multiplicador
CROSS JOIN parametro_subtracao
CROSS JOIN fixo
CROSS JOIN percap
WHERE ${normalizeSqlText.replace('%s', 'v.os_especial')} = 'NAO'
  AND ${normalizeSqlText.replace('%s', 'v.tipo_de_bancada')} = 'CONVENCIONAL'
  AND v.cap_teg IS NOT NULL
ORDER BY v.codigo ASC
LIMIT 20;
`

async function main() {
  const [summaryResult, sampleResult] = await Promise.all([
    pool.query(summarySql),
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
