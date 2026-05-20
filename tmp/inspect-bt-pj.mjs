import XLSX from 'xlsx';
const path = String.raw`C:\Users\m089383\Aplicativos\teg_financ\pgtos\2026-04 Pgto\04 ATESTE BT PJ ABR 26.xlsx`;
const workbook = XLSX.readFile(path, { cellDates: true });
const sheetName = workbook.SheetNames.find((name) => String(name).trim().toUpperCase() === 'APONTAMENTO CREDENCIAMENTO');
const sheet = workbook.Sheets[sheetName];
const range = XLSX.utils.decode_range(sheet['!ref']);
for (let row = 8; row <= range.e.r + 1; row += 1) {
  const os = sheet[`B${row}`]?.w ?? sheet[`B${row}`]?.v ?? '';
  const placa = sheet[`D${row}`]?.w ?? sheet[`D${row}`]?.v ?? '';
  const tipo = sheet[`K${row}`]?.w ?? sheet[`K${row}`]?.v ?? '';
  const n = sheet[`N${row}`]?.w ?? sheet[`N${row}`]?.v ?? '';
  const f = sheet[`F${row}`]?.w ?? sheet[`F${row}`]?.v ?? '';
  const g = sheet[`G${row}`]?.w ?? sheet[`G${row}`]?.v ?? '';
  if (String(placa).trim().toUpperCase().includes('TLP5D19') || String(n).trim() === '1,61' || String(n).trim() === '1.61') {
    console.log(JSON.stringify({ row, os: String(os).trim(), placa: String(placa).trim(), tipo: String(tipo).trim(), colunaN: String(n).trim(), inicio: String(f).trim(), fim: String(g).trim() }));
  }
}
