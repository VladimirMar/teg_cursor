const fetch = global.fetch;
(async () => {
  const itemResp = await fetch('http://localhost:3001/api/condutor?page=1&pageSize=50&search=10000');
  const itemJson = await itemResp.json();
  const item = (itemJson.items || []).find((entry) => String(entry.codigo) === '10000');
  console.log('before', item?.tipo_vinculo);
  const updateResp = await fetch('http://localhost:3001/api/condutor/10000', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      codigo: item.codigo,
      condutor: item.condutor,
      cpfCondutor: item.cpf_condutor,
      crmc: item.crmc,
      validadeCrmc: item.validade_crmc,
      validadeCurso: item.validade_curso,
      tipoVinculo: 'Funcionario',
      historico: item.historico,
    }),
  });
  const updateJson = await updateResp.json();
  console.log('update', updateResp.status, updateJson.item?.tipo_vinculo || updateJson.message);
  const importResp = await fetch('http://localhost:3001/api/condutor/import-xml', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ fileName: 'Condutor.xml' })
  });
  const importJson = await importResp.json();
  console.log('import', importResp.status, JSON.stringify({ processed: importJson.processed, updated: importJson.updated, inserted: importJson.inserted, skipped: importJson.skipped }));
  const afterResp = await fetch('http://localhost:3001/api/condutor?page=1&pageSize=50&search=10000');
  const afterJson = await afterResp.json();
  const after = (afterJson.items || []).find((entry) => String(entry.codigo) === '10000');
  console.log('after', after?.tipo_vinculo);
})();
