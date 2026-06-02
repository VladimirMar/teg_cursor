const { Pool } = require('pg')

async function main() {
  const pool = new Pool({
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
    database: process.env.PGDATABASE || 'postgres',
  })

  const base = '2022/0026670-001'
  const tipoPessoa = 'PF'
  const mesAno = '04/2026'

  try {
    const osSql = `
      SELECT
        os.codigo::text AS codigo,
        BTRIM(COALESCE(os.termo_adesao, '')) AS termo_adesao,
        BTRIM(COALESCE(os.num_os, '')) AS num_os,
        BTRIM(COALESCE(os.revisao, '')) AS revisao,
        BTRIM(COALESCE(os.termo_adesao, '')) || '-' || BTRIM(COALESCE(os.num_os, '')) || COALESCE(NULLIF(BTRIM(os.revisao), ''), '') AS os_concat
      FROM ordem_servico os
      WHERE regexp_replace(UPPER(BTRIM(COALESCE(os.termo_adesao, '')) || '-' || BTRIM(COALESCE(os.num_os, ''))), '[^A-Z0-9/-]', '', 'g')
            = regexp_replace(UPPER($1), '[^A-Z0-9/-]', '', 'g')
    `

    const osRes = await pool.query(osSql, [base])
    const codigos = osRes.rows.map((row) => row.codigo)

    if (!codigos.length) {
      console.log(JSON.stringify({ ok: false, message: 'OS base nao encontrada em ordem_servico.', base }, null, 2))
      return
    }

    const aggSql = `
      SELECT
        aps.data_referencia::text AS data_referencia,
        COALESCE(BTRIM(te.sigla), '') AS tipo_escola_sigla,
        COALESCE(BTRIM(CAST(te.descricao AS text)), '') AS tipo_escola_descricao,
        SUM(COALESCE(aps.nc_pres, 0))::int AS nc_pres,
        SUM(COALESCE(aps.cad, 0))::int AS cad,
        SUM(COALESCE(aps.ac_nc, 0))::int AS ac_nc,
        SUM(COALESCE(aps.ac_cad, 0))::int AS ac_cad,
        SUM(COALESCE(aps.cont_nc, 0))::int AS cont_nc,
        SUM(COALESCE(aps.cont_cad, 0))::int AS cont_cad,
        ROUND(SUM(COALESCE(aps.km, 0))::numeric, 4)::text AS km_total
      FROM apuracao_servicos aps
      LEFT JOIN tipo_escola te ON te.codigo = aps.tipo_escola_codigo
      WHERE aps.mes_ano = $1
        AND COALESCE(BTRIM(aps.tipo_pessoa), '') = $2
        AND aps.ordem_servico_codigo::text = ANY($3::text[])
      GROUP BY aps.data_referencia, te.sigla, te.descricao
      ORDER BY aps.data_referencia, tipo_escola_sigla
    `

    const totalSql = `
      SELECT
        COUNT(*)::int AS total_registros,
        COUNT(DISTINCT aps.data_referencia)::int AS total_dias,
        COUNT(DISTINCT aps.tipo_escola_codigo)::int AS total_tipos_escola,
        SUM(COALESCE(aps.nc_pres, 0))::int AS nc_pres,
        SUM(COALESCE(aps.cad, 0))::int AS cad,
        SUM(COALESCE(aps.ac_nc, 0))::int AS ac_nc,
        SUM(COALESCE(aps.ac_cad, 0))::int AS ac_cad,
        SUM(COALESCE(aps.cont_nc, 0))::int AS cont_nc,
        SUM(COALESCE(aps.cont_cad, 0))::int AS cont_cad,
        ROUND(SUM(COALESCE(aps.km, 0))::numeric, 4)::text AS km_total
      FROM apuracao_servicos aps
      WHERE aps.mes_ano = $1
        AND COALESCE(BTRIM(aps.tipo_pessoa), '') = $2
        AND aps.ordem_servico_codigo::text = ANY($3::text[])
    `

    const [aggRes, totalRes] = await Promise.all([
      pool.query(aggSql, [mesAno, tipoPessoa, codigos]),
      pool.query(totalSql, [mesAno, tipoPessoa, codigos]),
    ])

    console.log(
      JSON.stringify(
        {
          ok: true,
          base,
          mesAno,
          tipoPessoa,
          ordens_encontradas: osRes.rows,
          resumo_total: totalRes.rows[0],
          total_linhas_por_dia_tipo: aggRes.rowCount,
          preview_primeiras_30: aggRes.rows.slice(0, 30),
        },
        null,
        2,
      ),
    )
  } finally {
    await pool.end()
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2))
  process.exitCode = 1
})
