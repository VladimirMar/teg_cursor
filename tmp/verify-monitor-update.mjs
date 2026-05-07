const fetch = global.fetch;
(async () => {
  const itemResp = await fetch('http://localhost:3003/api/monitor?page=1&pageSize=50&search=15141');
  const itemJson = await itemResp.json();
  const item = (itemJson.items || []).find((entry) => String(entry.codigo) === '15141');
  console.log('before', item?.tipo_vinculo);
  const updateResp = await fetch('http://localhost:3003/api/monitor/15141', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      codigo: item.codigo,
      monitor: item.monitor,
      cpfMonitor: item.cpf_monitor,
      cursoMonitor: '2024-07-01',
      validadeCurso: '2029-07-01',
      tipoVinculo: 'Funcionario',
      nascimento: item.nascimento,
    }),
  });
  const updateJson = await updateResp.json();
  console.log('update', updateResp.status, JSON.stringify(updateJson));
  const afterResp = await fetch('http://localhost:3003/api/monitor?page=1&pageSize=50&search=15141');
  const afterJson = await afterResp.json();
  const after = (afterJson.items || []).find((entry) => String(entry.codigo) === '15141');
  console.log('after', after?.tipo_vinculo);
})();
