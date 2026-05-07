import { Pool } from 'pg'

const pool = new Pool({
  host: process.env.PGHOST ?? 'localhost',
  port: Number(process.env.PGPORT ?? 5432),
  user: process.env.PGUSER ?? 'postgres',
  password: process.env.PGPASSWORD ?? '12345',
  database: process.env.PGDATABASE ?? 'teg_financ',
})

const main = async () => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const result = await client.query(`
      WITH recalculated AS (
        SELECT
          t.codigo,
          COALESCE(SUM(COALESCE(v.valor_veiculo, 0)), 0)::numeric(14, 2) AS total
        FROM termo t
        LEFT JOIN ordem_servico os
          ON REGEXP_REPLACE(COALESCE(BTRIM(os.termo_adesao), ''), '\\D', '', 'g') = REGEXP_REPLACE(COALESCE(BTRIM(t.termo_adesao), ''), '\\D', '', 'g')
         AND UPPER(BTRIM(COALESCE(os.situacao, ''))) = 'ATIVO'
        LEFT JOIN veiculo v
          ON UPPER(BTRIM(COALESCE(v.crm, ''))) = UPPER(BTRIM(COALESCE(os.crm, '')))
        GROUP BY t.codigo
      )
      UPDATE termo t
         SET valor_contrato = recalculated.total,
             valor_contrato_atualizado = recalculated.total,
             data_modificacao = NOW()
        FROM recalculated
       WHERE recalculated.codigo = t.codigo
       RETURNING t.codigo::text AS codigo,
                 COALESCE(BTRIM(t.termo_adesao), '') AS termo_adesao,
                 recalculated.total::text AS valor_total
    `)

    await client.query('COMMIT')

    const updatedItems = result.rows.map((row) => ({
      codigo: row.codigo,
      termoAdesao: row.termo_adesao,
      valorTotal: row.valor_total,
    }))

    const positiveCount = updatedItems.filter((item) => Number(item.valorTotal) > 0).length
    const zeroCount = updatedItems.length - positiveCount

    console.log(JSON.stringify({
      database: process.env.PGDATABASE ?? 'teg_financ',
      updated: updatedItems.length,
      positiveCount,
      zeroCount,
      sample: updatedItems.slice(0, 10),
    }, null, 2))
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})