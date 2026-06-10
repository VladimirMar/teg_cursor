import pg from 'pg'
import path from 'node:path'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(readFileSync('.env', 'utf8').split(/\r?\n/).filter(Boolean).map((line) => {
  const idx = line.indexOf('=')
  return [line.slice(0, idx), line.slice(idx + 1)]
}))

const pool = new pg.Pool({
  host: env.PGHOST,
  port: Number(env.PGPORT),
  user: env.PGUSER,
  password: env.PGPASSWORD,
  database: env.PGDATABASE,
})

const pattern = /\bATESTE\s+([A-Z0-9]+)\s+(?:PJ|PF)\b/i

const files = [
  '04 ATESTE MP PJ ABR 26-1.xlsx',
  '04 ATESTE FB PF ABR 26.xlsx',
  '04 ATESTE MP PF ABR 26.xlsx',
  'planilha-sem-padrao.xlsx',
]

for (const fileName of files) {
  const baseName = path.basename(fileName, path.extname(fileName))
  const match = baseName.match(pattern)
  const sigla = match ? String(match[1]).trim().toUpperCase() : ''

  if (!sigla) {
    console.log(fileName, '-> sem sigla no nome')
    continue
  }

  const result = await pool.query(`
    SELECT codigo, sigla, descricao
    FROM dre
    WHERE (
      UPPER(BTRIM(COALESCE(sigla, ''))) = $1
      OR UPPER(BTRIM(COALESCE(codigo_operacional, ''))) = $1
    )
    AND UPPER(BTRIM(CAST(descricao AS text))) NOT LIKE '%TEG%'
    ORDER BY codigo ASC
  `, [sigla])

  console.log(fileName, '->', sigla, '=>', result.rows)
}

await pool.end()
