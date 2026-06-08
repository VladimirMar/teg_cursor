import assert from 'node:assert/strict'
import XLSX from 'xlsx'

const filePath = process.argv[2] || 'pgtos/2026-04 Pgto/04 ATESTE FB PF ABR 26.xlsx'
const workbook = XLSX.readFile(filePath, { cellDates: true })
const mainSheet = workbook.Sheets['APONTAMENTO CREDENCIAMENTO']
const continuaSheet = workbook.Sheets['CONTINUA']

const normalize = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0
}

const getCell = (sheet, col, row) => sheet?.[XLSX.utils.encode_cell({ c: XLSX.utils.decode_col(col), r: row - 1 })]?.v

const resolveContinuaForRow = (rowNumber) => {
  const mainTotalContReg = normalize(getCell(mainSheet, 'L', rowNumber))
  const mainTotalContCad = normalize(getCell(mainSheet, 'M', rowNumber))
  const continuaDay01Reg = normalize(getCell(continuaSheet, 'L', rowNumber))
  const continuaDay01Cad = normalize(getCell(continuaSheet, 'M', rowNumber))
  const useMainContinuaTotalsOnFirstDay = (mainTotalContReg !== 0 || mainTotalContCad !== 0)
    && continuaDay01Reg === 0
    && continuaDay01Cad === 0

  let day01 = 0
  let otherDays = 0

  for (let dayIndex = 0; dayIndex < 30; dayIndex += 1) {
    const col = XLSX.utils.encode_col(XLSX.utils.decode_col('L') + (dayIndex * 2))
    let value = 0

    if (useMainContinuaTotalsOnFirstDay) {
      if (dayIndex === 0) {
        value = mainTotalContReg
      }
    } else {
      value = normalize(getCell(continuaSheet, col, rowNumber))
    }

    if (dayIndex === 0) {
      day01 = value
    } else {
      otherDays += value
    }
  }

  return {
    rowNumber,
    ordemServico: String(getCell(mainSheet, 'B', rowNumber) ?? '').trim(),
    tipoEscola: String(getCell(mainSheet, 'K', rowNumber) ?? '').trim(),
    mainTotalContReg,
    continuaDay01Reg,
    useMainContinuaTotalsOnFirstDay,
    day01,
    otherDays,
    monthTotal: day01 + otherDays,
  }
}

const emee = resolveContinuaForRow(13)
assert.equal(emee.tipoEscola, 'EMEE')
assert.equal(emee.mainTotalContReg, 24)
assert.equal(emee.useMainContinuaTotalsOnFirstDay, true)
assert.equal(emee.day01, 24)
assert.equal(emee.otherDays, 0)
assert.equal(emee.monthTotal, 24)

const emefDistribuido = resolveContinuaForRow(92)
assert.equal(emefDistribuido.continuaDay01Reg, 1)
assert.equal(emefDistribuido.useMainContinuaTotalsOnFirstDay, false)
assert.equal(emefDistribuido.monthTotal, 18)

console.log('OK - fallback de TOTAL CONT REG para dia 01 validado.')
console.log(JSON.stringify({ emee, emefDistribuido }, null, 2))
