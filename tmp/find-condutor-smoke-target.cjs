const fetch = global.fetch;
const today = new Date().toISOString().slice(0, 10);
const isStrictlyFutureDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && value > today;
(async () => {
  for (let page = 1; page <= 50; page += 1) {
    const resp = await fetch(`http://localhost:3001/api/condutor?page=${page}&pageSize=50`);
    const json = await resp.json();
    const item = (json.items || []).find((entry) => String(entry.codigo ?? '').trim() && String(entry.crmc ?? '').trim() && isStrictlyFutureDate(entry.validade_crmc) && isStrictlyFutureDate(entry.validade_curso));
    if (item) {
      console.log(JSON.stringify({ page, codigo: item.codigo, tipo_vinculo: item.tipo_vinculo, historico: item.historico, validade_curso: item.validade_curso }, null, 2));
      return;
    }
  }
  console.log('not-found');
})();
