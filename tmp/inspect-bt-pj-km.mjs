import XLSX from 'xlsx';
const path = String.raw`C:\Users\m089383\Aplicativos\teg_financ\pgtos\2026-04 Pgto\04 ATESTE BT PJ ABR 26.xlsx`;
const workbook = XLSX.readFile(path, { cellDates: true });
const sheetName = workbook.SheetNames.find((name) => String(name).trim().toUpperCase() === 'APONTAMENTO CREDENCIAMENTO');
const sheet = workbook.Sheets[sheetName];
const row = 117;
const kmRaw = sheet[`N${row}`]?.v ?? '';
const normalize = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? Number(value.toFixed(4)) : Number.NaN;
  }
  const normalizedValue = String(value ?? '').trim();
  if (!normalizedValue) return 0;
  const parsedValue = /^\d+(?:\.\d+)?$/.test(normalizedValue)
    ? Number(normalizedValue)
    : Number(normalizedValue.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(parsedValue) && parsedValue >= 0 ? Number(parsedValue.toFixed(4)) : Number.NaN;
};
console.log(JSON.stringify({
  row,
  os: String(sheet[`B${row}`]?.w ?? sheet[`B${row}`]?.v ?? '').trim(),
  tipoEscola: String(sheet[`K${row}`]?.w ?? sheet[`K${row}`]?.v ?? '').trim(),
  periodoInicio: String(sheet[`F${row}`]?.w ?? sheet[`F${row}`]?.v ?? '').trim(),
  periodoFim: String(sheet[`G${row}`]?.w ?? sheet[`G${row}`]?.v ?? '').trim(),
  kmColunaNRaw: kmRaw,
  kmNormalizadoDia01: normalize(kmRaw).toFixed(4),
}));
