(async () => {
  const resp = await fetch('http://localhost:3001/api/ordem-servico?page=1&pageSize=500&sortBy=codigo&sortDirection=desc');
  const json = await resp.json();
  const drafts = (json.items || []).filter((item) => String(item.situacao || '').trim() === 'Rascunho').slice(0, 20);
  console.log(JSON.stringify({ total: json.total, drafts: drafts.map((item) => ({ codigo: item.codigo, termo: item.termo_adesao, numOs: item.num_os, revisao: item.revisao, situacao: item.situacao, cnpjCpf: item.cnpj_cpf, cpfCondutor: item.cpf_condutor, cpfMonitor: item.cpf_monitor, crm: item.crm })) }, null, 2));
})();
