import XLSX from 'xlsx';
import path from 'node:path';
const sourcePath = String.raw`C:\Users\m089383\Aplicativos\teg_financ\pgtos\2026-04 Pgto\04 ATESTE BT PJ ABR 26.xlsx`;
const outputPath = String.raw`C:\Users\m089383\Aplicativos\teg_financ\tmp\04-ATESTE-BT-PJ-ABR-26-row117.xlsx`;
const sourceWorkbook = XLSX.readFile(sourcePath, { cellDates: true });
const mainSource = sourceWorkbook.Sheets[sourceWorkbook.SheetNames.find((name) => String(name).trim().toUpperCase() === 'APONTAMENTO CREDENCIAMENTO')];
const continuaSource = sourceWorkbook.Sheets[sourceWorkbook.SheetNames.find((name) => String(name).trim().toUpperCase() === 'CONTINUA')];
const targetRow = 117;
const outputWorkbook = XLSX.utils.book_new();
const mainSheet = {};
const continuaSheet = {};
mainSheet.A1 = { t: 's', v: String(mainSource.A1?.w ?? mainSource.A1?.v ?? 'BUTANTA') };
mainSheet.F5 = { t: 's', v: String(mainSource.F5?.w ?? mainSource.F5?.v ?? '01/04/2026') };
for (const col of ['B','F','G','K','N','Q','R','S','T']) {
  const cell = mainSource[`${col}${targetRow}`];
  if (cell) {
    mainSheet[`${col}6`] = { ...cell };
  }
}
continuaSheet.B6 = { ...(continuaSource[`B${targetRow}`] ?? { t: 's', v: String(mainSource[`B${targetRow}`]?.w ?? mainSource[`B${targetRow}`]?.v ?? '') }) };
for (const col of ['L','M']) {
  const cell = continuaSource[`${col}${targetRow}`];
  if (cell) {
    continuaSheet[`${col}6`] = { ...cell };
  }
}
mainSheet['!ref'] = 'A1:T6';
continuaSheet['!ref'] = 'A1:M6';
XLSX.utils.book_append_sheet(outputWorkbook, mainSheet, 'APONTAMENTO CREDENCIAMENTO');
XLSX.utils.book_append_sheet(outputWorkbook, continuaSheet, 'CONTINUA');
XLSX.writeFile(outputWorkbook, outputPath);
console.log(outputPath);
