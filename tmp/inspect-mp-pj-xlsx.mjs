import XLSX from 'xlsx'

const filePath = 'pgtos/2026-04 Pgto/old/04 ATESTE MP PJ ABR 26-1.xlsx'
const workbook = XLSX.readFile(filePath, { cellDates: true })
const mainName = workbook.SheetNames.find((n) => /APONTAMENTO/i.test(n))
const contName = workbook.SheetNames.find((n) => /CONTINUA/i.test(n))
const main = workbook.Sheets[mainName]
const cont = workbook.Sheets[contName]
const enc = (col, row) => XLSX.utils.encode_cell({ c: XLSX.utils.decode_col(col), r: row - 1 })
const val = (sheet, col, row) => {
  const cell = sheet?.[enc(col, row)]
  if (!cell) return ''
  if (cell.v instanceof Date) return cell.v.toISOString().slice(0, 10)
  return cell.v
}
const disp = (sheet, col, row) => {
  const cell = sheet?.[enc(col, row)]
  if (!cell) return ''
  if (cell.v instanceof Date) return cell.v.toISOString().slice(0, 10)
  return String(cell.w ?? cell.v ?? '').trim()
}

console.log('F5', disp(main, 'F', 5))
console.log('A1', disp(main, 'A', 1))
console.log('NomeDRE', workbook.Workbook?.Names?.find((n) => n.Name === 'NomeDRE')?.Ref)

let rowsWithOs = 0
let rowsWithDay1Value = 0
const samples = []

for (let row = 6; row <= 800; row += 1) {
  const os = disp(main, 'B', row)
  if (!os) continue
  rowsWithOs += 1
  const q = Number(val(main, 'Q', row)) || 0
  const r = Number(val(main, 'R', row)) || 0
  const s = Number(val(main, 'S', row)) || 0
  const t = Number(val(main, 'T', row)) || 0
  const l = Number(val(cont, 'L', row)) || 0
  const m = Number(val(cont, 'M', row)) || 0
  if (q || r || s || t || l || m) {
    rowsWithDay1Value += 1
    if (samples.length < 5) {
      samples.push({ row, os, tipoEscola: disp(main, 'K', row), q, r, s, t, l, m, periodoInicio: disp(main, 'F', row), periodoFim: disp(main, 'G', row) })
    }
  }
}

console.log(JSON.stringify({ rowsWithOs, rowsWithDay1Value, samples }, null, 2))
