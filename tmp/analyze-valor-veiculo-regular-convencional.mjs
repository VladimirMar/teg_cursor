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

const sql = `
WITH veiculos AS (
  SELECT codigo, cap_teg::numeric(14,2) AS cap_teg, COALESCE(valor_veiculo, 0)::numeric(14,2) AS valor_veiculo
  FROM veiculo
  WHERE ${normalizeSqlText.replace('%s', 'os_especial')} = 'NAO'
    AND ${normalizeSqlText.replace('%s', 'tipo_de_bancada')} = 'CONVENCIONAL'
    AND cap_teg IS NOT NULL
), parametros AS (
  SELECT ${normalizeSqlText.replace('%s', 'pv.condicao')} AS condicao_key, pv.qtde_condicao::numeric(14,2) AS valor
  FROM parametro_veiculo pv
  INNER JOIN modalidade_tipo_bancada mtb ON mtb.codigo = pv.modalidade_tipo_bancada_codigo
  INNER JOIN modalidade m ON m.codigo = mtb.modalidade_codigo
  INNER JOIN tipo_bancada tb ON tb.codigo = mtb.tipo_bancada_codigo
  WHERE ${normalizeSqlText.replace('%s', 'm.descricao')} = 'TEG REGULAR'
    AND ${normalizeSqlText.replace('%s', 'tb.descricao')} = 'CONVENCIONAL'
    AND pv.data = (
      SELECT MAX(pv2.data)
      FROM parametro_veiculo pv2
      WHERE pv2.modalidade_tipo_bancada_codigo = pv.modalidade_tipo_bancada_codigo
        AND ${normalizeSqlText.replace('%s', 'pv2.condicao')} = ${normalizeSqlText.replace('%s', 'pv.condicao')}
    )
), valores AS (
  SELECT
    ${normalizeSqlText.replace('%s', 'tp.descricao')} AS tipo_pgto_key,
    ${normalizeSqlText.replace('%s', 'c.descricao')} AS condicao_key,
    mbv.valor::numeric(14,2) AS valor
  FROM modal_bancada_condicao_tipo_pgto_valor mbv
  INNER JOIN modal_bancada_condicao_tipo_pgto assoc ON assoc.codigo = mbv.modal_bancada_condicao_tipo_pgto_codigo
  INNER JOIN modalidade_tipo_bancada mtb ON mtb.codigo = assoc.modalidade_tipo_bancada_codigo
  INNER JOIN modalidade m ON m.codigo = mtb.modalidade_codigo
  INNER JOIN tipo_bancada tb ON tb.codigo = mtb.tipo_bancada_codigo
  INNER JOIN tipo_pgto tp ON tp.codigo = assoc.tipo_pgto_codigo
  INNER JOIN condicao c ON c.codigo = assoc.condicao_codigo
  WHERE ${normalizeSqlText.replace('%s', 'm.descricao')} = 'TEG REGULAR'
    AND ${normalizeSqlText.replace('%s', 'tb.descricao')} = 'CONVENCIONAL'
    AND mbv.data = (
      SELECT MAX(mbv2.data)
      FROM modal_bancada_condicao_tipo_pgto_valor mbv2
      WHERE mbv2.modal_bancada_condicao_tipo_pgto_codigo = mbv.modal_bancada_condicao_tipo_pgto_codigo
    )
), pares_valores AS (
  SELECT
    fixo.condicao_key,
    fixo.valor AS valor_fixo,
    percap.valor AS valor_percap
  FROM valores fixo
  INNER JOIN valores percap
    ON percap.condicao_key = fixo.condicao_key
   AND percap.tipo_pgto_key = 'PER CAPITA'
  WHERE fixo.tipo_pgto_key = 'FIXO'
), candidatos AS (
  SELECT
    pares_valores.condicao_key AS condicao_valor,
    mult.condicao_key AS parametro_multiplicador,
    sub.condicao_key AS parametro_subtracao,
    COUNT(*) FILTER (
      WHERE ROUND(((pares_valores.valor_fixo * 12) + ((((v.cap_teg * mult.valor) - sub.valor) * pares_valores.valor_percap) * 12)), 2) = v.valor_veiculo
    )::int AS total_iguais,
    COUNT(*)::int AS total_veiculos,
    MIN(ROUND(((pares_valores.valor_fixo * 12) + ((((v.cap_teg * mult.valor) - sub.valor) * pares_valores.valor_percap) * 12)), 2))::text AS menor_calculado,
    MAX(ROUND(((pares_valores.valor_fixo * 12) + ((((v.cap_teg * mult.valor) - sub.valor) * pares_valores.valor_percap) * 12)), 2))::text AS maior_calculado
  FROM veiculos v
  CROSS JOIN pares_valores
  CROSS JOIN parametros mult
  CROSS JOIN parametros sub
  GROUP BY pares_valores.condicao_key, mult.condicao_key, sub.condicao_key
)
SELECT *
FROM candidatos
ORDER BY total_iguais DESC, condicao_valor ASC, parametro_multiplicador ASC, parametro_subtracao ASC;
`

async function main() {
  const result = await pool.query(sql)
  console.log(JSON.stringify(result.rows, null, 2))
  await pool.end()
}

main().catch(async (error) => {
  console.error(error)
  await pool.end()
  process.exitCode = 1
})
