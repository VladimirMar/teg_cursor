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
  SELECT codigo, COALESCE(valor_veiculo, 0)::numeric(14,2) AS valor_veiculo
  FROM veiculo
  WHERE ${normalizeSqlText.replace('%s', 'os_especial')} = 'NAO'
    AND ${normalizeSqlText.replace('%s', 'tipo_de_bancada')} = 'ACESSIVEL'
), parametro_viagem AS (
  SELECT pv.qtde_condicao::numeric(14,2) AS viagem
  FROM parametro_veiculo pv
  INNER JOIN modalidade_tipo_bancada mtb ON mtb.codigo = pv.modalidade_tipo_bancada_codigo
  INNER JOIN modalidade m ON m.codigo = mtb.modalidade_codigo
  INNER JOIN tipo_bancada tb ON tb.codigo = mtb.tipo_bancada_codigo
  WHERE ${normalizeSqlText.replace('%s', 'm.descricao')} = 'TEG REGULAR'
    AND ${normalizeSqlText.replace('%s', 'tb.descricao')} = 'ACESSIVEL'
    AND ${normalizeSqlText.replace('%s', 'pv.condicao')} = 'VIAGEM'
  ORDER BY pv.data DESC, pv.codigo DESC
  LIMIT 1
), parametro_capacidade AS (
  SELECT pv.qtde_condicao::numeric(14,2) AS capacidade
  FROM parametro_veiculo pv
  INNER JOIN modalidade_tipo_bancada mtb ON mtb.codigo = pv.modalidade_tipo_bancada_codigo
  INNER JOIN modalidade m ON m.codigo = mtb.modalidade_codigo
  INNER JOIN tipo_bancada tb ON tb.codigo = mtb.tipo_bancada_codigo
  WHERE ${normalizeSqlText.replace('%s', 'm.descricao')} = 'TEG REGULAR'
    AND ${normalizeSqlText.replace('%s', 'tb.descricao')} = 'ACESSIVEL'
    AND ${normalizeSqlText.replace('%s', 'pv.condicao')} = 'CAPACIDADE'
  ORDER BY pv.data DESC, pv.codigo DESC
  LIMIT 1
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
    AND ${normalizeSqlText.replace('%s', 'tb.descricao')} = 'ACESSIVEL'
    AND mbv.data = (
      SELECT MAX(mbv2.data)
      FROM modal_bancada_condicao_tipo_pgto_valor mbv2
      WHERE mbv2.modal_bancada_condicao_tipo_pgto_codigo = mbv.modal_bancada_condicao_tipo_pgto_codigo
    )
), candidatos AS (
  SELECT
    fixo.condicao_key AS condicao_fixo,
    percap.condicao_key AS condicao_percap,
    COUNT(*) FILTER (
      WHERE ROUND(((fixo.valor * 12) + (12 * parametro_viagem.viagem * parametro_capacidade.capacidade * percap.valor)), 2) = veiculos.valor_veiculo
    )::int AS total_iguais,
    COUNT(*)::int AS total_veiculos,
    MIN(ROUND(((fixo.valor * 12) + (12 * parametro_viagem.viagem * parametro_capacidade.capacidade * percap.valor)), 2))::text AS menor_calculado,
    MAX(ROUND(((fixo.valor * 12) + (12 * parametro_viagem.viagem * parametro_capacidade.capacidade * percap.valor)), 2))::text AS maior_calculado
  FROM veiculos
  CROSS JOIN parametro_viagem
  CROSS JOIN parametro_capacidade
  CROSS JOIN (SELECT * FROM valores WHERE tipo_pgto_key = 'FIXO') fixo
  CROSS JOIN (SELECT * FROM valores WHERE tipo_pgto_key = 'PER CAPITA') percap
  GROUP BY fixo.condicao_key, percap.condicao_key
)
SELECT *
FROM candidatos
ORDER BY total_iguais DESC, condicao_fixo ASC, condicao_percap ASC;
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
