import XLSX from 'xlsx'
import pg from 'pg'
import { readFileSync } from 'node:fs'

const filePath = process.argv[2] || 'pgtos/2026-04 Pgto/04 ATESTE FB PF ABR 26.xlsx'
const targetCrmcDigits = '0157330'

const envText = readFileSync('.env', 'utf8')
const env = Object.fromEntries(envText.split(/\r?\n/).filter(Boolean).map((line) => {
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

const enc = (col, row) => XLSX.utils.encode_cell({ c: XLSX.utils.decode_col(col), r: row - 1 })
const cellVal = (sheet, col, row) => {
  const cell = sheet?.[enc(col, row)]
  if (!cell) return ''
  if (cell.v instanceof Date) return cell.v.toISOString().slice(0, 10)
  return String(cell.w ?? cell.v ?? '').trim()
}

const workbook = XLSX.readFile(filePath, { cellDates: true })
const mainSheetName = workbook.SheetNames.find((name) => /APONTAMENTO/i.test(name))
const continuaSheetName = workbook.SheetNames.find((name) => /CONTINUA/i.test(name))
const mainSheet = workbook.Sheets[mainSheetName]
const continuaSheet = workbook.Sheets[continuaSheetName]

console.log('FILE', filePath)
console.log('SHEETS', workbook.SheetNames)
console.log('F5', cellVal(mainSheet, 'F', 5))
console.log('A1', cellVal(mainSheet, 'A', 1))

const excelMatches = []
for (let row = 6; row <= 500; row += 1) {
  const os = cellVal(mainSheet, 'B', row)
  if (!os) continue
  const l = cellVal(continuaSheet, 'L', row)
  const m = cellVal(continuaSheet, 'M', row)
  const tipoEscola = cellVal(mainSheet, 'K', row)
  const periodoInicio = cellVal(mainSheet, 'F', row)
  const periodoFim = cellVal(mainSheet, 'G', row)
  const q = cellVal(mainSheet, 'Q', row)
  if (Number(l) === 24 || Number(m) === 24 || os.includes('015') || os.includes('733')) {
    excelMatches.push({ row, os, tipoEscola, periodoInicio, periodoFim, L: l, M: m, Q: q })
  }
}

console.log('\nEXCEL_ROWS_WITH_24_OR_CRMC_HINT')
console.log(JSON.stringify(excelMatches, null, 2))

const db = await pool.query(`
  SELECT
    aps.mes_ano,
    aps.data_referencia::text,
    aps.dre_codigo,
    aps.ordem_servico_codigo,
    aps.revisao,
    aps.tipo_pessoa,
    aps.tipo_escola_codigo,
    te.sigla AS tipo_escola_sigla,
    aps.crmc_condutor,
    aps.cont_nc,
    aps.cont_cad,
    os.os_concat,
    os.condutor
  FROM apuracao_servicos aps
  INNER JOIN ordem_servico os ON os.codigo = aps.ordem_servico_codigo
  LEFT JOIN tipo_escola te ON te.codigo = aps.tipo_escola_codigo
  WHERE aps.mes_ano = '04/2026'
    AND aps.tipo_pessoa = 'PF'
    AND aps.revisao = 0
    AND aps.data_referencia = '2026-04-01'::date
    AND (
      REGEXP_REPLACE(COALESCE(aps.crmc_condutor, ''), '[^0-9]', '', 'g') LIKE '%' || $1 || '%'
      OR os.os_concat ILIKE '%015%733%'
      OR os.condutor ILIKE '%015%733%'
    )
  ORDER BY aps.cont_nc DESC, os.os_concat
`, [targetCrmcDigits])

console.log('\nDB_ROWS_2026-04-01')
console.log(JSON.stringify(db.rows, null, 2))

const condutor = await pool.query(`
  SELECT codigo, crmc, cpf_condutor, nome
  FROM condutor
  WHERE REGEXP_REPLACE(COALESCE(crmc, ''), '[^0-9]', '', 'g') LIKE '%' || $1 || '%'
`, [targetCrmcDigits])
console.log('\nCONDUTOR_LOOKUP')
console.log(JSON.stringify(condutor.rows, null, 2))

await pool.end()
