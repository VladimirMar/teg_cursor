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

const updateSql = `
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
    ROUND(((fixo.valor_fixo * 12) + ((((v.cap_teg::numeric(14,2) * parametro_multiplicador.multiplicador) - parametro_subtracao.subtracao) * percap.valor_percap) * 12)), 2) AS novo_valor
  FROM veiculo v
  CROSS JOIN parametro_multiplicador
  CROSS JOIN parametro_subtracao
  CROSS JOIN fixo
  CROSS JOIN percap
  WHERE ${normalizeSqlText.replace('%s', 'v.os_especial')} = 'NAO'
    AND ${normalizeSqlText.replace('%s', 'v.tipo_de_bancada')} = 'CONVENCIONAL'
    AND v.cap_teg IS NOT NULL
), atualizados AS (
  UPDATE veiculo v
  SET valor_veiculo = calculo.novo_valor,
      data_modificacao = NOW()
  FROM calculo
  WHERE v.codigo = calculo.codigo
    AND COALESCE(v.valor_veiculo, -1) <> calculo.novo_valor
  RETURNING CAST(v.codigo AS text) AS codigo,
            BTRIM(COALESCE(v.placas, '')) AS placas,
            calculo.novo_valor::text AS valor_veiculo
)
SELECT * FROM atualizados ORDER BY codigo::int ASC;
`

async function main() {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const result = await client.query(updateSql)
    await client.query('COMMIT')

    console.log(JSON.stringify({
      updatedCount: result.rowCount,
      sample: result.rows.slice(0, 20),
    }, null, 2))
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(async (error) => {
  console.error(error)
  await pool.end()
  process.exitCode = 1
})
