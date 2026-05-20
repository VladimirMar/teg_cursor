import XLSX from 'xlsx';
const path = String.raw`C:\Users\m089383\Aplicativos\teg_financ\pgtos\2026-04 Pgto\04 ATESTE BT PJ ABR 26.xlsx`;
const workbook = XLSX.readFile(path, { cellDates: true });
const sheet = workbook.Sheets[workbook.SheetNames.find((name) => String(name).trim().toUpperCase() === 'APONTAMENTO CREDENCIAMENTO')];
const row = 117;
const displayValue = String(sheet[`N${row}`]?.w ?? sheet[`N${row}`]?.v ?? '').trim();
const normalize = (value) => {
  const normalizedValue = String(value ?? '').trim();
  if (!normalizedValue) return 0;
  const parsedValue = /^\d+(?:\.\d+)?$/.test(normalizedValue)
    ? Number(normalizedValue)
    : Number(normalizedValue.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(parsedValue) && parsedValue >= 0 ? Number(parsedValue.toFixed(4)) : Number.NaN;
};
console.log(JSON.stringify({ row, kmExibido: displayValue, kmImportado: normalize(displayValue).toFixed(4) }));
