const { Client } = require('pg');
(async () => {
  const c = new Client({ host:'localhost', port:5432, user:'postgres', password:'12345', database:'teg_financ' });
  await c.connect();
  const r = await c.query(`
    SELECT process_id, status, message, error_message, started_at, finished_at
    FROM batch_process_run
    WHERE process_id = 'remuneracao-servicos:1780085004686-8c3857ac'
    ORDER BY codigo DESC
    LIMIT 1
  `);
  console.log(JSON.stringify(r.rows, null, 2));
  await c.end();
})().catch((e)=>{ console.error(e.message); process.exit(1);});
