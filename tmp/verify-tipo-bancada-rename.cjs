const { Pool } = require('pg');
const apiBase = 'http://127.0.0.1:3001';
const pool = new Pool({ host: 'localhost', port: 5432, user: 'postgres', password: '12345', database: 'teg_financ' });

async function requestJson(path, options) {
  const response = await fetch(`${apiBase}${path}`, options);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`${path} -> ${response.status} ${payload.message || JSON.stringify(payload)}`);
  }
  return payload;
}

function buildTemporaryDescricao(originalDescricao) {
  if (!originalDescricao) {
    return 'TMP';
  }
  if (originalDescricao.length >= 20) {
    return `${originalDescricao.slice(0, 19)}X`;
  }
  return `${originalDescricao}X`;
}

(async () => {
  const beforeItem = (await requestJson('/api/tipo-bancada?page=1&pageSize=20&sortBy=codigo&sortDirection=asc')).items.find((item) => String(item.codigo) === '2');
  if (!beforeItem) {
    throw new Error('Codigo 2 nao encontrado em tipo_bancada');
  }

  const originalDescricao = String(beforeItem.descricao || '').trim();
  const temporaryDescricao = buildTemporaryDescricao(originalDescricao);

  const beforeCountResult = await pool.query(
    `SELECT COUNT(*)::int AS total
       FROM veiculo
      WHERE UPPER(BTRIM(COALESCE(tipo_de_bancada, ''))) = UPPER($1)`,
    [originalDescricao],
  );

  await requestJson('/api/tipo-bancada/2', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ descricao: temporaryDescricao }),
  });

  const afterRenameOldCountResult = await pool.query(
    `SELECT COUNT(*)::int AS total
       FROM veiculo
      WHERE UPPER(BTRIM(COALESCE(tipo_de_bancada, ''))) = UPPER($1)`,
    [originalDescricao],
  );

  const afterRenameNewCountResult = await pool.query(
    `SELECT COUNT(*)::int AS total
       FROM veiculo
      WHERE UPPER(BTRIM(COALESCE(tipo_de_bancada, ''))) = UPPER($1)`,
    [temporaryDescricao],
  );

  await requestJson('/api/tipo-bancada/2', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ descricao: originalDescricao }),
  });

  const afterRevertCountResult = await pool.query(
    `SELECT COUNT(*)::int AS total
       FROM veiculo
      WHERE UPPER(BTRIM(COALESCE(tipo_de_bancada, ''))) = UPPER($1)`,
    [originalDescricao],
  );

  console.log(JSON.stringify({
    originalDescricao,
    temporaryDescricao,
    matchingVehiclesBefore: beforeCountResult.rows[0].total,
    matchingVehiclesWithOldDescriptionAfterRename: afterRenameOldCountResult.rows[0].total,
    matchingVehiclesWithNewDescriptionAfterRename: afterRenameNewCountResult.rows[0].total,
    matchingVehiclesAfterRevert: afterRevertCountResult.rows[0].total,
  }, null, 2));
})()
  .catch(async (error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
