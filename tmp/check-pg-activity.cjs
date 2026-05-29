const { Client } = require('pg');
(async () => {
  const c = new Client({ host:'localhost', port:5432, user:'postgres', password:'12345', database:'teg_financ' });
  await c.connect();
  const r = await c.query(`
    SELECT pid, state, wait_event_type, wait_event, now() - query_start AS running_for, LEFT(query, 200) AS query
    FROM pg_stat_activity
    WHERE datname = current_database()
      AND usename = current_user
      AND state <> 'idle'
    ORDER BY query_start ASC
  `);
  console.log(JSON.stringify(r.rows, null, 2));
  await c.end();
})().catch((e)=>{ console.error(e.message); process.exit(1);});
