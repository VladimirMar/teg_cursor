import XLSX from 'xlsx';
const outputPath = String.raw`C:\Users\m089383\Aplicativos\teg_financ\tmp\04-ATESTE-BT-PJ-ABR-26-row117-day01.xlsx`;
const workbook = XLSX.readFile(String.raw`C:\Users\m089383\Aplicativos\teg_financ\tmp\04-ATESTE-BT-PJ-ABR-26-row117.xlsx`, { cellDates: true });
const mainSheet = workbook.Sheets['APONTAMENTO CREDENCIAMENTO'];
mainSheet.F6 = { t: 's', v: '01/04/2026' };
mainSheet.G6 = { t: 's', v: '01/04/2026' };
XLSX.writeFile(workbook, outputPath);
console.log(outputPath);
