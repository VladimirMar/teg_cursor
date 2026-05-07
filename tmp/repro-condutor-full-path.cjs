const fetch = global.fetch;
(async () => {
  const getItem = async () => {
    const resp = await fetch('http://localhost:3001/api/condutor?page=1&pageSize=50&search=10000');
    const json = await resp.json();
    return (json.items || []).find((entry) => String(entry.codigo) === '10000') || null;
  };

  const original = await getItem();
  console.log('original', JSON.stringify({ tipo_vinculo: original?.tipo_vinculo, historico: original?.historico, validade_curso: original?.validade_curso }));

  const updateResp = await fetch('http://localhost:3001/api/condutor/10000', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      codigo: original.codigo,
      condutor: original.condutor,
      cpfCondutor: original.cpf_condutor,
      crmc: original.crmc,
      validadeCrmc: original.validade_crmc,
      validadeCurso: '2030-12-31',
      tipoVinculo: 'Cooperado',
      historico: 'SMOKE TEST API CONDUTOR',
    }),
  });
  console.log('updateStatus', updateResp.status);

  const deleteResp = await fetch('http://localhost:3001/api/condutor/10000', { method: 'DELETE', headers: { Accept: 'application/json' } });
  console.log('deleteStatus', deleteResp.status);

  const afterDelete = await getItem();
  console.log('afterDelete', afterDelete);

  const importResp = await fetch('http://localhost:3001/api/condutor/import-xml', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ fileName: 'Condutor.xml' })
  });
  const importJson = await importResp.json();
  console.log('import', importResp.status, JSON.stringify({ processed: importJson.processed, updated: importJson.updated, inserted: importJson.inserted, skipped: importJson.skipped }));

  const restored = await getItem();
  console.log('restored', JSON.stringify({ tipo_vinculo: restored?.tipo_vinculo, historico: restored?.historico, validade_curso: restored?.validade_curso }));
})();
