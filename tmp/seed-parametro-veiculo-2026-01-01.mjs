import pg from 'pg'

const { Pool } = pg

const pool = new Pool({
  host: process.env.PGHOST ?? 'localhost',
  port: Number(process.env.PGPORT ?? 5432),
  database: process.env.PGDATABASE ?? 'teg_financ',
  user: process.env.PGUSER ?? 'postgres',
  password: process.env.PGPASSWORD ?? '12345',
})

const vigencia = '2026-01-01'

const rows = [
  { modalidadeTipoBancadaCodigo: 7, condicao: 'Desconto/ Viagem', qtdeCondicao: 3, origem: 'TEG Regular / Convencional' },
  { modalidadeTipoBancadaCodigo: 2, condicao: 'Desconto/ Viagem', qtdeCondicao: 3, origem: 'TEG Regular / Creche -> normalizado para TEG CRECHE / Creche' },
  { modalidadeTipoBancadaCodigo: 5, condicao: 'Viagem', qtdeCondicao: 2, origem: 'TEG Regular / Acessivel' },
  { modalidadeTipoBancadaCodigo: 7, condicao: 'Viagem', qtdeCondicao: 2, origem: 'TEG Regular / Convencional' },
  { modalidadeTipoBancadaCodigo: 2, condicao: 'Viagem', qtdeCondicao: 2, origem: 'TEG Regular / Creche -> normalizado para TEG CRECHE / Creche' },
  { modalidadeTipoBancadaCodigo: 4, condicao: 'Viagens', qtdeCondicao: 2, origem: 'TEG Especial / Convencional' },
  { modalidadeTipoBancadaCodigo: 3, condicao: 'Viagens', qtdeCondicao: 2, origem: 'TEG Especial / Acessivel' },
  { modalidadeTipoBancadaCodigo: 5, condicao: 'Capacidade', qtdeCondicao: 5, origem: 'TEG Regular / Acessivel' },
  { modalidadeTipoBancadaCodigo: 7, condicao: 'Capacidade', qtdeCondicao: 5, origem: 'TEG Regular / Convencional' },
  { modalidadeTipoBancadaCodigo: 2, condicao: 'Capacidade', qtdeCondicao: 5, origem: 'TEG Regular / Creche -> normalizado para TEG CRECHE / Creche' },
  { modalidadeTipoBancadaCodigo: 3, condicao: 'Capacidade', qtdeCondicao: 5, origem: 'TEG Especial / Acessivel' },
  { modalidadeTipoBancadaCodigo: 4, condicao: 'Capacidade', qtdeCondicao: 16, origem: 'TEG Especial / Convencional' },
]

const associationSql = `
  SELECT CAST(associacao.codigo AS text) AS codigo,
         BTRIM(CAST(modalidade.descricao AS text)) AS modalidade,
         BTRIM(CAST(tipo_bancada.descricao AS text)) AS tipo_bancada
  FROM modalidade_tipo_bancada associacao
  INNER JOIN modalidade ON modalidade.codigo = associacao.modalidade_codigo
  INNER JOIN tipo_bancada ON tipo_bancada.codigo = associacao.tipo_bancada_codigo
  WHERE associacao.codigo = $1
`

async function main() {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const stats = { inserted: 0, updated: 0 }
    const applied = []

    for (const row of rows) {
      const associationResult = await client.query(associationSql, [row.modalidadeTipoBancadaCodigo])

      if (associationResult.rowCount === 0) {
        throw new Error(`Associacao ${row.modalidadeTipoBancadaCodigo} nao encontrada para ${row.origem}.`)
      }

      const existingResult = await client.query(
        `SELECT codigo
         FROM parametro_veiculo
         WHERE modalidade_tipo_bancada_codigo = $1
           AND UPPER(BTRIM(condicao)) = UPPER(BTRIM($2))
           AND data = $3::date
         LIMIT 1`,
        [row.modalidadeTipoBancadaCodigo, row.condicao, vigencia],
      )

      let codigo

      if (existingResult.rowCount > 0) {
        codigo = existingResult.rows[0].codigo
        await client.query(
          `UPDATE parametro_veiculo
           SET qtde_condicao = $1,
               condicao = $2,
               data_modificacao = NOW()
           WHERE codigo = $3`,
          [row.qtdeCondicao, row.condicao.trim(), codigo],
        )
        stats.updated += 1
      } else {
        const insertResult = await client.query(
          `INSERT INTO parametro_veiculo (
             modalidade_tipo_bancada_codigo,
             condicao,
             qtde_condicao,
             data,
             data_inclusao,
             data_modificacao
           )
           VALUES ($1, $2, $3, $4::date, NOW(), NOW())
           RETURNING codigo`,
          [row.modalidadeTipoBancadaCodigo, row.condicao.trim(), row.qtdeCondicao, vigencia],
        )
        codigo = insertResult.rows[0].codigo
        stats.inserted += 1
      }

      applied.push({
        codigo,
        modalidadeTipoBancadaCodigo: row.modalidadeTipoBancadaCodigo,
        condicao: row.condicao,
        qtdeCondicao: row.qtdeCondicao,
        data: vigencia,
        origem: row.origem,
        associacao: `${associationResult.rows[0].modalidade} / ${associationResult.rows[0].tipo_bancada}`,
      })
    }

    await client.query('COMMIT')

    console.log(JSON.stringify({ vigencia, stats, applied }, null, 2))
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
