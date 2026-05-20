import XLSX from 'xlsx';
const path = String.raw`C:\Users\m089383\Aplicativos\teg_financ\tmp\04-ATESTE-BT-PJ-ABR-26-row117.xlsx`;
const workbook = XLSX.readFile(path, { cellDates: true });
const mainSheet = workbook.Sheets['APONTAMENTO CREDENCIAMENTO'];
const continuaSheet = workbook.Sheets['CONTINUA'];
console.log(JSON.stringify({
  A1: String(mainSheet.A1?.w ?? mainSheet.A1?.v ?? ''),
  F5: String(mainSheet.F5?.w ?? mainSheet.F5?.v ?? ''),
  B6: String(mainSheet.B6?.w ?? mainSheet.B6?.v ?? ''),
  F6: String(mainSheet.F6?.w ?? mainSheet.F6?.v ?? ''),
  G6: String(mainSheet.G6?.w ?? mainSheet.G6?.v ?? ''),
  K6: String(mainSheet.K6?.w ?? mainSheet.K6?.v ?? ''),
  N6Display: String(mainSheet.N6?.w ?? mainSheet.N6?.v ?? ''),
  N6Raw: mainSheet.N6?.v ?? '',
  Q6: String(mainSheet.Q6?.w ?? mainSheet.Q6?.v ?? ''),
  B6Cont: String(continuaSheet.B6?.w ?? continuaSheet.B6?.v ?? ''),
  L6: String(continuaSheet.L6?.w ?? continuaSheet.L6?.v ?? ''),
  M6: String(continuaSheet.M6?.w ?? continuaSheet.M6?.v ?? ''),
}));
