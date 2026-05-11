import fs from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'

const { Pool } = pg

const pool = new Pool({
  host: process.env.PGHOST ?? 'localhost',
  port: Number(process.env.PGPORT ?? 5432),
  database: process.env.PGDATABASE ?? 'teg_financ',
  user: process.env.PGUSER ?? 'postgres',
  password: process.env.PGPASSWORD ?? '12345',
})

const reportPath = path.resolve('documento', 'relatorio-atualizacao-valor-veiculo-especial-convencional-2026-05-11.md')

const sql = `
WITH parametro AS (
  SELECT pv.qtde_condicao::numeric(14,2) AS viagens,
         TO_CHAR(pv.data, 'YYYY-MM-DD') AS parametro_data
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
  SELECT mbv.valor::numeric(14,2) AS valor_fixo,
         TO_CHAR(mbv.data, 'YYYY-MM-DD') AS valor_data
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
  SELECT mbv.valor::numeric(14,2) AS valor_percap,
         TO_CHAR(mbv.data, 'YYYY-MM-DD') AS valor_data
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
), atualizados AS (
  SELECT
    CAST(v.codigo AS text) AS codigo,
    BTRIM(COALESCE(v.placas, '')) AS placas,
    CAST(v.cap_teg AS text) AS cap_teg,
    ROUND(v.valor_veiculo, 2)::text AS valor_veiculo,
    TO_CHAR(v.data_modificacao, 'YYYY-MM-DD HH24:MI:SS') AS data_modificacao
  FROM veiculo v
  WHERE UPPER(BTRIM(COALESCE(v.os_especial, ''))) = 'SIM'
    AND UPPER(BTRIM(COALESCE(v.tipo_de_bancada, ''))) = 'CONVENCIONAL'
    AND DATE(v.data_modificacao) = DATE '2026-05-11'
  ORDER BY v.codigo ASC
)
SELECT
  (SELECT viagens::text FROM parametro) AS viagens,
  (SELECT parametro_data FROM parametro) AS parametro_data,
  (SELECT valor_fixo::text FROM fixo) AS valor_fixo,
  (SELECT valor_data FROM fixo) AS fixo_data,
  (SELECT valor_percap::text FROM percap) AS valor_percap,
  (SELECT valor_data FROM percap) AS percap_data,
  COALESCE(json_agg(atualizados), '[]'::json) AS itens
FROM atualizados;
`

function buildMarkdown({ viagens, parametro_data, valor_fixo, fixo_data, valor_percap, percap_data, itens }) {
  const lines = []
  lines.push('# Relatorio de Atualizacao de Valor do Veiculo')
  lines.push('')
  lines.push('- Data da atualizacao: 2026-05-11')
  lines.push('- Escopo: veiculos com `os_especial = Sim` e `tipo_de_bancada = Convencional`')
  lines.push(`- Total de veiculos alterados: ${itens.length}`)
  lines.push('')
  lines.push('## Formula aplicada')
  lines.push('')
  lines.push('`valor_veiculo = (Fixo Esp * 12) + ((cap_teg * Per Cap Regular * Viagem) * 12)`')
  lines.push('')
  lines.push('## Parametros utilizados')
  lines.push('')
  lines.push(`- Fixo Esp TEG ESPECIAL / Convencional: ${valor_fixo} (vigencia ${fixo_data})`)
  lines.push(`- Per Cap Regular TEG ESPECIAL / Convencional: ${valor_percap} (vigencia ${percap_data})`)
  lines.push(`- Parametro Pgto Veiculo Viagem TEG ESPECIAL / Convencional: ${viagens} (vigencia ${parametro_data})`)
  lines.push('')
  lines.push('## Veiculos alterados')
  lines.push('')
  lines.push('| Codigo | Placa | Cap TEG | Valor do veiculo | Data modificacao |')
  lines.push('| --- | --- | ---: | ---: | --- |')
  for (const item of itens) {
    lines.push(`| ${item.codigo} | ${item.placas || ''} | ${item.cap_teg || ''} | ${item.valor_veiculo} | ${item.data_modificacao} |`)
  }
  lines.push('')
  return lines.join('\n')
}

async function main() {
  const result = await pool.query(sql)
  const row = result.rows[0] ?? null

  if (!row) {
    throw new Error('Nao foi possivel gerar o relatorio.')
  }

  const itens = Array.isArray(row.itens) ? row.itens : []
  const markdown = buildMarkdown({
    viagens: row.viagens,
    parametro_data: row.parametro_data,
    valor_fixo: row.valor_fixo,
    fixo_data: row.fixo_data,
    valor_percap: row.valor_percap,
    percap_data: row.percap_data,
    itens,
  })

  await fs.writeFile(reportPath, markdown, 'utf8')
  console.log(JSON.stringify({ reportPath, total: itens.length }, null, 2))
  await pool.end()
}

main().catch(async (error) => {
  console.error(error)
  await pool.end()
  process.exitCode = 1
})
