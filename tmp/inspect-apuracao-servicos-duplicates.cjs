const { Pool } = require('pg')

const pool = new Pool({
  host: process.env.PGHOST ?? 'localhost',
  port: Number(process.env.PGPORT ?? 5432),
  user: process.env.PGUSER ?? 'postgres',
  password: process.env.PGPASSWORD ?? '12345',
  database: process.env.PGDATABASE ?? 'teg_financ',
})

async function main() {
  const duplicateSummaryResult = await pool.query(`
    WITH duplicate_groups AS (
      SELECT
        BTRIM(mes_ano) AS mes_ano,
        dre_codigo,
        ordem_servico_codigo,
        COALESCE(revisao, 0) AS revisao,
        tipo_escola_codigo,
        COALESCE(BTRIM(tipo_pessoa), '') AS tipo_pessoa,
        COUNT(*) AS total_rows,
        COUNT(DISTINCT ROW(nc_pres, cad, ac_nc, ac_cad, cont_nc, cont_cad, km)) AS distinct_payloads
      FROM apuracao_servicos
      GROUP BY 1, 2, 3, 4, 5, 6
      HAVING COUNT(*) > 1
    )
    SELECT
      COUNT(*)::integer AS duplicate_group_count,
      COALESCE(SUM(total_rows - 1), 0)::integer AS duplicate_row_count,
      COUNT(*) FILTER (WHERE distinct_payloads > 1)::integer AS groups_with_payload_difference
    FROM duplicate_groups
  `)

  console.log('Duplicate summary:')
  console.log(JSON.stringify(duplicateSummaryResult.rows[0], null, 2))

  const duplicateGroupsResult = await pool.query(`
    SELECT
      BTRIM(mes_ano) AS mes_ano,
      dre_codigo,
      ordem_servico_codigo,
      COALESCE(revisao, 0) AS revisao,
      tipo_escola_codigo,
      COALESCE(BTRIM(tipo_pessoa), '') AS tipo_pessoa,
      COUNT(*) AS total
    FROM apuracao_servicos
    GROUP BY 1, 2, 3, 4, 5, 6
    HAVING COUNT(*) > 1
    ORDER BY total DESC, 1, 2, 3, 4, 5, 6
    LIMIT 20
  `)

  console.log('Duplicate groups:')
  console.log(JSON.stringify(duplicateGroupsResult.rows, null, 2))

  for (const group of duplicateGroupsResult.rows.slice(0, 5)) {
    const rowDetailsResult = await pool.query(
      `
        SELECT
          ctid::text AS ctid,
          BTRIM(mes_ano) AS mes_ano,
          dre_codigo,
          ordem_servico_codigo,
          COALESCE(revisao, 0) AS revisao,
          tipo_escola_codigo,
          COALESCE(BTRIM(tipo_pessoa), '') AS tipo_pessoa,
          nc_pres,
          cad,
          ac_nc,
          ac_cad,
          cont_nc,
          cont_cad,
          km,
          data_inclusao,
          data_alteracao
        FROM apuracao_servicos
        WHERE BTRIM(mes_ano) = $1
          AND dre_codigo = $2
          AND ordem_servico_codigo = $3
          AND COALESCE(revisao, 0) = $4
          AND tipo_escola_codigo = $5
          AND COALESCE(BTRIM(tipo_pessoa), '') = $6
        ORDER BY data_alteracao DESC NULLS LAST, data_inclusao DESC NULLS LAST, ctid DESC
      `,
      [
        group.mes_ano,
        group.dre_codigo,
        group.ordem_servico_codigo,
        group.revisao,
        group.tipo_escola_codigo,
        group.tipo_pessoa,
      ],
    )

    console.log(`Rows for ${group.mes_ano}/${group.dre_codigo}/${group.ordem_servico_codigo}/${group.revisao}/${group.tipo_escola_codigo}/${group.tipo_pessoa}:`)
    console.log(JSON.stringify(rowDetailsResult.rows, null, 2))
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })
