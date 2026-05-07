const fetch = global.fetch;
(async () => {
  const resp = await fetch('http://localhost:3001/api/ordem-servico?page=1&pageSize=20&sortBy=codigo&sortDirection=desc');
  const json = await resp.json();
  const items = json.items || [];
  const candidate = items.find((item) => String(item.situacao||'').trim() === 'Rascunho' && String(item.termo_adesao||'').trim() && String(item.num_os||'').trim());
  console.log(JSON.stringify(candidate, null, 2));
})();
